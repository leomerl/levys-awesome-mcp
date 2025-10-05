/**
 * Agent Invoker Handler
 * Provides MCP tools for invoking agents with enforced session.log creation
 */

import { query } from '@anthropic-ai/claude-code';
import { SessionStore } from '../utilities/session/session-store.js';
import { StreamingManager } from '../utilities/session/streaming-utils.js';
import { AgentLoader } from '../utilities/agents/agent-loader.js';
import { PermissionManager } from '../utilities/agents/permission-manager.js';
import {
  updateTaskToInProgress,
  getInProgressTaskBySession,
  updateTaskToCompleted
} from '../utilities/progress/task-tracker.js';
import { handlePlanCreatorTool } from './plan-creator.js';
import { resolveMcpConfig } from '../utilities/mcp/third-party-mcp-registry.js';
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
        },
        taskNumber: {
          type: 'number',
          description: 'Task number to update progress for (e.g., 1 for TASK-001) (optional, used by orchestrator)'
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for progress tracking (optional, used by orchestrator)'
        },
        invokerAgent: {
          type: 'string',
          description: 'Name of the invoking agent (optional, used to detect orchestrator)'
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
        console.log(`[AgentInvoker] Raw args received:`, JSON.stringify(args));
        const {
          agentName,
          prompt,
          continueSessionId,
          taskNumber,
          sessionId: orchestratorSessionId,
          invokerAgent
        } = args;

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

        // Debug: Log loaded configuration
        console.error(`[DEBUG invoke_agent] Loaded agent '${agentName}':`);
        console.error(`[DEBUG invoke_agent] - allowedTools count: ${agentConfig.options?.allowedTools?.length || 0}`);
        console.error(`[DEBUG invoke_agent] - mcpServers: ${Object.keys(agentConfig.options?.mcpServers || {}).join(', ') || 'none'}`);
        console.error(`[DEBUG invoke_agent] - Sample tools: ${(agentConfig.options?.allowedTools || []).slice(0, 5).join(', ')}`);
        if (agentConfig.options?.allowedTools?.some(t => t.includes('context7'))) {
          console.error(`[DEBUG invoke_agent] - HAS CONTEXT7 TOOLS!`);
        } else {
          console.error(`[DEBUG invoke_agent] - NO CONTEXT7 TOOLS`);
        }

        // PROGRAMMATICALLY detect if this is an orchestrator invocation
        // If sessionId points to a valid plan_and_progress directory AND taskNumber is provided,
        // then this is orchestration with automatic progress tracking
        let isOrchestratorInvoking = invokerAgent === 'orchestrator-agent' || invokerAgent === 'orchestrator';

        if (!isOrchestratorInvoking && orchestratorSessionId && taskNumber) {
          // Check if the sessionId points to a valid progress file
          const progressPath = path.join(process.cwd(), 'plan_and_progress', 'sessions', orchestratorSessionId, 'progress.json');
          if (fs.existsSync(progressPath)) {
            isOrchestratorInvoking = true;
            console.log(`[AgentInvoker] Programmatically detected orchestration: sessionId=${orchestratorSessionId}, taskNumber=${taskNumber}`);
          }
        }

        // Enhanced progress tracking for orchestrator
        console.log(`[AgentInvoker] Progress tracking check: isOrchestratorInvoking=${isOrchestratorInvoking}, orchestratorSessionId=${orchestratorSessionId}, taskNumber=${taskNumber}`);

        if (isOrchestratorInvoking && orchestratorSessionId && taskNumber) {
          console.log(`[AgentInvoker] Orchestrator detected - implementing enhanced progress tracking for session ${orchestratorSessionId}`);

          // Step 1: Update task to in_progress before agent starts
          const progressFilePath = path.join(process.cwd(), 'plan_and_progress', 'sessions', orchestratorSessionId, 'progress.json');
          console.log(`[AgentInvoker] DEBUG: Progress file path: ${progressFilePath}`);
          console.log(`[AgentInvoker] DEBUG: Progress file exists: ${fs.existsSync(progressFilePath)}`);

          const updateSuccess = await updateTaskToInProgress(taskNumber, orchestratorSessionId);
          if (updateSuccess) {
            console.log(`[AgentInvoker] ✅ Successfully marked task ${taskNumber} as in_progress in session ${orchestratorSessionId}`);

            // Verify the update actually happened
            if (fs.existsSync(progressFilePath)) {
              const progressContent = fs.readFileSync(progressFilePath, 'utf8');
              const progress = JSON.parse(progressContent);
              const taskId = `TASK-${String(taskNumber).padStart(3, '0')}`;
              const task = progress.tasks.find((t: any) => t.id === taskId);
              console.log(`[AgentInvoker] DEBUG: Task ${taskId} current state: ${task?.state}`);
              console.log(`[AgentInvoker] DEBUG: Progress file last_updated: ${progress.last_updated}`);
            }
          } else {
            console.error(`[AgentInvoker] ❌ Failed to update task ${taskNumber} to in_progress in session ${orchestratorSessionId}`);
          }
        }

        // Generate session ID upfront for new sessions
        // Check for "undefined" string which can come from MCP calls
        console.log(`[AgentInvoker] continueSessionId received:`, continueSessionId, `type:`, typeof continueSessionId);
        // Handle both undefined value and "undefined" string
        const shouldGenerateNew = !continueSessionId || continueSessionId === 'undefined' || continueSessionId === undefined;
        let sessionId: string = shouldGenerateNew ? randomUUID() : continueSessionId;
        console.log(`[AgentInvoker] Generated/using sessionId:`, sessionId, `(shouldGenerateNew: ${shouldGenerateNew})`);
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
          // Debug: Ensure sessionId is defined at this point
          if (!sessionId) {
            console.error(`[AgentInvoker] CRITICAL: sessionId is undefined when building sessionInfo!`);
            sessionId = randomUUID();
            console.log(`[AgentInvoker] Generated emergency sessionId: ${sessionId}`);
          }
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
          console.log(`[AgentInvoker] Allowed tools for ${agentName}:`, permissions.allowedTools);
          console.log(`[AgentInvoker] Initial disallowed tools count:`, permissions.disallowedTools.length);

          const finalDisallowedTools = permissions.disallowedTools.filter(tool =>
            !permissions.allowedTools.includes(tool)
          );

          console.log(`[AgentInvoker] Final disallowed tools count after filtering:`, finalDisallowedTools.length);
          console.log(`[AgentInvoker] Is agents_write in allowed?`, permissions.allowedTools.includes('mcp__levys-awesome-mcp__agents_write'));
          console.log(`[AgentInvoker] Is agents_write in final disallowed?`, finalDisallowedTools.includes('mcp__levys-awesome-mcp__agents_write'));

          // Resolve third-party MCP configurations
          const resolvedMcpServers: Record<string, any> = {};
          const configuredMcpServers = agentConfig.options?.mcpServers || {
            "levys-awesome-mcp": {
              command: "node",
              args: ["dist/src/index.js"]
            }
          };

          // Process each MCP server
          for (const [mcpId, mcpConfig] of Object.entries(configuredMcpServers)) {
            // Skip levys-awesome-mcp - it's not a third-party MCP
            if (mcpId === 'levys-awesome-mcp') {
              resolvedMcpServers[mcpId] = mcpConfig;
              continue;
            }

            // Try to resolve as third-party MCP
            const resolved = resolveMcpConfig(mcpId);
            if (resolved.isValid) {
              resolvedMcpServers[mcpId] = resolved.mcpServer;
              console.error(`[AgentInvoker] Resolved third-party MCP '${mcpId}' for agent '${agentName}'`);
              console.error(`[AgentInvoker] MCP '${mcpId}' config:`, JSON.stringify(resolved.mcpServer, null, 2));
            } else {
              console.error(`[AgentInvoker] Failed to resolve MCP '${mcpId}': ${resolved.errors.join(', ')}`);
              console.error(`[AgentInvoker] Skipping MCP '${mcpId}' - tools will not be available`);
            }
          }

          // Build query options with conditional resume parameter
          console.error(`[AgentInvoker] Final resolved MCP servers for '${agentName}':`, Object.keys(resolvedMcpServers));
          console.error(`[AgentInvoker] MCP servers details:`, JSON.stringify(resolvedMcpServers, null, 2));

          const queryOptions: any = {
            model: agentConfig.options?.model || 'sonnet',
            allowedTools: permissions.allowedTools, // Use managed permissions
            disallowedTools: finalDisallowedTools, // Use filtered disallowed tools
            permissionMode: 'acceptEdits',
            pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
            // Use resolved MCP servers
            mcpServers: resolvedMcpServers,
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

              // Now initialize streaming with the correct session ID
              if (!streamingUtils) {
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
            
            // Save conversation history in real-time
            await SessionStore.saveConversationHistory(sessionId, agentName, messages);

            // Track completion status without collecting output
            if (message.type === "result") {
              if (message.is_error) {
                const errorMsg = 'result' in message && typeof message.result === 'string' ? message.result : 'Unknown error';
                // Use actual session ID
                const errorSessionId = claudeCodeSessionId || sessionId;
                const logPath = `output_streams/${sessionId}/session.log`;
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

          // Final save
          await SessionStore.saveConversationHistory(sessionId, agentName, messages);

          // Add completion marker to session.log
          if (streamLogFile) {
            const timestamp = new Date().toISOString();
            const completionLog = `[${timestamp}] SESSION COMPLETED:\nStatus: success\nTotal Messages: ${messages.length}\nSession Log: output_streams/${sessionId}/session.log\n\n=== End of Session ===\n`;
            fs.appendFileSync(streamLogFile, completionLog, 'utf8');
          }

          // Check if we need to handle progress update (step 3 & 4: check for in-progress tasks after completion)
          if (isOrchestratorInvoking && orchestratorSessionId && agentCompleted) {
            // Check for in-progress task in the session
            const inProgressTask = await getInProgressTaskBySession(orchestratorSessionId);
            if (inProgressTask) {
              console.log(`[AgentInvoker] Found in-progress task ${inProgressTask.id} for session ${orchestratorSessionId}, reinvoking agent for completion`);

              // Reinvoke the agent with explicit instruction to complete or close the task
              const progressUpdatePrompt = `You have ${inProgressTask.id} currently marked as in_progress.

## CRITICAL: Task Completion Required

Please check if you have fully completed this task:
"${inProgressTask.description}"

Expected files to modify: ${inProgressTask.files_to_modify.join(', ')}

### If YES (task is complete):
Use mcp__levys-awesome-mcp__update_progress to mark it as completed:
- session_id: "${orchestratorSessionId}"
- task_id: "${inProgressTask.id}"
- state: "completed"
- agent_session_id: "${sessionId}"
- files_modified: [list the actual files you created/modified]
- summary: "Brief summary of what was accomplished"

### If NO (task is incomplete):
1. Complete the remaining work for this task first
2. Then update the progress as shown above

This is a required step - you MUST either complete the task or mark it as completed if already done.`;

              console.log(`[AgentInvoker] Resuming ${agentName} by session ID ${sessionId} to complete task ${inProgressTask.id}`);

              // Reinvoke the agent for task completion
              try {
                const progressMessages: any[] = [];

                for await (const message of query({
                  prompt: progressUpdatePrompt,
                  options: {
                    model: agentConfig.options?.model || 'sonnet',
                    allowedTools: [...(permissions.allowedTools || []), 'mcp__levys-awesome-mcp__update_progress'],
                    disallowedTools: finalDisallowedTools.filter(tool => tool !== 'mcp__levys-awesome-mcp__update_progress'),
                    permissionMode: 'acceptEdits',
                    pathToClaudeCodeExecutable: path.resolve(process.cwd(), 'node_modules/@anthropic-ai/claude-code/cli.js'),
                    mcpServers: {
                      "levys-awesome-mcp": {
                        command: "node",
                        args: ["dist/src/index.js"]
                      }
                    },
                    resume: String(claudeCodeSessionId || sessionId),
                    customSystemPrompt: agentConfig.options?.systemPrompt || ''
                  }
                })) {
                  progressMessages.push(message);

                  // Log progress update messages to session.log
                  if (streamingUtils) {
                    await streamingUtils.logConversationMessage(message);
                  }

                  if (message.type === "result") {
                    if (!message.is_error) {
                      console.log(`[AgentInvoker] Task completion/update completed for ${inProgressTask.id}`);
                    } else {
                      console.error(`[AgentInvoker] Task completion/update failed for ${inProgressTask.id}`);
                    }
                  }
                }

                // Save the extended conversation history
                await SessionStore.saveConversationHistory(sessionId, agentName, [...messages, ...progressMessages]);

              } catch (error) {
                console.error(`[AgentInvoker] Error during task completion reinvocation:`, error);
              }

              // SOLUTION #3: Check if task is still in_progress after reinvocation - indicates failure
              const taskAfterReinvocation = await getInProgressTaskBySession(orchestratorSessionId);
              if (taskAfterReinvocation && taskAfterReinvocation.id === inProgressTask.id) {
                console.log(`[AgentInvoker] Task ${inProgressTask.id} still in_progress after reinvocation - marking as failed`);
                // Automatically mark as failed since agent couldn't complete it
                try {
                  await handlePlanCreatorTool('update_progress', {
                    session_id: orchestratorSessionId,
                    task_id: inProgressTask.id,
                    state: 'failed',
                    agent_session_id: sessionId,
                    files_modified: [],
                    summary: `Task automatically marked as failed: Agent could not complete the task after reinvocation. Original summary: ${taskAfterReinvocation.summary || 'No summary provided'}`
                  });
                  console.log(`[AgentInvoker] Successfully marked task ${inProgressTask.id} as failed`);
                } catch (error) {
                  console.error(`[AgentInvoker] Failed to mark task as failed:`, error);
                }
              }
            } else {
              console.log(`[AgentInvoker] No in-progress tasks found for session ${orchestratorSessionId}`);
            }

            // SOLUTION #3: Check if current task has summary but is still pending - indicates implicit failure
            if (taskNumber) {
              const progressFilePath = path.join(process.cwd(), 'plan_and_progress', 'sessions', orchestratorSessionId, 'progress.json');
              if (fs.existsSync(progressFilePath)) {
                const progressContent = fs.readFileSync(progressFilePath, 'utf8');
                const progress = JSON.parse(progressContent);
                const taskId = `TASK-${String(taskNumber).padStart(3, '0')}`;
                const currentTask = progress.tasks.find((t: any) => t.id === taskId);

                if (currentTask && currentTask.state === 'pending' && currentTask.summary && currentTask.agent_session_id) {
                  console.log(`[AgentInvoker] Task ${taskId} has summary but state is pending - automatically marking as failed`);

                  // Update task to failed state
                  currentTask.state = 'failed';
                  currentTask.failed_at = new Date().toISOString();
                  if (!currentTask.summary.includes('automatically marked as failed')) {
                    currentTask.summary = `Task automatically marked as failed: ${currentTask.summary}`;
                  }
                  progress.last_updated = new Date().toISOString();

                  fs.writeFileSync(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');
                  console.log(`[AgentInvoker] Successfully marked task ${taskId} as failed`);
                }
              }
            }
          }

          // SUMMARY ENFORCEMENT: Verify agent created summary report
          if (orchestratorSessionId && agentCompleted) {
            const summaryPath = path.join(process.cwd(), 'reports', orchestratorSessionId, `${agentName}-summary.json`);
            if (!fs.existsSync(summaryPath)) {
              console.warn(`[AgentInvoker] WARNING: Agent '${agentName}' completed but no summary report found at ${summaryPath}`);
              console.warn(`[AgentInvoker] Creating placeholder summary to maintain workflow integrity`);

              // Create placeholder summary
              try {
                const reportsDir = path.join(process.cwd(), 'reports', orchestratorSessionId);
                fs.mkdirSync(reportsDir, { recursive: true });

                const placeholderSummary = {
                  session_id: orchestratorSessionId,
                  agent: agentName,
                  agentName: agentName,
                  status: 'completed_without_summary',
                  timestamp: new Date().toISOString(),
                  warning: 'Agent completed execution but did not create summary report',
                  agent_session_id: sessionId
                };

                fs.writeFileSync(summaryPath, JSON.stringify(placeholderSummary, null, 2), 'utf8');
                console.log(`[AgentInvoker] Created placeholder summary at ${summaryPath}`);
              } catch (error) {
                console.error(`[AgentInvoker] Failed to create placeholder summary:`, error);
              }
            } else {
              console.log(`[AgentInvoker] Verified: Summary report exists at ${summaryPath}`);
            }
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

          // Save conversation history even on error
          await SessionStore.saveConversationHistory(sessionId, agentName, messages);

          return {
            content: [{
              type: 'text',
              text: `Agent '${agentName}' execution error: ${error instanceof Error ? error.message : String(error)}\n\nSession ID: ${claudeCodeSessionId || sessionId}\nSession Log: output_streams/${sessionId}/session.log`
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