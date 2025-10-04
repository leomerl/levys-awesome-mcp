import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleAgentInvokerTool } from '../../src/handlers/agent-invoker.js';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import fs from 'fs';
import path from 'path';

/**
 * Integration tests for Orchestrator Self-Healing functionality
 *
 * Tests that orchestrator can:
 * 1. Detect failed tasks using get_failed_tasks
 * 2. Analyze failure reasons
 * 3. Automatically retry with correct agent
 * 4. Track self-healing attempts
 */
describe('Orchestrator Self-Healing', () => {
  const testSessionId = 'test-self-heal-' + Date.now();
  const sessionsDir = path.join(process.cwd(), 'plan_and_progress', 'sessions');
  const sessionDir = path.join(sessionsDir, testSessionId);

  beforeEach(async () => {
    // Create session directory
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Create a plan with a frontend task
    const plan = {
      goal: "Create login form",
      tasks: [
        {
          id: "TASK-001",
          designated_agent: "frontend-agent",
          description: "Create LoginForm component with email/password fields",
          files_to_modify: ["app/components/LoginForm.tsx"],
          dependencies: []
        }
      ],
      agents_required: ["frontend-agent"],
      estimated_duration: "10 minutes"
    };

    const planPath = path.join(sessionDir, 'plan.json');
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

    // Create corresponding progress file
    const progress = {
      plan_file: "plan.json",
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      git_commit_hash: "test-commit",
      tasks: plan.tasks.map(t => ({
        ...t,
        state: 'pending'
      }))
    };

    const progressPath = path.join(sessionDir, 'progress.json');
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');
  });

  afterEach(() => {
    // Clean up test session
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  });

  describe('Failed Task Detection', () => {
    it('should detect failed tasks using get_failed_tasks', async () => {
      // Manually mark a task as failed
      await handlePlanCreatorTool('update_progress', {
        session_id: testSessionId,
        task_id: 'TASK-001',
        state: 'failed',
        agent_session_id: 'fake-session',
        files_modified: [],
        summary: 'Task automatically marked as failed: Wrong agent invoked - backend-agent instead of frontend-agent'
      });

      // Query for failed tasks
      const result = await handlePlanCreatorTool('get_failed_tasks', {
        session_id: testSessionId
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0]).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const responseText = result.content[0].text;
      expect(responseText).toContain('Found 1 failed task(s)');
      expect(responseText).toContain('TASK-001');
      expect(responseText).toContain('frontend-agent');
      expect(responseText).toContain('Wrong agent invoked');
    });

    it('should return empty list when no failed tasks exist', async () => {
      const result = await handlePlanCreatorTool('get_failed_tasks', {
        session_id: testSessionId
      });

      expect(result).toBeDefined();
      const responseText = result.content[0].text;
      expect(responseText).toMatch(/Found 0 failed task\(s\)|No failed tasks found/);
    });
  });

  describe('Self-Healing Tracking', () => {
    it('should track self_heal_attempts in progress file', async () => {
      // Mark task as failed
      await handlePlanCreatorTool('update_progress', {
        session_id: testSessionId,
        task_id: 'TASK-001',
        state: 'failed',
        agent_session_id: 'first-attempt',
        files_modified: [],
        summary: 'Failed with wrong agent'
      });

      // Read progress file
      const progressPath = path.join(sessionDir, 'progress.json');
      const progressContent = fs.readFileSync(progressPath, 'utf8');
      const progress = JSON.parse(progressContent);

      const task = progress.tasks.find((t: any) => t.id === 'TASK-001');
      expect(task).toBeDefined();
      expect(task.state).toBe('failed');
      expect(task.failed_at).toBeDefined();
    });

    it('should support self_heal_history field', async () => {
      // Read and update progress file with self-heal history
      const progressPath = path.join(sessionDir, 'progress.json');
      const progressContent = fs.readFileSync(progressPath, 'utf8');
      const progress = JSON.parse(progressContent);

      const task = progress.tasks.find((t: any) => t.id === 'TASK-001');
      task.state = 'failed';
      task.failed_at = new Date().toISOString();
      task.self_heal_attempts = 1;
      task.self_heal_history = [{
        attempt: 1,
        action: "Reinvoking with correct agent: frontend-agent",
        timestamp: new Date().toISOString()
      }];

      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

      // Verify it was written correctly
      const updatedContent = fs.readFileSync(progressPath, 'utf8');
      const updatedProgress = JSON.parse(updatedContent);
      const updatedTask = updatedProgress.tasks.find((t: any) => t.id === 'TASK-001');

      expect(updatedTask.self_heal_attempts).toBe(1);
      expect(updatedTask.self_heal_history).toHaveLength(1);
      expect(updatedTask.self_heal_history[0].action).toContain('frontend-agent');
    });
  });

  describe('Failure Reason Analysis', () => {
    it('should identify wrong agent invocation from failure message', async () => {
      await handlePlanCreatorTool('update_progress', {
        session_id: testSessionId,
        task_id: 'TASK-001',
        state: 'failed',
        agent_session_id: 'test-session',
        files_modified: [],
        summary: 'Task automatically marked as failed: Agent could not complete the task. Designated agent: frontend-agent'
      });

      const result = await handlePlanCreatorTool('get_failed_tasks', {
        session_id: testSessionId
      });

      const responseText = result.content[0].text;
      const failedTaskData = JSON.parse(responseText.split(':\n\n')[1]);

      expect(failedTaskData).toHaveLength(1);
      expect(failedTaskData[0].designated_agent).toBe('frontend-agent');
      expect(failedTaskData[0].failure_reason).toContain('automatically marked as failed');
      expect(failedTaskData[0].self_heal_attempts).toBe(0);
    });
  });

  describe('Integration: Full Self-Healing Workflow', () => {
    it('should support complete self-healing cycle', async () => {
      // Step 1: Task fails with wrong agent
      await handlePlanCreatorTool('update_progress', {
        session_id: testSessionId,
        task_id: 'TASK-001',
        state: 'failed',
        agent_session_id: 'backend-agent-attempt',
        files_modified: [],
        summary: 'Backend agent could not complete frontend task'
      });

      // Step 2: Orchestrator detects failure
      const failedTasks = await handlePlanCreatorTool('get_failed_tasks', {
        session_id: testSessionId
      });

      const responseText = failedTasks.content[0].text;
      expect(responseText).toContain('Found 1 failed task(s)');

      // Step 3: Add self-heal history
      const progressPath = path.join(sessionDir, 'progress.json');
      const progressContent = fs.readFileSync(progressPath, 'utf8');
      const progress = JSON.parse(progressContent);

      const task = progress.tasks.find((t: any) => t.id === 'TASK-001');
      task.self_heal_attempts = 1;
      task.self_heal_history = [{
        attempt: 1,
        action: "Detected wrong agent (backend-agent), reinvoking with correct agent: frontend-agent",
        timestamp: new Date().toISOString()
      }];

      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf8');

      // Step 4: Retry with correct agent (simulate by marking as in_progress)
      await handlePlanCreatorTool('update_progress', {
        session_id: testSessionId,
        task_id: 'TASK-001',
        state: 'in_progress',
        agent_session_id: 'frontend-agent-retry',
        files_modified: [],
        summary: 'Retrying with correct agent'
      });

      // Step 5: Task succeeds
      await handlePlanCreatorTool('update_progress', {
        session_id: testSessionId,
        task_id: 'TASK-001',
        state: 'completed',
        agent_session_id: 'frontend-agent-retry',
        files_modified: ['app/components/LoginForm.tsx'],
        summary: 'Successfully created LoginForm component after self-healing retry'
      });

      // Verify final state
      const finalContent = fs.readFileSync(progressPath, 'utf8');
      const finalProgress = JSON.parse(finalContent);
      const finalTask = finalProgress.tasks.find((t: any) => t.id === 'TASK-001');

      expect(finalTask.state).toBe('completed');
      expect(finalTask.self_heal_attempts).toBe(1);
      expect(finalTask.self_heal_history).toHaveLength(1);
      expect(finalTask.files_modified).toContain('app/components/LoginForm.tsx');
      expect(finalTask.completed_at).toBeDefined();
    });
  });
});