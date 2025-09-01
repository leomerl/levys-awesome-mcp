/**
 * Agent Permission Manager
 * Centralizes tool permission management for consistent security across agents
 */

export interface AgentPermissionConfig {
  allowedTools: string[];
  deniedTools?: string[];
  restrictBuiltInTools?: boolean;
}

export class PermissionManager {
  /**
   * Gets standardized tool permissions for agent execution
   * Blocks TodoWrite and Task tools by default for security
   */
  static getAgentPermissions(config: AgentPermissionConfig): {
    allowedTools: string[];
    disallowedTools: string[];
  } {
    const standardDeniedTools = [
      'TodoWrite',  // Block built-in TodoWrite tool - agents shouldn't create todos
      'Task'        // Block Task tool that could invoke other agents - prevents infinite loops
    ];

    return {
      allowedTools: config.allowedTools || [],
      disallowedTools: [
        ...standardDeniedTools,
        ...(config.deniedTools || [])
      ]
    };
  }

  /**
   * Validates that an agent has permission to use put_summary tool
   */
  static ensureSummaryPermission(allowedTools: string[]): string[] {
    const summaryTool = 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary';
    if (!allowedTools.includes(summaryTool)) {
      return [...allowedTools, summaryTool];
    }
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
}