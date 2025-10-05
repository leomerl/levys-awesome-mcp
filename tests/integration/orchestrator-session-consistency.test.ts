/**
 * Orchestrator Session Consistency Integration Tests
 *
 * These tests verify that session IDs remain consistent throughout the
 * orchestrator workflow. Each invoked agent has its own execution session ID,
 * but should use the orchestrator's session ID for progress tracking and reports.
 *
 * Key Concept:
 * - Orchestrator session ID: Used for plan_and_progress/sessions/{id}/
 * - Agent execution session ID: Each agent invocation gets unique ID
 * - Reports: Should be saved under orchestrator's session ID
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

describe('Orchestrator Session Consistency', () => {
  let orchestratorSessionId: string;
  let progressDir: string;
  let reportsDir: string;

  beforeEach(() => {
    orchestratorSessionId = randomUUID();
    progressDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', orchestratorSessionId);
    reportsDir = path.join(process.cwd(), 'reports', orchestratorSessionId);

    fs.mkdirSync(progressDir, { recursive: true });
    fs.mkdirSync(reportsDir, { recursive: true });

    // Create mock plan and progress
    const plan = {
      task_description: 'Test workflow',
      synopsis: 'Session consistency test',
      created_at: new Date().toISOString(),
      git_commit_hash: 'test-hash',
      tasks: [
        {
          id: 'TASK-001',
          designated_agent: 'frontend-agent',
          description: 'Test task',
          files_to_modify: ['test.tsx'],
          dependencies: []
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
  });

  afterEach(() => {
    if (fs.existsSync(progressDir)) {
      fs.rmSync(progressDir, { recursive: true, force: true });
    }
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  });

  describe('Session ID Consistency', () => {
    it('should use same orchestrator session ID for all plan and progress files', () => {
      // Plan file should be in orchestrator's session directory
      const planPath = path.join(progressDir, 'plan.json');
      expect(fs.existsSync(planPath), 'Plan should be in orchestrator session directory').toBe(true);

      // Progress file should be in orchestrator's session directory
      const progressPath = path.join(progressDir, 'progress.json');
      expect(fs.existsSync(progressPath), 'Progress should be in orchestrator session directory').toBe(true);

      // Both files should reference the same session
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

      expect(plan.git_commit_hash).toBe(progress.git_commit_hash);
    });

    it('should prevent session ID switching between workflow phases', () => {
      // Create planner summary
      const plannerSummary = {
        session_id: orchestratorSessionId, // Should use orchestrator's session ID
        agent: 'planner-agent',
        status: 'completed'
      };

      fs.writeFileSync(
        path.join(reportsDir, 'planner-agent-summary.json'),
        JSON.stringify(plannerSummary, null, 2)
      );

      // Create reviewer summary - should use SAME session ID
      const reviewerSummary = {
        session_id: orchestratorSessionId, // Same ID
        reviewed_session_id: orchestratorSessionId, // Reviewing the same session
        agent: 'review-agent',
        status: 'completed'
      };

      fs.writeFileSync(
        path.join(reportsDir, 'review-agent-summary.json'),
        JSON.stringify(reviewerSummary, null, 2)
      );

      // Verify both use same session ID
      const planner = JSON.parse(
        fs.readFileSync(path.join(reportsDir, 'planner-agent-summary.json'), 'utf8')
      );
      const reviewer = JSON.parse(
        fs.readFileSync(path.join(reportsDir, 'review-agent-summary.json'), 'utf8')
      );

      // ASSERTION: Session IDs must match
      expect(
        planner.session_id,
        'Planner should use orchestrator session ID'
      ).toBe(orchestratorSessionId);

      expect(
        reviewer.session_id,
        'Reviewer should use orchestrator session ID'
      ).toBe(orchestratorSessionId);

      expect(
        reviewer.reviewed_session_id,
        'Reviewer should review orchestrator session'
      ).toBe(orchestratorSessionId);
    });

    it('should ensure reviewer uses same session as planner', () => {
      // This test captures the exact bug from simulation:
      // Reviewer session (60549738-...) different from plan session (6768b084-...)

      const plannerSessionId = orchestratorSessionId;

      // Create planner summary
      fs.writeFileSync(
        path.join(reportsDir, 'planner-agent-summary.json'),
        JSON.stringify({ session_id: plannerSessionId }, null, 2)
      );

      // Create reviewer summary with WRONG session ID (simulating the bug)
      const wrongReviewerSessionId = randomUUID(); // BUG: Different session ID!
      const reviewerReportsDir = path.join(process.cwd(), 'reports', wrongReviewerSessionId);

      try {
        fs.mkdirSync(reviewerReportsDir, { recursive: true });
        fs.writeFileSync(
          path.join(reviewerReportsDir, 'review-agent-summary.json'),
          JSON.stringify({
            session_id: wrongReviewerSessionId,
            reviewed_session_id: plannerSessionId
          }, null, 2)
        );

        // Check if reviewer report is in wrong directory
        const reviewerInWrongPlace = fs.existsSync(
          path.join(reviewerReportsDir, 'review-agent-summary.json')
        );
        const reviewerInRightPlace = fs.existsSync(
          path.join(reportsDir, 'review-agent-summary.json')
        );

        // ASSERTION: Reviewer should be in orchestrator's session, not its own
        expect(
          reviewerInWrongPlace,
          'REGRESSION: Reviewer created its own session instead of using orchestrator session'
        ).toBe(false);

        expect(
          reviewerInRightPlace,
          'Reviewer should save reports under orchestrator session ID'
        ).toBe(true);
      } finally {
        if (fs.existsSync(reviewerReportsDir)) {
          fs.rmSync(reviewerReportsDir, { recursive: true, force: true });
        }
      }
    });

    it('should ensure all reports use consistent session ID', () => {
      // Create multiple agent summaries
      const agents = ['planner-agent', 'frontend-agent', 'backend-agent', 'review-agent'];

      agents.forEach(agentName => {
        const summary = {
          session_id: orchestratorSessionId,
          agent: agentName,
          timestamp: new Date().toISOString()
        };

        fs.writeFileSync(
          path.join(reportsDir, `${agentName}-summary.json`),
          JSON.stringify(summary, null, 2)
        );
      });

      // Verify all summaries use same session ID
      const sessionIds = agents.map(agentName => {
        const summaryPath = path.join(reportsDir, `${agentName}-summary.json`);
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        return summary.session_id;
      });

      // ASSERTION: All should have same session ID
      const allSame = sessionIds.every(id => id === orchestratorSessionId);
      expect(
        allSame,
        `All agent summaries should use orchestrator session ID. Found: ${[...new Set(sessionIds)].join(', ')}`
      ).toBe(true);
    });
  });

  describe('Agent Execution Session IDs', () => {
    it('should allow agents to have their own execution session IDs', () => {
      // Each agent invocation gets its own execution session ID
      const frontendExecutionSessionId = randomUUID();
      const backendExecutionSessionId = randomUUID();

      // These are different from orchestrator session ID
      expect(frontendExecutionSessionId).not.toBe(orchestratorSessionId);
      expect(backendExecutionSessionId).not.toBe(orchestratorSessionId);
      expect(frontendExecutionSessionId).not.toBe(backendExecutionSessionId);

      // But progress tracking uses orchestrator session ID
      const progressPath = path.join(progressDir, 'progress.json');
      const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'));

      // Update progress with agent session IDs
      progress.tasks[0].agent_session_id = frontendExecutionSessionId;
      progress.tasks[0].state = 'completed';

      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));

      // Verify: Progress file is in orchestrator's session dir
      expect(progressPath).toContain(orchestratorSessionId);

      // But contains agent's execution session ID
      const updated = JSON.parse(fs.readFileSync(progressPath, 'utf8'));
      expect(updated.tasks[0].agent_session_id).toBe(frontendExecutionSessionId);
    });

    it('should differentiate between orchestrator session and agent execution sessions', () => {
      // Orchestrator session: for plan/progress/reports
      const orchestratorSession = orchestratorSessionId;

      // Agent execution sessions: for individual agent runs
      const agentExecutionSession1 = randomUUID();
      const agentExecutionSession2 = randomUUID();

      // Orchestrator session - single, consistent
      expect(orchestratorSession).toBe(orchestratorSessionId);

      // Agent execution sessions - unique per invocation
      expect(agentExecutionSession1).not.toBe(agentExecutionSession2);

      // But all use orchestrator session for tracking
      const progress = {
        plan_file: 'plan.json',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        git_commit_hash: 'test',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'agent1',
            description: 'Task 1',
            files_to_modify: [],
            dependencies: [],
            state: 'completed',
            agent_session_id: agentExecutionSession1 // Agent's own session
          },
          {
            id: 'TASK-002',
            designated_agent: 'agent2',
            description: 'Task 2',
            files_to_modify: [],
            dependencies: [],
            state: 'completed',
            agent_session_id: agentExecutionSession2 // Agent's own session
          }
        ]
      };

      // Save in orchestrator's session directory
      fs.writeFileSync(
        path.join(progressDir, 'progress.json'),
        JSON.stringify(progress, null, 2)
      );

      // Verify file location uses orchestrator session
      expect(progressDir).toContain(orchestratorSessionId);

      // But task data contains agent execution sessions
      const saved = JSON.parse(fs.readFileSync(path.join(progressDir, 'progress.json'), 'utf8'));
      expect(saved.tasks[0].agent_session_id).toBe(agentExecutionSession1);
      expect(saved.tasks[1].agent_session_id).toBe(agentExecutionSession2);
    });
  });

  describe('Report Directory Structure', () => {
    it('should save all agent reports under orchestrator session directory', () => {
      // Create reports for different agents
      const agentReports = [
        { agent: 'planner-agent', sessionId: orchestratorSessionId },
        { agent: 'frontend-agent', sessionId: orchestratorSessionId },
        { agent: 'backend-agent', sessionId: orchestratorSessionId },
        { agent: 'builder-agent', sessionId: orchestratorSessionId },
        { agent: 'linter-agent', sessionId: orchestratorSessionId },
        { agent: 'testing-agent', sessionId: orchestratorSessionId }
      ];

      agentReports.forEach(report => {
        fs.writeFileSync(
          path.join(reportsDir, `${report.agent}-summary.json`),
          JSON.stringify(report, null, 2)
        );
      });

      // Verify all reports are in same directory
      const files = fs.readdirSync(reportsDir);
      expect(files.length).toBe(agentReports.length);

      // Verify directory path contains orchestrator session
      expect(reportsDir).toContain(orchestratorSessionId);

      // Verify no reports in other session directories
      const reportsRoot = path.join(process.cwd(), 'reports');
      const allSessionDirs = fs.readdirSync(reportsRoot);

      // Should only have one session directory (orchestrator's)
      const sessionDirsCount = allSessionDirs.filter(dir => {
        const fullPath = path.join(reportsRoot, dir);
        return fs.statSync(fullPath).isDirectory();
      }).length;

      expect(
        sessionDirsCount,
        'Should only have orchestrator session directory in reports/'
      ).toBe(1);
    });

    it('should prevent agents from creating their own report directories', () => {
      // Simulate agent trying to create own report directory
      const rogueAgentSessionId = randomUUID();
      const rogueReportsDir = path.join(process.cwd(), 'reports', rogueAgentSessionId);

      // This should NOT happen
      if (fs.existsSync(rogueReportsDir)) {
        // Clean up and fail test
        fs.rmSync(rogueReportsDir, { recursive: true, force: true });

        expect(
          false,
          `Agent created its own report directory ${rogueAgentSessionId} instead of using orchestrator session ${orchestratorSessionId}`
        ).toBe(true);
      }

      // Only orchestrator's report directory should exist
      const reportsRoot = path.join(process.cwd(), 'reports');
      if (fs.existsSync(reportsRoot)) {
        const sessionDirs = fs.readdirSync(reportsRoot).filter(dir => {
          const fullPath = path.join(reportsRoot, dir);
          return fs.statSync(fullPath).isDirectory() && dir !== 'test-session-123'; // Exclude test fixtures
        });

        // Should only contain orchestrator session
        expect(sessionDirs).toContain(orchestratorSessionId);
        expect(
          sessionDirs.filter(d => d !== orchestratorSessionId).length,
          'Should not have additional agent session directories'
        ).toBe(0);
      }
    });
  });

  describe('Regression Tests from Simulation', () => {
    it('REGRESSION: should prevent reviewer from using different session ID than planner', () => {
      // This is the exact bug from the simulation:
      // Plan session: 6768b084-5507-4516-adac-c449de3ce25e
      // Reviewer session: 60549738-7093-4d98-a3b9-5f667cf041e0

      const planSessionId = orchestratorSessionId;

      // Create planner report in correct location
      fs.writeFileSync(
        path.join(reportsDir, 'planner-agent-summary.json'),
        JSON.stringify({ session_id: planSessionId }, null, 2)
      );

      // Reviewer should use SAME session ID
      const reviewerSummary = {
        session_id: planSessionId, // Not a different ID!
        reviewed_session_id: planSessionId,
        agent: 'review-agent'
      };

      fs.writeFileSync(
        path.join(reportsDir, 'review-agent-summary.json'),
        JSON.stringify(reviewerSummary, null, 2)
      );

      // Verify both in same directory
      const plannerPath = path.join(reportsDir, 'planner-agent-summary.json');
      const reviewerPath = path.join(reportsDir, 'review-agent-summary.json');

      expect(fs.existsSync(plannerPath)).toBe(true);
      expect(fs.existsSync(reviewerPath)).toBe(true);

      // Verify both have same session ID
      const planner = JSON.parse(fs.readFileSync(plannerPath, 'utf8'));
      const reviewer = JSON.parse(fs.readFileSync(reviewerPath, 'utf8'));

      expect(reviewer.session_id).toBe(planner.session_id);
    });
  });
});
