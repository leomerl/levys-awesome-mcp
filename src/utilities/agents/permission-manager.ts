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
      agentRole: yamlConfig.role as AgentPermissionConfig['agentRole'] || 'write-restricted'
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
      // Preserve ALL explicitly allowed tools (MCP tools, wildcards, etc.)
      const explicitlyAllowedTools = config.allowedTools || [];
      const customMCPTools = explicitlyAllowedTools.filter(tool => tool.startsWith('mcp__'));
      const roleBasedBuiltIns = this.getToolsForRole(config.agentRole, []);
      
      // Combine: all explicitly allowed tools + role-based built-ins (avoiding duplicates)
      const combinedTools = [...new Set([...explicitlyAllowedTools, ...roleBasedBuiltIns])];
      finalAllowedTools = combinedTools;
      
      console.log(`[DEBUG] Role-based permissions for '${config.agentRole}':`, roleBasedBuiltIns);
      console.log(`[DEBUG] Explicitly allowed tools:`, explicitlyAllowedTools);
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
    console.log(`[DEBUG] Final allowed tools (${finalAllowedTools.length}):`, finalAllowedTools);
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
    
    console.log(`[PermissionManager] Base permissions - allowed tools (${basePermissions.allowedTools.length}):`, basePermissions.allowedTools);
    console.log(`[PermissionManager] Checking for backend_write:`, basePermissions.allowedTools.includes('mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__content-writer__backend_write'));
    
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
    let deniedValidation = { valid: true, invalidTools: [] as string[] };
    if (config.deniedTools && config.deniedTools.length > 0) {
      deniedValidation = await ToolRegistry.validateToolList(config.deniedTools);
    }

    // Generate recommendations
    if (allowedValidation.invalidTools.length > 0) {
      recommendations.push(`Unknown tools in allowedTools: ${allowedValidation.invalidTools.join(', ')}`);
    }

    if (deniedValidation.invalidTools.length > 0) {
      recommendations.push(`Unknown tools in deniedTools: ${deniedValidation.invalidTools.join(', ')}`);
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
      unknownAllowedTools: allowedValidation.invalidTools,
      unknownDeniedTools: deniedValidation.invalidTools,
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
        if ((tools as string[]).includes(tool)) {
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
    const totalTools = stats.totalTools;
    
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

// ============================================================================
// COMPILE-TIME TYPE TESTS
// ============================================================================

/**
 * Type test utilities for static type verification using the test dictionary pattern
 */
type Equal<T, U> = T extends U ? U extends T ? true : false : false;
type Expect<T extends true> = T;
type ExpectTrue<T extends true> = T;
type ExpectFalse<T extends false> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type IsAny<T> = 0 extends (1 & T) ? true : false;

/**
 * Helper types for advanced type testing
 */
type IsString<T> = T extends string ? true : false;
type IsStringArray<T> = T extends string[] ? true : false;
type IsOptional<T, K extends keyof T> = {} extends Pick<T, K> ? true : false;
type HasProperty<T, K extends PropertyKey> = K extends keyof T ? true : false;

/**
 * Test dictionary for permission manager type tests
 */
const typeTests = {
  // ========== BASIC INTERFACE TYPE TESTS ==========
  
  /**
   * Test AgentPermissionConfig interface structure and constraints
   */
  agentPermissionConfigTests: {
    // Required fields exist and have correct types
    allowedToolsIsStringArray: {} as ExpectTrue<Equal<AgentPermissionConfig['allowedTools'], string[]>>,
    allowedToolsIsRequired: {} as ExpectFalse<IsOptional<AgentPermissionConfig, 'allowedTools'>>,
    
    // Optional fields have correct types when present
    deniedToolsIsOptionalStringArray: {} as ExpectTrue<Equal<AgentPermissionConfig['deniedTools'], string[] | undefined>>,
    deniedToolsIsOptional: {} as ExpectTrue<IsOptional<AgentPermissionConfig, 'deniedTools'>>,
    restrictBuiltInToolsIsOptionalBoolean: {} as ExpectTrue<Equal<AgentPermissionConfig['restrictBuiltInTools'], boolean | undefined>>,
    restrictBuiltInToolsIsOptional: {} as ExpectTrue<IsOptional<AgentPermissionConfig, 'restrictBuiltInTools'>>,
    useDynamicRestrictionsIsOptionalBoolean: {} as ExpectTrue<Equal<AgentPermissionConfig['useDynamicRestrictions'], boolean | undefined>>,
    useDynamicRestrictionsIsOptional: {} as ExpectTrue<IsOptional<AgentPermissionConfig, 'useDynamicRestrictions'>>,
    
    // Agent role is strictly typed to specific values
    agentRoleIsConstrainedUnion: {} as ExpectTrue<Equal<
      AgentPermissionConfig['agentRole'], 
      'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive' | undefined
    >>,
    agentRoleIsOptional: {} as ExpectTrue<IsOptional<AgentPermissionConfig, 'agentRole'>>,
    
    // Test that invalid agent roles are rejected
    invalidAgentRoleNotAllowed: {} as ExpectFalse<Equal<
      AgentPermissionConfig['agentRole'], 
      'invalid-role' | undefined
    >>,
    
    // Test interface completeness
    hasAllExpectedProperties: {} as ExpectTrue<Equal<
      keyof AgentPermissionConfig,
      'allowedTools' | 'deniedTools' | 'restrictBuiltInTools' | 'agentRole' | 'useDynamicRestrictions'
    >>,
  },

  /**
   * Test YAMLAgentConfig interface structure
   */
  yamlAgentConfigTests: {
    // Required fields
    nameIsRequiredString: {} as ExpectTrue<Equal<YAMLAgentConfig['name'], string>>,
    nameIsRequired: {} as ExpectFalse<IsOptional<YAMLAgentConfig, 'name'>>,
    descriptionIsRequiredString: {} as ExpectTrue<Equal<YAMLAgentConfig['description'], string>>,
    descriptionIsRequired: {} as ExpectFalse<IsOptional<YAMLAgentConfig, 'description'>>,
    
    // Optional fields
    toolsIsOptionalStringArray: {} as ExpectTrue<Equal<YAMLAgentConfig['tools'], string[] | undefined>>,
    toolsIsOptional: {} as ExpectTrue<IsOptional<YAMLAgentConfig, 'tools'>>,
    roleIsOptionalString: {} as ExpectTrue<Equal<YAMLAgentConfig['role'], string | undefined>>,
    roleIsOptional: {} as ExpectTrue<IsOptional<YAMLAgentConfig, 'role'>>,
    
    // Test interface completeness
    hasAllExpectedProperties: {} as ExpectTrue<Equal<
      keyof YAMLAgentConfig,
      'name' | 'description' | 'tools' | 'role'
    >>,
  },

  // ========== SECURITY PROFILES TYPE TESTS ==========
  
  /**
   * Test SECURITY_PROFILES constant type safety
   */
  securityProfilesTests: {
    // Test that security profiles type is readonly and correctly structured
    securityProfilesIsReadonly: {} as ExpectTrue<Equal<
      typeof PermissionManager['SECURITY_PROFILES'],
      {
        readonly 'read-only': {
          description: string;
          allowedBuiltInTools: string[];
          deniedBuiltInTools: string[];
        };
        readonly 'write-restricted': {
          description: string;
          allowedBuiltInTools: string[];
          deniedBuiltInTools: string[];
        };
        readonly 'security-sensitive': {
          description: string;
          allowedBuiltInTools: string[];
          deniedBuiltInTools: string[];
        };
        readonly 'full-access': {
          description: string;
          allowedBuiltInTools: string[];
          deniedBuiltInTools: string[];
        };
      }
    >>,
    
    // Test that profile keys match agent role union type exactly
    profileKeysMatchAgentRoles: {} as ExpectTrue<Equal<
      keyof typeof PermissionManager['SECURITY_PROFILES'],
      'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive'
    >>,
    
    // Test individual profile structure
    readOnlyProfileStructure: {} as ExpectTrue<Equal<
      typeof PermissionManager['SECURITY_PROFILES']['read-only'],
      {
        description: string;
        allowedBuiltInTools: string[];
        deniedBuiltInTools: string[];
      }
    >>,
  },

  // ========== METHOD RETURN TYPE TESTS ==========
  
  /**
   * Test getAgentPermissions return type structure
   */
  getAgentPermissionsReturnTypeTests: {
    // Return type has correct structure
    returnTypeStructure: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.getAgentPermissions>,
      {
        allowedTools: string[];
        disallowedTools: string[];
      }
    >>,
    
    // Verify it's not returning any
    notReturningAny: {} as ExpectFalse<IsAny<ReturnType<typeof PermissionManager.getAgentPermissions>>>,
    
    // Test specific return type properties
    allowedToolsIsStringArray: {} as ExpectTrue<IsStringArray<ReturnType<typeof PermissionManager.getAgentPermissions>['allowedTools']>>,
    disallowedToolsIsStringArray: {} as ExpectTrue<IsStringArray<ReturnType<typeof PermissionManager.getAgentPermissions>['disallowedTools']>>,
  },

  /**
   * Test async method return types
   */
  asyncMethodReturnTypeTests: {
    // Dynamic restrictions method return type
    dynamicRestrictionsReturnType: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.getAgentPermissionsWithDynamicRestrictions>,
      Promise<{
        allowedTools: string[];
        disallowedTools: string[];
      }>
    >>,
    
    // Validation method return type
    validationReturnType: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.validateAgentToolConfiguration>,
      Promise<{
        valid: boolean;
        unknownAllowedTools: string[];
        unknownDeniedTools: string[];
        recommendations: string[];
      }>
    >>,
    
    // Statistics method return type with constrained security level
    statisticsReturnType: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.getAgentToolStatistics>,
      Promise<{
        allowedCount: number;
        disallowedCount: number;
        totalAvailable: number;
        coveragePercent: number;
        securityLevel: 'high' | 'medium' | 'low';
      }>
    >>,
    
    // Test security level constraint specifically
    securityLevelIsConstrained: {} as ExpectTrue<Equal<
      Awaited<ReturnType<typeof PermissionManager.getAgentToolStatistics>>['securityLevel'],
      'high' | 'medium' | 'low'
    >>,
  },

  // ========== PARAMETER TYPE TESTS ==========
  
  /**
   * Test method parameter types and constraints
   */
  parameterTypeTests: {
    // getToolsForRole parameters
    getToolsForRoleFirstParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getToolsForRole>[0],
      AgentPermissionConfig['agentRole']
    >>,
    getToolsForRoleSecondParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getToolsForRole>[1],
      string[]
    >>,
    getToolsForRoleParameterCount: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getToolsForRole>['length'],
      2
    >>,
    
    // fromYAMLConfig parameter
    fromYAMLConfigParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.fromYAMLConfig>[0],
      YAMLAgentConfig
    >>,
    fromYAMLConfigParameterCount: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.fromYAMLConfig>['length'],
      1
    >>,
    
    // ensureSummaryPermission parameter
    ensureSummaryPermissionParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.ensureSummaryPermission>[0],
      string[]
    >>,
    
    // parseYAMLFrontmatter parameter and return type
    parseYAMLFrontmatterParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.parseYAMLFrontmatter>[0],
      string
    >>,
    parseYAMLFrontmatterReturn: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.parseYAMLFrontmatter>,
      YAMLAgentConfig | null
    >>,
    
    // fromMarkdownFile parameters
    fromMarkdownFileFirstParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.fromMarkdownFile>[0],
      string
    >>,
    fromMarkdownFileSecondParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.fromMarkdownFile>[1],
      string[]
    >>,
  },

  // ========== GENERIC AND CONDITIONAL TYPE TESTS ==========
  
  /**
   * Test type transformations and conditional types
   */
  conditionalTypeTests: {
    // Test that role parameter can be undefined and handled correctly
    roleUndefinedHandling: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getToolsForRole>[0],
      'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive' | undefined
    >>,
    
    // Test that YAML config tools field is truly optional
    yamlToolsOptional: {} as ExpectTrue<Equal<
      YAMLAgentConfig['tools'],
      string[] | undefined
    >>,
    
    // Test that permission config can be constructed with minimal required fields
    minimalPermissionConfig: {} as ExpectTrue<Equal<
      Pick<AgentPermissionConfig, 'allowedTools'>,
      { allowedTools: string[] }
    >>,
    
    // Test optional fields can be omitted
    optionalFieldsCanBeOmitted: {} as ExpectTrue<Equal<
      Omit<AgentPermissionConfig, 'deniedTools' | 'restrictBuiltInTools' | 'agentRole' | 'useDynamicRestrictions'>,
      { allowedTools: string[] }
    >>,
    
    // Test union type extraction
    extractValidRoles: {} as ExpectTrue<Equal<
      Extract<AgentPermissionConfig['agentRole'], string>,
      'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive'
    >>,
  },

  // ========== SECURITY TYPE CONSTRAINT TESTS ==========
  
  /**
   * Test security-related type constraints and enforcement
   */
  securityConstraintTests: {
    // Test that agent roles are strictly constrained
    agentRoleStrictlyTyped: {} as ExpectFalse<Equal<
      AgentPermissionConfig['agentRole'],
      string | undefined
    >>,
    
    // Test that security level is constrained to specific values
    securityLevelConstrained: {} as ExpectTrue<Equal<
      'high' | 'medium' | 'low',
      Extract<Awaited<ReturnType<typeof PermissionManager.getAgentToolStatistics>>['securityLevel'], 'high' | 'medium' | 'low'>
    >>,
    
    // Test that boolean security flags are properly typed
    restrictBuiltInToolsBoolean: {} as ExpectTrue<Equal<
      AgentPermissionConfig['restrictBuiltInTools'],
      boolean | undefined
    >>,
    useDynamicRestrictionsBoolean: {} as ExpectTrue<Equal<
      AgentPermissionConfig['useDynamicRestrictions'],
      boolean | undefined
    >>,
    
    // Test role type safety - ensure no string assignability
    roleNotGenericString: {} as ExpectFalse<Equal<
      NonNullable<AgentPermissionConfig['agentRole']>,
      string
    >>,
    
    // Test that validation return type is properly constrained
    validationBooleanConstraint: {} as ExpectTrue<Equal<
      Awaited<ReturnType<typeof PermissionManager.validateAgentToolConfiguration>>['valid'],
      boolean
    >>,
  },

  // ========== ARRAY AND UTILITY TYPE TESTS ==========
  
  /**
   * Test array transformations and utility type usage
   */
  arrayTransformationTests: {
    // Test that tool arrays maintain string[] type throughout transformations
    toolArrayConsistency: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.ensureSummaryPermission>,
      string[]
    >>,
    
    // Test that the method preserves input array type while potentially modifying it
    ensureSummaryPreservesType: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.ensureSummaryPermission>[0],
      ReturnType<typeof PermissionManager.ensureSummaryPermission>
    >>,
    
    // Test that security profiles return correct types
    securityProfilesReturnType: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.getSecurityProfiles>,
      typeof PermissionManager['SECURITY_PROFILES']
    >>,
    
    // Test array element types
    allowedToolsElementType: {} as ExpectTrue<Equal<
      AgentPermissionConfig['allowedTools'][number],
      string
    >>,
    
    // Test array utility types
    toolArrayIsArray: {} as ExpectTrue<IsStringArray<AgentPermissionConfig['allowedTools']>>,
    deniedToolsIsStringArrayOrUndefined: {} as ExpectTrue<Equal<
      AgentPermissionConfig['deniedTools'],
      string[] | undefined
    >>,
  },

  // ========== TYPE SAFETY AND ANY TYPE TESTS ==========
  
  /**
   * Test that no 'any' types leak through the API surface
   */
  noAnyTypesTests: {
    // Verify main interfaces don't contain any
    agentPermissionConfigNotAny: {} as ExpectFalse<IsAny<AgentPermissionConfig>>,
    yamlAgentConfigNotAny: {} as ExpectFalse<IsAny<YAMLAgentConfig>>,
    
    // Verify method return types are not any
    getAgentPermissionsNotAny: {} as ExpectFalse<IsAny<ReturnType<typeof PermissionManager.getAgentPermissions>>>,
    getToolsForRoleNotAny: {} as ExpectFalse<IsAny<ReturnType<typeof PermissionManager.getToolsForRole>>>,
    fromYAMLConfigNotAny: {} as ExpectFalse<IsAny<ReturnType<typeof PermissionManager.fromYAMLConfig>>>,
    
    // Verify async method return types are not any
    dynamicRestrictionsNotAny: {} as ExpectFalse<IsAny<Awaited<ReturnType<typeof PermissionManager.getAgentPermissionsWithDynamicRestrictions>>>>,
    validationNotAny: {} as ExpectFalse<IsAny<Awaited<ReturnType<typeof PermissionManager.validateAgentToolConfiguration>>>>,
    statisticsNotAny: {} as ExpectFalse<IsAny<Awaited<ReturnType<typeof PermissionManager.getAgentToolStatistics>>>>,
    
    // Verify individual return type properties are not any
    allowedToolsNotAny: {} as ExpectFalse<IsAny<ReturnType<typeof PermissionManager.getAgentPermissions>['allowedTools']>>,
    disallowedToolsNotAny: {} as ExpectFalse<IsAny<ReturnType<typeof PermissionManager.getAgentPermissions>['disallowedTools']>>,
    
    // Verify security profiles are not any
    securityProfilesNotAny: {} as ExpectFalse<IsAny<typeof PermissionManager['SECURITY_PROFILES']>>,
  },

  // ========== COMPLEX TYPE COMPOSITION TESTS ==========
  
  /**
   * Test complex type compositions and transformations
   */
  complexTypeCompositionTests: {
    // Test that fromMarkdownFile combines multiple type sources correctly
    fromMarkdownFileReturnType: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.fromMarkdownFile>,
      AgentPermissionConfig
    >>,
    
    // Test that getSummaryPermissions preserves and extends base structure
    getSummaryPermissionsStructure: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.getSummaryPermissions>,
      {
        allowedTools: string[];
        disallowedTools: string[];
      }
    >>,
    
    // Test that complex async method preserves correct typing
    generateToolRestrictionPromptReturnType: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.generateToolRestrictionPrompt>,
      Promise<string>
    >>,
    
    // Test complex parameter combinations
    validateConfigComplexParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.validateAgentToolConfiguration>[0],
      AgentPermissionConfig
    >>,
    
    // Test nested object type preservation
    validationRecommendationsType: {} as ExpectTrue<Equal<
      Awaited<ReturnType<typeof PermissionManager.validateAgentToolConfiguration>>['recommendations'],
      string[]
    >>,
  },

  // ========== PERMISSION CALCULATION TYPE SAFETY TESTS ==========
  
  /**
   * Test permission calculation methods maintain type safety
   */
  permissionCalculationTests: {
    // Test that permission methods accept correct config types
    getAgentPermissionsConfigParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getAgentPermissions>[0],
      AgentPermissionConfig
    >>,
    
    // Test that dynamic permissions accept same config type
    getDynamicPermissionsConfigParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getAgentPermissionsWithDynamicRestrictions>[0],
      AgentPermissionConfig
    >>,
    
    // Test that summary permissions accept same config type
    getSummaryPermissionsConfigParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getSummaryPermissions>[0],
      AgentPermissionConfig
    >>,
    
    // Test that all permission methods return compatible structures
    permissionStructureCompatibility: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.getAgentPermissions>,
      Pick<Awaited<ReturnType<typeof PermissionManager.getAgentPermissionsWithDynamicRestrictions>>, 'allowedTools' | 'disallowedTools'>
    >>,
    
    // Test permission calculation numeric types
    statisticsNumericTypes: {} as ExpectTrue<Equal<
      Pick<Awaited<ReturnType<typeof PermissionManager.getAgentToolStatistics>>, 'allowedCount' | 'disallowedCount' | 'totalAvailable' | 'coveragePercent'>,
      {
        allowedCount: number;
        disallowedCount: number;
        totalAvailable: number;
        coveragePercent: number;
      }
    >>,
  },

  // ========== TYPE ASSERTION AND CAST SAFETY TESTS ==========
  
  /**
   * Test type assertions and casts for safety violations
   */
  typeAssertionSafetyTests: {
    // Test that the type assertion in fromYAMLConfig is properly constrained
    yamlRoleTypeAssertion: {} as ExpectTrue<Equal<
      AgentPermissionConfig['agentRole'],
      'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive' | undefined
    >>,
    
    // Verify the assertion target matches expected type structure
    roleAssertionTarget: {} as ExpectTrue<Equal<
      YAMLAgentConfig['role'],
      string | undefined
    >>,
    
    // Test that constraint is properly applied in the method
    fromYAMLConfigRoleHandling: {} as ExpectTrue<Equal<
      ReturnType<typeof PermissionManager.fromYAMLConfig>['agentRole'],
      'read-only' | 'write-restricted' | 'full-access' | 'security-sensitive' | undefined
    >>,
  },

  // ========== METHOD OVERLOAD AND SIGNATURE TESTS ==========
  
  /**
   * Test method signatures and parameter optionality
   */
  methodSignatureTests: {
    // Test optional parameter handling
    getToolsForRoleOptionalSecondParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.getToolsForRole>,
      [AgentPermissionConfig['agentRole'], string[]?]
    >>,
    
    // Test fromMarkdownFile optional parameter
    fromMarkdownFileOptionalParam: {} as ExpectTrue<Equal<
      Parameters<typeof PermissionManager.fromMarkdownFile>,
      [string, string[]?]
    >>,
    
    // Test static method signatures
    staticMethodsReturnCorrectTypes: {} as ExpectTrue<Equal<
      typeof PermissionManager.getSecurityProfiles,
      () => typeof PermissionManager['SECURITY_PROFILES']
    >>,
  },

} as const;

// Verify that the test dictionary itself is properly typed
type TypeTestsStructure = typeof typeTests;
type TestDictionaryIsWellTyped = Expect<Equal<
  TypeTestsStructure,
  Record<string, Record<string, any>>
>>;

// Additional compile-time verification of type test structure
type VerifyTestStructure = {
  [K in keyof TypeTestsStructure]: TypeTestsStructure[K] extends Record<string, any> ? true : false;
};

// Export type test dictionary for external validation if needed
export type { TypeTestsStructure, VerifyTestStructure };