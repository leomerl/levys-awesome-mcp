import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import * as path from 'path';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';

describe('agents_write tool', () => {
  const testFilePath = 'test-agent-write.ts';
  const fullPath = path.join(process.cwd(), 'agents', testFilePath);

  afterEach(() => {
    // Clean up test file if it exists
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  });

  it('should write a file to the agents directory', async () => {
    const testContent = `import { AgentConfig } from '../src/types/agent-config.ts';

const testWriteAgent: AgentConfig = {
  name: 'test-write-agent',
  description: 'Test agent created by agents_write tool',
  prompt: 'Test agent for writing',
  options: {
    model: 'sonnet',
    systemPrompt: 'You are a test agent',
    allowedTools: ['Read(*)']
  }
};

export { testWriteAgent };
export default testWriteAgent;`;

    const result = await handleContentWriterTool('agents_write', {
      file_path: testFilePath,
      content: testContent
    });

    // Check that the result indicates success
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('File written successfully to agents/');

    // Verify the file was actually created
    expect(existsSync(fullPath)).toBe(true);

    // Verify the content is correct
    const writtenContent = await readFile(fullPath, 'utf8');
    expect(writtenContent).toBe(testContent);
  });

  it('should reject paths with path traversal attempts', async () => {
    const result = await handleContentWriterTool('agents_write', {
      file_path: '../outside/malicious.ts',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should reject absolute paths', async () => {
    const result = await handleContentWriterTool('agents_write', {
      file_path: '/etc/passwd',
      content: 'malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Path traversal not allowed');
  });

  it('should create subdirectories if they dont exist', async () => {
    const subDirPath = 'subdirectory/nested-agent.ts';
    const fullNestedPath = path.join(process.cwd(), 'agents', subDirPath);

    const result = await handleContentWriterTool('agents_write', {
      file_path: subDirPath,
      content: 'test content in subdirectory'
    });

    expect(result.isError).toBeUndefined();
    expect(existsSync(fullNestedPath)).toBe(true);

    // Clean up
    unlinkSync(fullNestedPath);
    const subDir = path.dirname(fullNestedPath);
    if (existsSync(subDir)) {
      require('fs').rmSync(subDir, { recursive: true });
    }
  });
});