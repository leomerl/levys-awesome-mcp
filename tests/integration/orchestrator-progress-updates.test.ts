/**
 * Orchestrator Progress Updates Integration Tests
 *
 * These tests verify that progress tracking works correctly when the orchestrator
 * invokes agents with taskNumber and sessionId parameters.
 *
 * IMPORTANT: Invoked agents have their own session_id for their execution,
 * but they use the orchestrator's sessionId for progress tracking in the
 * plan_and_progress/sessions/{orchestratorSessionId}/ directory.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  updateTaskToInProgress,
  updateTaskToCompleted,
  getInProgressTaskBySession
} from '../../src/utilities/progress/task-tracker.js';

describe('Orchestrator Progress Updates', () => {
  let orchestratorSessionId: string;
  let progressDir: string;
  let progressFilePath: string;

  beforeEach(() => {
    orchestratorSessionId = randomUUID();
    progressDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', orchestratorSessionId);
    progressFilePath = path.join(progressDir, 'progress.json');

    // Create directory
    fs.mkdirSync(progressDir, { recursive: true });

    // Create initial progress file with test tasks
    const progress = {
      plan_file: 'plan.json',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      git_commit_hash: 'test-hash',
      tasks: [
        {
          id: 'TASK-001',
          designated_agent: 'frontend-agent',
          description: 'Create React component',
          files_to_modify: ['test-projects/frontend/Component.tsx'],
          dependencies: [],
          state: 'pending'
        },
        {
          id: 'TASK-002',
          designated_agent: 'backend-agent',
          description: 'Create API endpoint',
          files_to_modify: ['test-projects/backend/api.ts'],
          dependencies: ['TASK-001'],
          state: 'pending'
        }
      ]
    };

    fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(progressDir)) {
      fs.rmSync(progressDir, { recursive: true, force: true });
    }
  });

  describe('Task State Transitions', () => {
    it('should update task from pending to in_progress when agent is invoked with taskNumber', async () => {
      // Get initial state
      const initialContent = fs.readFileSync(progressFilePath, 'utf8');
      const initialProgress = JSON.parse(initialContent);
      expect(initialProgress.tasks[0].state).toBe('pending');

      // Simulate orchestrator invoking agent with taskNumber=1, sessionId=orchestratorSessionId
      const updated = await updateTaskToInProgress(1, orchestratorSessionId);

      // ASSERTION: This will fail if progress updates don't work
      expect(updated, 'updateTaskToInProgress should return true').toBe(true);

      // Verify the progress file was actually updated
      const updatedContent = fs.readFileSync(progressFilePath, 'utf8');
      const updatedProgress = JSON.parse(updatedContent);

      expect(
        updatedProgress.tasks[0].state,
        'Task state should change from pending to in_progress'
      ).toBe('in_progress');

      expect(
        updatedProgress.tasks[0].started_at,
        'Task should have started_at timestamp'
      ).toBeDefined();
    });

    it('should NEVER leave tasks in pending state when agents are invoked', async () => {
      // Simulate orchestrator workflow: invoke agent for TASK-001
      await updateTaskToInProgress(1, orchestratorSessionId);

      // Check progress file
      const content = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(content);

      // ASSERTION: Critical - tasks must not stay in pending after invocation
      expect(
        progress.tasks[0].state,
        'CRITICAL: Task should NOT remain in pending state after agent invocation'
      ).not.toBe('pending');

      expect(
        progress.tasks[0].state,
        'Task should be in_progress or completed, not pending'
      ).toMatch(/^(in_progress|completed)$/);
    });

    it('should update progress.json last_updated timestamp when task state changes', async () => {
      const initialContent = fs.readFileSync(progressFilePath, 'utf8');
      const initialProgress = JSON.parse(initialContent);
      const initialTimestamp = new Date(initialProgress.last_updated);

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update task state
      await updateTaskToInProgress(1, orchestratorSessionId);

      // Check that last_updated was modified
      const updatedContent = fs.readFileSync(progressFilePath, 'utf8');
      const updatedProgress = JSON.parse(updatedContent);
      const updatedTimestamp = new Date(updatedProgress.last_updated);

      // ASSERTION: This will fail if progress file is never updated
      expect(
        updatedTimestamp.getTime(),
        'Progress file last_updated timestamp should change when tasks are updated'
      ).toBeGreaterThan(initialTimestamp.getTime());
    });

    it('should update task to completed after agent finishes', async () => {
      // First mark as in_progress
      await updateTaskToInProgress(1, orchestratorSessionId);

      // Agent completes and updates progress
      const agentSessionId = randomUUID(); // Agent has its own session ID
      const filesModified = ['test-projects/frontend/Component.tsx'];
      const summary = 'Created React component successfully';

      const completed = await updateTaskToCompleted(
        1,
        orchestratorSessionId, // Use orchestrator's session ID for progress
        agentSessionId,
        filesModified,
        summary
      );

      // ASSERTION: Progress update should succeed
      expect(completed, 'updateTaskToCompleted should return true').toBe(true);

      // Verify task state
      const content = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(content);

      expect(progress.tasks[0].state).toBe('completed');
      expect(progress.tasks[0].agent_session_id).toBe(agentSessionId);
      expect(progress.tasks[0].files_modified).toEqual(filesModified);
      expect(progress.tasks[0].summary).toBe(summary);
      expect(progress.tasks[0].completed_at).toBeDefined();
    });
  });

  describe('Progress File Integrity', () => {
    it('should detect when progress file is never updated despite agent invocations', async () => {
      const initialContent = fs.readFileSync(progressFilePath, 'utf8');
      const initialProgress = JSON.parse(initialContent);
      const initialTimestamp = initialProgress.last_updated;
      const initialCreatedAt = initialProgress.created_at;

      // This is the CRITICAL BUG from the simulation:
      // Progress file created but never updated
      // created_at === last_updated means NO updates occurred

      // If we don't call updateTaskToInProgress, timestamps should remain equal
      // (This simulates the bug we found)

      const currentContent = fs.readFileSync(progressFilePath, 'utf8');
      const currentProgress = JSON.parse(currentContent);

      // ASSERTION: Detect the bug condition
      if (currentProgress.created_at === currentProgress.last_updated) {
        expect(
          true,
          'CRITICAL BUG DETECTED: Progress file never updated (created_at === last_updated)'
        ).toBe(false); // This will fail, highlighting the bug
      }
    });

    it('should maintain file lock during concurrent updates', async () => {
      // Attempt concurrent updates to same task
      const updates = [
        updateTaskToInProgress(1, orchestratorSessionId),
        updateTaskToInProgress(1, orchestratorSessionId),
        updateTaskToInProgress(1, orchestratorSessionId)
      ];

      const results = await Promise.all(updates);

      // Only first update should succeed
      const successCount = results.filter(r => r === true).length;
      expect(successCount).toBe(1);

      // Verify task state is consistent
      const content = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(content);
      expect(progress.tasks[0].state).toBe('in_progress');
    });
  });

  describe('Orchestrator Integration', () => {
    it('should support orchestrator invoking multiple tasks sequentially', async () => {
      // Task 1
      await updateTaskToInProgress(1, orchestratorSessionId);
      await updateTaskToCompleted(1, orchestratorSessionId, randomUUID(), ['file1.ts'], 'Done');

      // Task 2
      await updateTaskToInProgress(2, orchestratorSessionId);
      await updateTaskToCompleted(2, orchestratorSessionId, randomUUID(), ['file2.ts'], 'Done');

      // Verify both tasks completed
      const content = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(content);

      expect(progress.tasks[0].state).toBe('completed');
      expect(progress.tasks[1].state).toBe('completed');

      // Verify both have different agent_session_id (each agent has its own)
      expect(progress.tasks[0].agent_session_id).not.toBe(progress.tasks[1].agent_session_id);
    });

    it('should track in-progress tasks by orchestrator session ID', async () => {
      // Mark task as in progress
      await updateTaskToInProgress(1, orchestratorSessionId);

      // Query for in-progress task
      const inProgressTask = await getInProgressTaskBySession(orchestratorSessionId);

      expect(inProgressTask).toBeDefined();
      expect(inProgressTask?.id).toBe('TASK-001');
      expect(inProgressTask?.state).toBe('in_progress');
    });

    it('should allow orchestrator to resume after agent completes', async () => {
      // Orchestrator invokes agent for TASK-001
      await updateTaskToInProgress(1, orchestratorSessionId);

      // Agent completes and calls update_progress
      await updateTaskToCompleted(
        1,
        orchestratorSessionId,
        randomUUID(),
        ['test.ts'],
        'Completed task'
      );

      // Orchestrator checks for in-progress tasks
      const inProgressTask = await getInProgressTaskBySession(orchestratorSessionId);

      // Should be null now (no in-progress tasks)
      expect(inProgressTask).toBeNull();

      // Orchestrator can now move to next task
      const content = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(content);
      expect(progress.tasks[0].state).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing progress file gracefully', async () => {
      const fakeSessionId = randomUUID();
      const result = await updateTaskToInProgress(1, fakeSessionId);

      expect(result).toBe(false);
    });

    it('should handle invalid task numbers', async () => {
      const result = await updateTaskToInProgress(999, orchestratorSessionId);

      expect(result).toBe(false);
    });

    it('should not update task that is already in_progress', async () => {
      // First update
      const first = await updateTaskToInProgress(1, orchestratorSessionId);
      expect(first).toBe(true);

      // Second attempt
      const second = await updateTaskToInProgress(1, orchestratorSessionId);
      expect(second).toBe(false);
    });
  });

  describe('Regression Tests for Simulation Failures', () => {
    it('REGRESSION: should prevent all tasks staying in pending state', async () => {
      // This reproduces the exact failure from the simulation
      // All 4 tasks remained in 'pending' despite orchestrator running

      // Simulate orchestrator workflow
      await updateTaskToInProgress(1, orchestratorSessionId);
      await updateTaskToCompleted(1, orchestratorSessionId, randomUUID(), ['file1'], 'Done');

      await updateTaskToInProgress(2, orchestratorSessionId);
      await updateTaskToCompleted(2, orchestratorSessionId, randomUUID(), ['file2'], 'Done');

      // Check final state
      const content = fs.readFileSync(progressFilePath, 'utf8');
      const progress = JSON.parse(content);

      const allPending = progress.tasks.every((t: any) => t.state === 'pending');

      // ASSERTION: This was the bug - all tasks stayed pending
      expect(
        allPending,
        'REGRESSION TEST: Tasks should NOT all remain in pending state'
      ).toBe(false);

      // At least some tasks should be completed
      const someCompleted = progress.tasks.some((t: any) => t.state === 'completed');
      expect(someCompleted).toBe(true);
    });

    it('REGRESSION: should ensure progress file timestamp updates', async () => {
      // This reproduces the bug where created_at === last_updated
      const initialContent = fs.readFileSync(progressFilePath, 'utf8');
      const initialProgress = JSON.parse(initialContent);

      // Wait and update
      await new Promise(resolve => setTimeout(resolve, 10));
      await updateTaskToInProgress(1, orchestratorSessionId);

      const updatedContent = fs.readFileSync(progressFilePath, 'utf8');
      const updatedProgress = JSON.parse(updatedContent);

      // ASSERTION: Timestamps should differ after update
      expect(
        updatedProgress.last_updated,
        'REGRESSION TEST: last_updated should change after task updates'
      ).not.toBe(initialProgress.last_updated);
    });
  });
});
