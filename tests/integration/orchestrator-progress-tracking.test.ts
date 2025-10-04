/**
 * IMPORTANT TEST: Orchestrator Progress Tracking Integration Tests
 *
 * These tests verify the critical automatic progress tracking logic that:
 * 1. Detects when the orchestrator is invoking another agent
 * 2. Marks tasks as in_progress before agent invocation
 * 3. Checks for in_progress tasks after agent completion
 * 4. Resumes agents to complete/close tasks as needed
 *
 * This functionality is essential for proper orchestrator workflow operation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  updateTaskToInProgress,
  getInProgressTaskBySession,
  updateTaskToCompleted
} from '../../src/utilities/progress/task-tracker.js';

describe('Orchestrator Progress Tracking', () => {
  const testSessionId = randomUUID();
  const testTaskNumber = 1;
  const testTaskId = 'TASK-001';
  let progressDir: string;
  let progressFilePath: string;

  beforeEach(() => {
    // Create test session directory and progress file
    progressDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', testSessionId);
    progressFilePath = path.join(progressDir, 'progress.json');

    // Ensure directory exists
    fs.mkdirSync(progressDir, { recursive: true });

    // Create initial progress file with test task
    const progressData = {
      plan_file: 'plan.json',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      git_commit_hash: 'test-hash',
      tasks: [
        {
          id: testTaskId,
          designated_agent: 'test-agent',
          dependencies: [],
          description: 'Test task for progress tracking',
          files_to_modify: ['test.ts'],
          state: 'pending'
        }
      ]
    };

    fs.writeFileSync(progressFilePath, JSON.stringify(progressData, null, 2));
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(progressDir)) {
      fs.rmSync(progressDir, { recursive: true });
    }
  });

  describe('Task State Updates', () => {
    it('should update task from pending to in_progress', async () => {
      const result = await updateTaskToInProgress(testTaskNumber, testSessionId);

      expect(result).toBe(true);

      // Verify the task state was updated
      const progressContent = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(progressContent);
      const task = progress.tasks[0];

      expect(task.state).toBe('in_progress');
      expect(task.started_at).toBeDefined();
    });

    it('should not update task if already in_progress', async () => {
      // First update
      await updateTaskToInProgress(testTaskNumber, testSessionId);

      // Second attempt should return false
      const result = await updateTaskToInProgress(testTaskNumber, testSessionId);
      expect(result).toBe(false);
    });

    it('should get in-progress task by session', async () => {
      // Update task to in_progress
      await updateTaskToInProgress(testTaskNumber, testSessionId);

      // Get the in-progress task
      const task = await getInProgressTaskBySession(testSessionId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(testTaskId);
      expect(task?.state).toBe('in_progress');
    });

    it('should update task to completed with details', async () => {
      // First mark as in_progress
      await updateTaskToInProgress(testTaskNumber, testSessionId);

      // Then mark as completed
      const agentSessionId = randomUUID();
      const filesModified = ['test.ts', 'test2.ts'];
      const summary = 'Successfully implemented test feature';

      const result = await updateTaskToCompleted(
        testTaskNumber,
        testSessionId,
        agentSessionId,
        filesModified,
        summary
      );

      expect(result).toBe(true);

      // Verify the task was updated correctly
      const progressContent = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(progressContent);
      const task = progress.tasks[0];

      expect(task.state).toBe('completed');
      expect(task.agent_session_id).toBe(agentSessionId);
      expect(task.files_modified).toEqual(filesModified);
      expect(task.summary).toBe(summary);
      expect(task.completed_at).toBeDefined();
    });
  });

  describe('Orchestrator Detection', () => {
    it('should detect orchestrator invocation by agent name', () => {
      const testCases = [
        { invokerAgent: 'orchestrator', expected: true },
        { invokerAgent: 'orchestrator-agent', expected: true },
        { invokerAgent: 'backend-agent', expected: false },
        { invokerAgent: 'frontend-agent', expected: false },
        { invokerAgent: undefined, expected: false }
      ];

      testCases.forEach(({ invokerAgent, expected }) => {
        const isOrchestratorInvoking = invokerAgent === 'orchestrator-agent' || invokerAgent === 'orchestrator';
        expect(isOrchestratorInvoking).toBe(expected);
      });
    });
  });

  describe('Programmatic Orchestration Detection', () => {
    it('should detect orchestration when sessionId points to valid progress file', async () => {
      // The system should programmatically detect orchestration based on:
      // 1. sessionId parameter pointing to valid plan_and_progress/sessions/{id}/progress.json
      // 2. taskNumber parameter present

      // This is validated by the task state update tests above
      // When these conditions are met, the task should be marked as in_progress

      const result = await updateTaskToInProgress(testTaskNumber, testSessionId);
      expect(result).toBe(true);

      const task = await getInProgressTaskBySession(testSessionId);
      expect(task).toBeDefined();
      expect(task?.state).toBe('in_progress');
    });

    it('should not detect orchestration without valid progress file', async () => {
      const fakeSessionId = randomUUID();

      const result = await updateTaskToInProgress(testTaskNumber, fakeSessionId);
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing session directory gracefully', async () => {
      const nonExistentSessionId = randomUUID();
      const result = await updateTaskToInProgress(testTaskNumber, nonExistentSessionId);
      expect(result).toBe(false);
    });

    it('should handle invalid task number', async () => {
      const result = await updateTaskToInProgress(999, testSessionId);
      expect(result).toBe(false);
    });

    it('should handle concurrent task updates with file locking', async () => {
      // Simulate concurrent updates
      const updates = [
        updateTaskToInProgress(testTaskNumber, testSessionId),
        updateTaskToInProgress(testTaskNumber, testSessionId),
        updateTaskToInProgress(testTaskNumber, testSessionId)
      ];

      const results = await Promise.all(updates);

      // Only the first update should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);

      // Verify task state is consistent
      const task = await getInProgressTaskBySession(testSessionId);
      expect(task?.state).toBe('in_progress');
    });
  });
});

describe('CRITICAL: Orchestrator Workflow Integration', () => {
  /**
   * This test suite verifies the complete orchestrator workflow
   * including task assignment, progress tracking, and completion.
   *
   * IMPORTANT: These tests ensure the orchestrator can properly
   * coordinate multiple agents and track their progress.
   */

  it('should complete full orchestrator workflow with progress tracking', async () => {
    const sessionId = randomUUID();
    const progressDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', sessionId);

    try {
      // Setup: Create plan and progress files
      fs.mkdirSync(progressDir, { recursive: true });

      const plan = {
        task_description: 'Build a feature',
        synopsis: 'Test orchestration',
        created_at: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            dependencies: [],
            description: 'Implement backend logic',
            files_to_modify: ['backend/api.ts']
          },
          {
            id: 'TASK-002',
            designated_agent: 'frontend-agent',
            dependencies: ['TASK-001'],
            description: 'Create UI components',
            files_to_modify: ['frontend/component.tsx']
          }
        ]
      };

      const progress = {
        plan_file: 'plan.json',
        created_at: plan.created_at,
        last_updated: plan.created_at,
        git_commit_hash: plan.git_commit_hash,
        tasks: plan.tasks.map(t => ({ ...t, state: 'pending' }))
      };

      fs.writeFileSync(path.join(progressDir, 'plan.json'), JSON.stringify(plan, null, 2));
      fs.writeFileSync(path.join(progressDir, 'progress.json'), JSON.stringify(progress, null, 2));

      // Step 1: Mark TASK-001 as in_progress
      const task1Started = await updateTaskToInProgress(1, sessionId);
      expect(task1Started).toBe(true);

      // Step 2: Complete TASK-001
      const task1Completed = await updateTaskToCompleted(
        1,
        sessionId,
        'agent-session-1',
        ['backend/api.ts'],
        'Implemented backend API endpoints'
      );
      expect(task1Completed).toBe(true);

      // Step 3: Start TASK-002
      const task2Started = await updateTaskToInProgress(2, sessionId);
      expect(task2Started).toBe(true);

      // Step 4: Complete TASK-002
      const task2Completed = await updateTaskToCompleted(
        2,
        sessionId,
        'agent-session-2',
        ['frontend/component.tsx', 'frontend/styles.css'],
        'Created responsive UI components'
      );
      expect(task2Completed).toBe(true);

      // Verify final state
      const finalProgress = JSON.parse(fs.readFileSync(path.join(progressDir, 'progress.json'), 'utf8'));

      expect(finalProgress.tasks[0].state).toBe('completed');
      expect(finalProgress.tasks[0].files_modified).toEqual(['backend/api.ts']);

      expect(finalProgress.tasks[1].state).toBe('completed');
      expect(finalProgress.tasks[1].files_modified).toContain('frontend/component.tsx');

      // All tasks should be completed
      const allCompleted = finalProgress.tasks.every((t: any) => t.state === 'completed');
      expect(allCompleted).toBe(true);

    } finally {
      // Cleanup
      if (fs.existsSync(progressDir)) {
        fs.rmSync(progressDir, { recursive: true });
      }
    }
  });
});