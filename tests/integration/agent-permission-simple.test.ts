import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Agent Tool Permission Tests - Simple', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    // Set shorter timeout for permission tests
    client.setTimeout(5000);
  }, 10000);

  afterAll(async () => {
    await client.stop();
  });

  /**
   * Test 1: Verify that forbidden tools prompt is injected
   */
  it.skip('should inject forbidden tools prompt', async () => {
    // SKIPPED: Requires actual Claude API
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'linter-agent',
        prompt: 'echo "TEST1" and exit immediately',
        streaming: false,
        saveStreamToFile: false
      }
    });

    expect(response.result).toBeDefined();
    const responseText = response.result.content[0].text;
    
    // Find session directory
    const dirs = fs.readdirSync('output_streams');
    const recentDir = dirs.sort().reverse()[0];
    
    if (recentDir) {
      const sessionLogPath = path.join('output_streams', recentDir, 'session.log');
      if (fs.existsSync(sessionLogPath)) {
        const content = fs.readFileSync(sessionLogPath, 'utf8');
        
        // Check for tool restrictions
        expect(content).toContain('TOOL RESTRICTIONS');
        expect(content).toContain('TodoWrite');
        expect(content).toContain('Task');
        expect(content).toContain('Write');
        expect(content).toContain('Edit');
      }
    }
  }, 8000);

  /**
   * Test 2: Verify allowed tools not in disallowed list
   */
  it.skip('should not have allowed tools in disallowed list', async () => {
    // SKIPPED: Requires actual Claude API
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'linter-agent',
        prompt: 'echo "TEST2" and exit immediately',
        streaming: false,
        saveStreamToFile: false
      }
    });

    expect(response.result).toBeDefined();
    
    // Find session directory
    const dirs = fs.readdirSync('output_streams');
    const recentDir = dirs.sort().reverse()[0];
    
    if (recentDir) {
      const conversationPath = path.join('output_streams', recentDir, 'conversation.json');
      if (fs.existsSync(conversationPath)) {
        const data = JSON.parse(fs.readFileSync(conversationPath, 'utf8'));
        const messages = data.messages || data;
        
        // Find init message
        const initMsg = messages.find((m: any) => m.type === 'system' && m.subtype === 'init');
        if (initMsg?.options) {
          const { allowedTools, disallowedTools } = initMsg.options;
          
          // Check no overlap
          if (allowedTools && disallowedTools) {
            for (const tool of allowedTools) {
              expect(disallowedTools).not.toContain(tool);
            }
          }
          
          // Linter should have Read, Grep, Glob allowed
          expect(allowedTools).toContain('Read');
          expect(allowedTools).toContain('Grep');
          expect(allowedTools).toContain('Glob');
          
          // These should NOT be in disallowed
          expect(disallowedTools).not.toContain('Read');
          expect(disallowedTools).not.toContain('Grep');
          expect(disallowedTools).not.toContain('Glob');
        }
      }
    }
  }, 8000);
});