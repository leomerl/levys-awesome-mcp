import { describe, it, expect } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Plan Creator Contract Tests', () => {
  const goldenDir = path.join(process.cwd(), 'tests', 'golden', 'plan-creator');

  // Ensure golden directory exists
  if (!fs.existsSync(goldenDir)) {
    fs.mkdirSync(goldenDir, { recursive: true });
  }
  it('should create valid plan with task breakdown', async () => {
    const input = {
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
    };

    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input);

    // Check structure
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');

    // Create normalized snapshot for comparison
    const snapshot = {
      input,
      hasError: result.isError || false,
      contentType: result.content[0]?.type,
      textContains: {
        hasPlan: result.content[0]?.text?.toLowerCase().includes('plan'),
        hasTask: result.content[0]?.text?.toLowerCase().includes('task'),
        hasSuccess: result.content[0]?.text?.toLowerCase().includes('success') ||
                    result.content[0]?.text?.toLowerCase().includes('created')
      }
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'valid-plan-task-breakdown.json');
    if (process.env.UPDATE_GOLDEN) {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (fs.existsSync(goldenPath)) {
      const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      // First run - create golden file
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
  });

  it('should handle missing task description', async () => {
    const input = {};
    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input);

    // Create normalized snapshot
    const snapshot = {
      input,
      hasError: result.isError || false,
      errorPattern: result.isError ? 'missing_required' : null
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'missing-task-description.json');
    if (process.env.UPDATE_GOLDEN) {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (fs.existsSync(goldenPath)) {
      const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
  });

  it('should generate task breakdown', async () => {
    const input = {
      task_description: 'Create multiple components',
      synopsis: 'Build multiple React components',
      tasks: [{
        id: 'TASK-001',
        designated_agent: 'frontend-agent',
        description: 'Create Header component',
        files_to_modify: ['src/components/Header.js'],
        dependencies: []
      }]
    };

    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input);

    // Create normalized snapshot
    const snapshot = {
      input,
      hasError: result.isError || false,
      contentType: result.content?.[0]?.type,
      textContains: {
        hasTask: result.content?.[0]?.text?.toLowerCase().includes('task'),
        hasComponent: result.content?.[0]?.text?.toLowerCase().includes('component') ||
                      result.content?.[0]?.text?.toLowerCase().includes('frontend')
      }
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'generate-task-breakdown.json');
    if (process.env.UPDATE_GOLDEN) {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (fs.existsSync(goldenPath)) {
      const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
  });

  it('should handle complex task descriptions', async () => {
    const input = {
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
    };

    const result = await handlePlanCreatorTool('mcp__levys-awesome-mcp__mcp__plan-creator__create_plan', input);

    // Create normalized snapshot
    const snapshot = {
      input,
      hasError: result.isError || false,
      hasDependencies: true,
      taskCount: input.tasks.length,
      contentDefined: result.content !== undefined
    };

    // Compare with golden snapshot
    const goldenPath = path.join(goldenDir, 'complex-task-descriptions.json');
    if (process.env.UPDATE_GOLDEN) {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    } else if (fs.existsSync(goldenPath)) {
      const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
      expect(snapshot).toEqual(golden);
    } else {
      fs.writeFileSync(goldenPath, JSON.stringify(snapshot, null, 2));
    }
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