import { jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import { handleServerRunnerTool } from '../src/handlers/server-runner.js';
import { validateProjectDirectory } from '../src/shared/utils.js';
import { DevServerResult } from '../src/shared/types.js';
import { EventEmitter } from 'events';

jest.mock('child_process');
jest.mock('fs');
jest.mock('../src/shared/utils.js');

const mockSpawn = jest.mocked(spawn);
const mockExistsSync = jest.mocked(existsSync);
const mockValidateProjectDirectory = jest.mocked(validateProjectDirectory);

// Mock ChildProcess that extends EventEmitter
class MockChildProcess extends EventEmitter {
  pid?: number;
  killed: boolean = false;
  exitCode: number | null = null;
  signalCode: string | null = null;
  stdin: any = { write: jest.fn(), end: jest.fn() };
  stdout: any = { on: jest.fn(), pipe: jest.fn() };
  stderr: any = { on: jest.fn(), pipe: jest.fn() };
  
  constructor(pid?: number) {
    super();
    this.pid = pid;
  }

  kill(signal?: string): boolean {
    this.killed = true;
    this.signalCode = signal || 'SIGTERM';
    return true;
  }
}

describe('Server Runner Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue('/mock/project');
    
    // Reset default mocks - these can be overridden per test
    mockExistsSync.mockReturnValue(true);
    mockValidateProjectDirectory.mockReturnValue({ valid: true });
    
    // Mock setTimeout to avoid waiting in tests
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as NodeJS.Timeout;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('run_dev_backend', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend';

    test('should start backend dev server successfully', async () => {
      const mockChild = new MockChildProcess(1234) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Backend dev server started (PID: 1234)');
      expect(result.content[0].text).toContain('tsx watch src/server.ts');
      expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'dev'], {
        cwd: expect.stringContaining('backend'),
        stdio: 'pipe',
        detached: false,
        shell: true
      });
      expect(mockValidateProjectDirectory).toHaveBeenCalledWith(
        expect.stringContaining('backend'),
        ['dev']
      );
    });

    test('should fail when backend directory validation fails', async () => {
      mockValidateProjectDirectory.mockReturnValue({
        valid: false,
        error: "Directory '/mock/project/backend' does not contain package.json"
      });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Backend validation failed');
      expect(result.content[0].text).toContain('does not contain package.json');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should fail when backend directory validation requires dev script', async () => {
      mockValidateProjectDirectory.mockReturnValue({
        valid: false,
        error: "Directory '/mock/project/backend' package.json is missing required scripts: dev"
      });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('missing required scripts: dev');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should handle spawn process without PID', async () => {
      const mockChild = new MockChildProcess() as any as ChildProcess; // No PID
      mockSpawn.mockReturnValue(mockChild);

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start backend dev server');
    });

    test('should handle spawn throwing error', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Command not found: npm');
      });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start backend dev server');
    });

    test('should handle spawn returning null process', async () => {
      mockSpawn.mockReturnValue(null as any);

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start backend dev server');
    });

    test('should validate backend with correct parameters', async () => {
      const mockChild = new MockChildProcess(5678) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      await handleServerRunnerTool(toolName, {});

      expect(mockValidateProjectDirectory).toHaveBeenCalledWith(
        path.join('/mock/project', 'backend'),
        ['dev']
      );
    });
  });

  describe('run_dev_frontend', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend';

    test('should start frontend dev server successfully', async () => {
      const mockChild = new MockChildProcess(5678) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Frontend dev server started (PID: 5678)');
      expect(result.content[0].text).toContain('Running: vite');
      expect(result.content[0].text).toContain('http://localhost:5173');
      expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'dev'], {
        cwd: expect.stringContaining('frontend'),
        stdio: 'pipe',
        detached: false,
        shell: true
      });
    });

    test('should fail when frontend directory validation fails', async () => {
      mockValidateProjectDirectory.mockReturnValue({
        valid: false,
        error: "Directory '/mock/project/frontend' does not exist"
      });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Frontend validation failed');
      expect(result.content[0].text).toContain('does not exist');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should handle spawn process without PID', async () => {
      const mockChild = new MockChildProcess() as any as ChildProcess; // No PID
      mockSpawn.mockReturnValue(mockChild);

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start frontend dev server');
    });

    test('should handle spawn throwing error', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start frontend dev server');
    });

    test('should validate frontend with correct parameters', async () => {
      const mockChild = new MockChildProcess(9999) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      await handleServerRunnerTool(toolName, {});

      expect(mockValidateProjectDirectory).toHaveBeenCalledWith(
        path.join('/mock/project', 'frontend'),
        ['dev']
      );
    });
  });

  describe('run_dev_all', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_all';

    test('should start both backend and frontend dev servers successfully', async () => {
      const mockBackendChild = new MockChildProcess(1111) as any as ChildProcess;
      const mockFrontendChild = new MockChildProcess(2222) as any as ChildProcess;
      
      mockSpawn
        .mockReturnValueOnce(mockBackendChild)  // First call for backend
        .mockReturnValueOnce(mockFrontendChild); // Second call for frontend
        
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Both dev servers started!');
      expect(result.content[0].text).toContain('Backend (PID: 1111)');
      expect(result.content[0].text).toContain('Frontend (PID: 2222)');
      expect(result.content[0].text).toContain('tsx watch src/server.ts');
      expect(result.content[0].text).toContain('vite');
      expect(result.content[0].text).toContain('http://localhost:5173');
      
      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockValidateProjectDirectory).toHaveBeenCalledTimes(2);
    });

    test('should fail when both validations fail', async () => {
      mockValidateProjectDirectory
        .mockReturnValueOnce({ valid: false, error: 'Backend missing package.json' })
        .mockReturnValueOnce({ valid: false, error: 'Frontend missing dev script' });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Validation failed:');
      expect(result.content[0].text).toContain('Backend: Backend missing package.json');
      expect(result.content[0].text).toContain('Frontend: Frontend missing dev script');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should fail when only backend validation fails', async () => {
      mockValidateProjectDirectory
        .mockReturnValueOnce({ valid: false, error: 'Backend invalid' })
        .mockReturnValueOnce({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation failed');
      expect(result.content[0].text).toContain('Backend: Backend invalid');
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should handle partial success - backend starts, frontend fails', async () => {
      const mockBackendChild = new MockChildProcess(3333) as any as ChildProcess;
      
      mockSpawn
        .mockReturnValueOnce(mockBackendChild) // Backend succeeds
        .mockReturnValueOnce(null as any);      // Frontend fails
        
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true); // Partial failure is still an error
      expect(result.content[0].text).toContain('WARNING: Partially started - only 1/2 servers running');
      expect(result.content[0].text).toContain('Failed to start frontend server');
    });

    test('should handle partial success - frontend starts, backend fails', async () => {
      const mockFrontendChild = new MockChildProcess(4444) as any as ChildProcess;
      
      mockSpawn
        .mockReturnValueOnce(null as any)      // Backend fails
        .mockReturnValueOnce(mockFrontendChild); // Frontend succeeds
        
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true); // Partial failure is still an error
      expect(result.content[0].text).toContain('WARNING: Partially started - only 1/2 servers running');
      expect(result.content[0].text).toContain('Failed to start backend server');
    });

    test('should handle both servers failing to start', async () => {
      mockSpawn
        .mockReturnValueOnce(null as any) // Backend fails
        .mockReturnValueOnce(null as any); // Frontend fails
        
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start dev servers');
      expect(result.content[0].text).toContain('Failed to start backend server');
      expect(result.content[0].text).toContain('Failed to start frontend server');
    });

    test('should handle spawn throwing error during all server start', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('System resources exhausted');
      });

      const result = await handleServerRunnerTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start dev servers');
    });

    test('should validate both directories with correct parameters', async () => {
      const mockBackendChild = new MockChildProcess(5555) as any as ChildProcess;
      const mockFrontendChild = new MockChildProcess(6666) as any as ChildProcess;
      
      mockSpawn
        .mockReturnValueOnce(mockBackendChild)
        .mockReturnValueOnce(mockFrontendChild);

      await handleServerRunnerTool(toolName, {});

      expect(mockValidateProjectDirectory).toHaveBeenNthCalledWith(1,
        path.join('/mock/project', 'backend'),
        ['dev']
      );
      expect(mockValidateProjectDirectory).toHaveBeenNthCalledWith(2,
        path.join('/mock/project', 'frontend'),
        ['dev']
      );
    });
  });

  describe('error handling', () => {
    test('should handle unknown tool name', async () => {
      const result = await handleServerRunnerTool('unknown-tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown server runner tool: unknown-tool');
    });

    test('should handle unexpected errors in main handler', async () => {
      // Force an error by making validateProjectDirectory throw
      mockValidateProjectDirectory.mockImplementation(() => {
        throw new Error('System validation error');
      });

      const result = await handleServerRunnerTool(
        'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend',
        {}
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Error starting backend dev server');
    });
  });

  describe('process management', () => {
    test('should track running processes correctly', async () => {
      const mockChild1 = new MockChildProcess(1001) as any as ChildProcess;
      const mockChild2 = new MockChildProcess(1002) as any as ChildProcess;
      
      // Start backend first
      mockSpawn.mockReturnValueOnce(mockChild1);
      await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend', {});
      
      // Start frontend
      mockSpawn.mockReturnValueOnce(mockChild2);
      await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend', {});
      
      // Both should have been called with correct parameters
      expect(mockSpawn).toHaveBeenNthCalledWith(1, 'npm', ['run', 'dev'], expect.objectContaining({
        cwd: expect.stringContaining('backend')
      }));
      expect(mockSpawn).toHaveBeenNthCalledWith(2, 'npm', ['run', 'dev'], expect.objectContaining({
        cwd: expect.stringContaining('frontend')
      }));
    });

    test('should handle process IDs correctly in responses', async () => {
      const testPid = 12345;
      const mockChild = new MockChildProcess(testPid) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      const result = await handleServerRunnerTool(
        'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend',
        {}
      );

      expect(result.content[0].text).toContain(`PID: ${testPid}`);
    });
  });

  describe('directory validation integration', () => {
    test('should pass dev script requirement to validation', async () => {
      const mockChild = new MockChildProcess(7777) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend', {});

      expect(mockValidateProjectDirectory).toHaveBeenCalledWith(
        expect.any(String),
        ['dev'] // Should specifically check for dev script
      );
    });

    test('should respect validation results and not spawn if invalid', async () => {
      mockValidateProjectDirectory.mockReturnValue({
        valid: false,
        error: 'Missing required scripts'
      });

      await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend', {});

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should proceed with spawn if validation passes', async () => {
      mockValidateProjectDirectory.mockReturnValue({ valid: true });
      const mockChild = new MockChildProcess(8888) as any as ChildProcess;
      mockSpawn.mockReturnValue(mockChild);

      await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend', {});

      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('realistic failure scenarios', () => {
    test('should fail appropriately when npm is not installed', async () => {
      mockSpawn.mockImplementation(() => {
        const error = new Error('spawn npm ENOENT') as any;
        error.code = 'ENOENT';
        throw error;
      });

      const result = await handleServerRunnerTool(
        'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend',
        {}
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('ERROR: Failed to start backend dev server');
    });

    test('should fail when project has no dev script', async () => {
      mockValidateProjectDirectory.mockReturnValue({
        valid: false,
        error: "Directory '/mock/project/backend' package.json is missing required scripts: dev"
      });

      const result = await handleServerRunnerTool(
        'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend',
        {}
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('missing required scripts: dev');
      // This should fail validation before trying to spawn
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should fail when directory does not exist', async () => {
      mockValidateProjectDirectory.mockReturnValue({
        valid: false,
        error: "Directory '/mock/project/frontend' does not exist"
      });

      const result = await handleServerRunnerTool(
        'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend',
        {}
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('does not exist');
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });
});