/**
 * Agent Configuration Types
 * Shared types for agent configuration and management
 * 
 * CORE MCP FUNCTIONALITY:
 * - Enhanced agent configuration with dynamic tool restrictions
 * - Auto-populated disallowed tools from comprehensive tool discovery
 * - Type-safe tool permission management
 */

export interface AgentConfig {
  name: string;
  description: string;
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  permissions?: {
    mode: 'default' | 'acceptEdits' | 'ask';
    tools: {
      allowed: string[];
      denied: string[];
      // Auto-populated fields (computed at runtime)
      autoPopulatedDisallowed?: string[]; // Dynamically calculated disallowed tools
      lastDiscoveryTime?: number; // When dynamic discovery was last performed
    };
    mcpServers: Record<string, 'allow' | 'deny' | 'ask'>;
    useDynamicRestrictions?: boolean; // Enable dynamic tool discovery and restriction
  };
  context?: {
    maxTokens: number;
    temperature: number;
  };
  options?: {
    maxTurns: number;
    allowedTools?: string[];
    disallowedTools?: string[]; // Auto-populated from dynamic discovery
    mcpServers?: string[];
    model?: string;
    systemPrompt?: string;
    useDynamicRestrictions?: boolean; // Enable dynamic tool discovery and restriction
    securityProfile?: {
      level: 'high' | 'medium' | 'low';
      allowedCount: number;
      totalAvailable: number;
      lastCalculated: number;
    };
  };
  color?: string;
}

/**
 * Enhanced agent configuration with dynamic tool restrictions
 * This configuration is auto-populated with tool restrictions at runtime
 */
export interface EnhancedAgentConfig extends AgentConfig {
  // Runtime-populated fields
  computedPermissions?: {
    allowedTools: string[];
    disallowedTools: string[]; // Auto-populated from ToolRegistry
    lastUpdated: number;
    toolValidation: {
      valid: boolean;
      unknownTools: string[];
      recommendations: string[];
    };
    securityAnalysis: {
      level: 'high' | 'medium' | 'low';
      coveragePercent: number;
      riskFactors: string[];
    };
  };
  restrictionPrompt?: string; // Auto-generated prompt text for tool restrictions
}

/**
 * Configuration for dynamic tool restriction behavior
 */
export interface DynamicRestrictionConfig {
  enabled: boolean;
  refreshIntervalMs: number; // How often to refresh tool discovery
  includePromptInjection: boolean; // Whether to inject restriction warnings
  logLevel: 'none' | 'basic' | 'verbose';
  cacheTTL: number; // Cache time-to-live for tool discovery
}

/**
 * Tool permission result with comprehensive information
 */
export interface ToolPermissionResult {
  allowedTools: string[];
  disallowedTools: string[];
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  statistics: {
    totalAvailable: number;
    allowedCount: number;
    disallowedCount: number;
    coveragePercent: number;
  };
  restrictionPrompt: string;
  generatedAt: number;
}

export interface AgentConfigLegacy {
  name: string;
  description: string;
  model: string;
  permissions: {
    mode: 'default' | 'acceptEdits' | 'ask';
    tools: {
      allowed: string[];
      denied: string[];
    };
    mcpServers: Record<string, 'allow' | 'deny' | 'ask'>;
  };
  systemPrompt: string;
  context: {
    maxTokens: number;
    temperature: number;
  };
  color?: string;
}