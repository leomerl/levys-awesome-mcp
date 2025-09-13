// Shared types and interfaces for all MCP tools

export interface AgentConfigOld {
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

export interface AgentConfigNew {
  name: string;
  description: string;
  prompt: string;
  options: {
    systemPrompt: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
    mcpServers?: Record<string, any>; // Changed from string[] to match SDK expectations
    permissions?: {
      mode?: 'default' | 'acceptEdits' | 'ask';
    };
  };
}

export type AgentConfig = AgentConfigOld | AgentConfigNew;

export interface CommandResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface TestValidationResult {
  valid: boolean;
  errors: string[];
  coverage?: {
    frontend: boolean;
    backend: boolean;
    e2e: boolean;
  };
}

export interface DevServerResult {
  success: boolean;
  message: string;
  pids?: number[];
  error?: string;
}

export interface TestResult {
  success: boolean;
  code?: number;
  error?: string;
}

export interface TestResults {
  backend: {
    lint: TestResult | null;
    typecheck: TestResult | null;
  };
  frontend: {
    lint: TestResult | null;
    typecheck: TestResult | null;
    test: TestResult | null;
  };
  e2e: TestResult | null;
}