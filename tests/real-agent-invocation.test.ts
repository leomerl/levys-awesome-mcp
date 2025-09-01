import { jest } from '@jest/globals';
import { readFile, rm, mkdtemp, access } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeAgentInvoker } from '../src/agent-invocation/claude-agent-invoker.js';
import { SessionManager } from '../src/agent-invocation/session-manager.js';

describe('Real Agent Invocation Tests', () => {
  let tempDir: string;
  let sessionManager: SessionManager;
  let agentInvoker: ClaudeAgentInvoker;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'real-agent-test-'));
    sessionManager = new SessionManager(tempDir);
    agentInvoker = new ClaudeAgentInvoker(sessionManager);
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should create real-time session.log with streaming updates', async () => {
    const result = await agentInvoker.invokeAgent('Test streaming behavior', {
      agentName: 'testing-agent'
    });

    const sessionLogFile = path.join(tempDir, 'output_streams', result.sessionId, 'session.log');
    
    // Verify session.log exists and has real-time content
    expect(existsSync(sessionLogFile)).toBe(true);
    
    const logContent = await readFile(sessionLogFile, 'utf8');
    
    // Verify streaming format
    expect(logContent).toContain('=== Agent Session Started ===');
    expect(logContent).toContain(`Session ID: ${result.sessionId}`);
    expect(logContent).toContain('=== Real-time Conversation ===');
    expect(logContent).toContain('USER PROMPT:');
    expect(logContent).toContain('Test streaming behavior');
    expect(logContent).toContain('ASSISTANT:');
    
    // Verify timestamps are present and properly formatted
    const timestampRegex = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
    expect(timestampRegex.test(logContent)).toBe(true);
  });

  test('should verify conversation.jsonl has proper JSONL format', async () => {
    const result = await agentInvoker.invokeAgent('Test JSONL format', {
      agentName: 'testing-agent'
    });

    const conversationFile = path.join(tempDir, 'output_streams', result.sessionId, 'conversation.jsonl');
    
    expect(existsSync(conversationFile)).toBe(true);
    
    const content = await readFile(conversationFile, 'utf8');
    const lines = content.trim().split('\n');
    
    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      const parsed = JSON.parse(line);
      expect(parsed.role).toMatch(/^(user|assistant)$/);
      expect(parsed.content).toBeDefined();
      expect(parsed.timestamp).toBeDefined();
    }
  });

  test('should create proper summary with all required fields', async () => {
    const result = await agentInvoker.invokeAgent('Test summary creation', {
      agentName: 'testing-agent',
      allowedTools: ['test-runner', 'validation']
    });

    const summaryFile = path.join(tempDir, 'reports', result.sessionId, 'testing-agent-summary.json');
    
    expect(existsSync(summaryFile)).toBe(true);
    
    const summaryContent = await readFile(summaryFile, 'utf8');
    const summary = JSON.parse(summaryContent);
    
    // Verify all required summary fields
    expect(summary.sessionId).toBe(result.sessionId);
    expect(summary.agentName).toBe('testing-agent');
    expect(summary.startTime).toBeDefined();
    expect(summary.endTime).toBeDefined();
    expect(summary.totalMessages).toBeGreaterThan(0);
    expect(Array.isArray(summary.toolsUsed)).toBe(true);
    expect(summary.status).toBe('completed');
    expect(summary.results).toBeDefined();
    expect(Array.isArray(summary.errors)).toBe(true);
    
    // Verify tools were tracked
    expect(summary.toolsUsed).toContain('test-runner');
    expect(summary.toolsUsed).toContain('validation');
  });

  test('should handle session continuation properly', async () => {
    // Create initial session
    const session = await sessionManager.createSession('testing-agent');
    
    // First message
    await agentInvoker.continueConversation(session.sessionId, 'Initial message');
    
    // Continue conversation
    await agentInvoker.continueConversation(session.sessionId, 'Follow-up message');
    
    const conversationFile = path.join(tempDir, 'output_streams', session.sessionId, 'conversation.jsonl');
    const content = await readFile(conversationFile, 'utf8');
    const lines = content.trim().split('\n');
    
    // Should have multiple message pairs
    expect(lines.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant messages
    
    // Verify continuation metadata
    const messages = lines.map(line => JSON.parse(line));
    const continuationMessage = messages.find(msg => 
      msg.role === 'user' && msg.content === 'Follow-up message'
    );
    
    expect(continuationMessage).toBeDefined();
    expect(continuationMessage.metadata?.invocationType).toBe('continuation');
  });

  test('should validate file access patterns', async () => {
    const result = await agentInvoker.invokeAgent('Test file access', {
      agentName: 'testing-agent'
    });

    // Verify all expected files exist
    const outputDir = path.join(tempDir, 'output_streams', result.sessionId);
    const reportsDir = path.join(tempDir, 'reports', result.sessionId);
    
    const expectedFiles = [
      path.join(outputDir, 'conversation.jsonl'),
      path.join(outputDir, 'session-metadata.json'),
      path.join(outputDir, 'conversation-complete.json'),
      path.join(outputDir, 'session.log'),
      path.join(reportsDir, 'testing-agent-summary.json')
    ];
    
    for (const file of expectedFiles) {
      try {
        await access(file);
      } catch (error) {
        fail(`Expected file ${file} should exist but was not accessible`);
      }
    }
  });

  test('should handle error scenarios gracefully', async () => {
    // Test invalid session continuation
    try {
      await agentInvoker.continueConversation('invalid-session-id', 'This should fail');
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Session invalid-session-id not found');
    }
  });
});