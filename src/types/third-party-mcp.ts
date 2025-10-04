/**
 * Third-Party MCP Integration Types
 * Provides a flexible interface for integrating external MCP servers
 */

/**
 * Third-party MCP server configuration
 * Supports both command-line and HTTP-based MCP servers
 */
export interface ThirdPartyMcpConfig {
  /** Unique identifier for the MCP server */
  id: string;

  /** Display name */
  name: string;

  /** MCP type: command-line or HTTP */
  type: 'command' | 'http';

  /** Command to execute (for command-line MCPs) */
  command?: string;

  /** Command arguments (can include env var placeholders like ${CONTEXT7_API_KEY}) */
  args?: string[];

  /** HTTP URL (for HTTP-based MCPs) */
  url?: string;

  /** HTTP headers (can include env var placeholders in values) */
  headers?: Record<string, string>;

  /** Environment variables required for this MCP */
  requiredEnvVars?: string[];

  /** Optional environment variables */
  optionalEnvVars?: string[];

  /** Tools provided by this MCP (for documentation/validation) */
  tools?: string[];

  /** Description of what this MCP provides */
  description?: string;

  /** Whether this MCP is enabled by default */
  enabled?: boolean;
}

/**
 * Registry of all third-party MCP configurations
 */
export interface ThirdPartyMcpRegistry {
  [mcpId: string]: ThirdPartyMcpConfig;
}

/**
 * Result of MCP configuration resolution (with env vars resolved)
 */
export interface ResolvedMcpConfig {
  /** MCP server configuration for claude-code query API */
  mcpServer: {
    type?: 'http';
    command?: string;
    args?: string[];
    url?: string;
    headers?: Record<string, string>;
  };

  /** Whether all required env vars are present */
  isValid: boolean;

  /** Missing required env vars */
  missingEnvVars: string[];

  /** Validation errors */
  errors: string[];
}

/**
 * Options for enabling third-party MCPs in an agent
 */
export interface EnableThirdPartyMcpOptions {
  /** MCP IDs to enable */
  mcpIds: string[];

  /** Whether to validate env vars before enabling */
  validateEnvVars?: boolean;

  /** Whether to throw on missing env vars (default: false, logs warning instead) */
  throwOnMissingEnv?: boolean;
}
