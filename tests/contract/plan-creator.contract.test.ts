import { describe, it, expect } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Plan Creator Contract Tests', () => {
  it('should create valid plan with task breakdown', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Build a simple todo app with React frontend and Node.js backend'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    
    const planText = result.content[0].text;
    expect(planText).toContain('plan');
    expect(planText).toContain('task');
  });

  it('should handle missing task description', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {});
    
    expect(result.isError).toBe(true);
  });

  it('should generate task breakdown', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Create multiple components'
    });

    expect(result.content[0].text).toContain('task');
  });

  it('should handle complex task descriptions', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Update frontend components and backend API'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Schema validation test'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});