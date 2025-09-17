import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Content Writer Contract Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Store original working directory
    originalCwd = process.cwd();

    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'content-writer-test-'));

    // Create necessary directories for testing
    fs.mkdirSync(path.join(tempDir, 'frontend'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'backend'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'tests', 'temp'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'agents'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'docs'), { recursive: true });

    // Create a test configuration file
    const testConfig = {
      folderMappings: {
        backend: ['backend/', 'src/'],
        frontend: ['frontend/'],
        agents: ['agents/'],
        docs: ['docs/'],
        reports: ['reports/'],
        plans: ['plan_and_progress/']
      },
      defaultPaths: {
        backend: 'backend/',
        frontend: 'frontend/',
        agents: 'agents/',
        docs: 'docs/',
        reports: 'reports/',
        plans: 'plan_and_progress/'
      },
      pathValidation: {
        allowPathTraversal: false,
        restrictToConfiguredFolders: true,
        createDirectoriesIfNotExist: true
      },
      metadata: {
        version: '1.0.0',
        description: 'Test configuration for content-writer',
        createdBy: 'test-suite',
        lastModified: '2024-01-01'
      }
    };

    // Write the test configuration
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'content-writer.json'),
      JSON.stringify(testConfig, null, 2)
    );

    // Change working directory to temp directory for tests
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Frontend Write Tests', () => {
    it('should handle valid frontend file creation', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'test-file.txt',
        content: 'Frontend test content'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
      expect(typeof result.content[0].text).toBe('string');
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('frontend/');

      // Verify file was actually created
      const filePath = path.join(tempDir, 'frontend', 'test-file.txt');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('Frontend test content');
    });

    it('should handle frontend files with subdirectories', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'components/Button.tsx',
        content: 'export const Button = () => <button>Click me</button>;'
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('File written successfully');

      // Verify file was created in subdirectory
      const filePath = path.join(tempDir, 'frontend', 'components', 'Button.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should handle frontend prefix in path correctly', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'frontend/app.js',
        content: 'console.log("App");'
      });

      expect(result.isError).not.toBe(true);
      // Should not create nested frontend/frontend directory
      const filePath = path.join(tempDir, 'frontend', 'app.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Backend Write Tests', () => {
    it('should handle valid backend file creation in backend folder', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'backend/server.ts',
        content: 'const server = express();'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('backend/');

      // Verify file was created
      const filePath = path.join(tempDir, 'backend', 'server.ts');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('const server = express();');
    });

    it('should handle valid backend file creation in src folder', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'src/utils.ts',
        content: 'export const utils = {};'
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('src/');

      // Verify file was created in src directory
      const filePath = path.join(tempDir, 'src', 'utils.ts');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('export const utils = {};');
    });

    it('should handle files without folder prefix using configuration default', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'test-backend.ts',
        content: 'Backend test'
      });

      expect(result.isError).not.toBe(true);
      // Should use the default backend path from configuration
      const filePath = path.join(tempDir, 'backend', 'test-backend.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should handle nested directories in backend', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'src/services/api.ts',
        content: 'export class API {}'
      });

      expect(result.isError).not.toBe(true);
      const filePath = path.join(tempDir, 'src', 'services', 'api.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Parameter Validation Tests', () => {
    it('should validate required parameters for frontend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        content: 'Missing file_path'
      });
      expect(result.isError).toBe(true);
    });

    it('should validate required parameters for backend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'test.ts'
        // Missing content
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('Path Security Tests', () => {
    it('should reject path traversal attempts in frontend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: '../../../etc/passwd',
        content: 'Malicious content'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('path');
    });

    it('should reject path traversal attempts in backend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: '../../sensitive/data.txt',
        content: 'Sensitive data'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('path');
    });

    it('should reject paths outside configured folders for frontend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: '/tmp/outside.txt',
        content: 'Outside content'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should reject paths outside configured folders for backend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: '/var/log/app.log',
        content: 'Log content'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });
  });

  describe('Restricted Write Tests', () => {
    it('should handle restricted folder access', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__restricted_write', {
        file_path: 'test.txt',
        content: 'Test content',
        allowed_folder: path.join(tempDir, 'tests')
      });

      expect(result).toBeDefined();
      expect(result.isError).not.toBe(true);

      // Verify file was created in the allowed folder
      const filePath = path.join(tempDir, 'tests', 'test.txt');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should reject restricted write outside allowed folder', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__restricted_write', {
        file_path: '../outside.txt',
        content: 'Outside content',
        allowed_folder: path.join(tempDir, 'tests')
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Access denied');
    });

    it('should validate allowed_folder parameter', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__restricted_write', {
        file_path: 'test.txt',
        content: 'Test content'
        // Missing allowed_folder
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('Agents Write Tests', () => {
    it('should handle valid agents file creation', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__agents_write', {
        file_path: 'test-agent.ts',
        content: 'export const agent = {};'
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('agents/');

      const filePath = path.join(tempDir, 'agents', 'test-agent.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should handle agents prefix in path correctly', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__agents_write', {
        file_path: 'agents/builder.ts',
        content: 'export const builder = {};'
      });

      expect(result.isError).not.toBe(true);
      // Should not create nested agents/agents directory
      const filePath = path.join(tempDir, 'agents', 'builder.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Docs Write Tests', () => {
    it('should handle valid docs file creation', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__docs_write', {
        file_path: 'README.md',
        content: '# Documentation'
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('File written successfully');
      expect(result.content[0].text).toContain('docs/');

      const filePath = path.join(tempDir, 'docs', 'README.md');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('MCP Response Schema Validation', () => {
    it('should conform to MCP response schema for frontend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'schema-test.txt',
        content: 'Schema validation test'
      });

      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result
      };

      expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
    });

    it('should conform to MCP response schema for backend_write', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'backend-schema.txt',
        content: 'Backend schema test'
      });

      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result
      };

      expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
    });
  });

  describe('Configuration Fallback Tests', () => {
    it('should handle missing configuration file gracefully', async () => {
      // Remove the configuration file
      const configPath = path.join(tempDir, 'src', 'content-writer.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      // Frontend write should still work with hardcoded fallback
      const frontendResult = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'fallback-test.js',
        content: 'Fallback test'
      });

      expect(frontendResult.isError).not.toBe(true);
      expect(frontendResult.content[0].text).toContain('File written successfully');

      // Backend write should still work with hardcoded fallback
      const backendResult = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'src/fallback.ts',
        content: 'Fallback backend'
      });

      expect(backendResult.isError).not.toBe(true);
      expect(backendResult.content[0].text).toContain('File written successfully');
    });

    it('should handle invalid configuration file gracefully', async () => {
      // Write invalid JSON to configuration file
      const configPath = path.join(tempDir, 'src', 'content-writer.json');
      fs.writeFileSync(configPath, '{ invalid json }');

      // Should fall back to hardcoded paths
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'invalid-config-test.js',
        content: 'Test with invalid config'
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('File written successfully');
    });
  });

  describe('Configuration-based Path Resolution Tests', () => {
    it('should respect configured folder mappings for backend', async () => {
      // Test both backend and src folders from configuration
      const srcResult = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'src/config-test.ts',
        content: 'Config test src'
      });

      expect(srcResult.isError).not.toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'src', 'config-test.ts'))).toBe(true);

      const backendResult = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'backend/config-test.ts',
        content: 'Config test backend'
      });

      expect(backendResult.isError).not.toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'backend', 'config-test.ts'))).toBe(true);
    });

    it('should use default paths from configuration when no prefix is provided', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'no-prefix.js',
        content: 'No prefix test'
      });

      expect(result.isError).not.toBe(true);
      // Should use default frontend path from config
      const filePath = path.join(tempDir, 'frontend', 'no-prefix.js');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should validate paths according to configuration settings', async () => {
      // Configuration has allowPathTraversal: false
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'frontend/../sneaky.js',
        content: 'Sneaky content'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('path');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty content', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'empty.txt',
        content: ''
      });

      expect(result.isError).not.toBe(true);
      const filePath = path.join(tempDir, 'frontend', 'empty.txt');
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('');
    });

    it('should handle very long file paths', async () => {
      const longPath = 'a/'.repeat(50) + 'file.txt';
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: longPath,
        content: 'Long path test'
      });

      // Should either succeed or fail gracefully
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle special characters in file names', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'file-with-special_chars.test.ts',
        content: 'Special chars test'
      });

      expect(result.isError).not.toBe(true);
      const filePath = path.join(tempDir, 'frontend', 'file-with-special_chars.test.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should handle Unicode content', async () => {
      const unicodeContent = 'Hello 世界 🌍 émojis';
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'unicode.txt',
        content: unicodeContent
      });

      expect(result.isError).not.toBe(true);
      const filePath = path.join(tempDir, 'frontend', 'unicode.txt');
      expect(fs.readFileSync(filePath, 'utf8')).toBe(unicodeContent);
    });

    it('should handle Windows-style paths', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
        file_path: 'backend\\windows\\path.ts',
        content: 'Windows path test'
      });

      expect(result.isError).not.toBe(true);
      // Path should be normalized correctly
      const filePath = path.join(tempDir, 'backend', 'windows', 'path.ts');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('Tool Name Normalization Tests', () => {
    it('should handle various tool name formats', async () => {
      // Test short form
      const shortForm = await handleContentWriterTool('frontend_write', {
        file_path: 'short-form.js',
        content: 'Short form test'
      });
      expect(shortForm.isError).not.toBe(true);

      // Test long form
      const longForm = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
        file_path: 'long-form.js',
        content: 'Long form test'
      });
      expect(longForm.isError).not.toBe(true);

      // Test double prefix (edge case)
      const doublePrefix = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__frontend_write', {
        file_path: 'double-prefix.js',
        content: 'Double prefix test'
      });
      expect(doublePrefix.isError).not.toBe(true);
    });
  });

  describe('Summary Tools Tests', () => {
    it('should create summary reports', async () => {
      const sessionId = 'test-session-123';
      const summaryContent = JSON.stringify({
        sessionId: sessionId,
        agentName: 'test-agent',
        timestamp: new Date().toISOString(),
        results: ['test1', 'test2']
      });

      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__put_summary', {
        session_id: sessionId,
        agent_name: 'test-agent',
        content: summaryContent
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('Summary report created successfully');

      // Verify file was created
      const summaryPath = path.join(tempDir, 'reports', sessionId, 'test-agent-summary.json');
      expect(fs.existsSync(summaryPath)).toBe(true);
    });

    it('should read summary reports', async () => {
      // First create a summary
      const sessionId = 'read-test-456';
      const summaryData = {
        sessionId: sessionId,
        agentName: 'reader-agent',
        data: 'test data'
      };

      // Create the directory and file
      const reportsDir = path.join(tempDir, 'reports', sessionId);
      fs.mkdirSync(reportsDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportsDir, 'reader-agent-summary.json'),
        JSON.stringify(summaryData, null, 2)
      );

      // Now read it
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__get_summary', {
        session_id: sessionId,
        agent_name: 'reader-agent'
      });

      expect(result.isError).not.toBe(true);
      expect(result.content[0].text).toContain('reader-agent-summary.json');
      expect(result.content[0].text).toContain('"data": "test data"');
    });

    it('should validate summary parameters', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__put_summary', {
        agent_name: 'test-agent',
        content: '{}'
        // Missing session_id
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid session_id');
    });

    it('should validate JSON content in put_summary', async () => {
      const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__put_summary', {
        session_id: 'test-123',
        agent_name: 'test-agent',
        content: 'not valid json'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid JSON');
    });
  });
});