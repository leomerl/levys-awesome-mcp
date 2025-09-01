import { jest } from '@jest/globals';
import { existsSync } from 'fs';
import { mkdir, writeFile, rm, mkdtemp } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { handleBuildExecutorTool } from '../src/handlers/build-executor.js';
import { executeCommand } from '../src/shared/utils.js';
import { CommandResult } from '../src/shared/types.js';

const fs = { mkdir, writeFile, rm, mkdtemp };

// Mock fs and command execution
jest.mock('fs');
jest.mock('../src/shared/utils.js');

const mockExistsSync = jest.mocked(existsSync);
const mockExecuteCommand = jest.mocked(executeCommand);

// Create real temp directories for testing
let tempDir: string;
let backendDir: string;
let frontendDir: string;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'build-test-'));
  backendDir = path.join(tempDir, 'backend');
  frontendDir = path.join(tempDir, 'frontend');
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('Build Executor Tool', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Clean up directories
    await fs.rm(backendDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(frontendDir, { recursive: true, force: true }).catch(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('build_project', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__build-executor__build_project';

    test('should build both backend and frontend successfully', async () => {
      // Create real directories with package.json
      await mkdir(backendDir, { recursive: true });
      await mkdir(frontendDir, { recursive: true });
      await writeFile(path.join(backendDir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'tsc --noEmit' } }));
      await writeFile(path.join(frontendDir, 'package.json'), JSON.stringify({ scripts: { build: 'vite build' } }));
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Build completed',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Project Build COMPLETED');
      expect(result.content[0].text).toContain('Backend Typecheck: SUCCESS');
      expect(result.content[0].text).toContain('Frontend Build: SUCCESS');
      expect(mockExecuteCommand).toHaveBeenCalledTimes(2);
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'typecheck'], backendDir);
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'build'], frontendDir);
    });

    test('should skip backend when directory does not exist', async () => {
      // Only create frontend directory
      await mkdir(frontendDir, { recursive: true });
      await writeFile(path.join(frontendDir, 'package.json'), JSON.stringify({ scripts: { build: 'vite build' } }));
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Build completed',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Project Build COMPLETED');
      expect(result.content[0].text).toContain('Backend: Directory not found - skipping');
      expect(result.content[0].text).toContain('Frontend Build: SUCCESS');
      expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    });

    test('should skip frontend when directory does not exist', async () => {
      mockExistsSync.mockImplementation((path: PathLike) => {
        return path.toString().includes('backend'); // Only backend exists
      });
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Build completed',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Project Build COMPLETED');
      expect(result.content[0].text).toContain('Backend Typecheck: SUCCESS');
      expect(result.content[0].text).toContain('Frontend: Directory not found - skipping');
      expect(mockExecuteCommand).toHaveBeenCalledTimes(1);
    });

    test('should skip both when neither directory exists', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Project Build COMPLETED');
      expect(result.content[0].text).toContain('Backend: Directory not found - skipping');
      expect(result.content[0].text).toContain('Frontend: Directory not found - skipping');
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    test('should handle backend failure with frontend success', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const backendFailure: CommandResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Type error found'
      };
      
      const frontendSuccess: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Build completed',
        stderr: ''
      };
      
      mockExecuteCommand
        .mockResolvedValueOnce(backendFailure)
        .mockResolvedValueOnce(frontendSuccess);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project Build FAILED');
      expect(result.content[0].text).toContain('Backend Typecheck: FAILED');
      expect(result.content[0].text).toContain('Backend Error: Type error found');
      expect(result.content[0].text).toContain('Frontend Build: SUCCESS');
    });

    test('should handle both backend and frontend failures', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const failureResult: CommandResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Build failed'
      };
      
      mockExecuteCommand.mockResolvedValue(failureResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project Build FAILED');
      expect(result.content[0].text).toContain('Backend Typecheck: FAILED');
      expect(result.content[0].text).toContain('Frontend Build: FAILED');
    });

    test('should handle command execution error', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const errorResult: CommandResult = {
        success: false,
        code: -1,
        stdout: '',
        stderr: '',
        error: 'Command not found'
      };
      
      mockExecuteCommand.mockResolvedValue(errorResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project Build FAILED');
      expect(result.content[0].text).toContain('Backend Error: Command not found');
      expect(result.content[0].text).toContain('Frontend Error: Command not found');
    });
  });

  describe('build_backend', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__build-executor__build_backend';

    test('should build backend successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Typecheck passed',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Backend Typecheck SUCCESS');
      expect(result.content[0].text).toContain('Typecheck passed');
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'typecheck'], path.join('/mock/project', 'backend'));
    });

    test('should return error when backend directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Backend directory not found');
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    test('should handle backend typecheck failure', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const failureResult: CommandResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Type errors found'
      };
      
      mockExecuteCommand.mockResolvedValue(failureResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Backend Typecheck FAILED');
      expect(result.content[0].text).toContain('Type errors found');
    });

    test('should handle command execution error', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const errorResult: CommandResult = {
        success: false,
        code: -1,
        stdout: '',
        stderr: '',
        error: 'npm command not found'
      };
      
      mockExecuteCommand.mockResolvedValue(errorResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Backend Typecheck FAILED');
      // The error shows in stdout/stderr format, not the error field
    });
  });

  describe('build_frontend', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__build-executor__build_frontend';

    test('should build frontend successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Build completed successfully',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Frontend Build SUCCESS');
      expect(result.content[0].text).toContain('Build completed successfully');
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'build'], path.join('/mock/project', 'frontend'));
    });

    test('should return error when frontend directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe('Frontend directory not found');
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    test('should handle frontend build failure', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const failureResult: CommandResult = {
        success: false,
        code: 1,
        stdout: '',
        stderr: 'Build failed with errors'
      };
      
      mockExecuteCommand.mockResolvedValue(failureResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Frontend Build FAILED');
      expect(result.content[0].text).toContain('Build failed with errors');
    });

    test('should handle command execution error', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const errorResult: CommandResult = {
        success: false,
        code: -1,
        stdout: '',
        stderr: '',
        error: 'Build script not found'
      };
      
      mockExecuteCommand.mockResolvedValue(errorResult);

      const result = await handleBuildExecutorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Frontend Build FAILED');
      // The error shows in stdout/stderr format, not the error field
    });
  });

  describe('error handling', () => {
    test('should handle unknown tool name', async () => {
      const result = await handleBuildExecutorTool('unknown-tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown build executor tool: unknown-tool');
    });

    test('should handle unexpected errors', async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_backend', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in build executor tool: File system error');
    });
  });

  describe('minimal integration tests', () => {
    test('should detect project directories', async () => {
      await fs.mkdir(backendDir, { recursive: true });
      await fs.writeFile(
        path.join(backendDir, 'package.json'), 
        JSON.stringify({ scripts: { typecheck: 'tsc --noEmit' } })
      );
      
      await fs.mkdir(frontendDir, { recursive: true });
      await fs.writeFile(
        path.join(frontendDir, 'package.json'), 
        JSON.stringify({ scripts: { build: 'vite build' } })
      );
      
      expect(existsSync(backendDir)).toBe(true);
      expect(existsSync(frontendDir)).toBe(true);
      expect(existsSync(path.join(backendDir, 'package.json'))).toBe(true);
      expect(existsSync(path.join(frontendDir, 'package.json'))).toBe(true);
    });

    test('should handle missing directories', () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      expect(existsSync(nonExistentDir)).toBe(false);
    });
  });

  describe('path handling', () => {
    test('should use correct paths for backend and frontend', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Success',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_project', {});

      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/mock/project', 'backend'));
      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/mock/project', 'frontend'));
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'typecheck'], path.join('/mock/project', 'backend'));
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'build'], path.join('/mock/project', 'frontend'));
    });

    test('should handle different working directory', async () => {
      jest.spyOn(process, 'cwd').mockReturnValue('/different/path');
      mockExistsSync.mockReturnValue(true);
      
      const successResult: CommandResult = {
        success: true,
        code: 0,
        stdout: 'Success',
        stderr: ''
      };
      
      mockExecuteCommand.mockResolvedValue(successResult);

      await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_backend', {});

      expect(mockExistsSync).toHaveBeenCalledWith(path.join('/different/path', 'backend'));
      expect(mockExecuteCommand).toHaveBeenCalledWith('npm', ['run', 'typecheck'], path.join('/different/path', 'backend'));
    });
  });
});