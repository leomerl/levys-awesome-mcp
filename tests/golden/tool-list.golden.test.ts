import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { MCPClient } from '../helpers/mcp-client.js';

const GOLDEN_DIR = join(process.cwd(), 'tests', 'golden', 'snapshots');

describe('Golden/Snapshot Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should match golden snapshot for tools/list', async () => {
    const response = await client.call('tools/list');
    
    // Sanitize response (remove dynamic fields)
    const sanitized = {
      ...response,
      id: 'SANITIZED_ID',
      result: {
        tools: response.result.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: tool.inputSchema.type,
            properties: Object.keys(tool.inputSchema.properties || {}).sort(),
            required: (tool.inputSchema.required || []).sort()
          }
        })).sort((a: any, b: any) => a.name.localeCompare(b.name))
      }
    };

    const goldenPath = join(GOLDEN_DIR, 'tools-list.json');
    
    if (process.env.UPDATE_GOLDEN || !existsSync(goldenPath)) {
      writeFileSync(goldenPath, JSON.stringify(sanitized, null, 2));
      console.log(`Updated golden file: ${goldenPath}`);
    } else {
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      expect(sanitized).toEqual(golden);
    }
  });

  it('should match golden snapshot for content-writer success', async () => {
    const response = await client.call('tools/call', {
      name: 'content-writer-write',
      arguments: {
        file_path: 'tests/temp/golden-test.txt',
        content: 'Deterministic content for golden test',
        operation: 'create'
      }
    });

    const sanitized = {
      ...response,
      id: 'SANITIZED_ID',
      result: {
        ...response.result,
        content: response.result.content.map((c: any) => ({
          type: c.type,
          text: c.text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'SANITIZED_TIMESTAMP')
        }))
      }
    };

    const goldenPath = join(GOLDEN_DIR, 'content-writer-success.json');
    
    if (process.env.UPDATE_GOLDEN || !existsSync(goldenPath)) {
      writeFileSync(goldenPath, JSON.stringify(sanitized, null, 2));
    } else {
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8'));
      expect(sanitized).toEqual(golden);
    }
  });
});