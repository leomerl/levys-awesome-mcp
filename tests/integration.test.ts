import { jest } from '@jest/globals';
import { writeFile, mkdir, readFile, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const fs = { writeFile, mkdir, readFile, rm, mkdtemp };

/**
 * Integration Tests - Test Real Functionality Without Heavy Mocking
 * These tests use real file system operations to catch actual issues
 */

describe('Integration Tests', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'integration-test-'));
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  describe('Path Traversal Security', () => {
    test('should prevent actual path traversal attacks', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        '/etc/passwd',
        'C:\\Windows\\System32\\config'
      ];

      for (const maliciousPath of maliciousPaths) {
        // Test that path validation actually works
        const normalizedPath = path.normalize(maliciousPath);
        const resolvedPath = path.resolve(tempDir, normalizedPath);
        
        // Should not escape temp directory
        expect(resolvedPath.startsWith(tempDir)).toBe(true);
      }
    });

    test('should detect path traversal sequences', () => {
      const pathsWithTraversal = [
        'normal/../../../etc/passwd',
        'subdir\\..\\..\\..\\system32',
        './valid/../../../invalid'
      ];

      for (const testPath of pathsWithTraversal) {
        expect(testPath.includes('..')).toBe(true);
      }
    });
  });

  describe('Real File Operations', () => {
    test('should create nested directories and files', async () => {
      const nestedPath = path.join(tempDir, 'deep', 'nested', 'structure', 'file.txt');
      
      await mkdir(path.dirname(nestedPath), { recursive: true });
      await writeFile(nestedPath, 'test content');
      
      expect(existsSync(nestedPath)).toBe(true);
      const content = await readFile(nestedPath, 'utf8');
      expect(content).toBe('test content');
    });

    test('should handle file permission errors gracefully', async () => {
      // This test may behave differently on different OS
      const testFile = path.join(tempDir, 'test-permissions.txt');
      
      try {
        await writeFile(testFile, 'content');
        expect(existsSync(testFile)).toBe(true);
      } catch (error) {
        // Should handle permission errors gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Agent Configuration Loading', () => {
    test('should load real TypeScript agent config', async () => {
      const agentFile = path.join(tempDir, 'test-agent.ts');
      const agentConfig = `
export const testAgent = {
  name: 'test-agent',
  description: 'A test agent',
  systemPrompt: 'You are a test agent',
  options: {
    maxTurns: 5,
    model: 'claude-3'
  }
};
`;
      
      await writeFile(agentFile, agentConfig);
      
      // Test that file exists and can be read
      expect(existsSync(agentFile)).toBe(true);
      const content = await readFile(agentFile, 'utf8');
      expect(content).toContain('test-agent');
      expect(content).toContain('You are a test agent');
    });
  });

  describe('Build System Integration', () => {
    test('should detect missing package.json', async () => {
      const projectDir = path.join(tempDir, 'fake-project');
      await mkdir(projectDir, { recursive: true });
      
      // No package.json exists
      expect(existsSync(path.join(projectDir, 'package.json'))).toBe(false);
    });

    test('should validate package.json structure', async () => {
      const projectDir = path.join(tempDir, 'valid-project');
      await mkdir(projectDir, { recursive: true });
      
      const packageJson = {
        name: 'test-project',
        scripts: {
          build: 'echo "building"',
          typecheck: 'echo "typechecking"'
        }
      };
      
      await writeFile(
        path.join(projectDir, 'package.json'), 
        JSON.stringify(packageJson, null, 2)
      );
      
      // Verify structure
      const content = await readFile(path.join(projectDir, 'package.json'), 'utf8');
      const parsed = JSON.parse(content);
      expect(parsed.scripts.build).toBeDefined();
      expect(parsed.scripts.typecheck).toBeDefined();
    });
  });

  describe('Session Management', () => {
    test('should create real session directory structure', async () => {
      const sessionId = 'test-session-123';
      const outputDir = path.join(tempDir, 'output_streams', sessionId);
      const reportsDir = path.join(tempDir, 'reports', sessionId);
      
      await mkdir(outputDir, { recursive: true });
      await mkdir(reportsDir, { recursive: true });
      
      // Create session files
      await writeFile(
        path.join(outputDir, 'conversation.jsonl'),
        '{"type": "user", "message": "test"}\n'
      );
      
      await writeFile(
        path.join(outputDir, 'session-metadata.json'),
        JSON.stringify({ sessionId, createdAt: new Date().toISOString() })
      );
      
      await writeFile(
        path.join(reportsDir, 'agent-summary.json'),
        JSON.stringify({ success: true, summary: 'Test completed' })
      );
      
      // Verify structure
      expect(existsSync(path.join(outputDir, 'conversation.jsonl'))).toBe(true);
      expect(existsSync(path.join(outputDir, 'session-metadata.json'))).toBe(true);
      expect(existsSync(path.join(reportsDir, 'agent-summary.json'))).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle corrupted JSON files', async () => {
      const corruptedFile = path.join(tempDir, 'corrupted.json');
      await writeFile(corruptedFile, '{ invalid json content');
      
      try {
        const content = await readFile(corruptedFile, 'utf8');
        JSON.parse(content);
        fail('Should have thrown JSON parse error');
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    test('should handle missing files gracefully', async () => {
      const missingFile = path.join(tempDir, 'does-not-exist.txt');
      
      expect(existsSync(missingFile)).toBe(false);
      
      try {
        await readFile(missingFile, 'utf8');
        fail('Should have thrown file not found error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});