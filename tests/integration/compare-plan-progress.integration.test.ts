import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';

describe('compare_plan_progress Integration Test - No Mocks', () => {
  const testGitHash = 'test-integration-hash-12345';
  const testDir = path.join(process.cwd(), 'plan_and_progress', testGitHash);

  // Test data
  const testPlan = {
    task_description: 'Create a test utility function',
    synopsis: 'Test implementation for integration testing',
    created_at: new Date().toISOString(),
    git_commit_hash: testGitHash,
    tasks: [
      {
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create utility function',
        files_to_modify: ['src/utils/helper.ts'],
        dependencies: []
      },
      {
        id: 'TASK-002',
        designated_agent: 'testing-agent',
        description: 'Create tests',
        files_to_modify: ['tests/helper.test.ts'],
        dependencies: ['TASK-001']
      },
      {
        id: 'TASK-003',
        designated_agent: 'builder',
        description: 'Build project',
        files_to_modify: ['dist/helper.js', 'dist/helper.d.ts'],
        dependencies: ['TASK-001']
      }
    ]
  };

  const testProgress = {
    plan_file: '',
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    git_commit_hash: testGitHash,
    tasks: [
      {
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create utility function',
        files_to_modify: ['src/utils/helper.ts'],
        dependencies: [],
        state: 'completed' as const,
        agent_session_id: 'session-001',
        files_modified: ['src/utils/helper.ts', 'src/utils/index.ts'], // Extra file
        summary: 'Created helper function',
        completed_at: new Date().toISOString()
      },
      {
        id: 'TASK-002',
        designated_agent: 'testing-agent',
        description: 'Create tests',
        files_to_modify: ['tests/helper.test.ts'],
        dependencies: ['TASK-001'],
        state: 'completed' as const,
        agent_session_id: 'session-002',
        files_modified: ['tests/unit/helper.test.ts'], // Different location
        summary: 'Created tests',
        completed_at: new Date().toISOString()
      },
      {
        id: 'TASK-003',
        designated_agent: 'builder',
        description: 'Build project',
        files_to_modify: ['dist/helper.js', 'dist/helper.d.ts'],
        dependencies: ['TASK-001'],
        state: 'in_progress' as const,
        agent_session_id: 'session-003',
        files_modified: ['dist/helper.js'], // Missing .d.ts file
        summary: 'Building...',
        started_at: new Date().toISOString()
      }
    ]
  };

  beforeAll(async () => {
    // Create test directory structure
    if (!existsSync(testDir)) {
      await mkdir(testDir, { recursive: true });
    }

    // Create test plan and progress files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const planPath = path.join(testDir, `plan-${timestamp}.json`);
    const progressPath = path.join(testDir, `progress-${timestamp}.json`);

    testProgress.plan_file = planPath;

    await writeFile(planPath, JSON.stringify(testPlan, null, 2));
    await writeFile(progressPath, JSON.stringify(testProgress, null, 2));
  });

  afterAll(async () => {
    // Clean up test directory
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should successfully compare plan and progress files with real file system', async () => {
    // Execute the comparison tool
    const result = await handlePlanCreatorTool('compare_plan_progress', {
      git_commit_hash: testGitHash
    });

    // Verify no error occurred
    expect(result.isError).toBeUndefined();
    expect(result.content).toBeDefined();
    expect(result.content[0]).toBeDefined();
    expect(result.content[0].type).toBe('text');

    // Parse the JSON response
    const text = result.content[0].text;
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonPart = text.substring(0, jsonEnd);
    const report = JSON.parse(jsonPart);

    // Verify basic structure
    expect(report.git_commit_hash).toBe(testGitHash);
    expect(report.overall_goal).toBe('Create a test utility function');
    expect(report.synopsis).toBe('Test implementation for integration testing');

    // Verify task comparisons
    expect(report.task_comparisons).toHaveLength(3);

    // TASK-001: Should have unexpected file
    const task1 = report.task_comparisons[0];
    expect(task1.task_id).toBe('TASK-001');
    expect(task1.state).toBe('completed');
    expect(task1.has_discrepancy).toBe(true);
    expect(task1.missing_files).toEqual([]);
    expect(task1.unexpected_files).toEqual(['src/utils/index.ts']);

    // TASK-002: Should have file location mismatch
    const task2 = report.task_comparisons[1];
    expect(task2.task_id).toBe('TASK-002');
    expect(task2.state).toBe('completed');
    expect(task2.has_discrepancy).toBe(true);
    expect(task2.missing_files).toEqual(['tests/helper.test.ts']);
    expect(task2.unexpected_files).toEqual(['tests/unit/helper.test.ts']);

    // TASK-003: Should be in_progress with missing file
    const task3 = report.task_comparisons[2];
    expect(task3.task_id).toBe('TASK-003');
    expect(task3.state).toBe('in_progress');
    expect(task3.has_discrepancy).toBe(true);
    expect(task3.missing_files).toEqual(['dist/helper.d.ts']);
    expect(task3.unexpected_files).toEqual([]);

    // Verify summary calculations
    expect(report.summary.total_tasks).toBe(3);
    expect(report.summary.completed_tasks).toBe(2);
    expect(report.summary.in_progress_tasks).toBe(1);
    expect(report.summary.pending_tasks).toBe(0);
    expect(report.summary.tasks_with_discrepancies).toBe(3);
    expect(report.summary.overall_completion_percentage).toBe(67); // 2/3 = 66.67 rounded
    expect(report.summary.root_task_completed).toBe(false);

    // Verify discrepancy analysis
    expect(report.discrepancy_analysis.critical_missing_files).toContain('tests/helper.test.ts');
    expect(report.discrepancy_analysis.critical_missing_files).toContain('dist/helper.d.ts');
    expect(report.discrepancy_analysis.all_unexpected_files).toContain('src/utils/index.ts');
    expect(report.discrepancy_analysis.all_unexpected_files).toContain('tests/unit/helper.test.ts');

    // Verify human-readable summary is included
    expect(text).toContain('=== PLAN VS PROGRESS COMPARISON SUMMARY ===');
    expect(text).toContain('📊 Task Completion Status:');
    expect(text).toContain('🔍 Discrepancy Analysis:');
    expect(text).toContain('🎯 Root Task Achievement:');
  });

  it('should handle missing git hash directory gracefully', async () => {
    const result = await handlePlanCreatorTool('compare_plan_progress', {
      git_commit_hash: 'non-existent-hash'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('No plan/progress directory found');
  });

  it('should handle missing git_commit_hash parameter', async () => {
    const result = await handlePlanCreatorTool('compare_plan_progress', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('git_commit_hash is required');
  });

  it('should correctly identify when all tasks are completed', async () => {
    // Create a scenario where all tasks are completed
    const completedTestHash = 'test-completed-hash-67890';
    const completedTestDir = path.join(process.cwd(), 'plan_and_progress', completedTestHash);

    const completedPlan = {
      task_description: 'Test all completed',
      synopsis: 'All tasks completed test',
      created_at: new Date().toISOString(),
      git_commit_hash: completedTestHash,
      tasks: [
        {
          id: 'TASK-001',
          designated_agent: 'backend-agent',
          description: 'Task 1',
          files_to_modify: ['file1.ts'],
          dependencies: []
        }
      ]
    };

    const completedProgress = {
      plan_file: '',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      git_commit_hash: completedTestHash,
      tasks: [
        {
          id: 'TASK-001',
          designated_agent: 'backend-agent',
          description: 'Task 1',
          files_to_modify: ['file1.ts'],
          dependencies: [],
          state: 'completed' as const,
          agent_session_id: 'session-001',
          files_modified: ['file1.ts'],
          summary: 'Completed',
          completed_at: new Date().toISOString()
        }
      ]
    };

    try {
      // Set up test data
      await mkdir(completedTestDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await writeFile(
        path.join(completedTestDir, `plan-${timestamp}.json`),
        JSON.stringify(completedPlan, null, 2)
      );
      await writeFile(
        path.join(completedTestDir, `progress-${timestamp}.json`),
        JSON.stringify(completedProgress, null, 2)
      );

      // Run comparison
      const result = await handlePlanCreatorTool('compare_plan_progress', {
        git_commit_hash: completedTestHash
      });

      const text = result.content[0].text;
      const jsonEnd = text.lastIndexOf('}') + 1;
      const jsonPart = text.substring(0, jsonEnd);
      const report = JSON.parse(jsonPart);

      // Verify all completed
      expect(report.summary.completed_tasks).toBe(1);
      expect(report.summary.overall_completion_percentage).toBe(100);
      expect(report.summary.root_task_completed).toBe(true);
      expect(report.summary.tasks_with_discrepancies).toBe(0);

    } finally {
      // Clean up
      await rm(completedTestDir, { recursive: true, force: true });
    }
  });
});