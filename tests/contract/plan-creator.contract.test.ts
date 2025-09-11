import { describe, it, expect } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Plan Creator Contract Tests', () => {
  it('should create valid plan with task breakdown', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Build a simple todo app with React frontend and Node.js backend',
      synopsis: 'Create a full-stack todo application',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Create Node.js backend with Express',
        files_to_modify: ['server.js', 'package.json'],
        dependencies: []
      }, {
        id: 'TASK-002',
        designated_agent: 'frontend-agent',
        description: 'Create React frontend',
        files_to_modify: ['src/App.js', 'src/components/TodoList.js'],
        dependencies: ['TASK-001']
      }]
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
      task_description: 'Create multiple components',
      synopsis: 'Build multiple React components',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'frontend-agent',
        description: 'Create Header component',
        files_to_modify: ['src/components/Header.js'],
        dependencies: []
      }]
    });

    expect(result.content[0].text).toContain('task');
  });

  it('should handle complex task descriptions', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Update frontend components and backend API',
      synopsis: 'Modernize application with new features',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Update API endpoints',
        files_to_modify: ['api/routes.js'],
        dependencies: []
      }, {
        id: 'TASK-002',
        designated_agent: 'frontend-agent',
        description: 'Update frontend components',
        files_to_modify: ['src/components/'],
        dependencies: ['TASK-001']
      }]
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', {
      task_description: 'Schema validation test',
      synopsis: 'Test schema validation',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'backend-agent',
        description: 'Validate schema',
        files_to_modify: ['schema.js'],
        dependencies: []
      }]
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});