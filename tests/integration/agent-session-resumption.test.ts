/**
 * Integration test for agent session resumption
 * 
 * CRITICAL: This test verifies that:
 * 1. Claude Code's actual session ID is used for directory naming
 * 2. Session resumption works correctly with context retention
 * 3. The same directory and log files are used across sessions
 * 
 * These tests use REAL agent invocations through the MCP server to ensure
 * the actual behavior is tested, not mocked behavior.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Agent Session Resumption Tests', () => {
  let client: MCPClient;
  const OUTPUT_DIR = path.join(process.cwd(), 'output_streams');
  const createdSessions: string[] = [];

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
    
    // Clean up created sessions
    for (const sessionId of createdSessions) {
      const sessionDir = path.join(OUTPUT_DIR, sessionId);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    }
  });

  afterEach(() => {
    // Log session IDs for debugging
    if (createdSessions.length > 0) {
      console.log(`Created sessions: ${createdSessions.join(', ')}`);
    }
  });

  /**
   * Helper to extract session ID from agent response
   */
  function extractSessionId(responseText: string): string | null {
    const match = responseText.match(/\*\*Session ID:\*\* ([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Helper to parse conversation.json
   */
  function parseConversationJson(sessionId: string): any {
    const conversationPath = path.join(OUTPUT_DIR, sessionId, 'conversation.json');
    if (!fs.existsSync(conversationPath)) {
      throw new Error(`conversation.json not found for session ${sessionId}`);
    }
    return JSON.parse(fs.readFileSync(conversationPath, 'utf8'));
  }

  /**
   * Helper to read stream.log
   */
  function readStreamLog(sessionId: string): string {
    const logPath = path.join(OUTPUT_DIR, sessionId, 'stream.log');
    if (!fs.existsSync(logPath)) {
      throw new Error(`stream.log not found for session ${sessionId}`);
    }
    return fs.readFileSync(logPath, 'utf8');
  }

  /**
   * Test 1: Verify Claude Code's session ID is used for directory naming
   * This is CRITICAL - if this fails, session resumption won't work
   */
  it('should use Claude Code session ID for directory naming', async () => {
    const uniqueKey = `DIR_TEST_${Date.now()}`;
    
    // Create a new session
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        prompt: `Remember this directory test key: ${uniqueKey}`
      }
    });

    expect(response.result).toBeDefined();
    const responseText = response.result.content[0].text;
    const sessionId = extractSessionId(responseText);
    
    expect(sessionId).toBeTruthy();
    createdSessions.push(sessionId!);
    
    // Wait for files to be written
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify directory exists with the session ID
    const sessionDir = path.join(OUTPUT_DIR, sessionId!);
    expect(fs.existsSync(sessionDir)).toBe(true);
    
    // Parse conversation.json to find Claude Code's actual session ID
    const conversation = parseConversationJson(sessionId!);
    const initMessage = conversation.messages.find((m: any) => 
      m.type === 'system' && m.subtype === 'init'
    );
    
    expect(initMessage).toBeTruthy();
    const claudeCodeSessionId = initMessage.session_id;
    
    // CRITICAL ASSERTION: Directory name MUST match Claude Code's session ID
    expect(sessionId).toBe(claudeCodeSessionId);
    
    // Also verify the conversation.json sessionId field matches
    expect(conversation.sessionId).toBe(claudeCodeSessionId);
    
    console.log(`✓ Directory ${sessionId} matches Claude Code session ${claudeCodeSessionId}`);
  }, 30000);

  /**
   * Test 2: Verify session resumption maintains context
   * This tests that the agent remembers information across resumed sessions
   */
  it('should maintain context across resumed sessions', async () => {
    const secretKey = `SECRET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // First invocation - give the agent a secret
    const response1 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        prompt: `Remember this secret key exactly: ${secretKey}. Confirm you have it.`
      }
    });

    const responseText1 = response1.result.content[0].text;
    const sessionId = extractSessionId(responseText1);
    expect(sessionId).toBeTruthy();
    createdSessions.push(sessionId!);
    
    // Verify the agent acknowledged the key
    expect(responseText1.toLowerCase()).toMatch(/remember|noted|key|secret/i);
    
    // Wait for session to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Second invocation - resume and ask for the secret
    const response2 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        continueSessionId: sessionId,
        prompt: 'What was the exact secret key I gave you? Please state it clearly.'
      }
    });

    const responseText2 = response2.result.content[0].text;
    
    // CRITICAL ASSERTION: Agent must remember the exact secret
    expect(responseText2).toContain(secretKey);
    
    // Verify we got a new Claude Code session ID but same directory
    const sessionId2 = extractSessionId(responseText2);
    expect(sessionId2).toBeTruthy();
    expect(sessionId2).not.toBe(sessionId); // Different Claude session
    
    // But the directory should be the same
    const sessionDir = path.join(OUTPUT_DIR, sessionId!);
    expect(fs.existsSync(sessionDir)).toBe(true);
    
    console.log(`✓ Context maintained: Agent remembered "${secretKey}"`);
    console.log(`  Original session: ${sessionId}`);
    console.log(`  Resumed with new Claude session: ${sessionId2}`);
  }, 30000);

  /**
   * Test 3: Verify log files are appended to, not replaced
   * This ensures we have a complete audit trail
   */
  it('should append to existing log files on resumption', async () => {
    const marker1 = `MARKER_1_${Date.now()}`;
    const marker2 = `MARKER_2_${Date.now()}`;
    
    // First invocation
    const response1 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        prompt: `Log this first marker: ${marker1}`
      }
    });

    const sessionId = extractSessionId(response1.result.content[0].text);
    expect(sessionId).toBeTruthy();
    createdSessions.push(sessionId!);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Read initial log
    const log1 = readStreamLog(sessionId!);
    expect(log1).toContain(marker1);
    expect(log1).toContain('SESSION NEW:');
    const log1Lines = log1.split('\n').length;
    
    // Second invocation - resume
    const response2 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        continueSessionId: sessionId,
        prompt: `Log this second marker: ${marker2}`
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Read updated log
    const log2 = readStreamLog(sessionId!);
    
    // CRITICAL ASSERTIONS: Log must contain both markers and both session types
    expect(log2).toContain(marker1); // Original content preserved
    expect(log2).toContain(marker2); // New content added
    expect(log2).toContain('SESSION NEW:');
    expect(log2).toContain('SESSION RESUMED:');
    
    const log2Lines = log2.split('\n').length;
    expect(log2Lines).toBeGreaterThan(log1Lines); // Log grew, not replaced
    
    console.log(`✓ Log appended: ${log1Lines} lines → ${log2Lines} lines`);
  }, 30000);

  /**
   * Test 4: Verify conversation.json structure and updates
   * This ensures the session tracking file is properly maintained
   */
  it('should properly update conversation.json on resumption', async () => {
    const testData = `DATA_${Date.now()}`;
    
    // Create initial session
    const response1 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        prompt: `Store this data: ${testData}`
      }
    });

    const sessionId = extractSessionId(response1.result.content[0].text);
    expect(sessionId).toBeTruthy();
    createdSessions.push(sessionId!);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Read initial conversation
    const conv1 = parseConversationJson(sessionId!);
    const initialMessageCount = conv1.messages.length;
    const initialLastUpdated = conv1.lastUpdated;
    
    // Resume session
    const response2 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        continueSessionId: sessionId,
        prompt: 'What data did I give you?'
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Read updated conversation
    const conv2 = parseConversationJson(sessionId!);
    
    // CRITICAL ASSERTIONS
    expect(conv2.sessionId).toBe(sessionId); // Session ID unchanged
    expect(conv2.messages.length).toBeGreaterThan(initialMessageCount); // Messages added
    expect(new Date(conv2.lastUpdated).getTime()).toBeGreaterThan(
      new Date(initialLastUpdated).getTime()
    ); // Timestamp updated
    
    // Verify the conversation contains both interactions
    const allText = JSON.stringify(conv2.messages);
    expect(allText).toContain(testData);
    
    console.log(`✓ Conversation updated: ${initialMessageCount} → ${conv2.messages.length} messages`);
  }, 30000);

  /**
   * Test 5: Multiple resumptions stress test
   * This ensures the system handles multiple sequential resumptions
   */
  it('should handle multiple sequential resumptions', async () => {
    const keys: string[] = [];
    for (let i = 0; i < 3; i++) {
      keys.push(`KEY_${i}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
    }
    
    // Initial session
    const response1 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        prompt: `Remember key 1: ${keys[0]}`
      }
    });

    const sessionId = extractSessionId(response1.result.content[0].text);
    expect(sessionId).toBeTruthy();
    createdSessions.push(sessionId!);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // First resumption
    const response2 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        continueSessionId: sessionId,
        prompt: `Also remember key 2: ${keys[1]}`
      }
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Second resumption
    const response3 = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
      arguments: {
        agentName: 'backend-agent',
        continueSessionId: sessionId,
        prompt: `And key 3: ${keys[2]}. Now tell me all three keys in order.`
      }
    });

    const finalResponse = response3.result.content[0].text;
    
    // CRITICAL ASSERTION: All keys must be remembered
    keys.forEach((key, index) => {
      expect(finalResponse).toContain(key);
      console.log(`✓ Key ${index + 1} remembered: ${key}`);
    });
    
    // Verify log shows all sessions
    const log = readStreamLog(sessionId!);
    expect(log.match(/SESSION NEW:/g)?.length).toBe(1);
    expect(log.match(/SESSION RESUMED:/g)?.length).toBeGreaterThanOrEqual(2);
    
    console.log(`✓ Multiple resumptions successful: All ${keys.length} keys remembered`);
  }, 45000);
});