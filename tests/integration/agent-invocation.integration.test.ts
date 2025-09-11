import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';

describe('Agent Invocation Integration Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

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

  it('should handle agent invocation request', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'testing-agent',
        prompt: 'Test prompt for integration testing'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
  });

  it('should handle session continuity', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'testing-agent',
        prompt: 'First message',
        continueSessionId: 'test-session-123'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
  });

  it('should handle streaming option', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'testing-agent',
        prompt: 'Streaming test',
        streaming: true
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
  });

  it('should handle max turns limit', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'testing-agent',
        prompt: 'Limited turns test',
        maxTurns: 1
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
  });
});