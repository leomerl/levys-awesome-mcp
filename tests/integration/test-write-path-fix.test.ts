import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleContentWriterTool } from '../../src/handlers/content-writer';
import { existsSync, rmSync, readFileSync } from 'fs';
import * as path from 'path';

describe('Content Writer Path Fix', () => {
  const testFiles = [
    'docs/test-nested.md',
    'backend/test-nested.ts',
    'frontend/test-nested.tsx',
    'agents/test-nested.ts'
  ];

  beforeEach(() => {
    // Clean up any existing nested directories
    const nestedDirs = ['docs/docs', 'backend/backend', 'frontend/frontend', 'agents/agents'];
    nestedDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    });
  });

  afterEach(() => {
    // Clean up test files
    testFiles.forEach(file => {
      const fullPath = path.join(process.cwd(), file);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
      }
    });

    // Clean up any nested directories that might have been created
    const nestedDirs = ['docs/docs', 'backend/backend', 'frontend/frontend', 'agents/agents'];
    nestedDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
    });
  });

  it('should not create nested docs/docs directory when path includes docs prefix', async () => {
    const result = await handleContentWriterTool('docs_write', {
      file_path: 'docs/test-nested.md',
      content: '# Test Content'
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to docs/test-nested.md');

    // File should exist at docs/test-nested.md, not docs/docs/test-nested.md
    const correctPath = path.join(process.cwd(), 'docs', 'test-nested.md');
    const incorrectPath = path.join(process.cwd(), 'docs', 'docs', 'test-nested.md');

    expect(existsSync(correctPath)).toBe(true);
    expect(existsSync(incorrectPath)).toBe(false);

    const content = readFileSync(correctPath, 'utf8');
    expect(content).toBe('# Test Content');
  });

  it('should not create nested backend/backend directory when path includes backend prefix', async () => {
    const result = await handleContentWriterTool('backend_write', {
      file_path: 'backend/test-nested.ts',
      content: 'export const test = true;'
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to backend/test-nested.ts');

    // File should exist at backend/test-nested.ts, not backend/backend/test-nested.ts
    const correctPath = path.join(process.cwd(), 'backend', 'test-nested.ts');
    const incorrectPath = path.join(process.cwd(), 'backend', 'backend', 'test-nested.ts');

    expect(existsSync(correctPath)).toBe(true);
    expect(existsSync(incorrectPath)).toBe(false);

    const content = readFileSync(correctPath, 'utf8');
    expect(content).toBe('export const test = true;');
  });

  it('should not create nested frontend/frontend directory when path includes frontend prefix', async () => {
    const result = await handleContentWriterTool('frontend_write', {
      file_path: 'frontend/test-nested.tsx',
      content: 'export const Component = () => <div>Test</div>;'
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to frontend/test-nested.tsx');

    // File should exist at frontend/test-nested.tsx, not frontend/frontend/test-nested.tsx
    const correctPath = path.join(process.cwd(), 'frontend', 'test-nested.tsx');
    const incorrectPath = path.join(process.cwd(), 'frontend', 'frontend', 'test-nested.tsx');

    expect(existsSync(correctPath)).toBe(true);
    expect(existsSync(incorrectPath)).toBe(false);

    const content = readFileSync(correctPath, 'utf8');
    expect(content).toBe('export const Component = () => <div>Test</div>;');
  });

  it('should not create nested agents/agents directory when path includes agents prefix', async () => {
    const result = await handleContentWriterTool('agents_write', {
      file_path: 'agents/test-nested.ts',
      content: 'export const agent = {};'
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to agents/test-nested.ts');

    // File should exist at agents/test-nested.ts, not agents/agents/test-nested.ts
    const correctPath = path.join(process.cwd(), 'agents', 'test-nested.ts');
    const incorrectPath = path.join(process.cwd(), 'agents', 'agents', 'test-nested.ts');

    expect(existsSync(correctPath)).toBe(true);
    expect(existsSync(incorrectPath)).toBe(false);

    const content = readFileSync(correctPath, 'utf8');
    expect(content).toBe('export const agent = {};');
  });

  it('should handle paths without prefix correctly', async () => {
    const result = await handleContentWriterTool('docs_write', {
      file_path: 'test-without-prefix.md',
      content: '# No Prefix Test'
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to docs/test-without-prefix.md');

    const correctPath = path.join(process.cwd(), 'docs', 'test-without-prefix.md');
    expect(existsSync(correctPath)).toBe(true);

    const content = readFileSync(correctPath, 'utf8');
    expect(content).toBe('# No Prefix Test');

    // Clean up
    rmSync(correctPath);
  });

  it('should handle restricted_write with folder prefix in path', async () => {
    const testFolder = 'test-restricted-folder';
    const testFolderPath = path.join(process.cwd(), testFolder);

    // Create test folder
    if (!existsSync(testFolderPath)) {
      require('fs').mkdirSync(testFolderPath);
    }

    try {
      const result = await handleContentWriterTool('restricted_write', {
        file_path: 'test-restricted-folder/test-file.txt',
        content: 'Restricted content',
        allowed_folder: testFolder
      });

      expect(result.isError).toBeUndefined();

      // File should exist at test-restricted-folder/test-file.txt, not test-restricted-folder/test-restricted-folder/test-file.txt
      const correctPath = path.join(testFolderPath, 'test-file.txt');
      const incorrectPath = path.join(testFolderPath, 'test-restricted-folder', 'test-file.txt');

      expect(existsSync(correctPath)).toBe(true);
      expect(existsSync(incorrectPath)).toBe(false);

      const content = readFileSync(correctPath, 'utf8');
      expect(content).toBe('Restricted content');
    } finally {
      // Clean up
      if (existsSync(testFolderPath)) {
        rmSync(testFolderPath, { recursive: true, force: true });
      }
    }
  });
});