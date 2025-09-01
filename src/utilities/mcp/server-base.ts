/**
 * Base MCP Server Class
 * Eliminates boilerplate code duplication across all MCP servers
 */

import { 
  MCPRequest, 
  MCPResponse, 
  MCPNotification, 
  MCPError, 
  MCPTool, 
  MCPInitializeResult,
  MCPToolCall,
  MCPToolResult,
  MCPErrorCodes 
} from './protocol-types.js';

export abstract class MCPServerBase {
  protected abstract serverName: string;
  protected abstract serverVersion: string;
  protected abstract tools: MCPTool[];

  constructor() {
    this.setupStdioHandling();
  }

  private setupStdioHandling(): void {
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (data: string) => {
      const lines = data.trim().split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const request: MCPRequest = JSON.parse(line);
          const response = await this.handleRequest(request);
          this.sendResponse(response);
        } catch (error) {
          this.sendError(undefined, MCPErrorCodes.PARSE_ERROR, 'Parse error');
        }
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      process.exit(0);
    });
  }

  private async handleRequest(request: MCPRequest): Promise<MCPResponse | MCPNotification> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
          
        case 'tools/list':
          return this.handleToolsList(request);
          
        case 'tools/call':
          return await this.handleToolCall(request);
          
        default:
          return this.createErrorResponse(
            request.id, 
            MCPErrorCodes.METHOD_NOT_FOUND, 
            `Unknown method: ${request.method}`
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        MCPErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private handleInitialize(request: MCPRequest): MCPResponse {
    const result: MCPInitializeResult = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion
      }
    };

    return {
      jsonrpc: '2.0',
      id: request.id,
      result
    };
  }

  private handleToolsList(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools: this.tools
      }
    };
  }

  private async handleToolCall(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params as MCPToolCall;
    
    if (!name) {
      return this.createErrorResponse(
        request.id,
        MCPErrorCodes.INVALID_PARAMS,
        'Missing tool name'
      );
    }

    const tool = this.tools.find(t => t.name === name);
    if (!tool) {
      return this.createErrorResponse(
        request.id,
        MCPErrorCodes.METHOD_NOT_FOUND,
        `Unknown tool: ${name}`
      );
    }

    try {
      const result = await this.executeTool(name, args || {});
      return {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        MCPErrorCodes.INTERNAL_ERROR,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  protected abstract executeTool(name: string, args: Record<string, any>): Promise<MCPToolResult>;

  protected createErrorResponse(id: number | string | undefined, code: number, message: string): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
  }

  protected createSuccessResult(text: string, isError: boolean = false): MCPToolResult {
    return {
      content: [
        {
          type: 'text',
          text
        }
      ],
      isError
    };
  }

  private sendResponse(response: MCPResponse | MCPNotification): void {
    process.stdout.write(JSON.stringify(response) + '\n');
  }

  protected sendError(id: number | string | undefined, code: number, message: string): void {
    this.sendResponse(this.createErrorResponse(id, code, message));
  }

  public start(): void {
    // Server is started automatically in constructor
    // This method exists for API compatibility
  }
}