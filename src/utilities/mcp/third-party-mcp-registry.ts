/**
 * Third-Party MCP Registry
 * Central registry of all third-party MCP configurations
 */

import {
  ThirdPartyMcpConfig,
  ThirdPartyMcpRegistry,
  ResolvedMcpConfig
} from '../../types/third-party-mcp.js';
import {
  resolveEnvVarsInArray,
  resolveEnvVarsInHeaders,
  validateRequiredEnvVars
} from './env-resolver.js';

/**
 * Registry of all available third-party MCPs
 * Add new MCPs here to make them available to agents
 */
export const THIRD_PARTY_MCP_REGISTRY: ThirdPartyMcpRegistry = {
  context7: {
    id: 'context7',
    name: 'Context7',
    type: 'http',
    description: 'AI-powered documentation and code examples from Upstash',
    url: 'https://mcp.context7.com/mcp',
    headers: {
      'CONTEXT7_API_KEY': '${CONTEXT7_API_KEY}'
    },
    requiredEnvVars: ['CONTEXT7_API_KEY'],
    tools: [
      'mcp__context7__resolve-library-id',
      'mcp__context7__get-library-docs'
    ],
    enabled: true
  },

  memory: {
    id: 'memory',
    name: 'Memory MCP',
    type: 'command',
    description: 'Persistent key-value storage for agent state across sessions',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    tools: [
      'mcp__memory__store',
      'mcp__memory__retrieve',
      'mcp__memory__delete',
      'mcp__memory__list'
    ],
    enabled: true
  },

  github: {
    id: 'github',
    name: 'GitHub MCP',
    type: 'command',
    description: 'GitHub API integration for repositories, issues, PRs, and workflows',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    requiredEnvVars: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
    tools: [
      'mcp__github__create-or-update-file',
      'mcp__github__search-repositories',
      'mcp__github__create-repository',
      'mcp__github__get-file-contents',
      'mcp__github__push-files',
      'mcp__github__create-issue',
      'mcp__github__create-pull-request',
      'mcp__github__fork-repository',
      'mcp__github__create-branch'
    ],
    enabled: true
  },

  playwright: {
    id: 'playwright',
    name: 'Playwright MCP',
    type: 'command',
    description: 'Browser automation for testing and web scraping',
    command: 'npx',
    args: ['-y', '@executeautomation/playwright-mcp-server'],
    tools: [
      'mcp__playwright__navigate',
      'mcp__playwright__screenshot',
      'mcp__playwright__click',
      'mcp__playwright__fill',
      'mcp__playwright__evaluate'
    ],
    enabled: true
  },

  languageServer: {
    id: 'languageServer',
    name: 'Language Server MCP',
    type: 'command',
    description: 'TypeScript/JavaScript language server for code intelligence and symbol navigation',
    // Use full path since go/bin may not be in PATH
    command: process.env.HOME ? `${process.env.HOME}/go/bin/mcp-language-server` : 'mcp-language-server',
    args: ['--workspace', '${WORKSPACE_PATH}', '--lsp', 'typescript-language-server', '--', '--stdio'],
    requiredEnvVars: ['WORKSPACE_PATH'],
    tools: [
      'mcp__languageServer__definition',
      'mcp__languageServer__references',
      'mcp__languageServer__diagnostics',
      'mcp__languageServer__hover',
      'mcp__languageServer__rename',
      'mcp__languageServer__edit'
    ],
    enabled: true
  }
};

/**
 * Get a third-party MCP configuration by ID
 *
 * @param mcpId - The MCP identifier (e.g., 'context7')
 * @returns The MCP config or undefined if not found
 */
export function getMcpConfig(mcpId: string): ThirdPartyMcpConfig | undefined {
  return THIRD_PARTY_MCP_REGISTRY[mcpId];
}

/**
 * Resolve a third-party MCP configuration with environment variables
 *
 * @param mcpId - The MCP identifier
 * @returns Resolved MCP config with validation results
 */
export function resolveMcpConfig(mcpId: string): ResolvedMcpConfig {
  const config = getMcpConfig(mcpId);

  if (!config) {
    return {
      mcpServer: {},
      isValid: false,
      missingEnvVars: [],
      errors: [`Unknown MCP: ${mcpId}`]
    };
  }

  // Validate required env vars
  const validation = validateRequiredEnvVars(config.requiredEnvVars || []);

  if (!validation.isValid) {
    return {
      mcpServer: {},
      isValid: false,
      missingEnvVars: validation.missingVars,
      errors: [
        `Missing required environment variables for ${config.name}: ${validation.missingVars.join(', ')}`
      ]
    };
  }

  // Handle HTTP-based MCPs
  if (config.type === 'http') {
    const resolvedHeaders = config.headers ? resolveEnvVarsInHeaders(config.headers) : undefined;

    return {
      mcpServer: {
        type: 'http',
        url: config.url,
        headers: resolvedHeaders
      },
      isValid: true,
      missingEnvVars: [],
      errors: []
    };
  }

  // Handle command-line MCPs
  if (config.type === 'command') {
    const resolvedArgs = config.args ? resolveEnvVarsInArray(config.args) : [];

    return {
      mcpServer: {
        command: config.command,
        args: resolvedArgs
      },
      isValid: true,
      missingEnvVars: [],
      errors: []
    };
  }

  return {
    mcpServer: {},
    isValid: false,
    missingEnvVars: [],
    errors: [`Invalid MCP type for ${config.name}`]
  };
}

/**
 * Resolve multiple MCP configurations
 *
 * @param mcpIds - Array of MCP identifiers
 * @returns Map of MCP ID to resolved config
 */
export function resolveMultipleMcpConfigs(mcpIds: string[]): Map<string, ResolvedMcpConfig> {
  const resolved = new Map<string, ResolvedMcpConfig>();

  for (const mcpId of mcpIds) {
    resolved.set(mcpId, resolveMcpConfig(mcpId));
  }

  return resolved;
}

/**
 * Get all available third-party MCP IDs
 *
 * @returns Array of MCP IDs
 */
export function getAvailableMcpIds(): string[] {
  return Object.keys(THIRD_PARTY_MCP_REGISTRY);
}

/**
 * Get all tools provided by a third-party MCP
 *
 * @param mcpId - The MCP identifier
 * @returns Array of tool names or empty array if not found
 */
export function getMcpTools(mcpId: string): string[] {
  const config = getMcpConfig(mcpId);
  return config?.tools || [];
}

/**
 * Get all tools provided by multiple MCPs
 *
 * @param mcpIds - Array of MCP identifiers
 * @returns Array of all tool names (deduplicated)
 */
export function getMultipleMcpTools(mcpIds: string[]): string[] {
  const allTools = new Set<string>();

  for (const mcpId of mcpIds) {
    const tools = getMcpTools(mcpId);
    tools.forEach(tool => allTools.add(tool));
  }

  return Array.from(allTools);
}
