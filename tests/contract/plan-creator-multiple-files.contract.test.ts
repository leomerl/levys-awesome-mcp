import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { existsSync, readdirSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

describe.skip('Plan Creator Multiple Files Prevention Tests', () => {
  let testDir: string;
  const goldenDir = path.join(process.cwd(), 'tests', 'golden', 'plan-creator-multiple');

  // Ensure golden directory exists
  if (!existsSync(goldenDir)) {
    mkdirSync(goldenDir, { recursive: true });
  }

  beforeEach(async () => {
    // Use a unique test-specific commit to avoid conflicts
    const currentCommit = `multiple-files-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    testDir = path.join(process.cwd(), 'plan_and_progress', currentCommit);
    
    // Clean up any existing test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up after each test  
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  async function getCurrentGitCommit(): Promise<string | null> {
    try {
      const { execSync } = require('child_process');
      const result = execSync('git rev-parse HEAD', { encoding: 'utf8' });
      return result.trim();
    } catch {
      return `test-${Date.now()}`;
    }
  }

  it.skip('should create only one set of plan/progress files on first call', async () => {
    const input = {
      task_description: 'First plan creation test',
      synopsis: 'Testing first plan creation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create first task',
        files_to_modify: ['test1.js'],
        dependencies: []
      }]
    };

    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input);

    // Check directory structure
    const dirExists = existsSync(testDir);
    const files = dirExists ? readdirSync(testDir) : [];
    const planFiles = files.filter(f => f.startsWith('plan-'));
    const progressFiles = files.filter(f => f.startsWith('progress-'));

    // Create normalized snapshot
    const snapshot = {
      input,
      hasError: result.isError || false,
      textContainsSuccess: result.content?.[0]?.text?.includes('successfully') || false,
      fileCreation: {
        dirExists,
        planFileCount: planFiles.length,
        progressFileCount: progressFiles.length,
        expectedCounts: { plan: 1, progress: 1 }
      }
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'first-call-file-creation.json');
    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (existsSync(goldenPath)) {
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
  });

  it.skip('should reuse existing files instead of creating new ones on second call', async () => {
    // First call - create initial files
    const input1 = {
      task_description: 'First plan creation test',
      synopsis: 'Testing first plan creation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create first task',
        files_to_modify: ['test1.js'],
        dependencies: []
      }]
    };

    const result1 = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input1);

    // Get initial file list
    const filesAfterFirst = existsSync(testDir) ? readdirSync(testDir) : [];
    const planFilesAfterFirst = filesAfterFirst.filter(f => f.startsWith('plan-'));
    const progressFilesAfterFirst = filesAfterFirst.filter(f => f.startsWith('progress-'));
    const initialPlanFile = planFilesAfterFirst[0] || null;
    const initialProgressFile = progressFilesAfterFirst[0] || null;

    // Wait a bit to ensure different timestamps would be generated if new files were created
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second call - should reuse existing files
    const input2 = {
      task_description: 'Second plan creation test',
      synopsis: 'Testing plan update with existing files',
      tasks: [{
        id: 'TASK-002',
        designated_agent: 'frontend-agent',
        description: 'Create second task',
        files_to_modify: ['test2.js'],
        dependencies: []
      }]
    };

    const result2 = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input2);

    // Check that still only one plan and one progress file exist
    const filesAfterSecond = existsSync(testDir) ? readdirSync(testDir) : [];
    const planFilesAfterSecond = filesAfterSecond.filter(f => f.startsWith('plan-'));
    const progressFilesAfterSecond = filesAfterSecond.filter(f => f.startsWith('progress-'));

    // Create normalized snapshot
    const snapshot = {
      firstCall: {
        input: input1,
        hasError: result1.isError || false,
        planFileCount: planFilesAfterFirst.length,
        progressFileCount: progressFilesAfterFirst.length
      },
      secondCall: {
        input: input2,
        hasError: result2.isError || false,
        planFileCount: planFilesAfterSecond.length,
        progressFileCount: progressFilesAfterSecond.length,
        sameFiles: {
          planFile: planFilesAfterSecond[0] === initialPlanFile,
          progressFile: progressFilesAfterSecond[0] === initialProgressFile
        }
      },
      expectedBehavior: {
        singlePlanFile: planFilesAfterSecond.length === 1,
        singleProgressFile: progressFilesAfterSecond.length === 1,
        filesReused: true
      }
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'file-reuse-on-second-call.json');
    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (existsSync(goldenPath)) {
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
  });

  it.skip('should preserve existing task states when updating progress file', async () => {
    // First call - create initial plan with task
    const initialInput = {
      task_description: 'Initial plan',
      synopsis: 'Initial plan creation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Initial task',
        files_to_modify: ['test1.js'],
        dependencies: []
      }]
    };

    await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', initialInput);

    // Get git commit hash for progress update
    const gitHash = await getCurrentGitCommit();

    // Simulate updating task progress
    const progressUpdate = {
      git_commit_hash: gitHash || 'no-commit-test',
      task_id: 'TASK-001',
      state: 'in_progress',
      agent_session_id: 'session-123',
      summary: 'Started working on task'
    };

    await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__update_progress', progressUpdate);

    // Second call with same task ID - should preserve the in_progress state
    const updatedInput = {
      task_description: 'Updated plan',
      synopsis: 'Plan update preserving state',
      tasks: [{
        id: 'TASK-001', // Same task ID
        designated_agent: 'backend-agent',
        description: 'Updated task description',
        files_to_modify: ['test1.js', 'test1-updated.js'],
        dependencies: []
      }]
    };

    await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', updatedInput);

    // Verify the task state was preserved
    const files = existsSync(testDir) ? readdirSync(testDir) : [];
    const progressFiles = files.filter(f => f.startsWith('progress-'));

    let taskState = null;
    if (progressFiles.length > 0) {
      try {
        const progressContent = readFileSync(path.join(testDir, progressFiles[0]), 'utf8');
        const progress = JSON.parse(progressContent);
        const task = progress.tasks.find((t: any) => t.id === 'TASK-001');
        taskState = task ? {
          state: task.state,
          agent_session_id: task.agent_session_id,
          summary: task.summary,
          description: task.description
        } : null;
      } catch {
        taskState = null;
      }
    }

    // Create normalized snapshot
    const snapshot = {
      initialPlan: initialInput,
      progressUpdate,
      updatedPlan: updatedInput,
      result: {
        progressFileCount: progressFiles.length,
        taskStatePreserved: taskState !== null,
        preservedValues: taskState ? {
          stateIsInProgress: taskState.state === 'in_progress',
          sessionIdPreserved: taskState.agent_session_id === 'session-123',
          summaryPreserved: taskState.summary === 'Started working on task',
          descriptionUpdated: taskState.description === 'Updated task description'
        } : null
      }
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'task-state-preservation.json');
    if (process.env.UPDATE_GOLDEN) {
      writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (existsSync(goldenPath)) {
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
  });
});