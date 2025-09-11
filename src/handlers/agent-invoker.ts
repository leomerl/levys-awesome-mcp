/**
 * Agent Invoker Handler
 * Provides MCP tools for invoking agents with enforced session.log creation
 */

import { query } from '@anthropic-ai/claude-code';
import { SessionStore } from '../utilities/session/session-store.js';
import { StreamingManager } from '../utilities/session/streaming-utils.js';
import { AgentLoader } from '../utilities/agents/agent-loader.js';
import { ValidationUtils } from '../utilities/config/validation.js';
import { ReportManager } from '../utilities/session/report-manager.js';
import { PermissionManager } from '../utilities/agents/permission-manager.js';
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
        
        // Get stream log file reference for logging throughout the session
        const streamLogFile = streamingUtils.getStreamLogFile();
        
        try {
          // Build enhanced prompt with session tracking
          const enhancedPrompt = `${prompt}

IMPORTANT: When you complete your task, create a summary report using available tools.
SESSION_ID: ${sessionId}
OUTPUT_DIR: output_streams/${sessionId}/
`;

          // Add initial prompt to session.log
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const promptLog = `[${timestamp}] USER PROMPT:\n${enhancedPrompt}\n\n`;
            fs.appendFileSync(streamLogFile, promptLog, 'utf8');
          }

          // Execute agent with Claude Code query - Enforce strict tool permissions
          // Support both legacy TypeScript configs and new awesome-claude-code patterns
          let permissions;
          
          if (agentConfig.options?.allowedTools) {
            // Legacy TypeScript agent config
            permissions = PermissionManager.getAgentPermissions({
              allowedTools: agentConfig.options.allowedTools,
              agentRole: 'write-restricted' // Default role for legacy configs
            });
          } else {
            // For agents without explicit tools, try to load from .claude/agents/*.md files
            try {
              const fs = await import('fs/promises');
              const path = await import('path');
              const agentMarkdownPath = path.resolve('.claude', 'agents', `${agentName}.md`);
              
              try {
                const markdownContent = await fs.readFile(agentMarkdownPath, 'utf-8');
                const permissionConfig = PermissionManager.fromMarkdownFile(
                  markdownContent,
                  [] // No fallback MCP tools for markdown-based agents
                );
                permissions = PermissionManager.getAgentPermissions(permissionConfig);
                console.log(`[DEBUG] Loaded permissions from markdown file: ${agentMarkdownPath}`);
              } catch (fileError) {
                console.log(`[DEBUG] No markdown agent file found at ${agentMarkdownPath}, using default permissions`);
                // Fall back to default read-only permissions for security
                permissions = PermissionManager.getAgentPermissions({
                  allowedTools: [],
                  agentRole: 'read-only'
                });
              }
            } catch (importError) {
              console.warn(`[WARN] Could not load fs/path modules, using default permissions:`, importError);
              permissions = PermissionManager.getAgentPermissions({
                allowedTools: [],
                agentRole: 'read-only'
              });
            }
          }

          for await (const message of query({
            prompt: enhancedPrompt,
            options: {
              maxTurns,
              model: agentConfig.options?.model || 'sonnet',
              allowedTools: permissions.allowedTools, // Use managed permissions
              disallowedTools: permissions.disallowedTools, // Explicitly block problematic built-in tools
              permissionMode: 'acceptEdits',
              pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
              mcpServers: {
                "levys-awesome-mcp": {
                  command: "node",
                  args: ["dist/src/index.js"]
                }
              }
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

          // Special handling for planner-agent - check for plan file instead of summary
          if (agentName === 'planner-agent') {
            const planCheck = await checkForPlanFiles(sessionId!);
            if (!planCheck.found) {
              // Request plan creation by continuing the session
              const planPrompt = `You must create a plan file using the plan-creator tool. I noticed that no plan file was created in the plan_and_progress directory. Please analyze the task and create a detailed execution plan using the mcp__levys-awesome-mcp__mcp__plan-creator__create_plan tool immediately.`;
              
              // Log the plan request
              if (streamLogFile) {
                const timestamp = new Date().toISOString();
                const planRequestLog = `[${timestamp}] REQUESTING PLAN CREATION:\nReason: No plan file found after planner execution\nPrompt: ${planPrompt}\n\n`;
                fs.appendFileSync(streamLogFile, planRequestLog, 'utf8');
              }

              // Continue the session to request plan creation
              const planPermissions = PermissionManager.getAgentPermissions({
                allowedTools: agentConfig.options?.allowedTools || []
              });
              
              for await (const message of query({
                prompt: planPrompt,
                options: {
                  maxTurns: 5, // Limited turns for plan creation
                  model: agentConfig.options?.model || 'sonnet',
                  allowedTools: planPermissions.allowedTools,
                  disallowedTools: planPermissions.disallowedTools,
                  permissionMode: 'acceptEdits',
                  pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
                  mcpServers: {
                    "levys-awesome-mcp": {
                      command: "node",
                      args: ["dist/src/index.js"]
                    }
                  }
                }
              })) {
                messages.push(message);
                await streamingUtils.logConversationMessage(message);
                
                if (message.type === "assistant") {
                  const content = message.message.content;
                  if (content) {
                    for (const item of content) {
                      if (item.type === "text") {
                        output += item.text + '\n';
                      }
                    }
                  }
                }
              }

              // Final save after plan request
              await SessionStore.saveConversationHistory(sessionId!, agentName, messages);

              // Check again if plan was created
              const finalPlanCheck = await checkForPlanFiles(sessionId!);
              if (streamLogFile) {
                const timestamp = new Date().toISOString();
                const planResultLog = `[${timestamp}] PLAN FILE CHECK:\nFound: ${finalPlanCheck.found}\nFiles: ${finalPlanCheck.files.join(', ') || 'none'}\n\n`;
                fs.appendFileSync(streamLogFile, planResultLog, 'utf8');
              }
            }
          } else {
            // Regular summary check for non-planner agents
            const summaryCheck = ReportManager.checkForSummaryFiles(sessionId!, agentName);
            if (!summaryCheck.found) {
              // Request summary creation by continuing the session
              const summaryPrompt = `Please create a summary report of what you accomplished in this session. Use the put_summary tool with session_id "${sessionId}" and agent_name "${agentName}" to save your report as JSON. Include: your tasks completed, any files created/modified, key findings, and overall results.`;
              
              // Log the summary request
            if (streamLogFile) {
              const timestamp = new Date().toISOString();
              const summaryRequestLog = `[${timestamp}] REQUESTING SUMMARY REPORT:\nReason: No summary file found after agent execution\nPrompt: ${summaryPrompt}\n\n`;
              fs.appendFileSync(streamLogFile, summaryRequestLog, 'utf8');
            }

            // Continue the session to request summary - Ensure put_summary tool is available
            const summaryPermissions = PermissionManager.getSummaryPermissions({
              allowedTools: agentConfig.options?.allowedTools || []
            });
            
            for await (const message of query({
              prompt: summaryPrompt,
              options: {
                maxTurns: 3, // Limited turns for summary creation
                model: agentConfig.options?.model || 'sonnet',
                allowedTools: summaryPermissions.allowedTools, // Include put_summary tool for report creation
                disallowedTools: summaryPermissions.disallowedTools, // Maintain same restrictions for summary creation
                permissionMode: 'acceptEdits',
                pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
                mcpServers: {
                  "levys-awesome-mcp": {
                    command: "node",
                    args: ["dist/src/index.js"]
                  }
                }
              }
            })) {
              messages.push(message);
              await streamingUtils.logConversationMessage(message);
              
              if (message.type === "assistant") {
                const content = message.message.content;
                if (content) {
                  for (const item of content) {
                    if (item.type === "text") {
                      output += item.text + '\n';
                    }
                  }
                }
              }
            }

            // Final save after summary request
            await SessionStore.saveConversationHistory(sessionId!, agentName, messages);

            // Check again if summary was created
            const finalSummaryCheck = ReportManager.checkForSummaryFiles(sessionId!, agentName);
            if (streamLogFile) {
              const timestamp = new Date().toISOString();
              const summaryResultLog = `[${timestamp}] SUMMARY REPORT CHECK:\nFound: ${finalSummaryCheck.found}\nFiles: ${finalSummaryCheck.files.join(', ') || 'none'}\n\n`;
              fs.appendFileSync(streamLogFile, summaryResultLog, 'utf8');
            }
          }
          }

          // Add completion marker to session.log
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const completionLog = `[${timestamp}] SESSION COMPLETED:\nStatus: success\nTotal Messages: ${messages.length}\nSession Log: output_streams/${sessionId}/session.log\n\n=== End of Session ===\n`;
            fs.appendFileSync(streamLogFile, completionLog, 'utf8');
          }

          // Check final status for response - different handling for planner-agent vs other agents
          let statusInfo = '';
          if (agentName === 'planner-agent') {
            const finalPlanCheck = await checkForPlanFiles(sessionId!);
            if (finalPlanCheck.found) {
              statusInfo = `\n**Plan File:** ${finalPlanCheck.files[0]}`;
            } else {
              statusInfo = `\n**Warning:** No plan file was created despite requesting one.`;
            }
          } else {
            const finalSummaryCheck = ReportManager.checkForSummaryFiles(sessionId!, agentName);
            if (finalSummaryCheck.found) {
              statusInfo = `\n**Summary Report:** reports/${sessionId}/${agentName}-summary.json`;
            } else {
              statusInfo = `\n**Warning:** No summary report was created despite requesting one.`;
            }
          }

          return {
            content: [{
              type: 'text',
              text: `Agent '${agentName}' completed successfully.\n\n**Session ID:** ${sessionId}\n**Session Log:** output_streams/${sessionId}/session.log${statusInfo}\n\n**Output:**\n${output.trim()}\n\n**ALL conversation data has been saved to session.log for debugging and analysis.**`
            }]
          };

        } catch (error) {
          // Log error to session.log
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

// Helper function to check for plan files in plan_and_progress directory
async function checkForPlanFiles(sessionId: string): Promise<{ found: boolean; files: string[] }> {
  try {
    const { executeCommand } = await import('../shared/utils.js');
    
    // Get git commit hash for directory structure
    const result = await executeCommand('git', ['rev-parse', 'HEAD'], process.cwd());
    let gitHash = 'no-commit';
    if (result.success && result.stdout) {
      gitHash = result.stdout.trim();
    } else {
      // Generate a pseudo-hash based on current timestamp if no git commit available
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      gitHash = `no-commit-${timestamp}`;
    }
    
    const planDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
    
    if (!fs.existsSync(planDir)) {
      return { found: false, files: [] };
    }
    
    const files = fs.readdirSync(planDir);
    const planFiles = files.filter(file => file.startsWith('plan-') && file.endsWith('.json'));
    
    if (planFiles.length > 0) {
      return { 
        found: true, 
        files: planFiles.map(file => path.join(planDir, file))
      };
    }
    
    return { found: false, files: [] };
  } catch (error) {
    console.error('Error checking for plan files:', error);
    return { found: false, files: [] };
  }
}