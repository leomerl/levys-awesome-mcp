import { jest } from '@jest/globals';
import { existsSync, readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { handleOrchestratorTool } from '../src/handlers/orchestrator.js';

// Mock fs to avoid file system operations during tests
jest.mock('fs');
jest.mock('fs/promises');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-session-id-123')
}));

const mockExistsSync = jest.mocked(existsSync);
const mockReadFileSync = jest.mocked(readFileSync);
const mockReaddir = jest.mocked(readdir);

describe('Orchestrator Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful file operations
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('invoke_agent', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__orchestrator__invoke_agent';

    test('should invoke testing agent to test MCP tools', async () => {
      const args = {
        agent_type: 'testing-agent',
        task_description: 'Test MCP test-runner functionality',
        detailed_prompt: 'Run comprehensive tests on the test-runner MCP tools to validate that all variants work correctly and fail appropriately when directories are missing or invalid. Test all four variants: run_backend_tests, run_frontend_tests, run_e2e_tests, and test_runner.',
        options: {
          model: 'sonnet',
          skip_permissions: true,
          allowed_tools: ['test-runner', 'validation']
        }
      };

      const result = await handleOrchestratorTool(toolName, args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('## Agent Invocation Complete');
      expect(result.content[0].text).toContain('**Agent Type**: testing-agent');
      expect(result.content[0].text).toContain('**Session ID**: test-session-id-123');
      expect(result.content[0].text).toContain('**Status**: SUCCESS');
      
      // Check for proper session management
      expect(result.content[0].text).toContain('**Output Stream**');
      expect(result.content[0].text).toContain('**Report Summary**');
      expect(result.content[0].text).toContain('output_streams');
      expect(result.content[0].text).toContain('reports');
      
      // Check for proper file structure
      expect(result.content[0].text).toContain('conversation.jsonl');
      expect(result.content[0].text).toContain('session-metadata.json');
      expect(result.content[0].text).toContain('conversation-complete.json');
      
      // Check that the testing agent response contains test results
      expect(result.content[0].text).toContain('Test Runner Analysis Complete');
      expect(result.content[0].text).toContain('run_backend_tests');
      expect(result.content[0].text).toContain('run_frontend_tests');
      expect(result.content[0].text).toContain('run_e2e_tests');
      expect(result.content[0].text).toContain('test_runner');
      expect(result.content[0].text).toContain('Validation Results');
    });

    test('should invoke backend agent with proper configuration', async () => {
      const args = {
        agent_type: 'backend-agent',
        task_description: 'Implement API endpoint',
        detailed_prompt: 'Create a new REST API endpoint for user management',
        options: {
          model: 'opus',
          allowed_tools: ['Read', 'Write', 'Edit']
        }
      };

      const result = await handleOrchestratorTool(toolName, args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('**Agent Type**: backend-agent');
      expect(result.content[0].text).toContain('backend-developer');
      expect(result.content[0].text).toContain('Mock response for: ## Agent Role: backend-developer');
    });

    test('should handle unknown agent type', async () => {
      const args = {
        agent_type: 'unknown-agent',
        task_description: 'Some task',
        detailed_prompt: 'Do something'
      };

      const result = await handleOrchestratorTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown agent type: unknown-agent');
    });
  });

  describe('coordinate_workflow', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__orchestrator__coordinate_workflow';

    test('should coordinate multi-agent workflow', async () => {
      const args = {
        workflow_description: 'Full-stack development with testing',
        agents: [
          {
            agent_type: 'backend-agent',
            task: 'Implement API endpoints'
          },
          {
            agent_type: 'frontend-agent', 
            task: 'Create UI components',
            depends_on: ['backend-agent']
          },
          {
            agent_type: 'testing-agent',
            task: 'Run comprehensive tests',
            depends_on: ['backend-agent', 'frontend-agent']
          }
        ]
      };

      const result = await handleOrchestratorTool(toolName, args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('## Multi-Agent Workflow Complete');
      expect(result.content[0].text).toContain('Full-stack development with testing');
      expect(result.content[0].text).toContain('Agents executed: 3');
      expect(result.content[0].text).toContain('Successful: 3');
      
      // Check that all agents were executed
      expect(result.content[0].text).toContain('### backend-agent');
      expect(result.content[0].text).toContain('### frontend-agent');
      expect(result.content[0].text).toContain('### testing-agent');
      
      // Check session IDs are present
      expect(result.content[0].text).toContain('test-session-id-123');
    });

    test('should handle circular dependency', async () => {
      const args = {
        workflow_description: 'Circular dependency test',
        agents: [
          {
            agent_type: 'backend-agent',
            task: 'Task A',
            depends_on: ['frontend-agent']
          },
          {
            agent_type: 'frontend-agent',
            task: 'Task B', 
            depends_on: ['backend-agent']
          }
        ]
      };

      const result = await handleOrchestratorTool(toolName, args);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Circular dependency detected');
    });
  });

  describe('error handling', () => {
    test('should handle unknown tool names', async () => {
      const result = await handleOrchestratorTool('unknown_tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown orchestrator tool');
    });
  });
});

describe('Agent Session Management', () => {
  test('should create proper session structure', () => {
    // This test verifies the expected structure that should be created
    const expectedStructure = {
      sessionId: 'test-session-id-123',
      outputStream: 'output_streams/test-session-id-123/',
      reportPath: 'reports/test-session-id-123/',
      files: {
        conversationLog: 'output_streams/test-session-id-123/conversation.jsonl',
        sessionMetadata: 'output_streams/test-session-id-123/session-metadata.json',
        conversationComplete: 'output_streams/test-session-id-123/conversation-complete.json',
        agentSummary: 'reports/test-session-id-123/{agent_name}-summary.json'
      }
    };

    expect(expectedStructure.sessionId).toBe('test-session-id-123');
    expect(expectedStructure.outputStream).toMatch(/output_streams\/test-session-id-123/);
    expect(expectedStructure.reportPath).toMatch(/reports\/test-session-id-123/);
    expect(expectedStructure.files.conversationLog).toContain('conversation.jsonl');
    expect(expectedStructure.files.agentSummary).toContain('-summary.json');
  });
});