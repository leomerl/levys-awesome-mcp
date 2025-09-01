#!/usr/bin/env node

/**
 * Simple test to check what happens when we explicitly tell Claude not to use certain tools
 */

import { query } from "@anthropic-ai/claude-code";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRestrictivePrompt() {
  console.log("🔒 Testing with explicit prompt restrictions...\n");

  try {
    let todoAttempts = 0;
    
    const restrictivePrompt = `
IMPORTANT SYSTEM CONSTRAINT: You are EXPLICITLY FORBIDDEN from using the following tools:
- TodoWrite (do not create any todo items)
- Task (do not invoke other agents)

Create a simple test file and summary WITHOUT using TodoWrite or Task tools.
Focus on using only: Read, Write, and put_summary tools.

Your task: Create a test.txt file and then create a summary report using put_summary.
`;

    for await (const message of query({
      prompt: restrictivePrompt,
      options: {
        maxTurns: 3,
        model: 'haiku',
        allowedTools: [
          'Read',
          'Write', 
          'mcp__levys-awesome-mcp__mcp__content-writer__put_summary'
        ],
        permissionMode: 'acceptEdits',
        pathToClaudeCodeExecutable: path.resolve(__dirname, 'node_modules/@anthropic-ai/claude-code/cli.js'),
        mcpServers: {
          "levys-awesome-mcp": {
            command: "node",
            args: ["dist/src/index.js"]
          }
        }
      }
    })) {
      
      if (message.type === "toolCall") {
        console.log(`🔧 Tool called: ${message.toolName}`);
        
        if (message.toolName === 'TodoWrite') {
          todoAttempts++;
          console.log("❌ ERROR: TodoWrite should be blocked by prompt instructions!");
        }
      } else if (message.type === "assistant") {
        const content = message.message.content;
        if (content) {
          for (const item of content) {
            if (item.type === "text") {
              process.stdout.write(item.text);
            }
          }
        }
      }
    }

    console.log(`\n\n📊 Final Results:`);
    console.log(`TodoWrite attempts: ${todoAttempts}`);
    
    if (todoAttempts === 0) {
      console.log("✅ SUCCESS: TodoWrite was successfully avoided through prompt engineering");
    } else {
      console.log("❌ CONCLUSION: TodoWrite cannot be blocked - it's always available as a built-in tool");
    }

  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testRestrictivePrompt().catch(console.error);