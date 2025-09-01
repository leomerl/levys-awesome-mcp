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
      // Convert to file:// URL for Windows compatibility and add timestamp to avoid cache
      const resolvedPath = path.resolve(agentPath);
      const fileUrl = `file:///${resolvedPath.replace(/\\/g, '/').replace(/^[A-Z]:/, (match) => match.toLowerCase())}?t=${Date.now()}`;
      
      // Clear require cache if it exists
      delete require.cache[resolvedPath];
      
      const agentModule = await import(fileUrl);
      
      // Try different export patterns
      let config = agentModule.default;
      if (!config) {
        // Try named exports based on filename
        const agentName = path.basename(agentPath, '.ts').replace('-', '');
        const possibleNames = [
          agentName + 'Agent',
          agentName.charAt(0).toUpperCase() + agentName.slice(1) + 'Agent',
          'agent',
          agentName,
          'config'
        ];
        
        for (const name of possibleNames) {
          if (agentModule[name]) {
            config = agentModule[name];
            break;
          }
        }
      }
      
      return config || null;
    } catch (error) {
      console.error(`Error loading agent from ${agentPath}:`, error instanceof Error ? error.message : String(error));
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
      return `---
name: ${oldConfig.name}
description: ${oldConfig.description.replace(/\n/g, '\\n')}
tools: ${oldConfig.permissions.tools.allowed.join(', ') || 'default'}
model: ${oldConfig.model}
color: ${oldConfig.color || 'default'}
---

${oldConfig.systemPrompt}`;
    } else if (isAgentConfigNew(config)) {
      const newConfig = config as AgentConfigNew;
      return `---
name: ${newConfig.name}
description: ${newConfig.description.replace(/\n/g, '\\n')}
tools: ${newConfig.options.tools?.join(', ') || 'default'}
model: ${newConfig.options.model || 'default'}
color: default
---

${newConfig.options.systemPrompt}`;
    }
    return `---
name: ${config.name}
description: Unsupported configuration format
tools: default
model: default
color: default
---

Unsupported configuration format.`;
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
        console.log('Current working directory:', process.cwd());
        const agents = await AgentLoader.getAvailableAgents();
        console.log('Found agents:', agents);
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