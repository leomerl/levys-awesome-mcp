/**
 * Tool Registry
 * Provides comprehensive tool discovery and management for MCP agents
 */

export class ToolRegistry {
  private static readonly TOOL_CATEGORIES = {
    'file-system': ['Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Glob'],
    'execution': ['Bash', 'BashOutput', 'KillBash', 'Task'],
    'search': ['Grep', 'WebSearch', 'WebFetch'],
    'version-control': ['Git', 'GitCommit', 'GitPush', 'GitPull'],
    'development': ['TodoWrite', 'ExitPlanMode'],
    'mcp': ['mcp__ide__getDiagnostics', 'mcp__ide__executeCode', 'mcp__context7__resolve-library-id', 'mcp__context7__get-library-docs'],
    'testing': ['RunTests', 'TestCoverage'],
    'documentation': ['GenerateDocs', 'UpdateReadme'],
    'deployment': ['Deploy', 'BuildDocker', 'PushDocker'],
    'monitoring': ['GetLogs', 'GetMetrics', 'Alert'],
    'database': ['QueryDB', 'MigrateDB', 'BackupDB'],
    'cloud': ['AWS', 'GCP', 'Azure'],
    'communication': ['SendEmail', 'SendSlack', 'SendWebhook']
  };

  private static getAllTools(): string[] {
    const allTools: string[] = [];
    for (const tools of Object.values(this.TOOL_CATEGORIES)) {
      allTools.push(...tools);
    }
    return [...new Set(allTools)]; // Remove duplicates
  }

  /**
   * Calculate disallowed tools based on allowed tools
   */
  static async calculateDisallowedTools(allowedTools: string[]): Promise<string[]> {
    const allTools = this.getAllTools();
    return allTools.filter(tool => !allowedTools.includes(tool));
  }

  /**
   * Validate a list of tool names
   */
  static async validateToolList(tools: string[]): Promise<{
    valid: boolean;
    invalidTools: string[];
    message?: string;
  }> {
    const allTools = this.getAllTools();
    const invalidTools = tools.filter(tool => !allTools.includes(tool));

    return {
      valid: invalidTools.length === 0,
      invalidTools,
      message: invalidTools.length > 0
        ? `Invalid tools found: ${invalidTools.join(', ')}`
        : undefined
    };
  }

  /**
   * Get tools organized by category
   */
  static async getToolsByCategory(): Promise<Record<string, string[]>> {
    return { ...this.TOOL_CATEGORIES };
  }

  /**
   * Get tool statistics
   */
  static async getToolStatistics(): Promise<{
    totalTools: number;
    categoriesCount: number;
    categories: Array<{ name: string; count: number }>;
  }> {
    const allTools = this.getAllTools();
    const categories = Object.entries(this.TOOL_CATEGORIES).map(([name, tools]) => ({
      name,
      count: tools.length
    }));

    return {
      totalTools: allTools.length,
      categoriesCount: Object.keys(this.TOOL_CATEGORIES).length,
      categories
    };
  }

  /**
   * Check if a tool exists in the registry
   */
  static isValidTool(toolName: string): boolean {
    return this.getAllTools().includes(toolName);
  }

  /**
   * Get category for a specific tool
   */
  static getToolCategory(toolName: string): string | undefined {
    for (const [category, tools] of Object.entries(this.TOOL_CATEGORIES)) {
      if (tools.includes(toolName)) {
        return category;
      }
    }
    return undefined;
  }
}