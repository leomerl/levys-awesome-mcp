import { describe, it, expect } from 'vitest';
import { handleTestExecutorTool } from '../../src/handlers/test-executor.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Test Executor Contract Tests', () => {
  it('should run tests', async () => {
    const result = await handleTestExecutorTool('mcp__levys-awesome-mcp__mcp__test-executor__run_tests', {
      framework: 'vitest'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should validate and run tests', async () => {
    const result = await handleTestExecutorTool('mcp__levys-awesome-mcp__mcp__test-executor__validate_and_run_tests', {
      validate_only: false
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle coverage option', async () => {
    const result = await handleTestExecutorTool('mcp__levys-awesome-mcp__mcp__test-executor__run_tests', {
      coverage: true
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should handle watch mode', async () => {
    const result = await handleTestExecutorTool('mcp__levys-awesome-mcp__mcp__test-executor__run_tests', {
      watch: false
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleTestExecutorTool('mcp__levys-awesome-mcp__mcp__test-executor__run_tests', {});

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});