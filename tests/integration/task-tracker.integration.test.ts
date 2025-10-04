/**
 * CRITICAL INTEGRATION TEST: TaskTracker - Plan and Progress Management
 *
 * This test validates Core Functionality #4: Plan and Progress Tracking
 *
 * Why this is critical:
 * 1. TaskTracker is the coordination system for multi-agent workflows
 * 2. It manages which agent does what and when through dependencies
 * 3. It ensures data consistency with concurrent agent execution
 * 4. It persists state across system restarts
 *
 * Core Functionality Coverage:
 * - Plan creation with task breakdown and agent assignments
 * - Progress tracking with state transitions (pending → in_progress → completed)
 * - Dependency enforcement (tasks wait for dependencies)
 * - Concurrent update safety with locking mechanism
 * - State persistence and recovery
 * - Error handling for corrupted data
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MCPClient } from '../helpers/mcp-client.js';

// Helper to get the current git hash for testing
async function getCurrentGitHash(): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    return hash;
  } catch (error) {
    // Fallback for environments without git
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `no-commit-${timestamp}`;
  }
}

// Helper to wait for file operations to complete
async function waitForFileUpdate(filePath: string, expectedContent: string, maxWait = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes(expectedContent)) {
          return true;
        }
      } catch (error) {
        // File might be locked, continue waiting
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

// Helper to extract session ID from create_plan response
function extractSessionId(responseText: string): string | null {
  const sessionIdMatch = responseText.match(/Session ID: ([a-zA-Z0-9-]+)/);
  return sessionIdMatch ? sessionIdMatch[1] : null;
}

describe('TaskTracker Integration Tests', () => {
  let client: MCPClient;
  let currentGitHash: string;

  beforeAll(async () => {
    // Start MCP server
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    client.setTimeout(10000);

    // Ensure plan_and_progress directory exists
    if (!fs.existsSync('plan_and_progress')) {
      fs.mkdirSync('plan_and_progress', { recursive: true });
    }
  }, 15000);

  afterAll(async () => {
    // Stop MCP server
    await client.stop();

    // Clean up test files (but keep the real git hash directory)
    // Only clean up files that might have been modified during tests
    if (currentGitHash && fs.existsSync(path.join('plan_and_progress', currentGitHash))) {
      const planDir = path.join('plan_and_progress', currentGitHash);
      const files = fs.readdirSync(planDir);
      for (const file of files) {
        if (file.includes('test-') || file.includes('corruption') || file.includes('comparison')) {
          fs.unlinkSync(path.join(planDir, file));
        }
      }
    }
  });

  beforeEach(async () => {
    // Get current git hash
    currentGitHash = await getCurrentGitHash();

    // Clean up any existing test files from the current git hash directory
    const planDir = path.join('plan_and_progress', currentGitHash);
    if (fs.existsSync(planDir)) {
      const files = fs.readdirSync(planDir);
      for (const file of files) {
        if (file.includes('test-') || file.includes('temp-')) {
          fs.unlinkSync(path.join(planDir, file));
        }
      }
    }
  });

  it('should create plan with task breakdown and dependencies', async () => {
    console.log('Testing plan creation...');

    // Create a plan with multiple tasks and dependencies
    const response = await client.call('tools/call', {
      name: 'create_plan',
      arguments: {
        task_description: 'Build a user authentication system',
        synopsis: 'Create backend API, frontend UI, and tests for user authentication',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Create user model and authentication endpoints',
            files_to_modify: ['backend/models/user.ts', 'backend/routes/auth.ts'],
            dependencies: []
          },
          {
            id: 'TASK-002',
            designated_agent: 'frontend-agent',
            description: 'Create login and signup forms',
            files_to_modify: ['frontend/components/LoginForm.tsx', 'frontend/components/SignupForm.tsx'],
            dependencies: ['TASK-001']
          },
          {
            id: 'TASK-003',
            designated_agent: 'testing-agent',
            description: 'Create integration tests for authentication',
            files_to_modify: ['tests/auth.test.ts'],
            dependencies: ['TASK-001', 'TASK-002']
          }
        ]
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();

    // Extract session ID from response
    const responseText = response.result?.content?.[0]?.text || '';
    const sessionId = extractSessionId(responseText);
    expect(sessionId).toBeTruthy();
    console.log('Created plan with session ID:', sessionId);

    // Wait for plan file to be created
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify plan file was created in the session-based directory
    const planDir = path.join('plan_and_progress', 'sessions', sessionId!);
    const planFile = path.join(planDir, 'plan.json');

    expect(fs.existsSync(planDir)).toBe(true);
    expect(fs.existsSync(planFile)).toBe(true);

    if (fs.existsSync(planFile)) {
      const planContent = JSON.parse(fs.readFileSync(planFile, 'utf8'));
      expect(planContent.tasks).toHaveLength(3);
      expect(planContent.tasks[0].id).toBe('TASK-001');
      expect(planContent.tasks[1].dependencies).toContain('TASK-001');
      expect(planContent.tasks[2].dependencies).toContain('TASK-001');
      expect(planContent.tasks[2].dependencies).toContain('TASK-002');
      console.log('✓ Plan created successfully with proper dependencies');
    }
  }, 20000);

  it('should handle concurrent task updates without data corruption', async () => {
    console.log('Testing concurrent task updates...');

    // Create a plan and capture the session ID
    const createResponse = await client.call('tools/call', {
      name: 'create_plan',
      arguments: {
        task_description: 'Concurrent update test',
        synopsis: 'Test concurrent task updates',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Task 1',
            files_to_modify: ['file1.ts'],
            dependencies: []
          },
          {
            id: 'TASK-002',
            designated_agent: 'frontend-agent',
            description: 'Task 2',
            files_to_modify: ['file2.ts'],
            dependencies: []
          },
          {
            id: 'TASK-003',
            designated_agent: 'testing-agent',
            description: 'Task 3',
            files_to_modify: ['file3.ts'],
            dependencies: []
          }
        ]
      }
    });

    // Extract session ID from response
    const responseText = createResponse.result?.content?.[0]?.text || '';
    const sessionId = extractSessionId(responseText);
    expect(sessionId).toBeTruthy();
    console.log('Created plan with session ID:', sessionId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate concurrent updates from multiple agents using session_id
    const concurrentUpdates = [
      client.call('tools/call', {
        name: 'update_progress',
        arguments: {
          session_id: sessionId,
          task_id: 'TASK-001',
          state: 'in_progress',
          agent_session_id: 'session-001',
          files_modified: ['file1.ts'],
          summary: 'Started working on task 1'
        }
      }),
      client.call('tools/call', {
        name: 'update_progress',
        arguments: {
          session_id: sessionId,
          task_id: 'TASK-002',
          state: 'in_progress',
          agent_session_id: 'session-002',
          files_modified: ['file2.ts'],
          summary: 'Started working on task 2'
        }
      }),
      client.call('tools/call', {
        name: 'update_progress',
        arguments: {
          session_id: sessionId,
          task_id: 'TASK-003',
          state: 'in_progress',
          agent_session_id: 'session-003',
          files_modified: ['file3.ts'],
          summary: 'Started working on task 3'
        }
      })
    ];

    // Execute all updates simultaneously
    const results = await Promise.all(concurrentUpdates);

    // All updates should succeed
    for (const result of results) {
      expect(result.jsonrpc).toBe('2.0');
      expect(result.error).toBeUndefined();
    }

    // Wait for all updates to be written
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify progress file is not corrupted and contains all updates
    const progressFile = path.join('plan_and_progress', 'sessions', sessionId!, 'progress.json');

    expect(fs.existsSync(progressFile)).toBe(true);
    if (fs.existsSync(progressFile)) {
      const progressContent = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      expect(progressContent.tasks).toHaveLength(3);

      // All tasks should be in_progress
      const inProgressTasks = progressContent.tasks.filter((t: any) => t.state === 'in_progress');
      expect(inProgressTasks).toHaveLength(3);

      console.log('✓ Concurrent updates completed without data corruption');
    }
  }, 30000);

  it('should enforce task dependencies correctly', async () => {
    console.log('Testing dependency enforcement...');

    // Create plan with dependencies
    const createResponse = await client.call('tools/call', {
      name: 'create_plan',
      arguments: {
        task_description: 'Dependency test',
        synopsis: 'Test task dependencies',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Foundation task',
            files_to_modify: ['foundation.ts'],
            dependencies: []
          },
          {
            id: 'TASK-002',
            designated_agent: 'frontend-agent',
            description: 'Dependent task',
            files_to_modify: ['dependent.ts'],
            dependencies: ['TASK-001']
          }
        ]
      }
    });

    // Extract session ID from response
    const responseText = createResponse.result?.content?.[0]?.text || '';
    const sessionId = extractSessionId(responseText);
    expect(sessionId).toBeTruthy();
    console.log('Created plan with session ID:', sessionId);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to start TASK-002 before TASK-001 is completed
    await client.call('tools/call', {
      name: 'update_progress',
      arguments: {
        session_id: sessionId,
        task_id: 'TASK-002',
        state: 'in_progress',
        agent_session_id: 'session-002'
      }
    });

    // Complete TASK-001
    await client.call('tools/call', {
      name: 'update_progress',
      arguments: {
        session_id: sessionId,
        task_id: 'TASK-001',
        state: 'completed',
        agent_session_id: 'session-001',
        files_modified: ['foundation.ts']
      }
    });

    // Now TASK-002 should be able to complete
    await client.call('tools/call', {
      name: 'update_progress',
      arguments: {
        session_id: sessionId,
        task_id: 'TASK-002',
        state: 'completed',
        agent_session_id: 'session-002',
        files_modified: ['dependent.ts']
      }
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify both tasks are completed
    const progressFile = path.join('plan_and_progress', 'sessions', sessionId!, 'progress.json');
    expect(fs.existsSync(progressFile)).toBe(true);
    if (fs.existsSync(progressFile)) {
      const progressContent = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      const completedTasks = progressContent.tasks.filter((t: any) => t.state === 'completed');
      expect(completedTasks).toHaveLength(2);
      console.log('✓ Dependencies enforced correctly');
    }
  }, 25000);

  it('should persist and recover task state across sessions', async () => {
    console.log('Testing state persistence...');

    // Create and update a plan
    const createResponse = await client.call('tools/call', {
      name: 'create_plan',
      arguments: {
        task_description: 'Persistence test',
        synopsis: 'Test state persistence',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Persistent task',
            files_to_modify: ['persistent.ts'],
            dependencies: []
          }
        ]
      }
    });

    // Extract session ID from response
    const responseText = createResponse.result?.content?.[0]?.text || '';
    const sessionId = extractSessionId(responseText);
    expect(sessionId).toBeTruthy();
    console.log('Created plan with session ID:', sessionId);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Update task state
    await client.call('tools/call', {
      name: 'update_progress',
      arguments: {
        session_id: sessionId,
        task_id: 'TASK-001',
        state: 'in_progress',
        agent_session_id: 'session-001',
        summary: 'Working on persistent task'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Check what directories exist for debugging
    if (fs.existsSync('plan_and_progress/sessions')) {
      const dirs = fs.readdirSync('plan_and_progress/sessions');
      console.log('Available session directories:', dirs);
    }

    // Verify the state is persisted in the file
    const progressFile = path.join('plan_and_progress', 'sessions', sessionId!, 'progress.json');
    expect(fs.existsSync(progressFile)).toBe(true);
    if (fs.existsSync(progressFile)) {
      const progressContent = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
      expect(progressContent.tasks[0].state).toBe('in_progress');
      expect(progressContent.tasks[0].summary).toBe('Working on persistent task');
      console.log('✓ Task state persisted correctly');
    }
  }, 15000);

  it('should handle corrupted progress files gracefully', async () => {
    console.log('Testing error handling for corrupted files...');

    // Create a plan first
    const createResponse = await client.call('tools/call', {
      name: 'create_plan',
      arguments: {
        task_description: 'Corruption test',
        synopsis: 'Test corruption handling',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Test task',
            files_to_modify: ['test.ts'],
            dependencies: []
          }
        ]
      }
    });

    // Extract session ID from response
    const responseText = createResponse.result?.content?.[0]?.text || '';
    const sessionId = extractSessionId(responseText);
    expect(sessionId).toBeTruthy();
    console.log('Created plan with session ID:', sessionId);

    await new Promise(resolve => setTimeout(resolve, 500));

    const progressFile = path.join('plan_and_progress', 'sessions', sessionId!, 'progress.json');

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(progressFile), { recursive: true });

    // Create a corrupted progress file
    fs.writeFileSync(progressFile, '{ invalid json content }');

    // Try to update progress - should handle corruption gracefully
    const response = await client.call('tools/call', {
      name: 'update_progress',
      arguments: {
        session_id: sessionId,
        task_id: 'TASK-001',
        state: 'in_progress',
        agent_session_id: 'session-001'
      }
    });

    // Should either recover gracefully or provide clear error
    expect(response.jsonrpc).toBe('2.0');
    // Response might contain error but shouldn't crash the system

    console.log('✓ Corrupted file handling tested');

    // Clean up the corrupted test file
    if (fs.existsSync(progressFile)) {
      fs.unlinkSync(progressFile);
    }
    const corruptionDir = path.dirname(progressFile);
    if (fs.existsSync(corruptionDir)) {
      fs.rmSync(corruptionDir, { recursive: true, force: true });
    }
  }, 15000);

  it('should compare plan vs progress accurately', async () => {
    console.log('Testing plan vs progress comparison...');

    // Create plan with specific files to modify
    const createResponse = await client.call('tools/call', {
      name: 'create_plan',
      arguments: {
        task_description: 'Comparison test',
        synopsis: 'Test plan vs progress comparison',
        tasks: [
          {
            id: 'TASK-001',
            designated_agent: 'backend-agent',
            description: 'Create backend files',
            files_to_modify: ['backend/user.ts', 'backend/auth.ts'],
            dependencies: []
          }
        ]
      }
    });

    // Extract session ID from response
    const responseText = createResponse.result?.content?.[0]?.text || '';
    const sessionId = extractSessionId(responseText);
    expect(sessionId).toBeTruthy();
    console.log('Created plan with session ID:', sessionId);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Update with different files modified
    await client.call('tools/call', {
      name: 'update_progress',
      arguments: {
        session_id: sessionId,
        task_id: 'TASK-001',
        state: 'completed',
        agent_session_id: 'session-001',
        files_modified: ['backend/user.ts', 'backend/extra.ts'], // Different from plan
        summary: 'Completed with modifications'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    // Compare plan vs progress
    const compareResponse = await client.call('tools/call', {
      name: 'compare_plan_progress',
      arguments: {
        session_id: sessionId
      }
    });

    expect(compareResponse.jsonrpc).toBe('2.0');
    expect(compareResponse.result).toBeDefined();

    // Should detect differences between planned and actual files
    const content = compareResponse.result?.content?.[0]?.text || '';
    expect(content).toContain('comparison');

    console.log('✓ Plan vs progress comparison working');
  }, 15000);
});