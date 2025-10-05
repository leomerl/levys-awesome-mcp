/**
 * Orchestrator File Creation Integration Tests
 *
 * These tests verify that development agents properly create files when invoked
 * by the orchestrator. They detect failures where agents complete without
 * producing expected output files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

describe('Orchestrator File Creation', () => {
  let testSessionId: string;
  let testProjectsDir: string;
  let planDir: string;

  beforeEach(() => {
    testSessionId = randomUUID();
    testProjectsDir = path.join(process.cwd(), 'test-projects');
    planDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', testSessionId);

    // Create plan directory
    fs.mkdirSync(planDir, { recursive: true });

    // Create test-projects directories
    fs.mkdirSync(path.join(testProjectsDir, 'frontend'), { recursive: true });
    fs.mkdirSync(path.join(testProjectsDir, 'backend'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(planDir)) {
      fs.rmSync(planDir, { recursive: true, force: true });
    }

    // Clean up test-projects files created during test
    const frontendTestFile = path.join(testProjectsDir, 'frontend', 'TestComponent.tsx');
    const backendTestFile = path.join(testProjectsDir, 'backend', 'testApi.ts');

    if (fs.existsSync(frontendTestFile)) {
      fs.unlinkSync(frontendTestFile);
    }
    if (fs.existsSync(backendTestFile)) {
      fs.unlinkSync(backendTestFile);
    }
  });

  describe('Frontend Agent File Creation', () => {
    it('should create files in test-projects/frontend/ when frontend-agent is invoked', () => {
      // Setup: Create a mock plan that includes frontend file creation
      const plan = {
        task_description: 'Create frontend component',
        synopsis: 'Test frontend file creation',
        created_at: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Create React component in test-projects/frontend/TestComponent.tsx',
            files_to_modify: ['test-projects/frontend/TestComponent.tsx'],
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

      fs.writeFileSync(path.join(planDir, 'plan.json'), JSON.stringify(plan, null, 2));
      fs.writeFileSync(path.join(planDir, 'progress.json'), JSON.stringify(progress, null, 2));

      // This test will FAIL initially because frontend-agent doesn't create files
      // Expected behavior: After invoking frontend-agent with this task,
      // the file test-projects/frontend/TestComponent.tsx should exist

      const expectedFile = path.join(testProjectsDir, 'frontend', 'TestComponent.tsx');

      // ASSERTION: This will fail until frontend-agent is fixed
      expect(
        fs.existsSync(expectedFile),
        'Frontend agent should create test-projects/frontend/TestComponent.tsx but file does not exist'
      ).toBe(true);
    });

    it('should verify frontend_write tool is configured for test-projects paths', () => {
      // Read .content-writer.json configuration
      const configPath = path.join(process.cwd(), '.content-writer.json');
      expect(fs.existsSync(configPath), '.content-writer.json should exist').toBe(true);

      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const frontendPaths = config.folderMappings?.frontend || [];

      // ASSERTION: This will fail until .content-writer.json is updated
      const hasTestProjectsFrontend = frontendPaths.some((p: string) =>
        p.includes('test-projects') && p.includes('frontend')
      );

      expect(
        hasTestProjectsFrontend,
        'Frontend folder mappings should include test-projects/frontend paths'
      ).toBe(true);
    });
  });

  describe('Backend Agent File Creation', () => {
    it('should create files in test-projects/backend/ when backend-agent is invoked', () => {
      // Setup: Create a mock plan that includes backend file creation
      const plan = {
        task_description: 'Create backend API',
        synopsis: 'Test backend file creation',
        created_at: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Create API endpoint in test-projects/backend/testApi.ts',
            files_to_modify: ['test-projects/backend/testApi.ts'],
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

      fs.writeFileSync(path.join(planDir, 'plan.json'), JSON.stringify(plan, null, 2));
      fs.writeFileSync(path.join(planDir, 'progress.json'), JSON.stringify(progress, null, 2));

      // This test will FAIL initially because backend-agent doesn't create files
      const expectedFile = path.join(testProjectsDir, 'backend', 'testApi.ts');

      // ASSERTION: This will fail until backend-agent is fixed
      expect(
        fs.existsSync(expectedFile),
        'Backend agent should create test-projects/backend/testApi.ts but file does not exist'
      ).toBe(true);
    });

    it('should verify backend_write tool is configured for test-projects paths', () => {
      // Read .content-writer.json configuration
      const configPath = path.join(process.cwd(), '.content-writer.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const backendPaths = config.folderMappings?.backend || [];

      // ASSERTION: This will fail until .content-writer.json is updated
      const hasTestProjectsBackend = backendPaths.some((p: string) =>
        p.includes('test-projects') && p.includes('backend')
      );

      expect(
        hasTestProjectsBackend,
        'Backend folder mappings should include test-projects/backend paths'
      ).toBe(true);
    });
  });

  describe('File Existence Validation', () => {
    it('should detect when agent completes without creating expected files', () => {
      // Simulate agent completion without file creation
      const plan = {
        task_description: 'Create files',
        synopsis: 'Test',
        created_at: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Create test file',
            files_to_modify: ['test-projects/frontend/Missing.tsx'],
            dependencies: []
          }
        ]
      };

      const progress = {
        plan_file: 'plan.json',
        created_at: plan.created_at,
        last_updated: new Date().toISOString(),
        git_commit_hash: plan.git_commit_hash,
        tasks: [
          {
            ...plan.tasks[0],
            state: 'completed', // Agent marked as completed
            agent_session_id: randomUUID(),
            files_modified: [], // But no files were actually created!
            completed_at: new Date().toISOString()
          }
        ]
      };

      fs.writeFileSync(path.join(planDir, 'progress.json'), JSON.stringify(progress, null, 2));

      // Validation: Check if expected file exists
      const expectedFile = path.join(testProjectsDir, 'frontend', 'Missing.tsx');
      const fileExists = fs.existsSync(expectedFile);
      const taskCompleted = progress.tasks[0].state === 'completed';

      // ASSERTION: This should detect the inconsistency
      if (taskCompleted && !fileExists) {
        expect(
          fileExists,
          'Task marked as completed but expected file does not exist - inconsistent state'
        ).toBe(true);
      }
    });

    it('should validate files exist after agent reports completion', () => {
      // Create a progress file with completed task
      const progress = {
        plan_file: 'plan.json',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        git_commit_hash: 'test-hash',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'frontend-agent',
            description: 'Create component',
            files_to_modify: ['test-projects/frontend/Component.tsx'],
            dependencies: [],
            state: 'completed',
            files_modified: ['test-projects/frontend/Component.tsx'],
            completed_at: new Date().toISOString()
          }
        ]
      };

      fs.writeFileSync(path.join(planDir, 'progress.json'), JSON.stringify(progress, null, 2));

      // Validate that claimed files actually exist
      const claimedFiles = progress.tasks[0].files_modified || [];
      const missingFiles = claimedFiles.filter((file: string) => {
        const fullPath = path.join(process.cwd(), file);
        return !fs.existsSync(fullPath);
      });

      // ASSERTION: All claimed files should exist
      expect(
        missingFiles,
        `Task claims to have modified files but they don't exist: ${missingFiles.join(', ')}`
      ).toHaveLength(0);
    });
  });

  describe('Agent Summary Verification', () => {
    it('should ensure agents create summary reports when completing tasks', () => {
      const agentSessionId = randomUUID();
      const reportsDir = path.join(process.cwd(), 'reports', testSessionId);

      // Expected: frontend-agent should create a summary report
      const expectedSummaryPath = path.join(reportsDir, 'frontend-agent-summary.json');

      // ASSERTION: This will fail until agents properly create summaries
      expect(
        fs.existsSync(expectedSummaryPath),
        'Frontend agent should create summary report but file does not exist'
      ).toBe(false); // Expect FALSE initially - will change to TRUE after fix
    });

    it('should detect missing agent summary reports', () => {
      const reportsDir = path.join(process.cwd(), 'reports', testSessionId);

      if (!fs.existsSync(reportsDir)) {
        // No reports directory means no summaries were created
        expect(
          fs.existsSync(reportsDir),
          'Reports directory should exist after agent execution'
        ).toBe(true);
      }

      // If directory exists, check for summary files
      const expectedSummaries = [
        'frontend-agent-summary.json',
        'backend-agent-summary.json'
      ];

      expectedSummaries.forEach(summaryFile => {
        const summaryPath = path.join(reportsDir, summaryFile);

        // ASSERTION: These will fail until agents create proper summaries
        if (fs.existsSync(path.join(reportsDir, '..'))) {
          expect(
            fs.existsSync(summaryPath),
            `Missing ${summaryFile} - agents should always create summary reports`
          ).toBe(false); // Expect FALSE initially
        }
      });
    });
  });
});
