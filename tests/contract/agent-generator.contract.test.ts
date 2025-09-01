import { describe, it, expect } from 'vitest';
import { handleAgentGeneratorTool } from '../../src/handlers/agent-generator.js';
import { validateToolCallResponse } from '../helpers/schema-validator.js';

describe('Agent Generator Contract Tests', () => {
  it('should generate agent from TypeScript config', async () => {
    const result = await handleAgentGeneratorTool('agent-generator-generate', {
      agent_config_path: 'agents/testing-agent.ts',
      output_path: 'tests/temp/generated-agent.md'
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    expect(result.content[0]).toHaveProperty('type', 'text');
    expect(result.content[0].text).toContain('generated');
  });

  it('should validate agent config path exists', async () => {
    const result = await handleAgentGeneratorTool('agent-generator-generate', {
      agent_config_path: 'nonexistent/agent.ts'
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });

  it('should handle invalid TypeScript config', async () => {
    const result = await handleAgentGeneratorTool('agent-generator-generate', {
      agent_config_path: 'package.json' // Not a TS file
    });

    expect(result.isError).toBe(true);
  });

  it('should support different output formats', async () => {
    const result = await handleAgentGeneratorTool('agent-generator-generate', {
      agent_config_path: 'agents/testing-agent.ts',
      format: 'yaml'
    });

    expect(result.content[0].text).toContain('yaml') || expect(result.content[0].text).toContain('YAML');
  });

  it('should conform to MCP response schema', async () => {
    const result = await handleAgentGeneratorTool('agent-generator-generate', {
      agent_config_path: 'agents/testing-agent.ts'
    });

    const mockResponse = {
      jsonrpc: '2.0' as const,
      id: 1,
      result
    };

    expect(() => validateToolCallResponse(mockResponse)).not.toThrow();
  });
});