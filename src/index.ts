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
    // Route to appropriate handler based on tool name
    // Handle agent-generator tools
    if (name.includes('convert_agent_ts_to_claude_md') || 
        name.includes('convert_all_agents_ts_to_claude_md') ||
        name.includes('remove_all_agent_md_files')) {
      return await handleAgentGeneratorTool(name, args);
    } 
    // Handle agent-invoker tools
    else if (name.includes('invoke_agent') || 
             name.includes('list_agents')) {
      return await handleAgentInvokerTool(name, args);
    } 
    // Handle build-executor tools
    else if (name.includes('build_project') || 
             name.includes('build_backend') ||
             name.includes('build_frontend')) {
      return await handleBuildExecutorTool(name, args);
    } 
    // Handle content-writer tools
    else if (name.includes('backend_write') || 
             name.includes('frontend_write') || 
             name.includes('restricted_write') ||
             name.includes('put_summary') ||
             name.includes('get_summary') ||
             name.includes('get_plan')) {
      return await handleContentWriterTool(name, args);
    } 
    // Handle code-analyzer tools
    else if (name.includes('lint_javascript') || 
             name.includes('security_scan') ||
             name.includes('dependency_check') ||
             name.includes('code_quality_scan')) {
      return await handleCodeAnalyzerTool(name, args);
    } 
    // Handle server-runner tools
    else if (name.includes('run_dev_backend') || 
             name.includes('run_dev_frontend') ||
             name.includes('run_dev_all')) {
      return await handleServerRunnerTool(name, args);
    } 
    // Handle test-executor tools
    else if (name.includes('run_tests') || 
             name.includes('validate_and_run_tests')) {
      return await handleTestExecutorTool(name, args);
    } 
    // Handle plan-creator tools
    else if (name.includes('create_plan') || 
             name.includes('update_progress')) {
      return await handlePlanCreatorTool(name, args);
    } 
    else {
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