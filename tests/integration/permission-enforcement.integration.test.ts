import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';
import { existsSync, rmSync } from 'fs';

/**
 * Integration tests verifying the permission enforcement system.
 * Attempts to perform a disallowed write outside the permitted directory
 * and ensures the operation is blocked with no side effects.
 */

describe('Permission Enforcement Integration Tests', () => {
  let client: MCPClient;
  const forbiddenFile = 'backend/unauthorized.txt';

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    if (existsSync(forbiddenFile)) {
      rmSync(forbiddenFile, { force: true });
    }
  });

  afterAll(async () => {
    await client.stop();
    if (existsSync(forbiddenFile)) {
      rmSync(forbiddenFile, { force: true });
    }
  });

  it('should reject writes that escape the frontend directory', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
      arguments: {
        file_path: '../backend/unauthorized.txt',
        content: 'This should not be written'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.error || response.result?.isError).toBeTruthy();
    expect(existsSync(forbiddenFile)).toBe(false);
  });
});
