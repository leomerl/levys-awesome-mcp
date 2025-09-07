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
      'Task',       // Block Task tool that could invoke other agents - prevents infinite loops
      'Write',      // Block regular Write tool - agents should use restricted write tools
      'Edit',       // Block regular Edit tool - agents should use restricted edit tools
      'MultiEdit'   // Block MultiEdit tool - agents should use restricted edit tools
    ];

    console.log(`[DEBUG] getAgentPermissions input:`, config.allowedTools);
    const result = {
      allowedTools: config.allowedTools || [],
      disallowedTools: [
        ...standardDeniedTools,
        ...(config.deniedTools || [])
      ]
    };
    console.log(`[DEBUG] getAgentPermissions output:`, result);

    return result;
  }

  /**
   * Validates that an agent has permission to use put_summary tool
   */
  static ensureSummaryPermission(allowedTools: string[]): string[] {
    const summaryTool = 'mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__content-writer__put_summary';
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
}