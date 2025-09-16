import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';

describe('docs_write tool', () => {
  const testFilePath = 'test-docs-write.md';
  const fullPath = path.join(process.cwd(), 'docs', testFilePath);

  afterEach(() => {
    // Clean up test file if it exists
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  });

  it('should write a file to the docs directory', async () => {
    const testContent = `# Test Documentation

This is a test documentation file created by the docs_write tool.

## Features
- Test feature 1
- Test feature 2

## Usage
\`\`\`typescript
const example = "test";
\`\`\``;

    const result = await handleContentWriterTool('docs_write', {
      file_path: testFilePath,
      content: testContent
    });

    // Check that the result indicates success
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to docs/');

    // Verify the file was actually created
    expect(existsSync(fullPath)).toBe(true);

    // Verify the content is correct
    const writtenContent = await readFile(fullPath, 'utf8');
    expect(writtenContent).toBe(testContent);
  });

  it('should reject paths with path traversal attempts', async () => {
    const result = await handleContentWriterTool('docs_write', {
      file_path: '../outside/malicious.md',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should reject absolute paths', async () => {
    const result = await handleContentWriterTool('docs_write', {
      file_path: '/etc/passwd',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should reject paths outside the docs directory', async () => {
    const result = await handleContentWriterTool('docs_write', {
      file_path: 'docs/../src/malicious.ts',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should create subdirectories if they dont exist', async () => {
    const subDirPath = 'workflows/test-workflow.md';
    const fullNestedPath = path.join(process.cwd(), 'docs', subDirPath);

    const result = await handleContentWriterTool('docs_write', {
      file_path: subDirPath,
      content: '# Test Workflow Documentation'
    });

    expect(result.isError).toBeUndefined();
    expect(existsSync(fullNestedPath)).toBe(true);

    // Clean up
    unlinkSync(fullNestedPath);
    // Note: workflows subdirectory already exists in docs, so we don't remove it
  });

  it('should handle markdown files properly', async () => {
    const markdownContent = `---
title: API Documentation
author: Test Author
---

# API Reference

## Endpoints

### GET /api/users
Returns a list of users.

### POST /api/users
Creates a new user.

## Examples

\`\`\`json
{
  "id": 1,
  "name": "John Doe"
}
\`\`\``;

    const result = await handleContentWriterTool('docs_write', {
      file_path: 'api-reference.md',
      content: markdownContent
    });

    expect(result.isError).toBeUndefined();

    const writtenPath = path.join(process.cwd(), 'docs', 'api-reference.md');
    const writtenContent = await readFile(writtenPath, 'utf8');
    expect(writtenContent).toBe(markdownContent);

    // Clean up
    unlinkSync(writtenPath);
  });
});