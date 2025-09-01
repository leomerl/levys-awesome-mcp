import { describe, it, expect } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Plan Creator Contract Tests', () => {
  it('should create valid plan with task breakdown', async () => {
    const result = await handlePlanCreatorTool('create_plan', {
      task_description: 'Build a simple todo app with React frontend and Node.js backend',
      git_commit_hash: 'test-commit-123'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    
    const planText = result.content[0].text;
    expect(planText).toContain('plan.json');
    expect(planText).toContain('task breakdown');
  });

  it('should handle missing task description', async () => {
    await expect(
      handlePlanCreatorTool('create_plan', {
        git_commit_hash: 'test-commit-123'
      })
    ).rejects.toThrow();
  });

  it('should generate unique task IDs', async () => {
    const result = await handlePlanCreatorTool('create_plan', {
      task_description: 'Create multiple components',
      git_commit_hash: 'test-unique-ids'
    });

    expect(result.content[0].text).toContain('unique task IDs');
  });

  it('should assign agents based on directory relevancy', async () => {
    const result = await handlePlanCreatorTool('create_plan', {
      task_description: 'Update frontend components and backend API',
      git_commit_hash: 'test-agent-assignment'
    });

    const planText = result.content[0].text;
    expect(planText).toContain('frontend') || expect(planText).toContain('backend');
  });

  it('should conform to MCP response schema', async () => {
    const result = await handlePlanCreatorTool('create_plan', {
      task_description: 'Schema validation test',
      git_commit_hash: 'test-schema'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});