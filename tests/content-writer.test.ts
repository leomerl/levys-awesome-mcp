import { jest } from '@jest/globals';
import { writeFile, mkdir, readFile, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleContentWriterTool } from '../src/handlers/content-writer.js';
import { validatePath, validateProjectDirectory } from '../src/shared/utils.js';

const fs = { writeFile, mkdir, readFile, rm, mkdtemp };

// Mock fs and validation functions
jest.mock('fs');
jest.mock('fs/promises');
jest.mock('../src/shared/utils.js');

const mockWriteFile = jest.mocked(writeFile);
const mockMkdir = jest.mocked(mkdir);
const mockExistsSync = jest.mocked(existsSync);
const mockValidatePath = jest.mocked(validatePath);
const mockValidateProjectDirectory = jest.mocked(validateProjectDirectory);

// Create real temp directories for testing
let tempDir: string;
let frontendDir: string;
let backendDir: string;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-test-'));
  frontendDir = path.join(tempDir, 'frontend');
  backendDir = path.join(tempDir, 'backend');
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('Content Writer Tool', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    
    // Clean up directories
    await fs.rm(frontendDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(backendDir, { recursive: true, force: true }).catch(() => {});
    
    // Default mocks - can be overridden in specific tests
    mockValidatePath.mockReturnValue(true);
    mockValidateProjectDirectory.mockReturnValue({ valid: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('restricted_write', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__content-writer__restricted_write';

    test('should write file to allowed folder successfully', async () => {
      const allowedDir = path.join(tempDir, 'allowed');
      await mkdir(allowedDir, { recursive: true });

      const args = {
        file_path: 'test.txt',
        content: 'Hello World',
        allowed_folder: allowedDir
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully');
      expect(mockValidatePath).toHaveBeenCalledWith('test.txt');
      
      // Verify file was actually written
      const writtenContent = await readFile(path.join(allowedDir, 'test.txt'), 'utf8');
      expect(writtenContent).toBe('Hello World');
    });

    test('should create directory if it does not exist', async () => {
      const allowedDir = path.join(tempDir, 'new-allowed');
      // Don't create the directory - let the function create it

      const args = {
        file_path: 'subdir/test.txt',
        content: 'Hello World',
        allowed_folder: allowedDir
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      
      // Verify directory and file were created
      expect(existsSync(path.join(allowedDir, 'subdir'))).toBe(true);
      const writtenContent = await readFile(path.join(allowedDir, 'subdir', 'test.txt'), 'utf8');
      expect(writtenContent).toBe('Hello World');
    });

    test('should reject invalid file paths', async () => {
      mockValidatePath.mockReturnValue(false);

      const args = {
        file_path: '../../../etc/passwd',
        content: 'malicious content',
        allowed_folder: '/allowed/folder'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid file path: Path traversal not allowed');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should reject paths outside allowed folder', async () => {
      const args = {
        file_path: '../../outside/test.txt',
        content: 'content',
        allowed_folder: '/allowed/folder'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied: File path must be within the allowed folder');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should handle absolute paths correctly', async () => {
      mockExistsSync.mockReturnValue(true);

      const args = {
        file_path: 'test.txt',
        content: 'content',
        allowed_folder: '/home/user/documents'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('should handle writeFile error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      const args = {
        file_path: 'test.txt',
        content: 'content',
        allowed_folder: '/allowed/folder'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in content writer tool: Permission denied');
    });

    test('should handle mkdir error', async () => {
      mockExistsSync.mockReturnValue(false);
      mockMkdir.mockRejectedValue(new Error('Cannot create directory'));

      const args = {
        file_path: 'subdir/test.txt',
        content: 'content',
        allowed_folder: '/allowed/folder'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in content writer tool: Cannot create directory');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });

  describe('frontend_write', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write';

    test('should write file to frontend folder successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const args = {
        file_path: 'components/Button.tsx',
        content: 'export const Button = () => <button>Click me</button>;'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully to frontend/components/Button.tsx');
      expect(result.content[0].text).not.toContain('WARNING');
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('frontend'),
        'export const Button = () => <button>Click me</button>;',
        'utf8'
      );
    });

    test('should create frontend directory structure if needed', async () => {
      mockExistsSync.mockReturnValue(false);

      const args = {
        file_path: 'src/components/Header.tsx',
        content: 'export const Header = () => <header>My App</header>;'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('frontend'),
        { recursive: true }
      );
    });

    test('should show warning for invalid project structure', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // directory exists for file creation
        .mockReturnValueOnce(true); // frontend dir exists for validation
      
      mockValidateProjectDirectory.mockReturnValue({ 
        valid: false, 
        error: "Directory '/mock/project/frontend' does not contain package.json" 
      });

      const args = {
        file_path: 'test.txt',
        content: 'content'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('WARNING: The frontend/ directory exists but doesn\'t appear to be a proper frontend project');
      expect(result.content[0].text).toContain('does not contain package.json');
    });

    test('should not show warning when frontend directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockValidateProjectDirectory.mockReturnValue({ valid: false, error: 'Directory does not exist' });

      const args = {
        file_path: 'test.txt',
        content: 'content'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).not.toContain('WARNING');
    });

    test('should reject invalid file paths', async () => {
      mockValidatePath.mockReturnValue(false);

      const args = {
        file_path: '../../../etc/passwd',
        content: 'malicious'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid file path: Path traversal not allowed');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should reject paths outside frontend folder', async () => {
      const args = {
        file_path: '../../backend/app.js',
        content: 'malicious'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied: File path must be within frontend/ folder');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should handle nested file paths correctly', async () => {
      mockExistsSync.mockReturnValue(true);

      const args = {
        file_path: 'src/pages/dashboard/Dashboard.tsx',
        content: 'export const Dashboard = () => <div>Dashboard</div>;'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('Dashboard.tsx'),
        'export const Dashboard = () => <div>Dashboard</div>;',
        'utf8'
      );
    });

    test('should handle writeFile error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const args = {
        file_path: 'test.txt',
        content: 'content'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in content writer tool: Disk full');
    });
  });

  describe('backend_write', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__content-writer__backend_write';

    test('should write file to backend folder successfully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockValidateProjectDirectory.mockReturnValue({ valid: true });

      const args = {
        file_path: 'routes/users.js',
        content: 'const express = require("express");\nconst router = express.Router();'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully to backend/routes/users.js');
      expect(result.content[0].text).not.toContain('WARNING');
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('backend'),
        'const express = require("express");\nconst router = express.Router();',
        'utf8'
      );
    });

    test('should create backend directory structure if needed', async () => {
      mockExistsSync.mockReturnValue(false);

      const args = {
        file_path: 'models/User.js',
        content: 'const mongoose = require("mongoose");'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('backend'),
        { recursive: true }
      );
    });

    test('should show warning for invalid project structure', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // directory exists for file creation  
        .mockReturnValueOnce(true); // backend dir exists for validation
      
      mockValidateProjectDirectory.mockReturnValue({ 
        valid: false, 
        error: "Directory '/mock/project/backend' does not contain package.json" 
      });

      const args = {
        file_path: 'server.js',
        content: 'const express = require("express");'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('WARNING: The backend/ directory exists but doesn\'t appear to be a proper backend project');
      expect(result.content[0].text).toContain('does not contain package.json');
    });

    test('should not show warning when backend directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      mockValidateProjectDirectory.mockReturnValue({ valid: false, error: 'Directory does not exist' });

      const args = {
        file_path: 'app.js',
        content: 'console.log("Hello");'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).not.toContain('WARNING');
    });

    test('should reject invalid file paths', async () => {
      mockValidatePath.mockReturnValue(false);

      const args = {
        file_path: '../../../etc/passwd',
        content: 'malicious'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid file path: Path traversal not allowed');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should reject paths outside backend folder', async () => {
      const args = {
        file_path: '../../frontend/app.js',
        content: 'malicious'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied: File path must be within backend/ folder');
      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    test('should handle nested file paths correctly', async () => {
      mockExistsSync.mockReturnValue(true);

      const args = {
        file_path: 'api/v1/controllers/UserController.js',
        content: 'class UserController { async getUsers() { return []; } }'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBeFalsy();
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('UserController.js'),
        'class UserController { async getUsers() { return []; } }',
        'utf8'
      );
    });

    test('should handle writeFile error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      const args = {
        file_path: 'test.js',
        content: 'console.log("test");'
      };

      const result = await handleContentWriterTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in content writer tool: Permission denied');
    });
  });

  describe('error handling', () => {
    test('should handle unknown tool name', async () => {
      const result = await handleContentWriterTool('unknown-tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown content writer tool: unknown-tool');
    });

    test('should handle unexpected errors', async () => {
      mockValidatePath.mockImplementation(() => {
        throw new Error('Validation system error');
      });

      const result = await handleContentWriterTool(
        'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
        { file_path: 'test.txt', content: 'content' }
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in content writer tool: Validation system error');
    });
  });

  describe('path security', () => {
    beforeEach(() => {
      // Reset to default secure behavior
      mockValidatePath.mockReturnValue(true);
    });

    test('should prevent directory traversal in restricted_write', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/passwd',
        'C:\\Windows\\System32\\config'
      ];

      for (const maliciousPath of maliciousPaths) {
        const args = {
          file_path: maliciousPath,
          content: 'malicious',
          allowed_folder: '/safe/folder'
        };

        const result = await handleContentWriterTool(
          'mcp__levys-awesome-mcp__mcp__content-writer__restricted_write',
          args
        );

        // Should be blocked by either path validation or folder containment check
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid file path|Access denied/);
      }
    });

    test('should prevent directory traversal in frontend_write', async () => {
      const maliciousPaths = [
        '../backend/secret.js',
        '../../etc/passwd',
        '../../../root/.ssh/id_rsa'
      ];

      for (const maliciousPath of maliciousPaths) {
        const args = {
          file_path: maliciousPath,
          content: 'malicious'
        };

        const result = await handleContentWriterTool(
          'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
          args
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid file path|Access denied/);
      }
    });

    test('should prevent directory traversal in backend_write', async () => {
      const maliciousPaths = [
        '../frontend/public/index.html',
        '../../config/database.yml',
        '../../../usr/bin/bash'
      ];

      for (const maliciousPath of maliciousPaths) {
        const args = {
          file_path: maliciousPath,
          content: 'malicious'
        };

        const result = await handleContentWriterTool(
          'mcp__levys-awesome-mcp__mcp__content-writer__backend_write',
          args
        );

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid file path|Access denied/);
      }
    });
  });

  describe('project validation integration', () => {
    test('should call validateProjectDirectory for frontend_write', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // dir exists for file creation
        .mockReturnValueOnce(true); // frontend dir exists for validation
      
      const args = {
        file_path: 'test.js',
        content: 'content'
      };

      await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', args);

      expect(mockValidateProjectDirectory).toHaveBeenCalledWith(expect.stringContaining('frontend'));
    });

    test('should call validateProjectDirectory for backend_write', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // dir exists for file creation
        .mockReturnValueOnce(true); // backend dir exists for validation
      
      const args = {
        file_path: 'test.js', 
        content: 'content'
      };

      await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', args);

      expect(mockValidateProjectDirectory).toHaveBeenCalledWith(expect.stringContaining('backend'));
    });

    test('should not call validateProjectDirectory for restricted_write', async () => {
      mockExistsSync.mockReturnValue(true);
      
      const args = {
        file_path: 'test.txt',
        content: 'content',
        allowed_folder: '/custom/folder'
      };

      await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__restricted_write', args);

      expect(mockValidateProjectDirectory).not.toHaveBeenCalled();
    });
  });

  describe('minimal integration tests', () => {
    test('should write files to frontend directory', async () => {
      await fs.mkdir(frontendDir, { recursive: true });
      
      const testFile = path.join(frontendDir, 'test.tsx');
      const content = 'export const Button = () => <button>Click me</button>;';
      
      await fs.writeFile(testFile, content);
      
      expect(existsSync(testFile)).toBe(true);
      const readContent = await fs.readFile(testFile, 'utf8');
      expect(readContent).toBe(content);
    });

    test('should write files to backend directory', async () => {
      await fs.mkdir(backendDir, { recursive: true });
      
      const testFile = path.join(backendDir, 'server.js');
      const content = 'const express = require("express");';
      
      await fs.writeFile(testFile, content);
      
      expect(existsSync(testFile)).toBe(true);
      const readContent = await fs.readFile(testFile, 'utf8');
      expect(readContent).toBe(content);
    });

    test('should create nested directory structure', async () => {
      const nestedDir = path.join(frontendDir, 'src', 'components');
      await fs.mkdir(nestedDir, { recursive: true });
      
      const testFile = path.join(nestedDir, 'Header.tsx');
      await fs.writeFile(testFile, 'export const Header = () => <header>App</header>;');
      
      expect(existsSync(testFile)).toBe(true);
    });

    test('should prevent path traversal', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd'
      ];

      for (const maliciousPath of maliciousPaths) {
        const normalizedPath = path.normalize(maliciousPath);
        const resolvedPath = path.resolve(tempDir, normalizedPath);
        
        expect(resolvedPath.startsWith(tempDir)).toBe(true);
      }
    });
  });

  describe('file path normalization', () => {
    test('should normalize paths correctly in restricted_write', async () => {
      mockExistsSync.mockReturnValue(true);

      const args = {
        file_path: './subdir/../test.txt',
        content: 'content',
        allowed_folder: '/allowed/folder'
      };

      const result = await handleContentWriterTool(
        'mcp__levys-awesome-mcp__mcp__content-writer__restricted_write',
        args
      );

      expect(result.isError).toBeFalsy();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('should handle relative paths in frontend_write', async () => {
      mockExistsSync.mockReturnValue(true);

      const args = {
        file_path: 'components/../utils/helpers.js',
        content: 'export const helper = () => {};'
      };

      const result = await handleContentWriterTool(
        'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
        args
      );

      expect(result.isError).toBeFalsy();
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('helpers.js'),
        'export const helper = () => {};',
        'utf8'
      );
    });
  });
});