import { describe, it, expect } from 'vitest';
import { handleCodeAnalyzerTool } from '../../src/handlers/code-analyzer.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Code Analyzer Contract Tests', () => {
  it('should run lint javascript', async () => {
    const result = await handleCodeAnalyzerTool('mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript', {
      path: 'src/'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
  });

  it('should run security scan', async () => {
    const result = await handleCodeAnalyzerTool('mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan', {
      type: 'npm'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should run code quality scan', async () => {
    const result = await handleCodeAnalyzerTool('mcp__levys-awesome-mcp__mcp__code-analyzer__code_quality_scan', {
      path: 'src/'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should check dependencies', async () => {
    const result = await handleCodeAnalyzerTool('mcp__levys-awesome-mcp__mcp__code-analyzer__dependency_check', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleCodeAnalyzerTool('mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript', {
      path: 'src/'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});