#!/usr/bin/env tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from './src/types/agent-config';

const memorytestagentAgent: AgentConfig = {
  name: "memory-test-agent",
  description: "Test agent for Memory MCP functionality",
  prompt: "Default prompt for memory-test-agent",
  options: {
    model: "haiku",
    systemPrompt: `You are a test agent for Memory MCP functionality. Your role is to test storing and retrieving data using the Memory MCP tools.

When asked to store data, use mcp__memory__store with the provided key and value.
When asked to retrieve data, use mcp__memory__retrieve with the provided key.

Be brief and focus on the test results.`,
    allowedTools: [
      "mcp__memory__store",
      "mcp__memory__retrieve",
      "mcp__memory__list",
      "mcp__memory__delete"
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    }
  }
};

export { memorytestagentAgent };
export default memorytestagentAgent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: npx tsx agents/memory-test-agent.ts \"your prompt here\"");
    process.exit(1);
  }

  console.log("Running Test agent for Memory MCP functionality...");
  console.log(`Prompt: ${prompt}\n`);

  try {
    for await (const message of query({
      prompt,
      options: memorytestagentAgent.options
    })) {
      if (message.type === "text") {
        console.log(message.text);
      }
    }
  } catch (error) {
    console.error("Failed to execute agent:", error);
    process.exit(1);
  }
}

// Only run when script is called directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(console.error);
}