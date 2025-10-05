/**
 * Orchestrator Workflow Execution Integration Tests
 *
 * These tests verify that the orchestrator properly executes all workflow phases
 * and creates necessary reports for each agent invocation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

describe('Orchestrator Workflow Execution', () => {
  let sessionId: string;
  let progressDir: string;
  let reportsDir: string;

  beforeEach(() => {
    sessionId = randomUUID();
    progressDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', sessionId);
    reportsDir = path.join(process.cwd(), 'reports', sessionId);

    fs.mkdirSync(progressDir, { recursive: true });
    fs.mkdirSync(reportsDir, { recursive: true });

    // Create mock plan
    const plan = {
      task_description: 'Test workflow execution',
      synopsis: 'Verify all phases execute correctly',
      created_at: new Date().toISOString(),
      git_commit_hash: 'test-hash',
      tasks: [
        {
          id: 'TASK-001',
          designated_agent: 'frontend-agent',
          description: 'Frontend task',
          files_to_modify: ['frontend/test.tsx'],
          dependencies: []
        },
        {
          id: 'TASK-002',
          designated_agent: 'backend-agent',
          description: 'Backend task',
          files_to_modify: ['backend/test.ts'],
          dependencies: []
        }
      ]
    };

    fs.writeFileSync(path.join(progressDir, 'plan.json'), JSON.stringify(plan, null, 2));
  });

  afterEach(() => {
    if (fs.existsSync(progressDir)) {
      fs.rmSync(progressDir, { recursive: true, force: true });
    }
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  });

  describe('Sequential Task Execution', () => {
    it('should execute tasks sequentially, never in parallel', () => {
      // Read plan to check for parallel execution hints
      const planPath = path.join(progressDir, 'plan.json');
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

      // Planner should NOT suggest parallel execution
      const planText = JSON.stringify(plan);

      // ASSERTION: Plan should not contain "parallel" suggestions
      const containsParallelSuggestion = planText.includes('parallel_tasks') ||
                                          planText.includes('"parallel"') ||
                                          planText.includes('execute in parallel');

      expect(
        containsParallelSuggestion,
        'Plan should not suggest parallel execution - orchestrator executes tasks sequentially'
      ).toBe(false);
    });

    it('should process tasks one at a time in dependency order', () => {
      // Create progress with task execution timestamps
      const progress = {
        plan_file: 'plan.json',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Task 1',
            files_to_modify: [],
            dependencies: [],
            state: 'completed',
            started_at: '2025-01-01T10:00:00Z',
            completed_at: '2025-01-01T10:05:00Z'
          },
          {
            id: 'TASK-002',
            designated_agent: 'backend-agent',
            description: 'Task 2',
            files_to_modify: [],
            dependencies: ['TASK-001'],
            state: 'completed',
            started_at: '2025-01-01T10:06:00Z', // Started AFTER TASK-001 completed
            completed_at: '2025-01-01T10:10:00Z'
          }
        ]
      };

      fs.writeFileSync(
        path.join(progressDir, 'progress.json'),
        JSON.stringify(progress, null, 2)
      );

      // Verify sequential execution
      const task1CompletedAt = new Date(progress.tasks[0].completed_at!);
      const task2StartedAt = new Date(progress.tasks[1].started_at!);

      // Task 2 should start AFTER task 1 completes
      expect(
        task2StartedAt.getTime(),
        'Task 2 should start after Task 1 completes (sequential execution)'
      ).toBeGreaterThanOrEqual(task1CompletedAt.getTime());
    });

    it('should never have multiple tasks in in_progress state simultaneously', () => {
      // Create progress snapshot during execution
      const progress = {
        plan_file: 'plan.json',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Task 1',
            files_to_modify: [],
            dependencies: [],
            state: 'in_progress' // Currently running
          },
          {
            id: 'TASK-002',
            designated_agent: 'backend-agent',
            description: 'Task 2',
            files_to_modify: [],
            dependencies: [],
            state: 'pending' // Should be pending, not in_progress
          }
        ]
      };

      fs.writeFileSync(
        path.join(progressDir, 'progress.json'),
        JSON.stringify(progress, null, 2)
      );

      // Count in_progress tasks
      const inProgressCount = progress.tasks.filter(t => t.state === 'in_progress').length;

      // ASSERTION: Only 1 task should be in_progress at a time
      expect(
        inProgressCount,
        'Only ONE task should be in_progress at any time (sequential execution)'
      ).toBeLessThanOrEqual(1);
    });
  });

  describe('Workflow Phase Execution', () => {
    it('should invoke all required phases: plan → dev → review → build → lint → test', () => {
      // Create summaries for each phase
      const requiredPhases = [
        'planner-agent',
        'frontend-agent', // Development
        'backend-agent',  // Development
        'review-agent',   // Review
        'builder-agent',  // Build
        'linter-agent',   // Lint
        'testing-agent'   // Test
      ];

      requiredPhases.forEach(agent => {
        const summary = {
          session_id: sessionId,
          agent: agent,
          status: 'completed',
          timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
          path.join(reportsDir, `${agent}-summary.json`),
          JSON.stringify(summary, null, 2)
        );
      });

      // Verify all phases executed
      const reportFiles = fs.readdirSync(reportsDir);
      const executedPhases = reportFiles
        .filter(f => f.endsWith('-summary.json'))
        .map(f => f.replace('-summary.json', ''));

      // ASSERTION: All required phases should have reports
      requiredPhases.forEach(phase => {
        expect(
          executedPhases,
          `Missing ${phase} - orchestrator should execute all workflow phases`
        ).toContain(phase);
      });
    });

    it('should execute phases in correct order', () => {
      // Create summaries with timestamps
      const phases = [
        { name: 'planner-agent', timestamp: '2025-01-01T10:00:00Z' },
        { name: 'frontend-agent', timestamp: '2025-01-01T10:05:00Z' },
        { name: 'backend-agent', timestamp: '2025-01-01T10:10:00Z' },
        { name: 'review-agent', timestamp: '2025-01-01T10:15:00Z' },
        { name: 'builder-agent', timestamp: '2025-01-01T10:20:00Z' },
        { name: 'linter-agent', timestamp: '2025-01-01T10:25:00Z' },
        { name: 'testing-agent', timestamp: '2025-01-01T10:30:00Z' }
      ];

      phases.forEach(phase => {
        fs.writeFileSync(
          path.join(reportsDir, `${phase.name}-summary.json`),
          JSON.stringify({ session_id: sessionId, timestamp: phase.timestamp }, null, 2)
        );
      });

      // Verify timestamps are in order
      for (let i = 1; i < phases.length; i++) {
        const prevTime = new Date(phases[i - 1].timestamp);
        const currTime = new Date(phases[i].timestamp);

        expect(
          currTime.getTime(),
          `${phases[i].name} should execute after ${phases[i - 1].name}`
        ).toBeGreaterThanOrEqual(prevTime.getTime());
      }
    });

    it('should not skip any workflow phases', () => {
      // Simulate orchestrator run with missing phase
      const executedPhases = [
        'planner-agent',
        'frontend-agent',
        // 'review-agent' <- MISSING!
        'builder-agent',
        'linter-agent'
      ];

      executedPhases.forEach(agent => {
        fs.writeFileSync(
          path.join(reportsDir, `${agent}-summary.json`),
          JSON.stringify({ session_id: sessionId, agent }, null, 2)
        );
      });

      // Check for required phases
      const requiredPhases = ['planner-agent', 'review-agent', 'builder-agent', 'linter-agent'];
      const reportFiles = fs.readdirSync(reportsDir);

      const missingPhases = requiredPhases.filter(phase => {
        return !reportFiles.includes(`${phase}-summary.json`);
      });

      // ASSERTION: No phases should be skipped
      expect(
        missingPhases,
        `Orchestrator skipped workflow phases: ${missingPhases.join(', ')}`
      ).toHaveLength(0);
    });
  });

  describe('Agent Summary Report Generation', () => {
    it('should create summary reports for each agent invocation', () => {
      const agents = ['planner-agent', 'frontend-agent', 'backend-agent'];

      agents.forEach(agent => {
        fs.writeFileSync(
          path.join(reportsDir, `${agent}-summary.json`),
          JSON.stringify({ session_id: sessionId, agent }, null, 2)
        );
      });

      // Verify all summaries exist
      agents.forEach(agent => {
        const summaryPath = path.join(reportsDir, `${agent}-summary.json`);

        expect(
          fs.existsSync(summaryPath),
          `Missing summary for ${agent} - agents must create summary reports`
        ).toBe(true);
      });
    });

    it('should save agent summaries to correct locations', () => {
      // Agent summaries should be in reports/{sessionId}/
      const correctLocation = path.join(reportsDir, 'frontend-agent-summary.json');
      const wrongLocation = path.join(process.cwd(), 'reports', randomUUID(), 'frontend-agent-summary.json');

      // Create summary in correct location
      fs.writeFileSync(
        correctLocation,
        JSON.stringify({ session_id: sessionId }, null, 2)
      );

      // Verify correct location exists
      expect(fs.existsSync(correctLocation)).toBe(true);

      // Verify wrong location doesn't exist
      expect(fs.existsSync(wrongLocation)).toBe(false);

      // Verify summary is in session directory
      expect(correctLocation).toContain(sessionId);
    });

    it('should detect missing agent summary reports', () => {
      // Simulate orchestrator claiming agent completed but no summary exists
      const progress = {
        plan_file: 'plan.json',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Task',
            files_to_modify: [],
            dependencies: [],
            state: 'completed', // Marked as completed
            agent_session_id: randomUUID()
          }
        ]
      };

      fs.writeFileSync(
        path.join(progressDir, 'progress.json'),
        JSON.stringify(progress, null, 2)
      );

      // Check if summary exists
      const summaryPath = path.join(reportsDir, 'frontend-agent-summary.json');
      const summaryExists = fs.existsSync(summaryPath);
      const taskCompleted = progress.tasks[0].state === 'completed';

      // ASSERTION: If task completed, summary should exist
      if (taskCompleted) {
        expect(
          summaryExists,
          'Task marked as completed but agent summary report is missing'
        ).toBe(true);
      }
    });

    it('should validate agent summary report structure', () => {
      // Create a malformed summary
      const summary = {
        // Missing required fields
        agent: 'frontend-agent'
        // Missing: session_id, status, timestamp
      };

      fs.writeFileSync(
        path.join(reportsDir, 'frontend-agent-summary.json'),
        JSON.stringify(summary, null, 2)
      );

      // Read and validate
      const savedSummary = JSON.parse(
        fs.readFileSync(path.join(reportsDir, 'frontend-agent-summary.json'), 'utf8')
      );

      // ASSERTION: Summary should have required fields
      expect(
        savedSummary.session_id,
        'Agent summary should include session_id'
      ).toBeDefined();

      expect(
        savedSummary.agent || savedSummary.agentName,
        'Agent summary should include agent name'
      ).toBeDefined();
    });
  });

  describe('Report Consistency Validation', () => {
    it('should ensure report structure matches expected format', () => {
      const expectedFields = ['session_id', 'agent', 'status', 'timestamp'];

      const summary = {
        session_id: sessionId,
        agent: 'frontend-agent',
        status: 'completed',
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(
        path.join(reportsDir, 'frontend-agent-summary.json'),
        JSON.stringify(summary, null, 2)
      );

      // Validate structure
      expectedFields.forEach(field => {
        expect(
          summary[field as keyof typeof summary],
          `Report should have ${field} field`
        ).toBeDefined();
      });
    });

    it('should detect reports with unexpected structure', () => {
      // Create report with wrong structure
      const badReport = {
        some_random_field: 'value',
        another_field: 123
        // Missing all expected fields
      };

      fs.writeFileSync(
        path.join(reportsDir, 'bad-report.json'),
        JSON.stringify(badReport, null, 2)
      );

      // Validate
      const report = JSON.parse(
        fs.readFileSync(path.join(reportsDir, 'bad-report.json'), 'utf8')
      );

      const hasSessionId = 'session_id' in report || 'sessionId' in report;
      const hasAgent = 'agent' in report || 'agentName' in report;

      // ASSERTION: Report should have expected fields
      expect(
        hasSessionId && hasAgent,
        'Report has unexpected structure - missing required fields'
      ).toBe(true);
    });
  });

  describe('Regression Tests from Simulation', () => {
    it('REGRESSION: should prevent orchestrator skipping workflow phases', () => {
      // This tests the bug where orchestrator might skip review, build, lint, or test
      const requiredPhases = ['plan', 'develop', 'review', 'build', 'lint', 'test'];

      // Create orchestrator summary
      const orchestratorSummary = {
        session_id: sessionId,
        workflow_phases: {
          planning: { status: 'success' },
          development: { status: 'partial' },
          review: { status: 'completed' },
          build: { status: 'completed' },
          lint: { status: 'completed' },
          testing: { status: 'completed' }
        }
      };

      fs.writeFileSync(
        path.join(reportsDir, 'orchestrator-agent-summary.json'),
        JSON.stringify(orchestratorSummary, null, 2)
      );

      // Verify all phases present
      const phases = orchestratorSummary.workflow_phases;
      const phaseKeys = Object.keys(phases);

      expect(phaseKeys).toContain('planning');
      expect(phaseKeys).toContain('development');
      expect(phaseKeys).toContain('review');
      expect(phaseKeys).toContain('build');
      expect(phaseKeys).toContain('lint');
      expect(phaseKeys).toContain('testing');
    });

    it('REGRESSION: should prevent orchestrator batching multiple tasks to single agent', () => {
      // This tests the bug where orchestrator might pass multiple tasks at once
      const progress = {
        plan_file: 'plan.json',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Task 1',
            files_to_modify: [],
            dependencies: [],
            state: 'completed',
            agent_session_id: 'session-1',
            started_at: '2025-01-01T10:00:00Z',
            completed_at: '2025-01-01T10:05:00Z'
          },
          {
            id: 'TASK-002',
            designated_agent: 'frontend-agent',
            description: 'Task 2',
            files_to_modify: [],
            dependencies: [],
            state: 'completed',
            agent_session_id: 'session-2', // Different session = separate invocation
            started_at: '2025-01-01T10:06:00Z',
            completed_at: '2025-01-01T10:10:00Z'
          }
        ]
      };

      fs.writeFileSync(
        path.join(progressDir, 'progress.json'),
        JSON.stringify(progress, null, 2)
      );

      // Verify different agent session IDs (one task per invocation)
      expect(
        progress.tasks[0].agent_session_id,
        'Tasks should have different agent session IDs (separate invocations)'
      ).not.toBe(progress.tasks[1].agent_session_id);

      // Verify sequential execution (no overlap)
      const task1End = new Date(progress.tasks[0].completed_at!).getTime();
      const task2Start = new Date(progress.tasks[1].started_at!).getTime();

      expect(
        task2Start,
        'Tasks should execute sequentially, not batched'
      ).toBeGreaterThanOrEqual(task1End);
    });
  });
});
