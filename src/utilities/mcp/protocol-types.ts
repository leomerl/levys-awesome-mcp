/**
 * Shared MCP Protocol Type Definitions
 * Eliminates duplication across all MCP servers
 */

export interface MCPRequest {
  jsonrpc: string;
  id?: number | string;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id?: number | string;
  result?: any;
  error?: MCPError;
}

export interface MCPNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export interface MCPServerInfo {
  name: string;
  version: string;
}

export interface MCPCapabilities {
  tools?: {
    listChanged?: boolean;
  };
}

export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: MCPServerInfo;
}

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Standard MCP error codes
export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const;