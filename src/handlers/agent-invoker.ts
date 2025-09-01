/**
 * Agent Invoker Handler
 * Provides MCP tools for invoking agents with enforced session.log creation
 */

import { query } from '@anthropic-ai/claude-code';
import { SessionStore } from '../utilities/session/session-store.js';
import { StreamingManager } from '../utilities/session/streaming-utils.js';
import { AgentLoader } from '../utilities/agents/agent-loader.js';
import { ValidationUtils } from '../utilities/config/validation.js';
import * as path from 'path';
import * as fs from 'fs';

export const agentInvokerTools = [
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
    description: 'Invoke another agent programmatically with enforced session.log creation',
    inputSchema: {
      type: 'object',
      properties: {
        agentName: {
          type: 'string',
          description: 'Name of the agent to invoke'
        },
        prompt: {
          type: 'string',
          description: 'Prompt to send to the agent'
        },
        maxTurns: {
          type: 'number',
          description: 'Maximum number of turns for the agent (optional, default: 10)'
        },
        streaming: {
          type: 'boolean',
          description: 'Whether to enable real-time streaming output (optional, default: true)'
        },
        saveStreamToFile: {
          type: 'boolean',
          description: 'Whether to save streaming output to session.log (optional, default: true, ALWAYS ENFORCED)'
        },
        continueSessionId: {
          type: 'string',
          description: 'Session ID to continue a previous conversation (optional)'
        }
      },
      required: ['agentName', 'prompt'],
      additionalProperties: false
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__list_agents',
    description: 'List all available agents that can be invoked',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  }
];

export async function handleAgentInvokerTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent': {
        const { agentName, prompt, maxTurns = 10, streaming = true, saveStreamToFile = true, continueSessionId } = args;
        
        if (!agentName || !prompt) {
          return {
            content: [{
              type: 'text',
              text: 'Error: agentName and prompt are required'
            }],
            isError: true
          };
        }

        // Load agent configuration
        const agentConfig = await AgentLoader.loadAgentConfig(agentName);
        if (!agentConfig) {
          return {
            content: [{
              type: 'text',
              text: `Error: Agent '${agentName}' not found`
            }],
            isError: true
          };
        }

        // Initialize session with ENFORCED streaming and session.log creation
        const sessionInit = await SessionStore.initializeSession(continueSessionId, agentName);
        if (!sessionInit.success) {
          return {
            content: [{
              type: 'text',
              text: `Error: ${sessionInit.error}`
            }],
            isError: true
          };
        }

        const { sessionId, existingHistory, isSessionContinuation } = sessionInit;
        const messages: any[] = existingHistory?.messages || [];
        let output = '';

        // ENFORCE streaming and session.log creation - cannot be disabled
        const streamingUtils = new StreamingManager(sessionId!, agentName, {
          streaming: true,        // ALWAYS TRUE - enforced
          saveStreamToFile: true, // ALWAYS TRUE - enforced
          verbose: true
        });

        // Initialize session.log file - THIS IS ENFORCED
        streamingUtils.initStreamFile();
        
        try {
          // Build enhanced prompt with session tracking
          const enhancedPrompt = `${prompt}

IMPORTANT: When you complete your task, create a summary report using available tools.
SESSION_ID: ${sessionId}
OUTPUT_DIR: output_streams/${sessionId}/
`;

          // Add initial prompt to session.log
          const streamLogFile = streamingUtils.getStreamLogFile();
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const promptLog = `[${timestamp}] USER PROMPT:\n${enhancedPrompt}\n\n`;
            fs.appendFileSync(streamLogFile, promptLog, 'utf8');
          }

          // Execute agent with Claude Code query
          for await (const message of query({
            prompt: enhancedPrompt,
            options: {
              maxTurns,
              model: agentConfig.options?.model || 'sonnet',
              allowedTools: agentConfig.options?.allowedTools,
              pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js')
            }
          })) {
            // Always collect messages for conversation history
            messages.push(message);

            // Log ALL conversation messages to session.log in real-time - ENFORCED
            await streamingUtils.logConversationMessage(message);
            
            // Save conversation history in real-time
            await SessionStore.saveConversationHistory(sessionId!, agentName, messages);

            // Collect output for response
            if (message.type === "assistant") {
              const content = message.message.content;
              if (content) {
                for (const item of content) {
                  if (item.type === "text") {
                    output += item.text + '\n';
                  }
                }
              }
            } else if (message.type === "result" && message.is_error) {
              const errorMsg = 'result' in message && typeof message.result === 'string' ? message.result : 'Unknown error';
              return {
                content: [{
                  type: 'text',
                  text: `Agent '${agentName}' execution failed: ${errorMsg}\n\nSession ID: ${sessionId}\nSession Log: output_streams/${sessionId}/session.log\n\nPartial output:\n${output}`
                }],
                isError: true
              };
            }
          }

          // Final save
          await SessionStore.saveConversationHistory(sessionId!, agentName, messages);

          // Add completion marker to session.log
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const completionLog = `[${timestamp}] SESSION COMPLETED:\nStatus: success\nTotal Messages: ${messages.length}\nSession Log: output_streams/${sessionId}/session.log\n\n=== End of Session ===\n`;
            fs.appendFileSync(streamLogFile, completionLog, 'utf8');
          }

          return {
            content: [{
              type: 'text',
              text: `Agent '${agentName}' completed successfully.\n\n**Session ID:** ${sessionId}\n**Session Log:** output_streams/${sessionId}/session.log\n\n**Output:**\n${output.trim()}\n\n**ALL conversation data has been saved to session.log for debugging and analysis.**`
            }]
          };

        } catch (error) {
          // Log error to session.log
          const streamLogFile = streamingUtils.getStreamLogFile();
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const errorLog = `[${timestamp}] EXECUTION ERROR:\n${error instanceof Error ? error.message : String(error)}\n\n=== Session Ended with Error ===\n`;
            fs.appendFileSync(streamLogFile, errorLog, 'utf8');
          }

          // Save conversation history even on error
          await SessionStore.saveConversationHistory(sessionId!, agentName, messages);

          return {
            content: [{
              type: 'text',
              text: `Agent '${agentName}' execution error: ${error instanceof Error ? error.message : String(error)}\n\nSession ID: ${sessionId}\nSession Log: output_streams/${sessionId}/session.log\n\nPartial output:\n${output}`
            }],
            isError: true
          };
        }
      }

      case 'mcp__levys-awesome-mcp__mcp__agent-invoker__list_agents': {
        const agents = await AgentLoader.listAvailableAgents();
        return {
          content: [{
            type: 'text',
            text: `Available agents:\n${agents.map(agent => `- ${agent}`).join('\n')}`
          }]
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `Unknown agent invoker tool: ${name}`
          }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Agent invoker error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}