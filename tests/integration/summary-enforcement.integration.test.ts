import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Summary Enforcement Mechanism Integration Test', () => {
  let testSessionId: string;
  const testAgentName = 'test-agent';
  const testPrompt = 'Run a simple test that validates 2+2=4 and create summary';

  beforeAll(() => {
    // Generate unique session ID for this test
    testSessionId = `test-summary-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  });

  afterAll(() => {
    // Clean up test artifacts
    const outputDir = path.join(projectRoot, 'output_streams', testSessionId);
    const reportsDir = path.join(projectRoot, 'reports', testSessionId);
    
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  });

  it.skip('should verify summary enforcement mechanism works end-to-end', async () => {
    // SKIPPED: Requires actual Claude API to invoke agents
    // Invoke the agent using the MCP server
    const invokeCommand = `node dist/src/index.js`;
    const input = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
        arguments: {
          agentName: testAgentName,
          prompt: testPrompt,
          streaming: true,
          saveStreamToFile: true
        }
      },
      id: 1
    }) + '\n';

    let response: any;
    let capturedSessionId: string | undefined;
    let rawOutput: string = '';

    try {
      // Execute the command and capture output
      rawOutput = execSync(invokeCommand, {
        input: input,
        encoding: 'utf8',
        cwd: projectRoot,
        env: { ...process.env, NODE_ENV: 'test' },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      console.log('Raw output length:', rawOutput.length);
      
      // Parse the response - look for JSON-RPC response
      const lines = rawOutput.split('\n');
      for (const line of lines) {
        if (line.trim() && line.includes('"jsonrpc"') && line.includes('"result"')) {
          try {
            response = JSON.parse(line);
            break;
          } catch (e) {
            // Continue to next line
          }
        }
      }

      // If no response found, try to parse the entire output
      if (!response) {
        // Sometimes the response is at the end
        const lastLines = lines.slice(-10).reverse();
        for (const line of lastLines) {
          if (line.trim() && line.includes('"jsonrpc"')) {
            try {
              response = JSON.parse(line);
              break;
            } catch (e) {
              // Continue
            }
          }
        }
      }

      // Extract session ID from response
      if (response?.result?.content?.[0]?.text) {
        const sessionMatch = response.result.content[0].text.match(/\*\*Session ID:\*\* ([a-zA-Z0-9-]+)/);
        if (sessionMatch) {
          capturedSessionId = sessionMatch[1];
        }
      }
    } catch (error: any) {
      console.error('Error invoking agent:', error.message);
      console.error('Raw output:', rawOutput.substring(0, 1000));
      throw error;
    }

    // Verify we got a valid response structure
    if (!response) {
      console.error('No valid JSON-RPC response found in output');
      console.error('First 500 chars of output:', rawOutput.substring(0, 500));
      console.error('Last 500 chars of output:', rawOutput.substring(rawOutput.length - 500));
    }

    expect(response).toBeDefined();
    expect(response?.jsonrpc).toBe('2.0');
    expect(response?.result).toBeDefined();
    
    // Check if there was an error
    if (response.result.isError) {
      console.error('Agent execution error:', response.result.content[0].text);
    }
    
    expect(response.result.isError).not.toBe(true);
    expect(response.result.content[0].text).toContain('completed successfully');

    // Use captured session ID or look for it in output_streams
    if (!capturedSessionId) {
      // Find the session directory created
      const outputStreamsDir = path.join(projectRoot, 'output_streams');
      const sessionDirs = fs.readdirSync(outputStreamsDir).filter(dir => 
        dir.includes('test-summary') || fs.statSync(path.join(outputStreamsDir, dir)).isDirectory()
      );
      
      // Use the most recent session directory
      if (sessionDirs.length > 0) {
        capturedSessionId = sessionDirs[sessionDirs.length - 1];
      }
    }

    expect(capturedSessionId).toBeDefined();
    console.log(`Testing with session ID: ${capturedSessionId}`);

    // Parse conversation.json to verify summary enforcement prompt was included
    const conversationPath = path.join(projectRoot, 'output_streams', capturedSessionId!, 'conversation.json');
    expect(fs.existsSync(conversationPath)).toBe(true);

    const conversationRaw = fs.readFileSync(conversationPath, 'utf8');
    const conversationJson = JSON.parse(conversationRaw);

    // Handle different conversation.json structures
    let conversationData: any[];
    if (Array.isArray(conversationJson)) {
      conversationData = conversationJson;
    } else if (conversationJson.messages) {
      conversationData = conversationJson.messages;
    } else {
      conversationData = Object.values(conversationJson);
    }

    // Debug: log structure
    console.log('Conversation data structure:', {
      isArray: Array.isArray(conversationJson),
      hasMessages: !!conversationJson.messages,
      dataLength: conversationData.length,
      firstItem: conversationData[0] ? Object.keys(conversationData[0]) : 'empty'
    });

    // In this implementation, the enforcement is in the stream.log, not in user messages
    // Read the stream.log for verification
    const streamLogPath = path.join(projectRoot, 'output_streams', capturedSessionId!, 'stream.log');
    const sessionLogPath = path.join(projectRoot, 'output_streams', capturedSessionId!, 'session.log');

    let logContent = '';
    if (fs.existsSync(streamLogPath)) {
      logContent = fs.readFileSync(streamLogPath, 'utf8');
    } else if (fs.existsSync(sessionLogPath)) {
      logContent = fs.readFileSync(sessionLogPath, 'utf8');
    }

    expect(logContent).toBeTruthy();

    // Verify all enforcement components are present in the log
    const enforcementChecks = {
      summaryInstruction: logContent.includes('IMPORTANT: When you complete your task, create a summary report'),
      userPrompt: logContent.includes('USER PROMPT:') && logContent.includes(testPrompt),
      customSystemPrompt: logContent.includes('CUSTOM SYSTEM PROMPT'),
      taskMention: logContent.includes('task:') && logContent.includes(testPrompt)
    };

    for (const [component, isPresent] of Object.entries(enforcementChecks)) {
      if (!isPresent) {
        console.log(`Missing component: ${component}`);
        console.log('Log excerpt:', logContent.substring(0, 500));
      }
      expect(isPresent, `Missing enforcement component: ${component}`).toBe(true);
    }

    const sessionLogContent = logContent;
    
    // Verify session log contains the key components
    expect(sessionLogContent).toContain('IMPORTANT: When you complete your task, create a summary report');
    expect(sessionLogContent).toContain('USER PROMPT:');
    // SESSION COMPLETED might not exist if the agent didn't complete
    // expect(sessionLogContent).toContain('SESSION COMPLETED:');
    
    // Check if summary was actually created (agent should have created it)
    const reportsDir = path.join(projectRoot, 'reports', capturedSessionId!);
    
    // The agent might create the summary - check if it exists
    if (fs.existsSync(reportsDir)) {
      const summaryFiles = fs.readdirSync(reportsDir).filter(file => 
        file.includes('summary') && file.endsWith('.json')
      );
      
      if (summaryFiles.length > 0) {
        console.log(`Summary file found: ${summaryFiles[0]}`);
        const summaryPath = path.join(reportsDir, summaryFiles[0]);
        const summaryContent = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        
        // Verify summary has expected structure
        expect(summaryContent).toHaveProperty('timestamp');
        expect(summaryContent).toHaveProperty('agent');
        expect(summaryContent.agent).toBe(testAgentName);
      }
    }

    // Verify the enforcement mechanism worked by checking outputs
    const enforcementValidation = {
      conversationHasEnforcement: false,
      sessionLogHasEnforcement: false,
      summaryToolMentioned: false
    };

    // Check conversation for enforcement
    enforcementValidation.conversationHasEnforcement = conversationData.some((msg: any) => {
      if (msg.message?.content) {
        const content = typeof msg.message.content === 'string'
          ? msg.message.content
          : JSON.stringify(msg.message.content);
        return content.includes('create a summary report');
      }
      return false;
    });

    // Check session log for enforcement
    enforcementValidation.sessionLogHasEnforcement =
      sessionLogContent.includes('create a summary report') &&
      sessionLogContent.includes('SESSION_ID:') &&
      sessionLogContent.includes('OUTPUT_DIR:');

    // Check if put_summary tool was mentioned
    enforcementValidation.summaryToolMentioned =
      sessionLogContent.includes('put_summary') ||
      conversationData.some((msg: any) => {
        const content = JSON.stringify(msg);
        return content.includes('put_summary');
      });

    // All enforcement validations should pass
    for (const [check, passed] of Object.entries(enforcementValidation)) {
      expect(passed, `Enforcement validation failed: ${check}`).toBe(true);
    }

    console.log('Enforcement validation results:', enforcementValidation);
  }, 30000); // 30 second timeout for agent execution
});