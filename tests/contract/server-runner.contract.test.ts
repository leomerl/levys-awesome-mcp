import { describe, it, expect } from 'vitest';
import { handleServerRunnerTool } from '../../src/handlers/server-runner.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Server Runner Contract Tests', () => {
  it('should run dev backend', async () => {
    const result = await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should run dev frontend', async () => {
    const result = await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should run dev all', async () => {
    const result = await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_all', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle unknown server tool', async () => {
    const result = await handleServerRunnerTool('unknown-server-tool', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown');
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleServerRunnerTool('mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend', {});

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});