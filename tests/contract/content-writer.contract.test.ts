import { describe, it, expect } from 'vitest';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Content Writer Contract Tests', () => {
  it('should handle valid file creation', async () => {
    const result = await handleContentWriterTool('content-writer-write', {
      file_path: 'tests/temp/contract-test.txt',
      content: 'Contract test content',
      operation: 'create'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('should validate required parameters', async () => {
    await expect(
      handleContentWriterTool('content-writer-write', {
        content: 'Missing file_path'
      })
    ).rejects.toThrow();
  });

  it('should handle invalid file paths', async () => {
    const result = await handleContentWriterTool('content-writer-write', {
      file_path: '../../../etc/passwd',
      content: 'Malicious content',
      operation: 'create'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid file path');
  });

  it('should validate operation types', async () => {
    const result = await handleContentWriterTool('content-writer-write', {
      file_path: 'tests/temp/test.txt',
      content: 'Test content',
      operation: 'invalid_operation'
    });

    expect(result.isError).toBe(true);
  });

  it('should handle folder restrictions', async () => {
    const result = await handleContentWriterTool('content-writer-write', {
      file_path: 'unauthorized/path/file.txt',
      content: 'Test content',
      operation: 'create',
      access_folder: 'frontend'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('access denied');
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleContentWriterTool('content-writer-write', {
      file_path: 'tests/temp/schema-test.txt',
      content: 'Schema validation test',
      operation: 'create'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});