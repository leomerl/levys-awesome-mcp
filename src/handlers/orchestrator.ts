// Removed agent-invocation imports - using tools/agent_invoker.ts instead
import { existsSync } from 'fs';
import { join } from 'path';
import { AgentLoader } from '../utilities/agents/agent-loader.js';

/**
 * Generate orchestrator tools dynamically based on available agents
 */
export async function getOrchestratorTools() {
  const availableAgents = AgentLoader.listAvailableAgents();
  
  return [
    {
      name: 'mcp__levys-awesome-mcp__mcp__orchestrator__invoke_agent',
      description: 'Invoke a specialized agent to handle specific tasks',
      inputSchema: {
        type: 'object' as const,
        properties: {
          agent_type: {
            type: 'string',
            enum: availableAgents,
            description: 'Type of agent to invoke'
          },
          task_description: {
            type: 'string',
            description: 'Description of the task for the agent'
          },
          detailed_prompt: {
            type: 'string',
            description: 'Detailed prompt/instructions for the agent'
          },
          options: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                default: 'sonnet',
                description: 'Model to use for the agent'
              },
              skip_permissions: {
                type: 'boolean',
                default: false,
                description: 'Skip permission prompts for the agent'
              },
              allowed_tools: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tools the agent is allowed to use'
              },
              denied_tools: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tools the agent is not allowed to use'
              }
            },
            additionalProperties: false
          }
        },
        required: ['agent_type', 'task_description', 'detailed_prompt'],
        additionalProperties: false
      }
    },
    {
      name: 'mcp__levys-awesome-mcp__mcp__orchestrator__coordinate_workflow',
      description: 'Coordinate a multi-agent workflow for complex tasks',
      inputSchema: {
        type: 'object' as const,
        properties: {
          workflow_description: {
            type: 'string',
            description: 'Description of the overall workflow'
          },
          agents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                agent_type: {
                  type: 'string',
                  enum: availableAgents
                },
                task: {
                  type: 'string',
                  description: 'Task for this agent'
                },
                depends_on: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Agent types this agent depends on'
                }
              },
              required: ['agent_type', 'task']
            },
            description: 'List of agents and their tasks'
          }
        },
        required: ['workflow_description', 'agents'],
        additionalProperties: false
      }
    }
  ];
}

// Legacy export for backwards compatibility (now returns empty array and logs warning)
export const orchestratorTools = [];

interface AgentCapabilities {
  [key: string]: {
    role: string;
    defaultTools: string[];
    specialization: string;
  };
}

const AGENT_CAPABILITIES: AgentCapabilities = {
  'planner': {
    role: 'strategic-planner',
    defaultTools: ['Read', 'Glob', 'Grep', 'plan-creator'],
    specialization: 'Strategic planning, task analysis, execution plan generation, codebase analysis'
  },
  'backend-agent': {
    role: 'backend-developer',
    defaultTools: ['Read', 'Write', 'Edit', 'Bash', 'test-runner'],
    specialization: 'Backend development, API design, database operations, server-side logic'
  },
  'frontend-agent': {
    role: 'frontend-developer', 
    defaultTools: ['Read', 'Write', 'Edit', 'build-executor'],
    specialization: 'Frontend development, UI/UX, React/Vue/Angular, CSS, browser compatibility'
  },
  'testing-agent': {
    role: 'test-engineer',
    defaultTools: ['Read', 'test-runner', 'test-executor'],
    specialization: 'Test automation, unit testing, integration testing, E2E testing, test strategy'
  },
  'builder': {
    role: 'build-engineer',
    defaultTools: ['build-executor', 'Read'],
    specialization: 'Build systems, CI/CD, deployment, bundling, optimization'
  },
  'linter': {
    role: 'code-quality-engineer',
    defaultTools: ['code-analyzer', 'Read'],
    specialization: 'Code quality, linting, static analysis, code standards, best practices'
  },
  'orchestrator': {
    role: 'workflow-coordinator',
    defaultTools: ['agent-invoker', 'content-writer', 'Read'],
    specialization: 'Workflow coordination, agent management, task routing, result aggregation'
  }
};

export class OrchestratorService {
  // TODO: Refactor to use tools/agent_invoker.ts instead of agent-invocation classes
  
  constructor() {
    // Disabled until refactoring is complete
  }

  async invokeAgent(
    agentType: string,
    taskDescription: string,
    detailedPrompt: string,
    options: any = {}
  ): Promise<{ sessionId: string; response: string; success: boolean; outputPath: string; reportPath: string }> {
    throw new Error('OrchestratorService temporarily disabled - needs refactoring to use tools/agent_invoker.ts');
    /*
    
    const capabilities = AGENT_CAPABILITIES[agentType];
    if (!capabilities) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    // Build comprehensive prompt
    const fullPrompt = `## Agent Role: ${capabilities.role}
## Specialization: ${capabilities.specialization}
## Task: ${taskDescription}

## Detailed Instructions:
${detailedPrompt}

Please execute this task using your specialized knowledge and available tools. Provide detailed feedback on your actions and results.`;

    const invocationOptions: AgentInvocationOptions = {
      agentName: agentType,
      model: options.model || 'sonnet',
      role: capabilities.role,
      allowedTools: options.allowed_tools || capabilities.defaultTools,
      deniedTools: options.denied_tools,
      skipPermissions: options.skip_permissions || false
    };

    const result = await this.agentInvoker.invokeAgent(fullPrompt, invocationOptions);

    // Determine output and report paths
    const outputPath = join(this.sessionManager['baseOutputDir'], result.sessionId);
    const reportPath = join(this.sessionManager['baseReportsDir'], result.sessionId);

    return {
      ...result,
      outputPath,
      reportPath
    };
  }

  async coordinateWorkflow(
    workflowDescription: string,
    agents: Array<{ agent_type: string; task: string; depends_on?: string[] }>
  ): Promise<{ results: any[]; success: boolean; summary: string }> {
    throw new Error('coordinateWorkflow temporarily disabled - needs refactoring');
    /*
    
    const results: any[] = [];
    const executionOrder = this.topologicalSort(agents);
    let overallSuccess = true;
    
    for (const agent of executionOrder) {
      try {
        console.log(`Executing agent: ${agent.agent_type} - ${agent.task}`);
        
        const result = await this.invokeAgent(
          agent.agent_type,
          agent.task,
          `As part of the workflow: "${workflowDescription}"
          
Your specific task: ${agent.task}

Context from previous agents: ${results.length > 0 ? JSON.stringify(results.slice(-2), null, 2) : 'None'}

Please complete your task and provide clear output for subsequent agents.`
        );

        results.push({
          agentType: agent.agent_type,
          task: agent.task,
          sessionId: result.sessionId,
          success: result.success,
          response: result.response,
          outputPath: result.outputPath,
          reportPath: result.reportPath
        });

        if (!result.success) {
          overallSuccess = false;
          console.warn(`Agent ${agent.agent_type} failed: ${result.response}`);
        }

      } catch (error) {
        overallSuccess = false;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        results.push({
          agentType: agent.agent_type,
          task: agent.task,
          success: false,
          error: errorMsg
        });

        console.error(`Agent ${agent.agent_type} error: ${errorMsg}`);
      }
    }

    const summary = `Workflow "${workflowDescription}" completed.
Status: ${overallSuccess ? 'SUCCESS' : 'PARTIAL_FAILURE'}
Agents executed: ${results.length}
Successful: ${results.filter(r => r.success).length}
Failed: ${results.filter(r => !r.success).length}

Session IDs and reports:
${results.map(r => `- ${r.agentType}: ${r.sessionId || 'N/A'} ${r.reportPath ? `(${r.reportPath})` : ''}`).join('\n')}`;

    return { results, success: overallSuccess, summary };
    */
  }

  private topologicalSort(agents: Array<{ agent_type: string; task: string; depends_on?: string[] }>): typeof agents {
    /*
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const agentMap = new Map<string, typeof agents[0]>();

    // Build graph and initialize in-degrees
    for (const agent of agents) {
      graph.set(agent.agent_type, agent.depends_on || []);
      inDegree.set(agent.agent_type, 0);
      agentMap.set(agent.agent_type, agent);
    }

    // Calculate in-degrees - dependencies point TO this agent
    for (const agent of agents) {
      for (const dep of agent.depends_on || []) {
        inDegree.set(agent.agent_type, (inDegree.get(agent.agent_type) || 0) + 1);
      }
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: typeof agents = [];

    // Find all nodes with no incoming edges
    for (const [agent, degree] of inDegree) {
      if (degree === 0) {
        queue.push(agent);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(agentMap.get(current)!);

      // Remove this node from the graph and update dependents
      for (const agent of agents) {
        if (agent.depends_on?.includes(current)) {
          inDegree.set(agent.agent_type, (inDegree.get(agent.agent_type) || 1) - 1);
          if (inDegree.get(agent.agent_type) === 0) {
            queue.push(agent.agent_type);
          }
        }
      }
    }

    if (result.length !== agents.length) {
      throw new Error('Circular dependency detected in agent workflow');
    }

    return result;
    */
    return [];
  }
}

export async function handleOrchestratorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return {
    content: [{ type: 'text', text: 'Orchestrator temporarily disabled - needs refactoring to use tools/agent_invoker.ts' }],
    isError: true
  };
  
  const orchestrator = new OrchestratorService();

  /*
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__orchestrator__invoke_agent': {
        const { agent_type, task_description, detailed_prompt, options = {} } = args;
        
        const result = await orchestrator.invokeAgent(
          agent_type,
          task_description,
          detailed_prompt,
          options
        );

        return {
          content: [{
            type: 'text',
            text: `## Agent Invocation Complete

**Agent Type**: ${agent_type}
**Session ID**: ${result.sessionId}
**Status**: ${result.success ? 'SUCCESS' : 'FAILED'}

**Output Stream**: \`${result.outputPath}\`
**Report Summary**: \`${result.reportPath}/${agent_type}-summary.json\`

## Agent Response:
${result.response}

---
**Files Created:**
- Conversation log: \`${result.outputPath}/conversation.jsonl\`
- Session metadata: \`${result.outputPath}/session-metadata.json\`
- Final conversation: \`${result.outputPath}/conversation-complete.json\`
- Agent summary: \`${result.reportPath}/${agent_type}-summary.json\`
`
          }],
          isError: !result.success
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__orchestrator__coordinate_workflow': {
        const { workflow_description, agents } = args;
        
        // const result = await orchestrator.coordinateWorkflow(workflow_description, agents);
        throw new Error('coordinateWorkflow temporarily disabled');

        return {
          content: [{
            type: 'text',
            text: `## Multi-Agent Workflow Complete

${result.summary}

## Individual Agent Results:
${result.results.map(r => `
### ${r.agentType}
- **Task**: ${r.task}
- **Status**: ${r.success ? 'SUCCESS' : 'FAILED'}
- **Session ID**: ${r.sessionId || 'N/A'}
- **Output**: ${r.outputPath || 'N/A'}
- **Report**: ${r.reportPath || 'N/A'}
${r.error ? `- **Error**: ${r.error}` : ''}
`).join('\n')}
`
          }],
          isError: !result.success
        };
      }

      default:
        throw new Error(`Unknown orchestrator tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in orchestrator tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
  */
}
