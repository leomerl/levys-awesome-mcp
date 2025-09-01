/**
 * Streaming Utilities
 * Handles real-time output streaming and logging for agent sessions
 */

import * as fs from 'fs';
import { PathConfig } from '../config/paths.js';
import { FileOperations } from '../fs/file-operations.js';
import { StreamingUtils } from '../../types/session.js';

export class StreamingManager implements StreamingUtils {
  private streamLogFile: string | null = null;
  private streamingOutput = '';
  private verboseOutput = '';

  constructor(
    private sessionId: string,
    private agentName: string,
    private params: { streaming?: boolean; saveStreamToFile?: boolean; verbose?: boolean }
  ) {}

  initStreamFile(): boolean {
    if (this.params.streaming || this.params.saveStreamToFile) {
      try {
        const outputStreamsDir = PathConfig.getSessionDirectory(this.sessionId);
        fs.mkdirSync(outputStreamsDir, { recursive: true });
        this.streamLogFile = PathConfig.getStreamFilePath(this.sessionId);
        
        // Only write header if file doesn't exist (new session)
        if (!FileOperations.fileExists(this.streamLogFile)) {
          const header = `=== Agent Session Started ===\n` +
                        `Session ID: ${this.sessionId}\n` +
                        `Agent: ${this.agentName}\n` +
                        `Started: ${new Date().toISOString()}\n` +
                        `=== Real-time Conversation ===\n\n`;
          fs.writeFileSync(this.streamLogFile, header, 'utf8');
        } else {
          // Append session continuation marker
          const continuationMarker = `\n=== Session Continued ===\n` +
                                    `Continued at: ${new Date().toISOString()}\n\n`;
          fs.appendFileSync(this.streamLogFile, continuationMarker, 'utf8');
        }
        console.log(`Live streaming to: ${this.streamLogFile}`);
        return true;
      } catch (error) {
        console.error(`Failed to initialize stream file:`, error);
        return false;
      }
    }
    return false;
  }

  appendToStream(message: string): void {
    if (this.streamLogFile) {
      try {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const logLine = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(this.streamLogFile, logLine, 'utf8');
      } catch (error) {
        console.error(`Failed to append to stream:`, error);
      }
    }
  }

  addStreamingOutput(message: string, level: 'info' | 'debug' | 'tool' = 'info'): void {
    if (this.params.streaming !== false) {
      this.streamingOutput += message + '\n';
      console.log(message);
    }
  }

  addVerboseOutput(message: string): void {
    if (this.params.verbose !== false) {
      this.verboseOutput += message + '\n';
      console.log(message);
    }
  }

  getStreamingOutput(): string {
    return this.streamingOutput;
  }

  getVerboseOutput(): string {
    return this.verboseOutput;
  }

  getStreamLogFile(): string | null {
    return this.streamLogFile;
  }

  /**
   * Log conversation messages in real-time
   */
  async logConversationMessage(message: any): Promise<void> {
    const timestamp = new Date().toISOString();
    
    if (!this.streamLogFile) return;
    
    try {
      if (message.type === "assistant" && message.message?.content) {
        // Log assistant responses to stream
        for (const item of message.message.content) {
          if (item.type === "text") {
            fs.appendFileSync(this.streamLogFile, `[${timestamp}] ASSISTANT:\n${item.text}\n\n`, 'utf8');
          } else if (item.type === "tool_use") {
            fs.appendFileSync(this.streamLogFile, `[${timestamp}] TOOL_USE: ${item.name}\n${JSON.stringify(item.input, null, 2)}\n\n`, 'utf8');
          }
        }
      } else if (message.type === "user" && message.message?.content?.[0]?.type === "tool_result") {
        // Log tool results to stream
        const toolResult = message.message.content[0];
        let resultContent = '';
        
        if (toolResult.content?.[0]?.text) {
          resultContent = toolResult.content[0].text;
        } else if (typeof toolResult.content === "string") {
          resultContent = toolResult.content;
        }
        
        fs.appendFileSync(this.streamLogFile, `[${timestamp}] TOOL_RESULT: ${toolResult.name} ${toolResult.is_error ? '(ERROR)' : '(SUCCESS)'}\n${resultContent}\n\n`, 'utf8');
      }
    } catch (error) {
      console.error(`Failed to log conversation message:`, error);
    }
  }

  /**
   * Process and log messages in real-time
   */
  processMessage(message: any): void {
    if (message.type === "assistant") {
      this.addStreamingOutput(`Processing assistant response`, 'debug');
      
      const content = message.message.content;
      if (content) {
        for (const item of content) {
          if (item.type === "text") {
            const text = item.text;
            this.addVerboseOutput(`Agent response: ${text}`);
            // Stream the actual assistant response text in real-time
            this.addStreamingOutput(`Assistant: ${text}`, 'info');
          }
        }
      }
    } else if (message.type === "user") {
      const toolResult = message.message.content?.[0];
      if (toolResult?.type === "tool_result") {
        this.addVerboseOutput(`Tool executed: ${toolResult.name}`);
        this.addStreamingOutput(`Tool execution completed: ${toolResult.tool_use_id || 'unknown'}`, 'tool');
        
        if (toolResult.content?.[0]?.text) {
          const resultText = toolResult.content[0].text;
          this.addVerboseOutput(`Tool output: ${resultText.substring(0, 200)}${resultText.length > 200 ? '...' : ''}`);
          this.addStreamingOutput(`Tool output: ${resultText.length} characters ${toolResult.is_error ? '(ERROR)' : '(SUCCESS)'}`, 'tool');
        } else if (typeof toolResult.content === "string") {
          this.addVerboseOutput(`Tool output: ${toolResult.content.substring(0, 200)}${toolResult.content.length > 200 ? '...' : ''}`);
          this.addStreamingOutput(`Tool output: ${toolResult.content.length} characters`, 'tool');
        }
      } else if (toolResult?.type === "tool_use") {
        this.addVerboseOutput(`Using tool: ${toolResult.name}`);
        this.addStreamingOutput(`Invoking tool: ${toolResult.name}`, 'tool');
        
        if (toolResult.input) {
          const inputStr = typeof toolResult.input === 'object' 
            ? JSON.stringify(toolResult.input).substring(0, 100)
            : String(toolResult.input).substring(0, 100);
          this.addStreamingOutput(`Tool input: ${Object.keys(toolResult.input || {}).join(', ')}`, 'tool');
        }
      }
    } else if (message.type === "result") {
      if (message.is_error) {
        this.addVerboseOutput(`Agent execution failed: ${message.error_message || 'Unknown error'}`);
        this.addStreamingOutput(`Agent execution failed: ${message.error_message || 'Unknown error'}`, 'info');
      } else {
        this.addVerboseOutput(`Agent execution completed successfully`);
        this.addStreamingOutput(`Agent execution completed successfully`, 'info');
      }
    }
  }
}