import { describe, it, expect } from 'vitest';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Summary Tools Contract Tests', () => {
  it('should put summary', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__put_summary', {
      session_id: 'test-session-123',
      agent_name: 'test-agent',
      content: JSON.stringify({ status: 'completed', files_modified: ['test.js'] })
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should get summary', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__get_summary', {
      session_id: 'test-session-123',
      agent_name: 'test-agent'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle missing session for get_summary', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__get_summary', {
      session_id: 'nonexistent-session'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should validate required parameters for put_summary', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__put_summary', {
      session_id: 'test-session'
      // Missing agent_name and content
    });

    expect(result.isError).toBe(true);
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__get_summary', {
      session_id: 'test-session-123'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});