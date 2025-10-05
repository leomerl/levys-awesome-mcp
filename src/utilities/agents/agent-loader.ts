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
   * Recursively find all agent files in a directory
   */
  private static findAgentFiles(dir: string, fileExtension: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        files.push(...this.findAgentFiles(fullPath, fileExtension));
      } else if (entry.isFile() && entry.name.endsWith(fileExtension) &&
                 !entry.name.endsWith('.d.ts') && !entry.name.endsWith('.map')) {
        files.push(fullPath);
      }
    }

    return files;
  }

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

    const files = this.findAgentFiles(agentsDir, fileExtension);

    console.log(`[AgentLoader] Found ${files.length} agent files (including subdirectories)`);

    for (const fullPath of files) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const file = path.basename(fullPath);
        
        // Check if this file contains the agent we're looking for
        const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
        console.log(`[AgentLoader] File ${file}: found name = ${nameMatch ? nameMatch[1] : 'none'}`);
        if (!nameMatch || nameMatch[1] !== agentName) {
          continue;
        }

        // Try dynamic import first (for agents with MCP enablers)
        try {
          console.log(`[AgentLoader] Attempting dynamic import of ${fullPath}`);
          const modulePath = path.resolve(fullPath);
          const agentModule = await import(`file://${modulePath}`);

          // Look for exported agent config (default export or named export)
          const agentConfig = agentModule.default || agentModule[`${agentName}Agent`] || agentModule[`${agentName.replace(/-/g, '')}Agent`];

          if (agentConfig && agentConfig.name === agentName) {
            console.log(`[AgentLoader] Successfully loaded agent '${agentName}' via dynamic import`);
            console.log(`[AgentLoader] Agent has ${agentConfig.options?.allowedTools?.length || 0} allowed tools`);
            console.log(`[AgentLoader] Agent has ${Object.keys(agentConfig.options?.mcpServers || {}).length} MCP servers configured`);
            return this.validateAndNormalizeConfig(agentConfig);
          }
        } catch (importError) {
          console.log(`[AgentLoader] Dynamic import failed for ${fullPath}, falling back to text parsing:`, importError instanceof Error ? importError.message : String(importError));
        }

        // Fallback: Extract the agent configuration object from text
        // Look for patterns like: const xxxAgent: AgentConfig = { ... }
        // Also handle cases without "Agent" suffix and different casing
        const configPattern = /const\s+\w+(?:Agent)?(?::\s*AgentConfig)?\s*=\s*({[\s\S]*?^});/m;
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
          console.error(`Error parsing agent config from ${fullPath}:`, parseError);
        }
      } catch (error) {
        console.error(`Error loading agent from ${fullPath}:`, error);
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

    console.log(`[AgentLoader.listAvailableAgents] Checking directory: ${agentsDir}`);

    if (!fs.existsSync(agentsDir)) {
      console.log(`[AgentLoader.listAvailableAgents] Directory does not exist: ${agentsDir}`);
      return agents;
    }

    // Check if we're looking at compiled agents (dist/agents) or source agents
    // The dist/agents path will end with 'dist/agents', source will end with just 'agents'
    const isCompiledDir = agentsDir.endsWith(path.join('dist', 'agents'));
    const fileExtension = isCompiledDir ? '.js' : '.ts';

    console.log(`[AgentLoader.listAvailableAgents] Is compiled dir: ${isCompiledDir}, extension: ${fileExtension}`);

    const files = this.findAgentFiles(agentsDir, fileExtension);

    console.log(`[AgentLoader.listAvailableAgents] Found ${files.length} ${fileExtension} files (including subdirectories)`);


    for (const fullPath of files) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const file = path.basename(fullPath);

        // Extract agent name from file content
        // Works for both TypeScript and compiled JavaScript
        const nameMatch = content.match(/name:\s*['"`]([^'"`]+)['"`]/);
        if (nameMatch) {
          console.log(`[AgentLoader] Found agent name in ${file}: ${nameMatch[1]}`);
          if (ValidationUtils.validateAgentName(nameMatch[1])) {
            agents.push(nameMatch[1]);
          } else {
            console.log(`[AgentLoader] Agent name '${nameMatch[1]}' from ${fullPath} failed validation`);
          }
        } else {
          console.log(`[AgentLoader] No agent name found in ${fullPath}`);
        }
      } catch (error) {
        console.log(`[AgentLoader] Error reading ${fullPath}:`, error);
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

    const files = this.findAgentFiles(agentsDir, fileExtension);

    for (const fullPath of files) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Simple regex to extract agent config (basic implementation)
        // Handle both exported and non-exported agents, with or without "Agent" suffix
        const exportMatch = content.match(/(?:export\s+)?const\s+(\w+)(?:Agent)?\s*(?::\s*AgentConfig)?\s*=\s*({[\s\S]*?});/);
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