/**
 * Agent Permission Manager
 * Centralizes tool permission management for consistent security across agents
 * Implements awesome-claude-code patterns for tool restriction
 * 
 * CORE MCP FUNCTIONALITY:
 * - Dynamic tool discovery and restriction enforcement
 * - Automatic disallowed tool calculation from comprehensive tool registry
 * - Type-safe tool permission management
 */

import { ToolRegistry } from '../tools/tool-registry.js';

export interface AgentPermissionConfig {
  allowedTools: string[];
  deniedTools?: string[];
  restrictBuiltInTools?: boolean;
  agentRole?: 'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive';
  useDynamicRestrictions?: boolean; // Enable dynamic tool discovery and restriction
}

export interface YAMLAgentConfig {
  name: string;
  description: string;
  tools?: string[]; // If omitted, inherits all tools (awesome-claude-code pattern)
  role?: string;
}

export class PermissionManager {
  /**
   * Security profiles based on awesome-claude-code patterns
   */
  private static readonly SECURITY_PROFILES = {
    'read-only': {
      description: 'Code reviewers, analyzers - read-only tools for safety',
      allowedBuiltInTools: ['Read', 'Grep', 'Glob', 'WebFetch'],
      deniedBuiltInTools: ['Bash', 'Write', 'Edit', 'MultiEdit', 'Task', 'TodoWrite']
    },
    'write-restricted': {
      description: 'Frontend/backend agents - restricted write access to specific folders',
      allowedBuiltInTools: ['Read', 'Grep', 'Glob', 'WebFetch'],
      deniedBuiltInTools: ['Bash', 'Write', 'Edit', 'MultiEdit', 'Task', 'TodoWrite']
    },
    'security-sensitive': {
      description: 'Minimal tools for security-critical operations',
      allowedBuiltInTools: ['Read', 'Grep'], 
      deniedBuiltInTools: ['Bash', 'Write', 'Edit', 'MultiEdit', 'Task', 'TodoWrite', 'WebFetch', 'WebSearch']
    },
    'full-access': {
      description: 'Orchestrators and planners - access to most tools but not Write/Edit',
      allowedBuiltInTools: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'Bash'],
      deniedBuiltInTools: ['Write', 'Edit', 'MultiEdit'] // Still block direct file operations
    }
  } as const;

  /**
   * Converts YAML-style agent config to permission config (awesome-claude-code pattern)
   */
  static fromYAMLConfig(yamlConfig: YAMLAgentConfig): AgentPermissionConfig {
    // If tools field is omitted, inherit all tools (awesome-claude-code pattern)
    if (!yamlConfig.tools) {
      console.log(`[DEBUG] Agent '${yamlConfig.name}' omitted tools field - inheriting all tools`);
      return {
        allowedTools: [], // Will be populated by role-based logic
        agentRole: 'full-access'
      };
    }

    // If tools are explicitly specified, use them
    console.log(`[DEBUG] Agent '${yamlConfig.name}' explicitly specified tools:`, yamlConfig.tools);
    return {
      allowedTools: yamlConfig.tools,
      agentRole: yamlConfig.role as any || 'write-restricted'
    };
  }

  /**
   * Gets tools for a security role profile
   */
  static getToolsForRole(role: AgentPermissionConfig['agentRole'], customTools: string[] = []): string[] {
    if (!role || role === 'full-access') {
      // For full access, combine custom tools with allowed built-ins
      const profile = this.SECURITY_PROFILES['full-access'];
      return [...customTools, ...profile.allowedBuiltInTools];
    }

    const profile = this.SECURITY_PROFILES[role];
    if (!profile) {
      console.warn(`[WARN] Unknown security role: ${role}, defaulting to read-only`);
      return [...customTools, ...this.SECURITY_PROFILES['read-only'].allowedBuiltInTools];
    }

    return [...customTools, ...profile.allowedBuiltInTools];
  }

  /**
   * Gets standardized tool permissions for agent execution
   * Enforces WHITELIST-BASED security: only explicitly allowed tools are permitted
   * Implements awesome-claude-code patterns with role-based restrictions
   */
  static getAgentPermissions(config: AgentPermissionConfig): {
    allowedTools: string[];
    disallowedTools: string[];
  } {
    // Standard tools that are always denied regardless of config
    const alwaysDeniedTools = [
      'TodoWrite',  // Block built-in TodoWrite tool - agents shouldn't create todos
      'Task',       // Block Task tool that could invoke other agents - prevents infinite loops
      'Write',      // Block regular Write tool - agents should use restricted write tools
      'Edit',       // Block regular Edit tool - agents should use restricted edit tools
      'MultiEdit'   // Block MultiEdit tool - agents should use restricted edit tools
    ];

    // All available Claude Code built-in tools that need to be controlled
    const allBuiltInTools = [
      'Bash',          // Shell command execution - high risk
      'Read',          // File reading - controlled access
      'Write',         // File writing - blocked by default
      'Edit',          // File editing - blocked by default
      'MultiEdit',     // Multi-file editing - blocked by default
      'Glob',          // File pattern matching - controlled access
      'Grep',          // Content search - controlled access
      'TodoWrite',     // Todo management - blocked by default
      'Task',          // Agent invocation - blocked by default
      'WebFetch',      // Web content fetching - controlled access
      'WebSearch',     // Web search - controlled access
      'NotebookEdit',  // Jupyter notebook editing - controlled access
      'ExitPlanMode',  // Plan mode control - controlled access
      'BashOutput',    // Background bash output - controlled access
      'KillBash'       // Background bash termination - controlled access
    ];

    // Determine final allowed tools based on role and explicit configuration
    let finalAllowedTools: string[];
    
    if (config.agentRole) {
      // Use role-based permissions with custom tools
      const customMCPTools = config.allowedTools.filter(tool => tool.startsWith('mcp__'));
      const roleBasedBuiltIns = this.getToolsForRole(config.agentRole, []);
      finalAllowedTools = [...customMCPTools, ...roleBasedBuiltIns];
      
      console.log(`[DEBUG] Role-based permissions for '${config.agentRole}':`, roleBasedBuiltIns);
      console.log(`[DEBUG] Custom MCP tools:`, customMCPTools);
    } else {
      // Use explicitly allowed tools (legacy behavior)
      finalAllowedTools = config.allowedTools || [];
    }
    
    // Calculate tools to deny: all built-ins not in final allowed + always denied + config denied
    const toolsToDeny = [
      ...allBuiltInTools.filter(tool => !finalAllowedTools.includes(tool)),
      ...alwaysDeniedTools,
      ...(config.deniedTools || [])
    ];

    // Remove duplicates from denied tools list
    const uniqueDisallowedTools = [...new Set(toolsToDeny)];

    console.log(`[DEBUG] getAgentPermissions input - allowedTools:`, config.allowedTools);
    console.log(`[DEBUG] getAgentPermissions input - agentRole:`, config.agentRole);
    console.log(`[DEBUG] Final allowed tools:`, finalAllowedTools);
    console.log(`[DEBUG] Built-in tools being denied:`, allBuiltInTools.filter(tool => !finalAllowedTools.includes(tool)));
    
    const result = {
      allowedTools: finalAllowedTools,
      disallowedTools: uniqueDisallowedTools
    };
    console.log(`[DEBUG] getAgentPermissions output:`, result);

    return result;
  }

  /**
   * Validates that an agent has permission to use put_summary tool
   */
  static ensureSummaryPermission(allowedTools: string[]): string[] {
    const summaryTool = 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary';
    console.log(`[DEBUG] ensureSummaryPermission input tools:`, allowedTools);
    console.log(`[DEBUG] Looking for summary tool:`, summaryTool);
    console.log(`[DEBUG] Summary tool included?`, allowedTools.includes(summaryTool));
    
    if (!allowedTools.includes(summaryTool)) {
      const result = [...allowedTools, summaryTool];
      console.log(`[DEBUG] Added summary tool, result:`, result);
      return result;
    }
    console.log(`[DEBUG] Summary tool already present`);
    return allowedTools;
  }

  /**
   * Gets permissions for summary creation - ensures put_summary is available
   */
  static getSummaryPermissions(baseConfig: AgentPermissionConfig): {
    allowedTools: string[];
    disallowedTools: string[];
  } {
    const basePermissions = this.getAgentPermissions(baseConfig);
    
    return {
      allowedTools: this.ensureSummaryPermission(basePermissions.allowedTools),
      disallowedTools: basePermissions.disallowedTools
    };
  }

  /**
   * Parses YAML frontmatter from markdown agent files (awesome-claude-code pattern)
   */
  static parseYAMLFrontmatter(markdownContent: string): YAMLAgentConfig | null {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = markdownContent.match(frontmatterRegex);
    
    if (!match) {
      console.log(`[DEBUG] No YAML frontmatter found in agent file`);
      return null;
    }

    try {
      // Simple YAML parser for basic key-value pairs
      const yamlContent = match[1];
      const config: Partial<YAMLAgentConfig> = {};
      
      const lines = yamlContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':');
          const value = valueParts.join(':').trim();
          
          if (key.trim() === 'name') {
            config.name = value.replace(/['"]/g, '');
          } else if (key.trim() === 'description') {
            config.description = value.replace(/['"]/g, '');
          } else if (key.trim() === 'tools') {
            // Parse tools array: "Read, Write, Edit" or ["Read", "Write", "Edit"]
            if (value.startsWith('[') && value.endsWith(']')) {
              // Array format
              config.tools = value
                .slice(1, -1)
                .split(',')
                .map(t => t.trim().replace(/['"]/g, ''))
                .filter(t => t);
            } else if (value && value !== '[]') {
              // Comma-separated format
              config.tools = value.split(',').map(t => t.trim().replace(/['"]/g, '')).filter(t => t);
            }
            // If tools is empty or [], it will remain undefined (awesome-claude-code pattern)
          } else if (key.trim() === 'role') {
            config.role = value.replace(/['"]/g, '');
          }
        }
      }

      if (!config.name) {
        console.warn(`[WARN] Agent config missing required 'name' field`);
        return null;
      }

      console.log(`[DEBUG] Parsed YAML config:`, config);
      return config as YAMLAgentConfig;
    } catch (error) {
      console.error(`[ERROR] Failed to parse YAML frontmatter:`, error);
      return null;
    }
  }

  /**
   * Creates agent permission config from markdown file content (awesome-claude-code pattern)
   */
  static fromMarkdownFile(markdownContent: string, fallbackMCPTools: string[] = []): AgentPermissionConfig {
    const yamlConfig = this.parseYAMLFrontmatter(markdownContent);
    
    if (!yamlConfig) {
      // No YAML frontmatter - default to write-restricted with provided MCP tools
      console.log(`[DEBUG] No YAML frontmatter found, using write-restricted profile with MCP tools:`, fallbackMCPTools);
      return {
        allowedTools: fallbackMCPTools,
        agentRole: 'write-restricted'
      };
    }

    // Convert YAML config to permission config
    const permissionConfig = this.fromYAMLConfig(yamlConfig);
    
    // Add fallback MCP tools if not explicitly provided
    if (fallbackMCPTools.length > 0) {
      permissionConfig.allowedTools = [...(permissionConfig.allowedTools || []), ...fallbackMCPTools];
    }

    return permissionConfig;
  }

  /**
   * Get security profile examples for documentation
   */
  static getSecurityProfiles() {
    return this.SECURITY_PROFILES;
  }

  // ========== DYNAMIC TOOL RESTRICTION METHODS (CORE MCP FUNCTIONALITY) ==========

  /**
   * Gets agent permissions with dynamic tool discovery and restriction enforcement
   * This is a CORE MCP function that ensures comprehensive tool security
   */
  static async getAgentPermissionsWithDynamicRestrictions(config: AgentPermissionConfig): Promise<{
    allowedTools: string[];
    disallowedTools: string[];
  }> {
    // If dynamic restrictions are disabled, use the standard method
    if (config.useDynamicRestrictions === false) {
      return this.getAgentPermissions(config);
    }

    console.log(`[PermissionManager] Using dynamic tool restriction enforcement`);
    
    // Get base permissions using existing logic
    const basePermissions = this.getAgentPermissions(config);
    
    // Calculate dynamic disallowed tools using ToolRegistry
    const dynamicDisallowedTools = await ToolRegistry.calculateDisallowedTools(basePermissions.allowedTools);
    
    // Combine manual and dynamic restrictions, then subtract allowed tools to prevent conflicts
    const preliminaryDisallowedTools = [
      ...new Set([
        ...basePermissions.disallowedTools,
        ...dynamicDisallowedTools
      ])
    ];
    
    // CRITICAL FIX: Ensure no allowed tools are in the disallowed list
    const combinedDisallowedTools = preliminaryDisallowedTools.filter(tool => 
      !basePermissions.allowedTools.includes(tool)
    );
    
    console.log(`[PermissionManager] DEBUGGING DISALLOWED TOOLS FILTER:`);
    console.log(`[PermissionManager] Preliminary disallowed tools: ${preliminaryDisallowedTools.length}`);
    console.log(`[PermissionManager] Allowed tools: ${basePermissions.allowedTools.length}`);
    console.log(`[PermissionManager] Final disallowed tools: ${combinedDisallowedTools.length}`);
    console.log(`[PermissionManager] Tools that were filtered out: ${preliminaryDisallowedTools.length - combinedDisallowedTools.length}`);

    const result = {
      allowedTools: basePermissions.allowedTools,
      disallowedTools: combinedDisallowedTools
    };

    console.log(`[PermissionManager] Dynamic restrictions calculated: ${dynamicDisallowedTools.length} tools disallowed dynamically`);
    console.log(`[PermissionManager] Total disallowed tools: ${combinedDisallowedTools.length}`);
    
    return result;
  }

  /**
   * Validates agent tool configuration against all available tools
   */
  static async validateAgentToolConfiguration(config: AgentPermissionConfig): Promise<{
    valid: boolean;
    unknownAllowedTools: string[];
    unknownDeniedTools: string[];
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    // Validate allowed tools
    const allowedValidation = await ToolRegistry.validateToolList(config.allowedTools);
    
    // Validate denied tools if provided
    let deniedValidation = { valid: true, unknownTools: [] as string[] };
    if (config.deniedTools && config.deniedTools.length > 0) {
      deniedValidation = await ToolRegistry.validateToolList(config.deniedTools);
    }

    // Generate recommendations
    if (allowedValidation.unknownTools.length > 0) {
      recommendations.push(`Unknown tools in allowedTools: ${allowedValidation.unknownTools.join(', ')}`);
    }
    
    if (deniedValidation.unknownTools.length > 0) {
      recommendations.push(`Unknown tools in deniedTools: ${deniedValidation.unknownTools.join(', ')}`);
    }

    // Check for security best practices
    const hasWriteTools = config.allowedTools.some(tool => 
      tool.includes('write') || tool.includes('edit') || tool.includes('Write') || tool.includes('Edit')
    );
    const hasShellAccess = config.allowedTools.includes('Bash');
    
    if (hasWriteTools && !config.agentRole) {
      recommendations.push('Consider specifying an agentRole for better security when allowing write operations');
    }
    
    if (hasShellAccess && config.agentRole !== 'full-access') {
      recommendations.push('Bash tool requires full-access role for security compliance');
    }

    return {
      valid: allowedValidation.valid && deniedValidation.valid,
      unknownAllowedTools: allowedValidation.unknownTools,
      unknownDeniedTools: deniedValidation.unknownTools,
      recommendations
    };
  }

  /**
   * Generates a human-readable tool restriction prompt for injection into agent system prompts
   * This ensures agents receive explicit warnings about forbidden tools
   */
  static async generateToolRestrictionPrompt(disallowedTools: string[]): Promise<string> {
    if (disallowedTools.length === 0) {
      return '';
    }

    // Group tools by category for better readability
    const toolsByCategory = await ToolRegistry.getToolsByCategory();
    const categorizedDisallowed: Record<string, string[]> = {};
    
    for (const tool of disallowedTools) {
      let foundCategory = 'unknown';
      for (const [category, tools] of Object.entries(toolsByCategory)) {
        if (tools.includes(tool)) {
          foundCategory = category;
          break;
        }
      }
      
      if (!categorizedDisallowed[foundCategory]) {
        categorizedDisallowed[foundCategory] = [];
      }
      categorizedDisallowed[foundCategory].push(tool);
    }

    let prompt = '\n\n## 🚫 TOOL RESTRICTIONS ENFORCED\n\n';
    prompt += `**CRITICAL: You are FORBIDDEN from using the following ${disallowedTools.length} tools:**\n\n`;
    
    for (const [category, tools] of Object.entries(categorizedDisallowed)) {
      if (tools.length > 0) {
        const displayCategory = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        prompt += `**${displayCategory} Tools:** ${tools.join(', ')}\n`;
      }
    }
    
    prompt += '\n**If you attempt to use any restricted tool, your request will be blocked.**\n';
    prompt += '**Only use tools explicitly listed in your allowed tools configuration.**\n\n';
    prompt += '---\n\n';
    
    return prompt;
  }

  /**
   * Gets tool usage statistics for an agent configuration
   */
  static async getAgentToolStatistics(config: AgentPermissionConfig): Promise<{
    allowedCount: number;
    disallowedCount: number;
    totalAvailable: number;
    coveragePercent: number;
    securityLevel: 'high' | 'medium' | 'low';
  }> {
    const permissions = await this.getAgentPermissionsWithDynamicRestrictions(config);
    const stats = await ToolRegistry.getToolStatistics();
    const totalTools = stats.totalMCPTools + stats.totalBuiltInTools;
    
    const coveragePercent = (permissions.allowedTools.length / totalTools) * 100;
    
    let securityLevel: 'high' | 'medium' | 'low' = 'medium';
    if (coveragePercent < 20) {
      securityLevel = 'high'; // Very restrictive
    } else if (coveragePercent > 60) {
      securityLevel = 'low'; // Very permissive
    }

    return {
      allowedCount: permissions.allowedTools.length,
      disallowedCount: permissions.disallowedTools.length,
      totalAvailable: totalTools,
      coveragePercent: Math.round(coveragePercent * 100) / 100,
      securityLevel
    };
  }
}