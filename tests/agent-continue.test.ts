import { jest } from '@jest/globals';
import { readFile, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeAgentInvoker } from '../src/agent-invocation/claude-agent-invoker.js';
import { SessionManager } from '../src/agent-invocation/session-manager.js';

describe('Agent Continue Session Tests', () => {
  let tempDir: string;
  let sessionManager: SessionManager;
  let agentInvoker: ClaudeAgentInvoker;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'agent-continue-test-'));
    sessionManager = new SessionManager(tempDir);
    agentInvoker = new ClaudeAgentInvoker(sessionManager);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should continue existing session with proper context', async () => {
    // Create initial session
    const session = await sessionManager.createSession('testing-agent');
    
    // First message
    await agentInvoker.continueConversation(session.sessionId, 'Initial message');
    
    // Continue conversation
    await agentInvoker.continueConversation(session.sessionId, 'Follow-up message');
    
    const conversationFile = path.join(tempDir, 'output_streams', session.sessionId, 'conversation.jsonl');
    const content = await readFile(conversationFile, 'utf8');
    const lines = content.trim().split('\n');
    
    expect(lines.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant messages
    
    const messages = lines.map(line => JSON.parse(line));
    const continuationMessage = messages.find(msg => 
      msg.role === 'user' && msg.content === 'Follow-up message'
    );
    
    expect(continuationMessage).toBeDefined();
    expect(continuationMessage.metadata?.invocationType).toBe('continuation');
  });

  test('should maintain session state across continuations', async () => {
    const session = await sessionManager.createSession('testing-agent');
    
    // Multiple continuations
    await agentInvoker.continueConversation(session.sessionId, 'Message 1');
    await agentInvoker.continueConversation(session.sessionId, 'Message 2');
    await agentInvoker.continueConversation(session.sessionId, 'Message 3');
    
    const sessionLogFile = path.join(tempDir, 'output_streams', session.sessionId, 'session.log');
    const logContent = await readFile(sessionLogFile, 'utf8');
    
    expect(logContent).toContain('Message 1');
    expect(logContent).toContain('Message 2');
    expect(logContent).toContain('Message 3');
    expect(logContent).toContain('=== Conversation Continued ===');
  });

  test('should update summary with continuation data', async () => {
    const session = await sessionManager.createSession('testing-agent');
    
    await agentInvoker.continueConversation(session.sessionId, 'Test continuation summary');
    
    const summaryFile = path.join(tempDir, 'reports', session.sessionId, 'testing-agent-summary.json');
    const summaryContent = await readFile(summaryFile, 'utf8');
    const summary = JSON.parse(summaryContent);
    
    expect(summary.sessionId).toBe(session.sessionId);
    expect(summary.totalMessages).toBeGreaterThan(0);
    expect(summary.status).toBe('active');
  });

  test('should fail for invalid session ID', async () => {
    try {
      await agentInvoker.continueConversation('invalid-session-id', 'This should fail');
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Session invalid-session-id not found');
    }
  });

  test('should preserve conversation order in JSONL', async () => {
    const session = await sessionManager.createSession('testing-agent');
    
    await agentInvoker.continueConversation(session.sessionId, 'First');
    await agentInvoker.continueConversation(session.sessionId, 'Second');
    
    const conversationFile = path.join(tempDir, 'output_streams', session.sessionId, 'conversation.jsonl');
    const content = await readFile(conversationFile, 'utf8');
    const lines = content.trim().split('\n');
    const messages = lines.map(line => JSON.parse(line));
    
    const userMessages = messages.filter(msg => msg.role === 'user');
    expect(userMessages[0].content).toBe('First');
    expect(userMessages[1].content).toBe('Second');
    
    // Verify timestamps are in order
    expect(new Date(userMessages[0].timestamp).getTime())
      .toBeLessThan(new Date(userMessages[1].timestamp).getTime());
  });
});