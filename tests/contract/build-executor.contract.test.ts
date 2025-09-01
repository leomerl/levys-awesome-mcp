import { describe, it, expect } from 'vitest';
import { handleBuildExecutorTool } from '../../src/handlers/build-executor.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Build Executor Contract Tests', () => {
  it('should handle valid build request', async () => {
    const result = await handleBuildExecutorTool('build-executor-build', {
      project_type: 'frontend',
      build_commands: ['npm run typecheck']
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0]).toHaveProperty('text');
    expect(typeof result.content[0].text).toBe('string');
  });

  it('should validate project types', async () => {
    const result = await handleBuildExecutorTool('build-executor-build', {
      project_type: 'invalid_type'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Invalid project type');
  });

  it('should handle missing project type', async () => {
    await expect(
      handleBuildExecutorTool('build-executor-build', {})
    ).rejects.toThrow();
  });

  it('should validate build commands array', async () => {
    const result = await handleBuildExecutorTool('build-executor-build', {
      project_type: 'frontend',
      build_commands: 'not-an-array'
    });

    expect(result.isError).toBe(true);
  });

  it('should handle parallel execution flag', async () => {
    const result = await handleBuildExecutorTool('build-executor-build', {
      project_type: 'fullstack',
      parallel: true
    });

    expect(result).toBeDefined();
    expect(result.content[0].text).toContain('parallel');
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleBuildExecutorTool('build-executor-build', {
      project_type: 'backend'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});