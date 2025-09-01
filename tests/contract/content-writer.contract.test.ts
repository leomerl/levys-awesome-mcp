import { describe, it, expect } from 'vitest';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Content Writer Contract Tests', () => {
  it('should handle valid file creation', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
      file_path: 'tests/temp/contract-test.txt',
      content: 'Contract test content'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('should validate required parameters', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
      content: 'Missing file_path'
    });
    expect(result.isError).toBe(true);
  });

  it('should handle invalid file paths', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
      file_path: '../../../etc/passwd',
      content: 'Malicious content'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('path');
  });

  it('should handle restricted folder access', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__restricted_write', {
      file_path: 'tests/temp/test.txt',
      content: 'Test content',
      allowed_folder: 'tests'
    });

    expect(result).toBeDefined();
  });

  it('should handle backend write', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
      file_path: 'test-file.txt',
      content: 'Backend test content'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
      file_path: 'tests/temp/schema-test.txt',
      content: 'Schema validation test'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});