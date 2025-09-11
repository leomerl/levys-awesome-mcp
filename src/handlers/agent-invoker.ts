/**
 * Agent Invoker Handler
 * Provides MCP tools for invoking agents with enforced session.log creation
 */

import { query } from '@anthropic-ai/claude-code';
import { SessionStore } from '../utilities/session/session-store.js';
import { StreamingManager } from '../utilities/session/streaming-utils.js';
import { AgentLoader } from '../utilities/agents/agent-loader.js';
import { PermissionManager } from '../utilities/agents/permission-manager.js';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

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
        const { agentName, prompt, continueSessionId } = args;
        
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

        // For resumed sessions, use the existing session ID
        // For new sessions, we'll capture Claude Code's actual session ID on first message
        let sessionId: string | undefined = continueSessionId;
        let streamingUtils: StreamingManager | undefined;
        let streamLogFile: string | undefined;
        
        const messages: any[] = [];
        let output = '';
        let claudeCodeSessionId: string | undefined; // To capture Claude Code's actual session ID
        let isFirstMessage = true;
        
        try {
          // Build enhanced prompt (CLI --resume will handle session context automatically)
          const enhancedPrompt = `${prompt}

IMPORTANT: When you complete your task, create a summary report using available tools.
SESSION_ID: ${sessionId}
OUTPUT_DIR: output_streams/${sessionId}/
`;

          // Log will be added after we get the session ID

          // Get agent permissions
          let permissions: { allowedTools: string[]; disallowedTools: string[] };
          let restrictionPrompt = '';
          
          if (agentConfig.options?.allowedTools) {
            // Legacy TypeScript agent config with ENHANCED dynamic restrictions
            const permissionConfig = {
              allowedTools: agentConfig.options.allowedTools,
              agentRole: 'write-restricted' as const, // Default role for legacy configs
              useDynamicRestrictions: true // ENABLE dynamic restrictions for all agents
            };
            
            permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions(permissionConfig);
            
            // Generate tool restriction prompt for injection - subtract allowed tools first
            try {
              const promptDisallowedTools = permissions.disallowedTools.filter(tool => 
                !permissions.allowedTools.includes(tool)
              );
              
              restrictionPrompt = await PermissionManager.generateToolRestrictionPrompt(promptDisallowedTools);
              console.log(`[AgentInvoker] Generated restriction prompt with ${promptDisallowedTools.length} disallowed tools (prompt length: ${restrictionPrompt.length})`);
            } catch (error) {
              console.error(`[AgentInvoker] Error generating restriction prompt:`, error);
              restrictionPrompt = '';
            }
          } else {
            // Default permissions
            const defaultConfig = {
              allowedTools: [],
              agentRole: 'read-only' as const,
              useDynamicRestrictions: true
            };
            permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions(defaultConfig);
            
            // Generate restriction prompt for default config - filter out allowed tools
            try {
              const promptDisallowedTools = permissions.disallowedTools.filter(tool => 
                !permissions.allowedTools.includes(tool)
              );
              restrictionPrompt = await PermissionManager.generateToolRestrictionPrompt(promptDisallowedTools);
              console.log(`[AgentInvoker] Generated restriction prompt for default config with ${promptDisallowedTools.length} disallowed tools (${restrictionPrompt.length} characters)`);
            } catch (error) {
              console.error(`[AgentInvoker] Error generating restriction prompt for default config:`, error);
              restrictionPrompt = '';
            }
          }

          // Build the final prompt with restriction warnings injected
          let finalPrompt = enhancedPrompt;
          
          // ALWAYS inject tool restriction information
          if (restrictionPrompt && restrictionPrompt.trim().length > 0) {
            finalPrompt = enhancedPrompt + restrictionPrompt;
            console.log(`[AgentInvoker] Injected tool restriction prompt (${restrictionPrompt.length} characters)`);
          } else {
            // Generate a basic restriction warning when no specific restrictions are calculated
            const basicRestrictionPrompt = `\n\n🚫 CRITICAL TOOL RESTRICTIONS 🚫\nYou are STRICTLY FORBIDDEN from using these tools:\n- TodoWrite: This tool is explicitly blocked and will cause errors\n- Task: This tool is explicitly blocked and will cause errors\n- Write: This tool is explicitly blocked and will cause errors\n- Edit: This tool is explicitly blocked and will cause errors\n- MultiEdit: This tool is explicitly blocked and will cause errors\n\nIf you attempt to use any of these forbidden tools, your execution will fail.\nUse only the tools explicitly listed in your allowed tools configuration.\n\n\n`;
            finalPrompt = enhancedPrompt + basicRestrictionPrompt;
            console.log(`[AgentInvoker] Added basic tool restriction warning (no dynamic restrictions calculated)`);
          }

          // Prompt log will be added after we get the session ID

          // CRITICAL FIX: Ensure no allowed tools are in disallowed list before passing to agent
          const finalDisallowedTools = permissions.disallowedTools.filter(tool => 
            !permissions.allowedTools.includes(tool)
          );

          // Build query options with conditional resume parameter
          const queryOptions: any = {
            model: agentConfig.options?.model || 'sonnet',
            allowedTools: permissions.allowedTools, // Use managed permissions
            disallowedTools: finalDisallowedTools, // Use filtered disallowed tools
            permissionMode: 'acceptEdits',
            pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
            mcpServers: {
              "levys-awesome-mcp": {
                command: "node",
                args: ["dist/src/index.js"]
              }
            }
          };

          // Only add resume parameter if continueSessionId is provided
          if (continueSessionId) {
            queryOptions.resume = String(continueSessionId);
          }

          for await (const message of query({
            prompt: finalPrompt, // Use the final prompt with injected restrictions
            options: queryOptions
          })) {
            // Always collect messages for conversation history
            messages.push(message);

            // Capture Claude Code's actual session ID and initialize streaming on first message
            if (isFirstMessage && (message.type === 'system' || message.type === 'assistant' || message.type === 'result')) {
              // Try to get session ID from message
              if (message.session_id) {
                claudeCodeSessionId = message.session_id;
                console.log(`[AgentInvoker] Captured Claude Code session ID: ${claudeCodeSessionId}`);
              } else if (message.type === 'system' && message.subtype === 'init' && message.uuid) {
                // Fallback to UUID if no session_id
                claudeCodeSessionId = message.uuid;
                console.log(`[AgentInvoker] Using UUID as session ID: ${claudeCodeSessionId}`);
              }
              
              // Use Claude Code's session ID if we got it, otherwise generate one
              if (!sessionId) {
                sessionId = claudeCodeSessionId || randomUUID();
                console.log(`[AgentInvoker] Using session ID for directory: ${sessionId}`);
              }
              
              // Now initialize streaming with the correct session ID
              if (!streamingUtils && sessionId) {
                // Ensure directory exists
                const sessionDir = path.join('output_streams', sessionId);
                if (!fs.existsSync(sessionDir)) {
                  fs.mkdirSync(sessionDir, { recursive: true });
                }
                
                streamingUtils = new StreamingManager(sessionId, agentName, {
                  streaming: true,
                  saveStreamToFile: true,
                  verbose: true
                });
                streamingUtils.initStreamFile();
                streamLogFile = streamingUtils.getStreamLogFile() || undefined;
                
                // Log initial info
                if (streamLogFile) {
                  const timestamp = new Date().toISOString();
                  const mode = continueSessionId ? 'RESUMED' : 'NEW';
                  const debugLog = `[${timestamp}] SESSION ${mode}:\nAgent: ${agentName}\nSession ID: ${sessionId}\nClaude Code Session ID: ${claudeCodeSessionId || 'pending'}\n\n`;
                  fs.appendFileSync(streamLogFile, debugLog, 'utf8');
                  
                  // Log the prompt
                  const promptLog = `[${timestamp}] USER PROMPT:\n${finalPrompt}\n\n`;
                  fs.appendFileSync(streamLogFile, promptLog, 'utf8');
                }
              }
              
              isFirstMessage = false;
            }
            
            // Update session ID if we get it later
            if (!claudeCodeSessionId && message.session_id) {
              claudeCodeSessionId = message.session_id;
              console.log(`[AgentInvoker] Updated Claude Code session ID: ${claudeCodeSessionId}`);
            }

            // Log ALL conversation messages to session.log in real-time - ENFORCED
            if (streamingUtils) {
              await streamingUtils.logConversationMessage(message);
            }
            
            // Save conversation history in real-time (only if we have sessionId)
            if (sessionId) {
              await SessionStore.saveConversationHistory(sessionId, agentName, messages);
            }

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
              // Use actual session ID or a fallback
              const errorSessionId = claudeCodeSessionId || sessionId || 'unknown';
              const logPath = sessionId ? `output_streams/${sessionId}/session.log` : 'not created';
              return {
                content: [{
                  type: 'text',
                  text: `Agent '${agentName}' execution failed: ${errorMsg}\n\nSession ID: ${errorSessionId}\nSession Log: ${logPath}\n\nPartial output:\n${output}`
                }],
                isError: true
              };
            }
          }

          // Ensure we have a session ID
          if (!sessionId) {
            sessionId = claudeCodeSessionId || randomUUID();
          }
          
          // Final save
          await SessionStore.saveConversationHistory(sessionId, agentName, messages);

          // Add completion marker to session.log
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const completionLog = `[${timestamp}] SESSION COMPLETED:\nStatus: success\nTotal Messages: ${messages.length}\nSession Log: output_streams/${sessionId}/session.log\n\n=== End of Session ===\n`;
            fs.appendFileSync(streamLogFile, completionLog, 'utf8');
          }

          // Use Claude Code's actual session ID for returning to user
          const returnSessionId = claudeCodeSessionId || sessionId;
          
          return {
            content: [{
              type: 'text',
              text: `Agent '${agentName}' completed successfully.\n\n**Session ID:** ${returnSessionId}\n**Session Log:** output_streams/${sessionId}/session.log\n\n**Output:**\n${output.trim()}\n\n**ALL conversation data has been saved to session.log for debugging and analysis.**`
            }]
          };

        } catch (error) {
          // Log error to session.log
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const errorLog = `[${timestamp}] EXECUTION ERROR:\n${error instanceof Error ? error.message : String(error)}\n\n=== Session Ended with Error ===\n`;
            fs.appendFileSync(streamLogFile, errorLog, 'utf8');
          }

          // Save conversation history even on error (if we have sessionId)
          if (sessionId) {
            await SessionStore.saveConversationHistory(sessionId, agentName, messages);
          }

          return {
            content: [{
              type: 'text',
              text: `Agent '${agentName}' execution error: ${error instanceof Error ? error.message : String(error)}\n\nSession ID: ${claudeCodeSessionId || sessionId || 'unknown'}\nSession Log: ${sessionId ? `output_streams/${sessionId}/session.log` : 'not created'}\n\nPartial output:\n${output}`
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
        throw new Error(`Unknown agent invoker tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in agent invoker tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}