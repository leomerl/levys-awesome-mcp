import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';
import { validateToolListResponse, validateToolCallResponse } from '../helpers/schema-validator.js';

describe('MCP Server Integration Tests', () => {
  let client: MCPClient;
  const startTime = Date.now();

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should boot under 2 seconds', () => {
    const bootTime = Date.now() - startTime;
    expect(bootTime).toBeLessThan(2000);
  });

  it('should list available tools', async () => {
    const response = await client.call('tools/list');
    
    expect(response.jsonrpc).toBe('2.0');
    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
    
    validateToolListResponse(response);
    
    const tools = response.result.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // Verify expected tools are present
    const toolNames = tools.map((t: any) => t.name);
    expect(toolNames).toContain('content-writer-write');
    expect(toolNames).toContain('build-executor-build');
  });

  it('should handle valid tool call - content writer', async () => {
    const response = await client.call('tools/call', {
      name: 'content-writer-write',
      arguments: {
        file_path: 'tests/temp/test-file.txt',
        content: 'Hello, World!',
        operation: 'create'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
    
    validateToolCallResponse(response);
    
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    expect(response.result.content[0].type).toBe('text');
  });

  it('should handle invalid tool parameters', async () => {
    const response = await client.call('tools/call', {
      name: 'content-writer-write',
      arguments: {
        // Missing required parameters
        content: 'Hello, World!'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.error || response.result?.isError).toBeTruthy();
  });

  it('should handle unknown tool call', async () => {
    const response = await client.call('tools/call', {
      name: 'unknown-tool',
      arguments: {}
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.error || response.result?.isError).toBeTruthy();
  });

  it('should handle malformed JSON-RPC request', async () => {
    if (!client['process']) return;
    
    // Send malformed JSON
    client['process'].stdin?.write('{"invalid": json}\n');
    
    // Should not crash the server - verify with a valid call
    const response = await client.call('tools/list');
    expect(response.jsonrpc).toBe('2.0');
  });

  it('should respond within performance threshold', async () => {
    const start = Date.now();
    const response = await client.call('tools/list');
    const duration = Date.now() - start;
    
    expect(response.jsonrpc).toBe('2.0');
    expect(duration).toBeLessThan(1000); // Under 1 second
  });
});