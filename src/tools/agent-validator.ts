/**
 * Agent Validation Tool
 * Validates agent configurations match claude-code query API requirements
 */

import { AgentConfig } from '../types/agent-config.js';
import { z } from 'zod';
import path from 'path';

// Schema for claude-code query API options
const ClaudeCodeOptionsSchema = z.object({
  systemPrompt: z.string().optional(),
  model: z.enum(['sonnet', 'opus', 'haiku']),  // Required field
  allowedTools: z.array(z.string()).optional(),
  disallowedTools: z.array(z.string()).optional(),
  mcpServers: z.record(z.string(), z.object({
    command: z.string(),
    args: z.array(z.string())
  })).optional(),
  pathToClaudeCodeExecutable: z.string().optional()
});

// Schema for AgentConfig that matches our types
const AgentConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt: z.string().optional(),
  systemPrompt: z.string().optional(), // Legacy field at root
  model: z.string().optional(), // Legacy field at root
  permissions: z.object({
    mode: z.enum(['default', 'acceptEdits', 'ask']),
    tools: z.object({
      allowed: z.array(z.string()),
      denied: z.array(z.string()),
      autoPopulatedDisallowed: z.array(z.string()).optional(),
      lastDiscoveryTime: z.number().optional()
    }),
    mcpServers: z.record(z.string(), z.enum(['allow', 'deny', 'ask'])),
    useDynamicRestrictions: z.boolean().optional()
  }).optional(),
  context: z.object({
    maxTokens: z.number(),
    temperature: z.number()
  }).optional(),
  options: z.object({
    allowedTools: z.array(z.string()).optional(),
    disallowedTools: z.array(z.string()).optional(),
    mcpServers: z.record(z.string(), z.any()).optional(),
    model: z.string().optional(),
    systemPrompt: z.string().optional(),
    useDynamicRestrictions: z.boolean().optional(),
    securityProfile: z.object({
      level: z.enum(['high', 'medium', 'low']),
      allowedCount: z.number(),
      totalAvailable: z.number(),
      lastCalculated: z.number()
    }).optional()
  }).optional(),
  color: z.string().optional()
});

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  queryOptions?: any;
}

/**
 * Validates an agent configuration for compatibility with claude-code query API
 */
export function validateAgentConfig(config: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  // First, check if it's a valid AgentConfig
  try {
    const parsedConfig = AgentConfigSchema.parse(config);

    // Check if options exists and has required fields
    if (!parsedConfig.options) {
      result.errors.push('Missing options object - required for claude-code query API');
      result.isValid = false;
    } else {
      // Validate options structure for query API
      if (!parsedConfig.options.systemPrompt) {
        result.warnings.push('No systemPrompt in options - agent will run without system instructions');
      }

      if (!parsedConfig.options.allowedTools || parsedConfig.options.allowedTools.length === 0) {
        result.warnings.push('No allowedTools specified - agent will have limited capabilities');
      }

      if (!parsedConfig.options.mcpServers) {
        result.warnings.push('No mcpServers configured - MCP tools will not be available');
      }

      if (!parsedConfig.options.model) {
        result.errors.push('model is required in options (must be sonnet, opus, or haiku)');
        result.isValid = false;
      }

      // Check for invalid fields
      const validOptionsFields = ['systemPrompt', 'model', 'allowedTools', 'disallowedTools', 'mcpServers', 'useDynamicRestrictions', 'securityProfile'];
      const configOptions = parsedConfig.options as any;
      const extraFields = Object.keys(configOptions).filter(key => !validOptionsFields.includes(key));

      if (extraFields.length > 0) {
        result.errors.push(`Invalid fields in options: ${extraFields.join(', ')}`);
        result.isValid = false;
      }

      // Extract query options
      result.queryOptions = {
        systemPrompt: parsedConfig.options.systemPrompt,
        model: parsedConfig.options.model,
        allowedTools: parsedConfig.options.allowedTools,
        disallowedTools: parsedConfig.options.disallowedTools,
        mcpServers: parsedConfig.options.mcpServers,
        pathToClaudeCodeExecutable: path.resolve(process.cwd(), "node_modules/@anthropic-ai/claude-code/cli.js")
      };
    }

    // Check for common mistakes
    if ((config as any).serverAllowedDirectories) {
      result.errors.push('serverAllowedDirectories is not a valid field - use specific write tools (agents_write, backend_write, etc.) instead');
      result.isValid = false;
    }

    if (parsedConfig.systemPrompt && !parsedConfig.options?.systemPrompt) {
      result.warnings.push('systemPrompt at root level is deprecated - move it to options.systemPrompt');
    }

    if (parsedConfig.model && !parsedConfig.options?.model) {
      result.warnings.push('model at root level is deprecated - move it to options.model');
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      result.isValid = false;
      result.errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    } else {
      result.isValid = false;
      result.errors = ['Invalid agent configuration structure'];
    }
  }

  return result;
}

/**
 * Creates a valid agent configuration template
 */
export function createAgentTemplate(name: string, description: string): AgentConfig {
  return {
    name,
    description,
    prompt: `Default prompt for ${name}`,
    options: {
      model: 'sonnet',  // Required - can be sonnet, opus, or haiku
      systemPrompt: `You are ${name}. ${description}`,
      allowedTools: [
        'Read',
        'Glob',
        'Grep'
      ],
      mcpServers: {
        "levys-awesome-mcp": {
          command: "node",
          args: ["dist/src/index.js"]
        }
      }
    }
  };
}

/**
 * Fixes common issues in agent configurations
 */
export function fixAgentConfig(config: any): AgentConfig {
  const fixed = { ...config };

  // Ensure options exists
  if (!fixed.options) {
    fixed.options = {};
  }

  // Move root-level systemPrompt to options
  if (fixed.systemPrompt && !fixed.options.systemPrompt) {
    fixed.options.systemPrompt = fixed.systemPrompt;
    delete fixed.systemPrompt;
  }

  // Move root-level model to options
  if (fixed.model && !fixed.options.model) {
    fixed.options.model = fixed.model;
    delete fixed.model;
  }

  // Remove invalid fields
  delete fixed.serverAllowedDirectories;

  // Ensure mcpServers is properly structured
  if (!fixed.options.mcpServers) {
    fixed.options.mcpServers = {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    };
  }

  // Ensure allowedTools exists
  if (!fixed.options.allowedTools) {
    fixed.options.allowedTools = ['Read', 'Glob', 'Grep'];
  }

  return fixed;
}