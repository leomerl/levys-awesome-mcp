/**
 * Agent Configuration Loader
 * Handles dynamic loading and validation of agent configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import { PathConfig } from '../config/paths.js';
import { ValidationUtils } from '../config/validation.js';
import { AgentConfig } from '../../types/agent-config.js';
import { PermissionManager } from './permission-manager.js';

export class AgentLoader {
  /**
   * Load agent configuration by name
   */
  static async loadAgentConfig(agentName: string): Promise<AgentConfig | null> {
    const agentsDir = PathConfig.getAgentsDirectory();
    console.log(`[AgentLoader] Looking for agent '${agentName}' in directory: ${agentsDir}`);
    
    if (!fs.existsSync(agentsDir)) {
      console.log(`[AgentLoader] Agents directory does not exist: ${agentsDir}`);
      return null;
    }
    
    // Check if we're looking at compiled agents (dist/agents) or source agents
    const isCompiledDir = agentsDir.includes('dist/agents');
    const fileExtension = isCompiledDir ? '.js' : '.ts';

    const files = fs.readdirSync(agentsDir).filter(file =>
      file.endsWith(fileExtension) && !file.endsWith('.d.ts') && !file.endsWith('.map')
    );
    
    console.log(`[AgentLoader] Found ${files.length} .ts files in agents directory`);
    
    for (const file of files) {
      try {
        const fullPath = path.resolve(agentsDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check if this file contains the agent we're looking for
        const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
        console.log(`[AgentLoader] File ${file}: found name = ${nameMatch ? nameMatch[1] : 'none'}`);
        if (!nameMatch || nameMatch[1] !== agentName) {
          continue;
        }
        
        // Extract the agent configuration object
        // Look for patterns like: const xxxAgent: AgentConfig = { ... }
        const configPattern = /const\s+\w+Agent(?::\s*AgentConfig)?\s*=\s*({[\s\S]*?^});/m;
        const configMatch = content.match(configPattern);
        
        if (!configMatch) {
          continue;
        }
        
        try {
          // Parse the configuration object
          // This is a simplified parser - extract key properties
          const configStr = configMatch[1];
          
          // Extract name
          const name = nameMatch[1];
          
          // Extract description
          const descMatch = configStr.match(/description:\s*['"`]([^'"`]+)['"`]/);
          const description = descMatch ? descMatch[1] : '';
          
          // Extract prompt
          const promptMatch = configStr.match(/prompt:\s*['"`]([^'"`]+)['"`]/);
          const prompt = promptMatch ? promptMatch[1] : '';
          
          // Extract systemPrompt (can be multiline)
          const systemPromptMatch = configStr.match(/systemPrompt:\s*`([^`]*)`/s);
          const systemPrompt = systemPromptMatch ? systemPromptMatch[1] : '';
          
          // Extract model
          const modelMatch = configStr.match(/model:\s*['"`]([^'"`]+)['"`]/);
          const model = modelMatch ? modelMatch[1] : 'claude-3-5-sonnet-20241022';
          
          // Extract allowedTools array
          const allowedToolsMatch = configStr.match(/allowedTools:\s*\[([\s\S]*?)\]/);
          let allowedTools: string[] = [];
          if (allowedToolsMatch) {
            // Extract tool patterns from the array
            const toolsStr = allowedToolsMatch[1];
            const toolMatches = toolsStr.matchAll(/['"`]([^'"`]+)['"`]/g);
            allowedTools = Array.from(toolMatches).map(m => m[1]);
          }
          
          // Create the agent configuration
          const agentConfig: AgentConfig = {
            name,
            description,
            systemPrompt: systemPrompt || prompt,
            model,
            options: {
              systemPrompt: systemPrompt || prompt,
              model,
              allowedTools,
              mcpServers: undefined
            }
          };
          
          return this.validateAndNormalizeConfig(agentConfig);
        } catch (parseError) {
          console.error(`Error parsing agent config from ${file}:`, parseError);
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

    // Check if we're looking at compiled agents (dist/agents) or source agents
    // The dist/agents path will end with 'dist/agents', source will end with just 'agents'
    const isCompiledDir = agentsDir.endsWith(path.join('dist', 'agents'));
    const fileExtension = isCompiledDir ? '.js' : '.ts';

    const files = fs.readdirSync(agentsDir).filter(file =>
      file.endsWith(fileExtension) && !file.endsWith('.d.ts') && !file.endsWith('.map')
    );

    for (const file of files) {
      try {
        const fullPath = path.resolve(agentsDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Extract agent name from file content
        // Works for both TypeScript and compiled JavaScript
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
    
    // Check if we're looking at compiled agents (dist/agents) or source agents
    const isCompiledDir = agentsDir.includes('dist/agents');
    const fileExtension = isCompiledDir ? '.js' : '.ts';

    const files = fs.readdirSync(agentsDir).filter(file =>
      file.endsWith(fileExtension) && !file.endsWith('.d.ts') && !file.endsWith('.map')
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
        model: normalizedConfig.model,
        allowedTools: allowedTools,
        mcpServers: undefined
      };
    } else {
      // Merge allowed tools from both sources
      normalizedConfig.options.allowedTools = allowedTools;
    }

    console.log(`[DEBUG] Final normalized allowedTools:`, normalizedConfig.options?.allowedTools);

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