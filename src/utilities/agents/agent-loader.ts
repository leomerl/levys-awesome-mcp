/**
 * Agent Configuration Loader
 * Handles dynamic loading and validation of agent configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { PathConfig } from '../config/paths.js';
import { ValidationUtils } from '../config/validation.js';
import { AgentConfig } from '../../types/agent-config.js';

export class AgentLoader {
  /**
   * Load agent configuration by name
   */
  static async loadAgentConfig(agentName: string): Promise<AgentConfig | null> {
    const agentsDir = PathConfig.getAgentsDirectory();
    
    if (!fs.existsSync(agentsDir)) {
      return null;
    }
    
    const files = fs.readdirSync(agentsDir).filter(file => 
      file.endsWith('.ts') && 
      file !== 'agent_generator.ts' && 
      file !== 'agent_invoker.ts' && 
      file !== 'builder-agent.ts'
    );
    
    for (const file of files) {
      try {
        const fullPath = path.resolve(agentsDir, file);
        const fileUrl = `file://${fullPath.replace(/\\/g, '/')}`;
        
        // Use dynamic import with timestamp to avoid caching
        const agentModule = await import(`${fileUrl}?t=${Date.now()}`);
        
        for (const [exportName, exportValue] of Object.entries(agentModule)) {
          if (typeof exportValue === 'object' && exportValue !== null) {
            const agentConfig = exportValue as AgentConfig;
            if (agentConfig.name === agentName) {
              return this.validateAndNormalizeConfig(agentConfig);
            }
            
            // Check if the export value has nested agent configs
            if (exportName === 'default' && typeof exportValue === 'object') {
              for (const [nestedName, nestedValue] of Object.entries(exportValue)) {
                if (typeof nestedValue === 'object' && nestedValue !== null) {
                  const nestedAgentConfig = nestedValue as AgentConfig;
                  if (nestedAgentConfig.name === agentName) {
                    return this.validateAndNormalizeConfig(nestedAgentConfig);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error loading agent from ${file}:`, error);
      }
    }
    
    return null;
  }

  /**
   * List all available agent names
   */
  static listAvailableAgents(): string[] {
    const agentsDir = PathConfig.getAgentsDirectory();
    const agents: string[] = [];
    
    if (!fs.existsSync(agentsDir)) {
      return agents;
    }
    
    const files = fs.readdirSync(agentsDir).filter(file => 
      file.endsWith('.ts') && 
      file !== 'agent_generator.ts' && 
      file !== 'agent_invoker.ts' && 
      file !== 'builder-agent.ts'
    );
    
    for (const file of files) {
      try {
        const fullPath = path.resolve(agentsDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Extract agent name from file content
        const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
        if (nameMatch && ValidationUtils.validateAgentName(nameMatch[1])) {
          agents.push(nameMatch[1]);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return agents;
  }

  /**
   * Get available agent configurations (for listing)
   */
  static listAvailableAgentConfigs(): AgentConfig[] {
    const agentsDir = PathConfig.getAgentsDirectory();
    const agents: AgentConfig[] = [];
    
    if (!fs.existsSync(agentsDir)) {
      return agents;
    }
    
    const files = fs.readdirSync(agentsDir).filter(file => 
      file.endsWith('.ts') && 
      file !== 'agent_generator.ts'
    );
    
    for (const file of files) {
      try {
        const fullPath = path.resolve(agentsDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Simple regex to extract agent config (basic implementation)
        const exportMatch = content.match(/export\s+const\s+(\w+Agent)\s*=\s*({[\s\S]*?});/);
        if (exportMatch) {
          try {
            // This is a simplified approach - in production you'd want better parsing
            const configStr = exportMatch[2];
            const agent = eval(`(${configStr})`);
            if (agent.name && agent.description) {
              agents.push(this.validateAndNormalizeConfig(agent));
            }
          } catch (e) {
            // Skip invalid configs
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return agents;
  }

  /**
   * Validate and normalize agent configuration
   */
  private static validateAndNormalizeConfig(config: AgentConfig): AgentConfig {
    // Ensure required fields exist
    if (!config.name || !config.description) {
      throw new Error('Agent configuration must have name and description');
    }

    // Validate agent name
    if (!ValidationUtils.validateAgentName(config.name)) {
      throw new Error(`Invalid agent name: ${config.name}`);
    }

    // Debug logging to understand config structure
    console.log(`[DEBUG] Loading agent config for: ${config.name}`);
    console.log(`[DEBUG] Config permissions:`, (config as any).permissions);
    console.log(`[DEBUG] Config options:`, config.options);

    // Handle both old format (permissions.tools.allowed) and new format (options.allowedTools)
    let allowedTools: string[] = [];
    if ((config as any).permissions?.tools?.allowed) {
      allowedTools = (config as any).permissions.tools.allowed;
      console.log(`[DEBUG] Using permissions.tools.allowed:`, allowedTools);
    } else if (config.options?.allowedTools) {
      allowedTools = config.options.allowedTools;
      console.log(`[DEBUG] Using options.allowedTools:`, allowedTools);
    }

    // Normalize configuration structure
    const normalizedConfig: AgentConfig = {
      ...config,
      name: config.name,
      description: config.description,
      systemPrompt: config.systemPrompt || config.options?.systemPrompt || '',
      model: config.model || config.options?.model || 'claude-3-5-sonnet-20241022'
    };

    // Ensure options exist and include resolved allowedTools
    if (!normalizedConfig.options) {
      normalizedConfig.options = {
        systemPrompt: normalizedConfig.systemPrompt || '',
        maxTurns: 10,
        model: normalizedConfig.model,
        allowedTools: allowedTools,
        mcpServers: []
      };
    } else {
      // Merge allowed tools from both sources
      normalizedConfig.options.allowedTools = allowedTools;
    }

    console.log(`[DEBUG] Final normalized allowedTools:`, normalizedConfig.options.allowedTools);

    return normalizedConfig;
  }

  /**
   * Check if agent exists
   */
  static async agentExists(agentName: string): Promise<boolean> {
    const config = await this.loadAgentConfig(agentName);
    return config !== null;
  }
}