#!/usr/bin/env node

/**
 * Levys Awesome MCP - Unified MCP Toolkit Server
 * Combines all toolkit functionality into a single MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import tool handlers
import { agentGeneratorTools, handleAgentGeneratorTool } from './handlers/agent-generator.js';
import { agentInvokerTools, handleAgentInvokerTool } from './handlers/agent-invoker.js';
import { buildExecutorTools, handleBuildExecutorTool } from './handlers/build-executor.js';
import { contentWriterTools, handleContentWriterTool } from './handlers/content-writer.js';
import { codeAnalyzerTools, handleCodeAnalyzerTool } from './handlers/code-analyzer.js';
import { serverRunnerTools, handleServerRunnerTool } from './handlers/server-runner.js';
import { testRunnerTools, handleTestRunnerTool } from './handlers/test-runner.js';
import { testExecutorTools, handleTestExecutorTool } from './handlers/test-executor.js';
import { planCreatorTools, handlePlanCreatorTool } from './handlers/plan-creator.js';

// Create the server
const server = new Server(
  {
    name: 'levys-awesome-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...agentGeneratorTools,
  ...agentInvokerTools,
  ...buildExecutorTools,
  ...contentWriterTools,
  ...codeAnalyzerTools,
  ...serverRunnerTools,
  ...testRunnerTools,
  ...testExecutorTools,
  ...planCreatorTools
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Route to appropriate handler based on tool name prefix
    if (name.includes('agent-generator')) {
      return await handleAgentGeneratorTool(name, args);
    } else if (name.includes('agent-invoker')) {
      return await handleAgentInvokerTool(name, args);
    } else if (name.includes('build-executor')) {
      return await handleBuildExecutorTool(name, args);
    } else if (name.includes('content-writer')) {
      return await handleContentWriterTool(name, args);
    } else if (name.includes('code-analyzer')) {
      return await handleCodeAnalyzerTool(name, args);
    } else if (name.includes('server-runner')) {
      return await handleServerRunnerTool(name, args);
    } else if (name.includes('test-runner')) {
      return await handleTestRunnerTool(name, args);
    } else if (name.includes('test-executor')) {
      return await handleTestExecutorTool(name, args);
    } else if (name.includes('plan-creator')) {
      return await handlePlanCreatorTool(name, args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Levys Awesome MCP server running on stdio');
}

main().catch(console.error);