#!/usr/bin/env tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../src/types/agent-config.ts';

const backendAgent: AgentConfig = {
  name: 'backend-agent',
  description: 'Agent specialized for backend development with write access only to backend/ folder',
  prompt: 'Work on backend code, APIs, and server logic. You can only write/edit files in the backend/ folder.',
  options: {
    systemPrompt: `You are a backend development agent with restricted access to the backend/ folder only.

IMPORTANT: You can ONLY write/edit files within the backend/ folder using backend_write and backend_edit tools.

## FILE TRACKING & REPORTING:
You MUST track all files you touch and generate a detailed JSON report at the end of your session.

## TYPESCRIPT CONSTRAINTS:
CRITICAL: You are STRICTLY FORBIDDEN from using the 'any' type in TypeScript code.
- NEVER use 'any' in function parameters, return types, or variable declarations
- Use proper TypeScript types: string, number, boolean, object, arrays, interfaces, unions, generics
- When unsure of a type, use 'unknown' instead of 'any'

## TODO CONSTRAINTS:
- If you identify tasks to be done, complete them immediately in the same session

## Available Tools:
- mcp__levys-awesome-mcp__backend_write: Write new files to backend/ folder
- mcp__language-server__definition: Get source code definition of symbols
- mcp__language-server__diagnostics: Get diagnostic information for files
- mcp__language-server__edit_file: Apply multiple text edits to files
- mcp__language-server__hover: Get type and documentation info for symbols
- mcp__language-server__references: Find all usages of symbols in codebase
- mcp__language-server__rename_symbol: Rename symbols and update all references
- Read: Read any file for analysis
- Glob: Find files matching patterns
- Grep: Search file contents

Remember: You are focused on backend development and can only modify files in the backend/ directory.`,
    model: 'sonnet',
    allowedTools: [
      'mcp__levys-awesome-mcp__backend_write',
      'mcp__levys-awesome-mcp__put_summary',
      'mcp__levys-awesome-mcp__get_summary',
      'Glob',
      'Grep',
      'Read'
    ]
  }
};

// Export for SDK usage
export { backendAgent };
export default backendAgent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: npx tsx agents/backend-agent.ts \"your prompt here\"");
    process.exit(1);
  }

  console.log("🚀 Running Backend Agent...");
  console.log(`📝 Prompt: ${prompt}\n`);

  console.log("Starting query...");

  try {
    // Execute the backend agent using Claude Code query
    for await (const message of query({
    prompt,
    options: {
      systemPrompt: backendAgent.options.systemPrompt,
      allowedTools: backendAgent.options.allowedTools,
      pathToClaudeCodeExecutable: "node_modules/@anthropic-ai/claude-code/cli.js",
      mcpServers: {
        "levys-awesome-mcp": {
          command: "node",
          args: ["dist/src/index.js"]
        }
      }
    }
  })) {
    if (message.type === "result") {
      console.log(message.result);
    } else if (message.type === "toolCall") {
      console.log(`🔧 Tool: ${message.toolName}`);
    } else if (message.type === "error") {
      console.error(`❌ Error: ${message.error}`);
    }
  }
  } catch (error) {
    console.error("Failed to execute agent:", error);
  }
}

// Always run when script is called directly
// Only run when script is called directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(console.error);
}