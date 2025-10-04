/**
 * Agent MCP Enabler
 * Helper utilities for enabling third-party MCPs in agent configurations
 */

import { AgentConfig } from '../../types/agent-config.js';
import { EnableThirdPartyMcpOptions } from '../../types/third-party-mcp.js';
import {
  resolveMcpConfig,
  getMcpTools,
  getMultipleMcpTools
} from './third-party-mcp-registry.js';

/**
 * Enable third-party MCPs for an agent configuration
 *
 * This function:
 * 1. Validates that MCPs exist and env vars are present (if validateEnvVars is true)
 * 2. Adds the MCP server configs to the agent's mcpServers
 * 3. Adds the MCP tools to the agent's allowedTools
 *
 * @param agentConfig - Base agent configuration
 * @param options - Options for enabling MCPs
 * @returns Enhanced agent config with MCPs enabled
 */
export function enableThirdPartyMcps(
  agentConfig: AgentConfig,
  options: EnableThirdPartyMcpOptions
): AgentConfig {
  const {
    mcpIds,
    validateEnvVars = true,
    throwOnMissingEnv = false
  } = options;

  // Start with existing config
  const enhancedConfig: AgentConfig = {
    ...agentConfig,
    options: {
      ...agentConfig.options,
      mcpServers: { ...(agentConfig.options?.mcpServers || {}) },
      allowedTools: [...(agentConfig.options?.allowedTools || [])]
    }
  };

  // Process each MCP
  for (const mcpId of mcpIds) {
    const resolved = resolveMcpConfig(mcpId);

    // Validate if requested
    if (validateEnvVars && !resolved.isValid) {
      const errorMsg = `Cannot enable MCP '${mcpId}' for agent '${agentConfig.name}': ${resolved.errors.join(', ')}`;

      if (throwOnMissingEnv) {
        throw new Error(errorMsg);
      } else {
        console.warn(`[AgentMcpEnabler] ${errorMsg}`);
        console.warn(`[AgentMcpEnabler] Skipping MCP '${mcpId}' - set required env vars in .env file`);
        continue;
      }
    }

    // Add MCP server config
    enhancedConfig.options!.mcpServers![mcpId] = resolved.mcpServer;

    // Add MCP tools to allowed tools
    const mcpTools = getMcpTools(mcpId);
    for (const tool of mcpTools) {
      if (!enhancedConfig.options!.allowedTools!.includes(tool)) {
        enhancedConfig.options!.allowedTools!.push(tool);
      }
    }

    console.log(`[AgentMcpEnabler] Enabled MCP '${mcpId}' for agent '${agentConfig.name}' with ${mcpTools.length} tools`);
  }

  return enhancedConfig;
}

/**
 * Create a simple MCP enabler for a specific MCP
 * Useful for common patterns like enabling context7
 *
 * @param mcpId - The MCP to enable
 * @returns Function that enables the MCP for an agent config
 */
export function createMcpEnabler(mcpId: string) {
  return (agentConfig: AgentConfig, validateEnvVars = true): AgentConfig => {
    return enableThirdPartyMcps(agentConfig, {
      mcpIds: [mcpId],
      validateEnvVars,
      throwOnMissingEnv: false
    });
  };
}

// Convenience enablers for common MCPs
export const enableContext7 = createMcpEnabler('context7');
export const enableMemory = createMcpEnabler('memory');
export const enableGitHub = createMcpEnabler('github');
export const enablePlaywright = createMcpEnabler('playwright');

/**
 * Check if an agent config has a specific MCP enabled
 *
 * @param agentConfig - Agent configuration to check
 * @param mcpId - MCP identifier to look for
 * @returns True if the MCP is configured
 */
export function hasThirdPartyMcp(agentConfig: AgentConfig, mcpId: string): boolean {
  return !!agentConfig.options?.mcpServers?.[mcpId];
}

/**
 * Get all third-party MCP IDs enabled for an agent
 *
 * @param agentConfig - Agent configuration
 * @returns Array of enabled MCP IDs
 */
export function getEnabledMcpIds(agentConfig: AgentConfig): string[] {
  const mcpServers = agentConfig.options?.mcpServers || {};
  const thirdPartyMcps: string[] = [];

  for (const key of Object.keys(mcpServers)) {
    // Exclude the levys-awesome-mcp server itself
    if (key !== 'levys-awesome-mcp') {
      thirdPartyMcps.push(key);
    }
  }

  return thirdPartyMcps;
}

/**
 * Get all tools available from third-party MCPs enabled for an agent
 *
 * @param agentConfig - Agent configuration
 * @returns Array of tool names from third-party MCPs
 */
export function getThirdPartyMcpTools(agentConfig: AgentConfig): string[] {
  const enabledMcps = getEnabledMcpIds(agentConfig);
  return getMultipleMcpTools(enabledMcps);
}
