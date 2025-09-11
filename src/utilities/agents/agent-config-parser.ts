/**
 * Agent Configuration Parser and Validator
 * Handles parsing, validation, and normalization of agent configurations
 */

import { AgentConfig, AgentConfigLegacy } from '../../types/agent-config.js';
import { ValidationUtils } from '../config/validation.js';

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: AgentConfig;
}

export class AgentConfigParser {
  /**
   * Parse and validate agent configuration
   */
  static parseAndValidate(rawConfig: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required fields
    if (!rawConfig || typeof rawConfig !== 'object') {
      return {
        isValid: false,
        errors: ['Configuration must be an object'],
        warnings: []
      };
    }

    if (!rawConfig.name || typeof rawConfig.name !== 'string') {
      errors.push('Missing or invalid name field');
    } else if (!ValidationUtils.validateAgentName(rawConfig.name)) {
      errors.push('Invalid agent name format (alphanumeric, hyphens, underscores only)');
    }

    if (!rawConfig.description || typeof rawConfig.description !== 'string') {
      errors.push('Missing or invalid description field');
    }

    // Stop if critical errors found
    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
        warnings
      };
    }

    try {
      const normalizedConfig = this.normalizeConfig(rawConfig);
      
      // Validate normalized config
      const validationErrors = this.validateNormalizedConfig(normalizedConfig);
      errors.push(...validationErrors);

      // Check for warnings
      const configWarnings = this.checkConfigWarnings(normalizedConfig);
      warnings.push(...configWarnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        normalizedConfig: errors.length === 0 ? normalizedConfig : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Configuration parsing error: ${error instanceof Error ? error.message : String(error)}`],
        warnings
      };
    }
  }

  /**
   * Normalize configuration from various formats to standard format
   */
  static normalizeConfig(rawConfig: any): AgentConfig {
    const config: AgentConfig = {
      name: rawConfig.name,
      description: rawConfig.description
    };

    // Handle different configuration structures
    if (rawConfig.options) {
      // New format
      config.options = {
        systemPrompt: rawConfig.options.systemPrompt || rawConfig.systemPrompt || '',
        model: rawConfig.options.model || rawConfig.model || 'claude-3-5-sonnet-20241022',
        allowedTools: rawConfig.options.allowedTools || [],
        mcpServers: rawConfig.options.mcpServers || []
      };
    } else if (rawConfig.permissions) {
      // Legacy format - convert to new format
      config.options = {
        systemPrompt: rawConfig.systemPrompt || '',
        model: rawConfig.model || 'claude-3-5-sonnet-20241022',
        allowedTools: rawConfig.permissions.tools?.allowed || [],
        mcpServers: Object.keys(rawConfig.permissions.mcpServers || {})
      };

      // Store legacy permissions for compatibility
      config.permissions = rawConfig.permissions;
    } else {
      // Basic format - create minimal options
      config.options = {
        systemPrompt: rawConfig.systemPrompt || rawConfig.prompt || '',
        model: rawConfig.model || 'claude-3-5-sonnet-20241022',
        allowedTools: rawConfig.allowedTools || [],
        mcpServers: rawConfig.mcpServers || []
      };
    }

    // Set other properties
    config.systemPrompt = config.options.systemPrompt;
    config.model = config.options.model;
    config.color = rawConfig.color;

    // Handle legacy context
    if (rawConfig.context) {
      config.context = rawConfig.context;
    }

    return config;
  }

  /**
   * Validate normalized configuration
   */
  private static validateNormalizedConfig(config: AgentConfig): string[] {
    const errors: string[] = [];

    // Validate options
    if (!config.options) {
      errors.push('Missing options configuration');
      return errors;
    }


    // Validate model
    if (!config.options.model || typeof config.options.model !== 'string') {
      errors.push('Missing or invalid model specification');
    }

    // Validate system prompt
    if (!ValidationUtils.isNonEmptyString(config.options.systemPrompt)) {
      errors.push('Missing or empty system prompt');
    }

    // Validate tools array
    if (!Array.isArray(config.options.allowedTools)) {
      errors.push('allowedTools must be an array');
    }

    // Validate MCP servers array
    if (!Array.isArray(config.options.mcpServers)) {
      errors.push('mcpServers must be an array');
    }

    return errors;
  }

  /**
   * Check for configuration warnings
   */
  private static checkConfigWarnings(config: AgentConfig): string[] {
    const warnings: string[] = [];

    if (!config.options) return warnings;

    // Check for empty system prompt
    if (config.options.systemPrompt && !config.options.systemPrompt.trim()) {
      warnings.push('System prompt is empty - agent may not behave as expected');
    }

    // Check for very long system prompt
    if (config.options.systemPrompt && config.options.systemPrompt.length > 10000) {
      warnings.push('System prompt is very long - consider breaking it down');
    }


    // Check for no allowed tools
    if (config.options.allowedTools && config.options.allowedTools.length === 0) {
      warnings.push('No tools allowed - agent will have limited capabilities');
    }

    // Check for deprecated model
    if (config.options.model && config.options.model.includes('claude-2')) {
      warnings.push('Using deprecated Claude-2 model - consider upgrading to Claude-3');
    }

    return warnings;
  }

  /**
   * Convert legacy configuration to new format
   */
  static convertLegacyConfig(legacyConfig: AgentConfigLegacy): AgentConfig {
    return this.normalizeConfig(legacyConfig);
  }

  /**
   * Merge configurations (base config + overrides)
   */
  static mergeConfigs(baseConfig: AgentConfig, overrides: Partial<AgentConfig>): AgentConfig {
    const merged: AgentConfig = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    // Merge top-level properties
    Object.assign(merged, overrides);

    // Merge options if provided
    if (overrides.options) {
      merged.options = {
        ...merged.options,
        ...overrides.options
      };
    }

    // Ensure consistency
    if (merged.options) {
      merged.systemPrompt = merged.options.systemPrompt;
      merged.model = merged.options.model;
    }

    return merged;
  }
}