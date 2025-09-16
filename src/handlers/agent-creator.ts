/**
 * Agent Creator Handler
 * Validates and creates agent configurations
 */

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { validateAgentConfig, createAgentTemplate, fixAgentConfig } from '../tools/agent-validator.js';
import { validateProjectDirectory } from '../shared/utils.js';

export const agentCreatorTools = [
  {
    name: 'create_agent',
    description: 'Create a new agent with validated configuration that matches claude-code query API requirements',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Agent name (kebab-case, e.g., "my-agent")'
        },
        description: {
          type: 'string',
          description: 'Clear description of agent purpose'
        },
        systemPrompt: {
          type: 'string',
          description: 'Detailed system prompt with all constraints and guidelines'
        },
        model: {
          type: 'string',
          enum: ['sonnet', 'opus', 'haiku'],
          description: 'Model to use (required)'
        },
        allowedTools: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of allowed tools for the agent'
        },
        includeMcpServer: {
          type: 'boolean',
          description: 'Whether to include levys-awesome-mcp server configuration',
          default: true
        }
      },
      required: ['name', 'description', 'systemPrompt', 'model', 'allowedTools']
    }
  },
  {
    name: 'validate_agent',
    description: 'Validate an agent configuration for claude-code query API compatibility',
    inputSchema: {
      type: 'object' as const,
      properties: {
        config: {
          type: 'object',
          description: 'Agent configuration to validate'
        }
      },
      required: ['config']
    }
  }
];

export async function handleAgentCreatorTool(name: string, args: any) {
  const projectDir = process.cwd();

  switch (name) {
    case 'create_agent': {
      const { name: agentName, description, systemPrompt, model, allowedTools, includeMcpServer = true } = args;

      // Validate agent name
      if (!/^[a-z][a-z0-9-]*$/.test(agentName)) {
        throw new Error('Agent name must be kebab-case (lowercase letters, numbers, and hyphens)');
      }

      // Create agent configuration
      const agentConfig = {
        name: agentName,
        description,
        prompt: `Default prompt for ${agentName}`,
        options: {
          model,
          systemPrompt,
          allowedTools,
          mcpServers: includeMcpServer ? {
            "levys-awesome-mcp": {
              command: "node",
              args: ["dist/src/index.js"]
            }
          } : undefined
        }
      };

      // Validate configuration
      const validation = validateAgentConfig(agentConfig);
      if (!validation.isValid) {
        throw new Error(`Invalid agent configuration:\n${validation.errors.join('\n')}`);
      }

      // Generate TypeScript file content with proper formatting
      const agentVarName = agentName.replace(/-/g, '');

      // Format allowedTools array
      const toolsFormatted = allowedTools.map((tool: string) => `      "${tool}"`).join(',\n');

      const fileContent = `#!/usr/bin/env tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../src/types/agent-config.ts';

const ${agentVarName}Agent: AgentConfig = {
  name: "${agentName}",
  description: "${description}",
  prompt: "Default prompt for ${agentName}",
  options: {
    model: "${model}",
    systemPrompt: \`${systemPrompt}\`,
    allowedTools: [
${toolsFormatted}
    ],${includeMcpServer ? `
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    }` : ''}
  }
};

export { ${agentVarName}Agent };
export default ${agentVarName}Agent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: npx tsx agents/${agentName}.ts \\"your prompt here\\"");
    process.exit(1);
  }

  console.log("Running ${description}...");
  console.log(\`Prompt: \${prompt}\\n\`);

  try {
    for await (const message of query({
      prompt,
      options: ${agentName.replace(/-/g, '')}Agent.options
    })) {
      if (message.type === "text") {
        console.log(message.text);
      }
    }
  } catch (error) {
    console.error("Failed to execute agent:", error);
    process.exit(1);
  }
}

// Only run when script is called directly (not when imported)
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  runAgent().catch(console.error);
}`;

      // Write agent file
      const agentPath = path.join(projectDir, 'agents', `${agentName}.ts`);
      if (existsSync(agentPath)) {
        throw new Error(`Agent file already exists: ${agentPath}`);
      }

      await writeFile(agentPath, fileContent, 'utf-8');

      return {
        success: true,
        message: `Agent '${agentName}' created successfully at agents/${agentName}.ts`,
        validation: {
          warnings: validation.warnings,
          suggestions: validation.suggestions
        },
        queryOptions: validation.queryOptions
      };
    }

    case 'validate_agent': {
      const { config } = args;
      const validation = validateAgentConfig(config);

      return {
        ...validation,
        fixedConfig: !validation.isValid ? fixAgentConfig(config) : undefined
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}