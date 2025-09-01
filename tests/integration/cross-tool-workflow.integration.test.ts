import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';

describe('Cross-Tool Workflow Integration Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should execute plan creation -> content writing workflow', async () => {
    // Step 1: Create a plan
    const planResponse = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__plan-creator__create_plan',
      arguments: {
        task_description: 'Create a simple test file'
      }
    });

    expect(planResponse.jsonrpc).toBe('2.0');
    expect(planResponse.result).toBeDefined();

    // Step 2: Write content based on plan
    const writeResponse = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
      arguments: {
        file_path: 'workflow-test.js',
        content: '// Generated from workflow test'
      }
    });

    expect(writeResponse.jsonrpc).toBe('2.0');
    expect(writeResponse.result).toBeDefined();
  });

  it('should execute build -> test workflow', async () => {
    // Step 1: Build project
    const buildResponse = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__build-executor__build_project',
      arguments: {}
    });

    expect(buildResponse.jsonrpc).toBe('2.0');
    expect(buildResponse.result).toBeDefined();

    // Step 2: Run tests
    const testResponse = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__test-executor__run_tests',
      arguments: {
        framework: 'vitest'
      }
    });

    expect(testResponse.jsonrpc).toBe('2.0');
    expect(testResponse.result).toBeDefined();
  });

  it('should execute summary workflow', async () => {
    const sessionId = 'workflow-test-' + Date.now();

    // Step 1: Put summary
    const putResponse = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary',
      arguments: {
        session_id: sessionId,
        agent_name: 'workflow-agent',
        content: JSON.stringify({ status: 'completed', workflow: 'test' })
      }
    });

    expect(putResponse.jsonrpc).toBe('2.0');
    expect(putResponse.result).toBeDefined();

    // Step 2: Get summary
    const getResponse = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__content-writer__get_summary',
      arguments: {
        session_id: sessionId,
        agent_name: 'workflow-agent'
      }
    });

    expect(getResponse.jsonrpc).toBe('2.0');
    expect(getResponse.result).toBeDefined();
  });

  it('should handle concurrent tool calls', async () => {
    const promises = [
      client.call('tools/call', {
        name: 'mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents',
        arguments: {}
      }),
      client.call('tools/call', {
        name: 'mcp__levys-awesome-mcp__mcp__build-executor__build_frontend',
        arguments: {}
      }),
      client.call('tools/call', {
        name: 'mcp__levys-awesome-mcp__mcp__test-runner__run_backend_tests',
        arguments: {}
      })
    ];

    const responses = await Promise.all(promises);

    responses.forEach(response => {
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();
    });
  });
});