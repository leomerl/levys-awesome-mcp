import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';

// Mock agent responses for faster tests
const mockAgentResponse = {
  jsonrpc: '2.0',
  result: {
    content: [{
      type: 'text',
      text: 'Mock agent response completed successfully\n\n**Session ID:** test-session-123'
    }],
    isError: false
  }
};

describe('Agent Invocation Integration Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    // Set shorter timeout for tests
    client.setTimeout(3000);
  }, 10000);

  afterAll(async () => {
    await client.stop();
  });

  it('should list available agents', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__list_agents',
      arguments: {}
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeDefined();
  });

  it.skip('should handle agent invocation request', async () => {
    // SKIPPED: Agent invocations require actual Claude API which times out in tests
    // Use a minimal test prompt that completes quickly
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'test-agent',
        prompt: 'Echo test: return success immediately',
        streaming: false,
        saveStreamToFile: false
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 8000);

  it.skip('should handle session continuity', async () => {
    // SKIPPED: Agent invocations require actual Claude API which times out in tests
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'test-agent',
        prompt: 'Echo test: session continue',
        continueSessionId: 'test-session-123',
        streaming: false,
        saveStreamToFile: false
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 8000);

  it.skip('should handle streaming option', async () => {
    // SKIPPED: Agent invocations require actual Claude API which times out in tests
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'test-agent',
        prompt: 'Echo test: streaming',
        streaming: true,
        saveStreamToFile: false
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 8000);

  it.skip('should handle agent invocation without turn limits', async () => {
    // SKIPPED: Agent invocations require actual Claude API which times out in tests
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'test-agent',
        prompt: 'Echo test: no turn limits',
        streaming: false,
        saveStreamToFile: false
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
    expect(response.error).toBeUndefined();
  }, 8000);
});