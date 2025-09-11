import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { existsSync, readdirSync, rmSync, readFileSync } from 'fs';
import path from 'path';

describe('Plan Creator Multiple Files Prevention Tests', () => {
  let testDir: string;

  beforeEach(async () => {
    // Use the current git commit for testing
    const currentCommit = await getCurrentGitCommit();
    testDir = path.join(process.cwd(), 'plan_and_progress', currentCommit || 'no-commit-test');
    
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

  it('should create only one set of plan/progress files on first call', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'First plan creation test',
      synopsis: 'Testing first plan creation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create first task',
        files_to_modify: ['test1.js'],
        dependencies: []
      }]
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Plan and progress files created successfully!');

    // Check that exactly one plan and one progress file were created
    const files = readdirSync(testDir);
    const planFiles = files.filter(f => f.startsWith('plan-'));
    const progressFiles = files.filter(f => f.startsWith('progress-'));

    expect(planFiles.length).toBe(1);
    expect(progressFiles.length).toBe(1);
  });

  it('should reuse existing files instead of creating new ones on second call', async () => {
    // First call - create initial files
    const result1 = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'First plan creation test',
      synopsis: 'Testing first plan creation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create first task',
        files_to_modify: ['test1.js'],
        dependencies: []
      }]
    });

    expect(result1.isError).toBeUndefined();

    // Get initial file list
    const filesAfterFirst = readdirSync(testDir);
    const planFilesAfterFirst = filesAfterFirst.filter(f => f.startsWith('plan-'));
    const progressFilesAfterFirst = filesAfterFirst.filter(f => f.startsWith('progress-'));

    expect(planFilesAfterFirst.length).toBe(1);
    expect(progressFilesAfterFirst.length).toBe(1);

    const initialPlanFile = planFilesAfterFirst[0];
    const initialProgressFile = progressFilesAfterFirst[0];

    // Wait a bit to ensure different timestamps would be generated if new files were created
    await new Promise(resolve => setTimeout(resolve, 100));

    // Second call - should reuse existing files
    const result2 = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Second plan creation test',
      synopsis: 'Testing plan update with existing files',
      tasks: [{
        id: 'TASK-002',
        designated_agent: 'frontend-agent',
        description: 'Create second task',
        files_to_modify: ['test2.js'],
        dependencies: []
      }]
    });

    expect(result2.isError).toBeUndefined();

    // Check that still only one plan and one progress file exist
    const filesAfterSecond = readdirSync(testDir);
    const planFilesAfterSecond = filesAfterSecond.filter(f => f.startsWith('plan-'));
    const progressFilesAfterSecond = filesAfterSecond.filter(f => f.startsWith('progress-'));

    expect(planFilesAfterSecond.length).toBe(1);
    expect(progressFilesAfterSecond.length).toBe(1);

    // Verify the same files are being reused (same names)
    expect(planFilesAfterSecond[0]).toBe(initialPlanFile);
    expect(progressFilesAfterSecond[0]).toBe(initialProgressFile);
  });

  it('should preserve existing task states when updating progress file', async () => {
    // First call - create initial plan with task
    await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Initial plan',
      synopsis: 'Initial plan creation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Initial task',
        files_to_modify: ['test1.js'],
        dependencies: []
      }]
    });

    // Get git commit hash for progress update
    const gitHash = await getCurrentGitCommit();

    // Simulate updating task progress
    await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__update_progress', {
      git_commit_hash: gitHash || 'no-commit-test',
      task_id: 'TASK-001',
      state: 'in_progress',
      agent_session_id: 'session-123',
      summary: 'Started working on task'
    });

    // Second call with same task ID - should preserve the in_progress state
    await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Updated plan',
      synopsis: 'Plan update preserving state',
      tasks: [{
        id: 'TASK-001', // Same task ID
        designated_agent: 'backend-agent',
        description: 'Updated task description',
        files_to_modify: ['test1.js', 'test1-updated.js'],
        dependencies: []
      }]
    });

    // Verify the task state was preserved
    const files = readdirSync(testDir);
    const progressFiles = files.filter(f => f.startsWith('progress-'));
    expect(progressFiles.length).toBe(1);

    const progressContent = readFileSync(path.join(testDir, progressFiles[0]), 'utf8');
    const progress = JSON.parse(progressContent);
    
    const task = progress.tasks.find((t: any) => t.id === 'TASK-001');
    expect(task).toBeDefined();
    expect(task.state).toBe('in_progress'); // State should be preserved
    expect(task.agent_session_id).toBe('session-123'); // Session ID should be preserved
    expect(task.summary).toBe('Started working on task'); // Summary should be preserved
    expect(task.description).toBe('Updated task description'); // But description should be updated
  });
});