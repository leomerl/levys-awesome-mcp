import { describe, it, expect } from 'vitest';
import { handleBuildExecutorTool } from '../../src/handlers/build-executor.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Build Executor Contract Tests', () => {
  it('should handle valid build request', async () => {
    const result = await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_frontend', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('should handle backend build', async () => {
    const result = await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_backend', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle full project build', async () => {
    const result = await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_project', {});
    
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle unknown build tool', async () => {
    const result = await handleBuildExecutorTool('unknown-build-tool', {});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown');
  });

  it('should validate tool exists', async () => {
    const result = await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_frontend', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleBuildExecutorTool('mcp__levys-awesome-mcp__mcp__build-executor__build_backend', {});

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});