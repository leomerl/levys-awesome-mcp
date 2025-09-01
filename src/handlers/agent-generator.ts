import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { AgentConfig, AgentConfigOld, AgentConfigNew } from '../shared/types.js';
import { isAgentConfigOld, isAgentConfigNew } from '../shared/utils.js';

export const agentGeneratorTools = [
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents',
    description: 'List all available agent configurations',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__generate_all_agents',
    description: 'Generate markdown files for all available agent configurations',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__remove_agent_markdowns',
    description: 'Remove all generated agent markdown files',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__agent-generator__get_agent_info',
    description: 'Get detailed information about a specific agent',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent_name: {
          type: 'string',
          description: 'Name of the agent to get info for'
        }
      },
      required: ['agent_name']
    }
  }
];

class AgentLoader {
  static async loadAgentConfig(agentPath: string): Promise<AgentConfig | null> {
    try {
      const agentModule = await import(path.resolve(agentPath));
      return agentModule.default || agentModule.agent || null;
    } catch (error) {
      console.error(`Error loading agent from ${agentPath}:`, error);
      return null;
    }
  }

  static async getAvailableAgents(): Promise<string[]> {
    const agentsDir = path.join(process.cwd(), 'agents');
    if (!existsSync(agentsDir)) {
      return [];
    }

    try {
      const files = await readdir(agentsDir);
      return files.filter(file => file.endsWith('.ts')).map(file => file.replace('.ts', ''));
    } catch (error) {
      console.error('Error reading agents directory:', error);
      return [];
    }
  }
}

class MarkdownConverter {
  static convertTSAgentToMD(config: AgentConfig): string {
    if (isAgentConfigOld(config)) {
      const oldConfig = config as AgentConfigOld;
      return `# ${oldConfig.name}

## Description
${oldConfig.description}

## Configuration
- **Model:** ${oldConfig.model}
- **Permission Mode:** ${oldConfig.permissions.mode}
- **Temperature:** ${oldConfig.context.temperature}
- **Max Tokens:** ${oldConfig.context.maxTokens}

## System Prompt
${oldConfig.systemPrompt}

## Permissions
- **Allowed Tools:** ${oldConfig.permissions.tools.allowed.join(', ') || 'None'}
- **Denied Tools:** ${oldConfig.permissions.tools.denied.join(', ') || 'None'}
- **MCP Servers:** ${Object.entries(oldConfig.permissions.mcpServers).map(([server, permission]) => `${server}: ${permission}`).join(', ') || 'None'}
`;
    } else if (isAgentConfigNew(config)) {
      const newConfig = config as AgentConfigNew;
      return `# ${newConfig.name}

## Description
${newConfig.description}

## Prompt
${newConfig.prompt}

## Configuration
- **Model:** ${newConfig.options.model || 'default'}
- **Max Turns:** ${newConfig.options.maxTurns}
- **Temperature:** ${newConfig.options.temperature || 'default'}
- **Max Tokens:** ${newConfig.options.maxTokens || 'default'}
- **Permission Mode:** ${newConfig.options.permissions?.mode || 'default'}

## System Prompt
${newConfig.options.systemPrompt}

## Tools
${newConfig.options.tools?.join(', ') || 'Default tools'}

## MCP Servers
${newConfig.options.mcpServers?.join(', ') || 'Default servers'}
`;
    }
    return `# ${config.name}\n\nUnsupported configuration format.`;
  }
}

export async function handleAgentGeneratorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents': {
        const agents = await AgentLoader.getAvailableAgents();
        return {
          content: [{
            type: 'text',
            text: `Available agents:\n${agents.map(agent => `- ${agent}`).join('\n') || 'No agents found'}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__agent-generator__generate_all_agents': {
        const agents = await AgentLoader.getAvailableAgents();
        const results = [];
        
        // Ensure .claude/agents directory exists
        const outputDir = path.join(process.cwd(), '.claude', 'agents');
        if (!existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true });
        }

        for (const agentName of agents) {
          const agentPath = path.join(process.cwd(), 'agents', `${agentName}.ts`);
          const config = await AgentLoader.loadAgentConfig(agentPath);
          
          if (config) {
            const markdown = MarkdownConverter.convertTSAgentToMD(config);
            const outputPath = path.join(outputDir, `${agentName}.md`);
            await writeFile(outputPath, markdown);
            results.push(`Generated ${agentName}.md`);
          } else {
            results.push(`Failed to load ${agentName}`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: `Generated ${results.filter(r => r.startsWith('Generated')).length} markdown files:\n${results.join('\n')}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__agent-generator__remove_agent_markdowns': {
        const outputDir = path.join(process.cwd(), '.claude', 'agents');
        if (!existsSync(outputDir)) {
          return {
            content: [{
              type: 'text',
              text: 'No markdown files to remove - .claude/agents directory does not exist'
            }]
          };
        }

        try {
          const files = await readdir(outputDir);
          const mdFiles = files.filter(file => file.endsWith('.md'));
          
          for (const file of mdFiles) {
            await import('fs/promises').then(fs => fs.unlink(path.join(outputDir, file)));
          }

          return {
            content: [{
              type: 'text',
              text: `Removed ${mdFiles.length} markdown files`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error removing files: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case 'mcp__levys-awesome-mcp__mcp__agent-generator__get_agent_info': {
        const { agent_name } = args;
        const agentPath = path.join(process.cwd(), 'agents', `${agent_name}.ts`);
        const config = await AgentLoader.loadAgentConfig(agentPath);
        
        if (!config) {
          return {
            content: [{
              type: 'text',
              text: `Agent '${agent_name}' not found or failed to load`
            }],
            isError: true
          };
        }

        const markdown = MarkdownConverter.convertTSAgentToMD(config);
        return {
          content: [{
            type: 'text',
            text: markdown
          }]
        };
      }

      default:
        throw new Error(`Unknown agent generator tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in agent generator tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}