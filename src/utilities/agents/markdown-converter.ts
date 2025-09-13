/**
 * Agent Configuration to Markdown Converter
 * Converts TypeScript agent configurations to Claude-compatible markdown format
 */

import { AgentConfig, AgentConfigLegacy } from '../../types/agent-config.js';

export class MarkdownConverter {
  /**
   * Convert TypeScript agent configuration to markdown format
   */
  static convertTSAgentToMD(agentConfig: AgentConfig | AgentConfigLegacy): string {
    const { name, description, color } = agentConfig;
    
    // Handle different config structures
    let model: string;
    let systemPrompt: string;
    let allTools: string[] = [];

    if ('options' in agentConfig && agentConfig.options) {
      // New format
      model = agentConfig.options.model || agentConfig.model || 'claude-3-5-sonnet-20241022';
      systemPrompt = agentConfig.options.systemPrompt || agentConfig.systemPrompt || '';
      allTools = agentConfig.options.allowedTools || [];
    } else if ('permissions' in agentConfig && agentConfig.permissions) {
      // Legacy format
      model = agentConfig.model || 'claude-3-5-sonnet-20241022';
      systemPrompt = agentConfig.systemPrompt || '';
      allTools = [...agentConfig.permissions.tools.allowed];
    } else {
      // Fallback
      model = agentConfig.model || 'claude-3-5-sonnet-20241022';
      systemPrompt = agentConfig.systemPrompt || '';
    }
    
    // Build YAML frontmatter
    let frontmatter = `---\n`;
    frontmatter += `name: ${name}\n`;
    frontmatter += `description: ${description}\n`;
    
    if (allTools.length > 0) {
      frontmatter += `tools: ${allTools.join(', ')}\n`;
    }
    
    frontmatter += `model: ${model}\n`;
    
    if (color) {
      frontmatter += `color: ${color}\n`;
    }
    
    frontmatter += `---\n\n`;
    
    // Add system prompt as main content
    const markdown = frontmatter + systemPrompt;
    
    return markdown;
  }

  /**
   * Convert agent configuration to Claude agent info format
   */
  static convertToAgentInfo(agentConfig: AgentConfig): object {
    const info: any = {
      name: agentConfig.name,
      description: agentConfig.description
    };

    if (agentConfig.options) {
      info.model = agentConfig.options.model || agentConfig.model || 'claude-3-5-sonnet-20241022';
      info.allowedTools = agentConfig.options.allowedTools || [];
      info.mcpServers = agentConfig.options.mcpServers ? Object.keys(agentConfig.options.mcpServers) : [];
      info.systemPrompt = agentConfig.options.systemPrompt || agentConfig.systemPrompt || '';
    } else {
      // Fallback for legacy format
      info.model = agentConfig.model || 'claude-3-5-sonnet-20241022';
      info.allowedTools = [];
      info.mcpServers = [];
      info.systemPrompt = agentConfig.systemPrompt || '';
    }

    return info;
  }

  /**
   * Extract agent configuration from markdown content (reverse operation)
   */
  static extractConfigFromMarkdown(markdownContent: string): Partial<AgentConfig> | null {
    try {
      // Extract YAML frontmatter
      const frontmatterMatch = markdownContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!frontmatterMatch) {
        return null;
      }

      const [, yamlContent, systemPrompt] = frontmatterMatch;
      const config: Partial<AgentConfig> = {
        systemPrompt: systemPrompt.trim()
      };

      // Parse YAML-like content (simple key-value parsing)
      const yamlLines = yamlContent.split('\n');
      for (const line of yamlLines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        switch (key) {
          case 'name':
            config.name = value;
            break;
          case 'description':
            config.description = value;
            break;
          case 'model':
            config.model = value;
            break;
          case 'color':
            config.color = value;
            break;
          case 'tools':
            // Parse comma-separated tools
            const tools = value.split(',').map(t => t.trim()).filter(t => t.length > 0);
            config.options = {
              ...config.options,
              allowedTools: tools,
              systemPrompt: config.systemPrompt || ''
            };
            break;
        }
      }

      return config.name && config.description ? config : null;
    } catch (error) {
      console.error('Failed to extract config from markdown:', error);
      return null;
    }
  }

  /**
   * Validate markdown format
   */
  static validateMarkdownFormat(markdownContent: string): { isValid: boolean; error?: string } {
    try {
      const config = this.extractConfigFromMarkdown(markdownContent);
      
      if (!config) {
        return {
          isValid: false,
          error: 'Invalid markdown format: missing or malformed frontmatter'
        };
      }

      if (!config.name) {
        return {
          isValid: false,
          error: 'Missing required field: name'
        };
      }

      if (!config.description) {
        return {
          isValid: false,
          error: 'Missing required field: description'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error'
      };
    }
  }
}