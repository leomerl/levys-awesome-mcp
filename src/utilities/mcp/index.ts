/**
 * Third-Party MCP Utilities
 * Exports for all MCP integration functionality
 */

// Environment variable utilities
export {
  loadEnvVars,
  resolveEnvVars,
  resolveEnvVarsInArray,
  resolveEnvVarsInHeaders,
  validateRequiredEnvVars,
  getEnvVar,
  hasEnvVarPlaceholders
} from './env-resolver.js';

// MCP registry and configuration
export {
  THIRD_PARTY_MCP_REGISTRY,
  getMcpConfig,
  resolveMcpConfig,
  resolveMultipleMcpConfigs,
  getAvailableMcpIds,
  getMcpTools,
  getMultipleMcpTools
} from './third-party-mcp-registry.js';

// Agent MCP enablement
export {
  enableThirdPartyMcps,
  createMcpEnabler,
  enableContext7,
  enableMemory,
  enableGitHub,
  enablePlaywright,
  hasThirdPartyMcp,
  getEnabledMcpIds,
  getThirdPartyMcpTools
} from './agent-mcp-enabler.js';
