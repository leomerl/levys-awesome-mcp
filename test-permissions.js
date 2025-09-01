#!/usr/bin/env node

/**
 * Test script to verify agent permission fixes
 */

import { query } from "@anthropic-ai/claude-code";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPermissions() {
  console.log("🔒 Testing Agent Permission Restrictions...\n");

  try {
    console.log("Testing with TodoWrite in disallowedTools...");
    
    let todoAttempts = 0;
    let summaryCreated = false;
    
    for await (const message of query({
      prompt: "Create a simple test and try to use TodoWrite tool if available. Then create a summary report.",
      options: {
        maxTurns: 5,
        model: 'haiku',
        allowedTools: [
          'Read',
          'Write', 
          'mcp__levys-awesome-mcp__mcp__content-writer__put_summary'
          // Explicitly NOT including TodoWrite or Task
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
      
      if (message.type === "assistant") {
        const content = message.message.content;
        if (content) {
          for (const item of content) {
            if (item.type === "text") {
              process.stdout.write(item.text);
              
              // Check for TodoWrite attempts
              if (item.text.toLowerCase().includes('todowrite')) {
                todoAttempts++;
              }
              
              // Check for put_summary usage
              if (item.text.toLowerCase().includes('put_summary')) {
                summaryCreated = true;
              }
            }
          }
        }
      } else if (message.type === "toolCall") {
        console.log(`\n🔧 Tool called: ${message.toolName}`);
        
        if (message.toolName === 'TodoWrite') {
          todoAttempts++;
          console.log("❌ ERROR: TodoWrite should be blocked!");
        }
        
        if (message.toolName.includes('put_summary')) {
          summaryCreated = true;
          console.log("✅ SUCCESS: put_summary tool is accessible");
        }
      } else if (message.type === "error") {
        console.log(`\n⚠️ Error: ${message.error}`);
        
        // If error mentions TodoWrite being unavailable, that's good!
        if (message.error.toLowerCase().includes('todowrite')) {
          console.log("✅ SUCCESS: TodoWrite correctly blocked by permissions");
        }
      }
    }

    console.log("\n\n📊 Test Results:");
    console.log(`TodoWrite attempts: ${todoAttempts}`);
    console.log(`Summary tool used: ${summaryCreated}`);
    
    if (todoAttempts === 0) {
      console.log("✅ SUCCESS: TodoWrite was successfully blocked");
    } else {
      console.log("❌ FAIL: TodoWrite was not blocked");
    }
    
    if (summaryCreated) {
      console.log("✅ SUCCESS: put_summary tool is accessible");
    } else {
      console.log("⚠️ WARNING: put_summary tool may not be accessible");
    }

  } catch (error) {
    console.error("Test failed:", error);
  }
}

testPermissions().catch(console.error);