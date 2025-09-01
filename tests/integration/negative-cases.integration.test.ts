import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';

describe('Negative Cases Integration Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should handle malformed JSON requests', async () => {
    if (!client['process']) return;
    
    // Send malformed JSON
    client['process'].stdin?.write('{"malformed": json, "missing": quote}\n');
    
    // Server should still respond to valid requests
    const response = await client.call('tools/list');
    expect(response.jsonrpc).toBe('2.0');
  });

  it('should return error for missing method', async () => {
    const response = await client.call('', {});
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601); // Method not found
  });

  it('should return error for invalid method', async () => {
    const response = await client.call('invalid/method', {});
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601); // Method not found
  });

  it('should handle missing jsonrpc field', async () => {
    if (!client['process']) return;
    
    const invalidRequest = {
      id: 1,
      method: 'tools/list'
      // Missing jsonrpc field
    };
    
    client['process'].stdin?.write(JSON.stringify(invalidRequest) + '\n');
    
    // Should still handle valid requests
    const response = await client.call('tools/list');
    expect(response.jsonrpc).toBe('2.0');
  });

  it('should handle missing id field', async () => {
    if (!client['process']) return;
    
    const invalidRequest = {
      jsonrpc: '2.0',
      method: 'tools/list'
      // Missing id field
    };
    
    client['process'].stdin?.write(JSON.stringify(invalidRequest) + '\n');
    
    // Should still handle valid requests
    const response = await client.call('tools/list');
    expect(response.jsonrpc).toBe('2.0');
  });

  it('should handle request timeout gracefully', async () => {
    // This test verifies the client timeout mechanism
    const start = Date.now();
    
    try {
      // Simulate a request that would timeout
      await client.call('tools/call', {
        name: 'build-executor-build',
        arguments: {
          project_type: 'frontend',
          build_commands: ['sleep 15'] // Command that takes too long
        }
      });
    } catch (error) {
      const duration = Date.now() - start;
      expect(error.message).toContain('timeout');
      expect(duration).toBeGreaterThan(9000); // Should timeout around 10s
    }
  });

  it('should handle invalid tool parameters gracefully', async () => {
    const response = await client.call('tools/call', {
      name: 'content-writer-write',
      arguments: {
        file_path: null, // Invalid parameter type
        content: 123,    // Invalid parameter type
        operation: 'invalid_op'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.error || response.result?.isError).toBeTruthy();
  });

  it('should handle extremely large payloads', async () => {
    const largeContent = 'x'.repeat(1024 * 1024); // 1MB string
    
    const response = await client.call('tools/call', {
      name: 'content-writer-write',
      arguments: {
        file_path: 'tests/temp/large-file.txt',
        content: largeContent,
        operation: 'create'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    // Should either succeed or fail gracefully
    expect(response.result || response.error).toBeDefined();
  });
});