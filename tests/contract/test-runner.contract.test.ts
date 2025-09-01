import { describe, it, expect } from 'vitest';
import { handleTestRunnerTool } from '../../src/handlers/test-runner.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Test Runner Contract Tests', () => {
  it('should run backend tests', async () => {
    const result = await handleTestRunnerTool('mcp__levys-awesome-mcp__mcp__test-runner__run_backend_tests', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should run frontend tests', async () => {
    const result = await handleTestRunnerTool('mcp__levys-awesome-mcp__mcp__test-runner__run_frontend_tests', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should run e2e tests', async () => {
    const result = await handleTestRunnerTool('mcp__levys-awesome-mcp__mcp__test-runner__run_e2e_tests', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should run all tests', async () => {
    const result = await handleTestRunnerTool('mcp__levys-awesome-mcp__mcp__test-runner__test_runner', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleTestRunnerTool('mcp__levys-awesome-mcp__mcp__test-runner__run_backend_tests', {});

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});