/**
 * Agent Configuration Types
 * Shared types for agent configuration and management
 */

export interface AgentConfig {
  name: string;
  description: string;
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  permissions?: {
    mode: 'default' | 'acceptEdits' | 'ask';
    tools: {
      allowed: string[];
      denied: string[];
    };
    mcpServers: Record<string, 'allow' | 'deny' | 'ask'>;
  };
  context?: {
    maxTokens: number;
    temperature: number;
  };
  options?: {
    maxTurns: number;
    allowedTools?: string[];
    mcpServers?: string[];
    model?: string;
    systemPrompt?: string;
  };
  color?: string;
}

export interface AgentConfigLegacy {
  name: string;
  description: string;
  model: string;
  permissions: {
    mode: 'default' | 'acceptEdits' | 'ask';
    tools: {
      allowed: string[];
      denied: string[];
    };
    mcpServers: Record<string, 'allow' | 'deny' | 'ask'>;
  };
  systemPrompt: string;
  context: {
    maxTokens: number;
    temperature: number;
  };
  color?: string;
}