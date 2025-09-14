import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';

describe('backend_write tool - dual directory support', () => {
  const testFiles: string[] = [];

  afterEach(() => {
    // Clean up test files
    testFiles.forEach(file => {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    });
    testFiles.length = 0;
  });

  it('should write a file to the src directory with src/ prefix', async () => {
    const testContent = 'test content for src';
    const testFilePath = 'src/test-backend-write.ts';
    const fullPath = path.join(process.cwd(), testFilePath);
    testFiles.push(fullPath);

    const result = await handleContentWriterTool('backend_write', {
      file_path: testFilePath,
      content: testContent
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to src/');
    expect(existsSync(fullPath)).toBe(true);

    const writtenContent = await readFile(fullPath, 'utf8');
    expect(writtenContent).toBe(testContent);
  });

  it('should write a file to the backend directory with backend/ prefix', async () => {
    const testContent = 'test content for backend';
    const testFilePath = 'backend/test-backend-write.ts';
    const fullPath = path.join(process.cwd(), testFilePath);
    testFiles.push(fullPath);

    const result = await handleContentWriterTool('backend_write', {
      file_path: testFilePath,
      content: testContent
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to backend/');
    expect(existsSync(fullPath)).toBe(true);

    const writtenContent = await readFile(fullPath, 'utf8');
    expect(writtenContent).toBe(testContent);
  });

  it('should write a file to the src directory without prefix', async () => {
    const testContent = 'test content for src without prefix';
    const testFilePath = 'test-backend-write-no-prefix.ts';
    const fullPath = path.join(process.cwd(), 'src', testFilePath);
    testFiles.push(fullPath);

    const result = await handleContentWriterTool('backend_write', {
      file_path: testFilePath,
      content: testContent
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to');
    expect(existsSync(fullPath)).toBe(true);

    const writtenContent = await readFile(fullPath, 'utf8');
    expect(writtenContent).toBe(testContent);
  });

  it('should reject paths with path traversal attempts', async () => {
    const result = await handleContentWriterTool('backend_write', {
      file_path: '../outside/malicious.ts',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should reject paths outside both allowed directories', async () => {
    const result = await handleContentWriterTool('backend_write', {
      file_path: '/etc/passwd',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should create subdirectories in src if they dont exist', async () => {
    const subDirPath = 'src/subdirectory/nested-file.ts';
    const fullPath = path.join(process.cwd(), subDirPath);
    testFiles.push(fullPath);

    const result = await handleContentWriterTool('backend_write', {
      file_path: subDirPath,
      content: 'test content in src subdirectory'
    });

    expect(result.isError).toBeUndefined();
    expect(existsSync(fullPath)).toBe(true);

    // Clean up the subdirectory
    const subDir = path.dirname(fullPath);
    if (existsSync(subDir) && subDir !== path.join(process.cwd(), 'src')) {
      require('fs').rmSync(subDir, { recursive: true });
    }
  });

  it('should create subdirectories in backend if they dont exist', async () => {
    const subDirPath = 'backend/subdirectory/nested-file.ts';
    const fullPath = path.join(process.cwd(), subDirPath);
    testFiles.push(fullPath);

    const result = await handleContentWriterTool('backend_write', {
      file_path: subDirPath,
      content: 'test content in backend subdirectory'
    });

    expect(result.isError).toBeUndefined();
    expect(existsSync(fullPath)).toBe(true);

    // Clean up the subdirectory
    const subDir = path.dirname(fullPath);
    if (existsSync(subDir) && subDir !== path.join(process.cwd(), 'backend')) {
      require('fs').rmSync(subDir, { recursive: true });
    }
  });
});