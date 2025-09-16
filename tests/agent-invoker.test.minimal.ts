import { jest } from '@jest/globals';
import { readFile, rm, mkdtemp, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClaudeAgentInvoker } from '../src/agent-invocation/claude-agent-invoker.js';
import { SessionManager } from '../src/agent-invocation/session-manager.js';

describe('Agent Invoker - Minimal Integration Tests', () => {
  let tempDir: string;
  let sessionManager: SessionManager;
  let agentInvoker: ClaudeAgentInvoker;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'agent-invoker-test-'));
    sessionManager = new SessionManager(tempDir);
    agentInvoker = new ClaudeAgentInvoker(sessionManager);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should create output_streams and reports directories according to README structure', async () => {
    const result = await agentInvoker.invokeAgent('Test prompt', {
      agentName: 'test-agent'
    });

    const outputStreamsDir = path.join(tempDir, 'output_streams', result.sessionId);
    const reportsDir = path.join(tempDir, 'reports', result.sessionId);

    expect(existsSync(outputStreamsDir)).toBe(true);
    expect(existsSync(reportsDir)).toBe(true);
  });

  test('should create real-time session.log (conversation.jsonl) during conversation', async () => {
    const result = await agentInvoker.invokeAgent('Test prompt for logging', {
      agentName: 'test-agent'
    });

    const conversationLogFile = path.join(tempDir, 'output_streams', result.sessionId, 'conversation.jsonl');
    
    expect(existsSync(conversationLogFile)).toBe(true);
    
    const logContent = await readFile(conversationLogFile, 'utf8');
    const logLines = logContent.trim().split('\n');
    
    // Should have at least 2 entries: user prompt + assistant response
    expect(logLines.length).toBeGreaterThanOrEqual(2);
    
    // Parse first entry (user message)
    let userMessage, assistantMessage;
    try {
      userMessage = JSON.parse(logLines[0]);
      assistantMessage = JSON.parse(logLines[1]);
    } catch (error) {
      fail(`Failed to parse conversation log JSON: ${error}`);
    }
    
    expect(userMessage.role).toBe('user');
    expect(userMessage.content).toBe('Test prompt for logging');
    expect(userMessage.timestamp).toBeDefined();
    
    expect(assistantMessage.role).toBe('assistant');
    expect(assistantMessage.content).toBeDefined();
    expect(assistantMessage.timestamp).toBeDefined();
  });

  test('should enforce summary creation in reports directory', async () => {
    const result = await agentInvoker.invokeAgent('Test summary enforcement', {
      agentName: 'test-agent'
    });

    const summaryFile = path.join(tempDir, 'reports', result.sessionId, 'test-agent-summary.json');
    
    expect(existsSync(summaryFile)).toBe(true);
    
    const summaryContent = await readFile(summaryFile, 'utf8');
    const summary = JSON.parse(summaryContent);
    
    // Verify required summary fields
    expect(summary.sessionId).toBe(result.sessionId);
    expect(summary.agentName).toBe('test-agent');
    expect(summary.startTime).toBeDefined();
    expect(summary.endTime).toBeDefined();
    expect(summary.totalMessages).toBeGreaterThan(0);
    expect(summary.toolsUsed).toBeDefined();
    expect(summary.status).toBe('completed');
    expect(summary.results).toBeDefined();
    expect(summary.errors).toBeDefined();
  });

  test('should create session metadata file', async () => {
    const result = await agentInvoker.invokeAgent('Test metadata', {
      agentName: 'test-agent'
    });

    const metadataFile = path.join(tempDir, 'output_streams', result.sessionId, 'session-metadata.json');
    
    expect(existsSync(metadataFile)).toBe(true);
    
    const metadataContent = await readFile(metadataFile, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    expect(metadata.sessionId).toBe(result.sessionId);
    expect(metadata.agentName).toBe('test-agent');
    expect(metadata.startTime).toBeDefined();
    expect(metadata.outputDir).toContain('output_streams');
    expect(metadata.reportsDir).toContain('reports');
  });

  test('should create conversation-complete.json after session closes', async () => {
    const result = await agentInvoker.invokeAgent('Test complete conversation', {
      agentName: 'test-agent'
    });

    const completeFile = path.join(tempDir, 'output_streams', result.sessionId, 'conversation-complete.json');
    
    expect(existsSync(completeFile)).toBe(true);
    
    const completeContent = await readFile(completeFile, 'utf8');
    const conversation = JSON.parse(completeContent);
    
    expect(Array.isArray(conversation)).toBe(true);
    expect(conversation.length).toBeGreaterThanOrEqual(2);
    
    // Verify message structure
    const userMsg = conversation.find((msg: any) => msg.role === 'user');
    const assistantMsg = conversation.find((msg: any) => msg.role === 'assistant');
    
    expect(userMsg).toBeDefined();
    expect(assistantMsg).toBeDefined();
    expect(userMsg.content).toBe('Test complete conversation');
  });

  test('should handle conversation continuation with existing session', async () => {
    const initialResult = await agentInvoker.invokeAgent('Initial prompt', {
      agentName: 'test-agent'
    });

    // Create new session for continuation test
    const session = await sessionManager.createSession('test-agent');
    
    const continuationResult = await agentInvoker.continueConversation(
      session.sessionId,
      'Follow-up prompt'
    );

    const conversationLogFile = path.join(tempDir, 'output_streams', session.sessionId, 'conversation.jsonl');
    
    expect(existsSync(conversationLogFile)).toBe(true);
    
    const logContent = await readFile(conversationLogFile, 'utf8');
    const logLines = logContent.trim().split('\n');
    
    // Should have entries for continuation
    expect(logLines.length).toBeGreaterThanOrEqual(2);
    
    const lastUserMessage = JSON.parse(logLines[logLines.length - 2]);
    expect(lastUserMessage.role).toBe('user');
    expect(lastUserMessage.content).toBe('Follow-up prompt');
    expect(lastUserMessage.metadata?.invocationType).toBe('continuation');
  });

  test('should handle errors and create error summary', async () => {
    // Mock an error scenario by using invalid session for continuation
    try {
      await agentInvoker.continueConversation('invalid-session-id', 'This should fail');
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Session invalid-session-id not found');
    }
  });

  test('should create unique session IDs for concurrent invocations', async () => {
    const promises = [
      agentInvoker.invokeAgent('Concurrent test 1', { agentName: 'agent-1' }),
      agentInvoker.invokeAgent('Concurrent test 2', { agentName: 'agent-2' }),
      agentInvoker.invokeAgent('Concurrent test 3', { agentName: 'agent-3' })
    ];

    const results = await Promise.all(promises);
    
    const sessionIds = results.map(r => r.sessionId);
    const uniqueIds = new Set(sessionIds);
    
    expect(uniqueIds.size).toBe(3);
    
    // Verify all directories were created
    for (const result of results) {
      const outputDir = path.join(tempDir, 'output_streams', result.sessionId);
      const reportsDir = path.join(tempDir, 'reports', result.sessionId);
      
      expect(existsSync(outputDir)).toBe(true);
      expect(existsSync(reportsDir)).toBe(true);
    }
  });

  test('should track tools used in summary', async () => {
    const result = await agentInvoker.invokeAgent('test-runner validation check', {
      agentName: 'test-agent',
      allowedTools: ['test-runner', 'validation']
    });

    const summaryFile = path.join(tempDir, 'reports', result.sessionId, 'test-agent-summary.json');
    const summaryContent = await readFile(summaryFile, 'utf8');
    const summary = JSON.parse(summaryContent);
    
    expect(summary.toolsUsed).toContain('test-runner');
    expect(summary.toolsUsed).toContain('validation');
  });

  test('should maintain proper directory structure as per README', async () => {
    const result = await agentInvoker.invokeAgent('Directory structure test', {
      agentName: 'test-agent'
    });

    // Check output_streams/$session_id/ structure
    const outputDir = path.join(tempDir, 'output_streams', result.sessionId);
    const outputFiles = await readdir(outputDir);
    
    expect(outputFiles).toContain('conversation.jsonl');
    expect(outputFiles).toContain('session-metadata.json');
    expect(outputFiles).toContain('conversation-complete.json');
    expect(outputFiles).toContain('session.log');

    // Check reports/$session_id/ structure  
    const reportsDir = path.join(tempDir, 'reports', result.sessionId);
    const reportFiles = await readdir(reportsDir);
    
    expect(reportFiles).toContain('test-agent-summary.json');
  });

  test('should create human-readable session.log with real-time updates', async () => {
    const result = await agentInvoker.invokeAgent('Test session.log creation', {
      agentName: 'test-agent'
    });

    const sessionLogFile = path.join(tempDir, 'output_streams', result.sessionId, 'session.log');
    
    expect(existsSync(sessionLogFile)).toBe(true);
    
    const logContent = await readFile(sessionLogFile, 'utf8');
    
    // Verify session header
    expect(logContent).toContain('=== Agent Session Started ===');
    expect(logContent).toContain(`Session ID: ${result.sessionId}`);
    expect(logContent).toContain('Agent: test-agent');
    expect(logContent).toContain('=== Real-time Conversation ===');
    
    // Verify user prompt logged
    expect(logContent).toContain('USER PROMPT:');
    expect(logContent).toContain('Test session.log creation');
    
    // Verify assistant response logged
    expect(logContent).toContain('ASSISTANT:');
    
    // Verify timestamps are present
    const timestampRegex = /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/;
    expect(timestampRegex.test(logContent)).toBe(true);
  });
});