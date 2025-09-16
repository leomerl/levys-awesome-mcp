import { describe, it, expect } from 'vitest';
import { handleAgentGeneratorTool } from '../../src/handlers/agent-generator.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Agent Generator Contract Tests', () => {
  it('should list available agents', async () => {
    const result = await handleAgentGeneratorTool('mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
  });

  it('should get agent info', async () => {
    const result = await handleAgentGeneratorTool('mcp__levys-awesome-mcp__mcp__agent-generator__get_agent_info', {
      agent_name: 'test-agent'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should generate all agents', async () => {
    const result = await handleAgentGeneratorTool('mcp__levys-awesome-mcp__mcp__agent-generator__generate_all_agents', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should remove agent markdowns', async () => {
    const result = await handleAgentGeneratorTool('mcp__levys-awesome-mcp__mcp__agent-generator__remove_agent_markdowns', {});

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleAgentGeneratorTool('mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents', {});

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});