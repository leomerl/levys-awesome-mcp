/**
 * MCP Client for invoking agents via the MCP server
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export interface InvokeAgentParams {
  agentName: string;
  prompt: string;
  streaming?: boolean;
  saveStreamToFile?: boolean;
  taskNumber?: number;
  sessionId?: string;
}

export interface InvokeAgentResult {
  success: boolean;
  sessionId: string;
  agentName: string;
  message: string;
  error?: string;
}

export class MCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  async connect(): Promise<void> {
    if (this.client) {
      return; // Already connected
    }

    const mcpServerPath = path.resolve(
      process.cwd(),
      "../dist/src/index.js"
    );

    this.transport = new StdioClientTransport({
      command: "node",
      args: [mcpServerPath],
    });

    this.client = new Client(
      {
        name: "web-ui-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(this.transport);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }

  async invokeAgent(params: InvokeAgentParams): Promise<InvokeAgentResult> {
    await this.connect();

    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const result = await this.client.callTool({
        name: "mcp__levys-awesome-mcp__invoke_agent",
        arguments: {
          agentName: params.agentName,
          prompt: params.prompt,
          streaming: params.streaming ?? true,
          saveStreamToFile: params.saveStreamToFile ?? true,
          taskNumber: params.taskNumber,
          sessionId: params.sessionId,
        },
      });

      // Parse the response
      if (result.content && result.content.length > 0) {
        const textContent = result.content.find((c) => c.type === "text");
        if (textContent && "text" in textContent) {
          // Extract session ID from response
          const sessionIdMatch = textContent.text.match(/Session ID: ([a-f0-9-]+)/i);
          const sessionId = sessionIdMatch ? sessionIdMatch[1] : "";

          return {
            success: !result.isError,
            sessionId,
            agentName: params.agentName,
            message: textContent.text,
          };
        }
      }

      return {
        success: false,
        sessionId: "",
        agentName: params.agentName,
        message: "No response from agent",
        error: "Invalid response format",
      };
    } catch (error) {
      return {
        success: false,
        sessionId: "",
        agentName: params.agentName,
        message: "Agent invocation failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listAgents(): Promise<string[]> {
    await this.connect();

    if (!this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const result = await this.client.callTool({
        name: "mcp__levys-awesome-mcp__list_agents",
        arguments: {},
      });

      if (result.content && result.content.length > 0) {
        const textContent = result.content.find((c) => c.type === "text");
        if (textContent && "text" in textContent) {
          // Parse agent list from response
          return textContent.text.split("\n").filter((line) => line.trim());
        }
      }

      return [];
    } catch (error) {
      console.error("Failed to list agents:", error);
      return [];
    }
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new MCPClient();
  }
  return mcpClientInstance;
}
