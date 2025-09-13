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
    name: 'invoke_agent',
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
    name: 'list_agents',
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
    // Handle both short and prefixed names
    const normalizedName = name.includes('invoke_agent') ? 'invoke_agent' : 
                          name.includes('list_agents') ? 'list_agents' : name;
    
    switch (normalizedName) {
      case 'invoke_agent': {
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
        let claudeCodeSessionId: string | undefined; // To capture Claude Code's actual session ID
        let isFirstMessage = true;
        let agentCompleted = false; // Track if agent completed successfully
        
        try {
          // Step 1: Create specialized prompt (systemPrompt + task)
          let specializedPrompt = '';
          if (agentConfig.options?.systemPrompt) {
            specializedPrompt = `${agentConfig.options.systemPrompt}

task: ${prompt}`;
          } else {
            specializedPrompt = `task: ${prompt}`;
          }

          // Step 2: Build enhanced prompt (session info + restrictions)
          const sessionInfo = `

IMPORTANT: When you complete your task, create a summary report using available tools.
SESSION_ID: ${sessionId}
OUTPUT_DIR: output_streams/${sessionId}/
`;

          // Helper function to generate restriction prompt
          const generateRestrictionPrompt = async (
            disallowedTools: string[], 
            allowedTools: string[],
            configType: string
          ): Promise<string> => {
            try {
              // Filter out tools that are actually allowed (handle both short and prefixed names)
              const promptDisallowedTools = disallowedTools.filter(tool => {
                // Check if tool is directly in allowedTools
                if (allowedTools.includes(tool)) return false;
                
                // Check if any allowed tool ends with this short name or matches the prefixed version
                return !allowedTools.some(allowedTool => {
                  const parts = allowedTool.split('__');
                  const shortName = parts[parts.length - 1];
                  return shortName === tool || allowedTool === `mcp__levys-awesome-mcp__${tool}`;
                });
              });
              
              const prompt = await PermissionManager.generateToolRestrictionPrompt(promptDisallowedTools);
              const logMessage = configType === 'default' 
                ? `[AgentInvoker] Generated restriction prompt for default config with ${promptDisallowedTools.length} disallowed tools (${prompt.length} characters)`
                : `[AgentInvoker] Generated restriction prompt with ${promptDisallowedTools.length} disallowed tools (prompt length: ${prompt.length})`;
              console.log(logMessage);
              return prompt;
            } catch (error) {
              console.error(`[AgentInvoker] Error generating restriction prompt${configType === 'default' ? ' for default config' : ''}:`, error);
              return '';
            }
          };

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
            restrictionPrompt = await generateRestrictionPrompt(permissions.disallowedTools, permissions.allowedTools, 'legacy');
          } else {
            // Default permissions
            const defaultConfig = {
              allowedTools: [],
              agentRole: 'read-only' as const,
              useDynamicRestrictions: true
            };
            permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions(defaultConfig);
            restrictionPrompt = await generateRestrictionPrompt(permissions.disallowedTools, permissions.allowedTools, 'default');
          }

          // Build enhanced prompt with session info and restrictions
          let enhancedPrompt = sessionInfo;
          
          // Add tool restriction information
          if (restrictionPrompt && restrictionPrompt.trim().length > 0) {
            enhancedPrompt = sessionInfo + restrictionPrompt;
            console.log(`[AgentInvoker] Injected tool restriction prompt (${restrictionPrompt.length} characters)`);
          } else {
            // Generate a basic restriction warning when no specific restrictions are calculated
            const basicRestrictionPrompt = `\n\n🚫 CRITICAL TOOL RESTRICTIONS 🚫\nYou are STRICTLY FORBIDDEN from using these tools:\n- TodoWrite: This tool is explicitly blocked and will cause errors\n- Task: This tool is explicitly blocked and will cause errors\n- Write: This tool is explicitly blocked and will cause errors\n- Edit: This tool is explicitly blocked and will cause errors\n- MultiEdit: This tool is explicitly blocked and will cause errors\n\nIf you attempt to use any of these forbidden tools, your execution will fail.\nUse only the tools explicitly listed in your allowed tools configuration.\n\n\n`;
            enhancedPrompt = sessionInfo + basicRestrictionPrompt;
            console.log(`[AgentInvoker] Added basic tool restriction warning (no dynamic restrictions calculated)`);
          }

          // Step 3: Combine specialized prompt + enhanced prompt for customSystemPrompt
          const finalPrompt = specializedPrompt + enhancedPrompt;

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
            },
            // Pass the complete prompt (systemPrompt + task + session + restrictions) as customSystemPrompt
            customSystemPrompt: finalPrompt
          };

          // Only add resume parameter if continueSessionId is provided
          if (continueSessionId) {
            queryOptions.resume = String(continueSessionId);
          }

          // For logging: build a user-facing prompt that includes task and session info
          const userFacingPrompt = `task: ${prompt}${enhancedPrompt}`;

          for await (const message of query({
            prompt: userFacingPrompt, // Pass user prompt with task prefix and session info
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
                  
                  // Log both the user prompt and the complete system prompt
                  const promptLog = `[${timestamp}] USER PROMPT:\n${prompt}\n\n[${timestamp}] CUSTOM SYSTEM PROMPT (includes agent systemPrompt + task + session + restrictions):\n${finalPrompt}\n\n`;
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

            // Track completion status without collecting output
            if (message.type === "result") {
              if (message.is_error) {
                const errorMsg = 'result' in message && typeof message.result === 'string' ? message.result : 'Unknown error';
                // Use actual session ID or a fallback
                const errorSessionId = claudeCodeSessionId || sessionId || 'unknown';
                const logPath = sessionId ? `output_streams/${sessionId}/session.log` : 'not created';
                return {
                  content: [{
                    type: 'text',
                    text: `Agent '${agentName}' execution failed: ${errorMsg}\n\nSession ID: ${errorSessionId}\nSession Log: ${logPath}`
                  }],
                  isError: true
                };
              } else {
                // Agent completed successfully
                agentCompleted = true;
              }
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
              text: `Agent '${agentName}' completed successfully.\n\n**Session ID:** ${returnSessionId}\n**Full conversation saved to:** output_streams/${sessionId}/session.log\n\nThe complete agent conversation has been logged but not returned to preserve context boundaries.`
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
              text: `Agent '${agentName}' execution error: ${error instanceof Error ? error.message : String(error)}\n\nSession ID: ${claudeCodeSessionId || sessionId || 'unknown'}\nSession Log: ${sessionId ? `output_streams/${sessionId}/session.log` : 'not created'}`
            }],
            isError: true
          };
        }
      }

      case 'list_agents': {
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