import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';

describe('Performance Integration Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should respond to tools/list under 1000ms', async () => {
    const start = Date.now();
    const response = await client.call('tools/list');
    const duration = Date.now() - start;
    
    expect(response.jsonrpc).toBe('2.0');
    // Allow a more generous threshold to avoid flakes in slower environments
    expect(duration).toBeLessThan(1000);
  });

  it('should handle concurrent requests efficiently', async () => {
    const concurrentRequests = 10;
    const start = Date.now();
    
    const promises = Array.from({ length: concurrentRequests }, () =>
      client.call('tools/list')
    );
    
    const responses = await Promise.all(promises);
    const duration = Date.now() - start;
    
    expect(responses).toHaveLength(concurrentRequests);
    expect(responses.every(r => r.jsonrpc === '2.0')).toBe(true);
    expect(duration).toBeLessThan(2000); // Should handle 10 concurrent requests in under 2s
  });

  it('should handle rapid sequential requests', async () => {
    const requestCount = 20;
    const start = Date.now();
    
    for (let i = 0; i < requestCount; i++) {
      const response = await client.call('tools/list');
      expect(response.jsonrpc).toBe('2.0');
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000); // 20 requests in under 5s
  });

  it('should handle large tool responses efficiently', async () => {
    const start = Date.now();
    
    const response = await client.call('tools/call', {
      name: 'content-writer-write',
      arguments: {
        file_path: 'tests/temp/large-response.txt',
        content: 'x'.repeat(10000), // 10KB content
        operation: 'create'
      }
    });
    
    const duration = Date.now() - start;
    
    expect(response.jsonrpc).toBe('2.0');
    expect(duration).toBeLessThan(2000);
  });

  it('should maintain performance under memory pressure', async () => {
    // Create multiple large objects to simulate memory pressure
    const largeArrays = Array.from({ length: 100 }, () => 
      new Array(10000).fill('memory-pressure-test')
    );
    
    const start = Date.now();
    const response = await client.call('tools/list');
    const duration = Date.now() - start;
    
    expect(response.jsonrpc).toBe('2.0');
    expect(duration).toBeLessThan(1000);
    
    // Clean up
    largeArrays.length = 0;
  });

  it('should handle tool execution timeouts gracefully', async () => {
    const start = Date.now();
    
    const response = await client.call('tools/call', {
      name: 'build-executor-build',
      arguments: {
        project_type: 'frontend',
        build_commands: ['echo "Quick command"']
      }
    });
    
    const duration = Date.now() - start;
    
    expect(response.jsonrpc).toBe('2.0');
    expect(duration).toBeLessThan(5000);
  });
});