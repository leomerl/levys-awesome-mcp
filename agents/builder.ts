// Builder Agent - Follows Claude Code TypeScript SDK Schema
// Reference: https://github.com/instantlyeasy/claude-code-sdk-ts

import { query } from "@anthropic-ai/claude-code";
import { StreamingManager } from '../src/utilities/session/streaming-utils.ts';
import { v4 as uuidv4 } from 'uuid';

import { AgentConfig } from '../src/types/agent-config.js';

const builderAgent: AgentConfig = {
  name: 'builder-agent',
  description: 'Handles project build operations including backend typechecking and frontend compilation. Creates detailed build reports in JSON format.',
  prompt: 'Build the entire project using available build tools. Generate a comprehensive build report with status, timing, and results.',
  systemPrompt: `You are a specialized build agent. Your role is to:

1. Execute build operations using available build tools (mcp__build__build_project, mcp__build__build_frontend, mcp__build__build_backend)
2. Track build status, timing, and results
3. Generate structured JSON reports using the put_summary tool

IMPORTANT: You must create a JSON report after completing build operations.
IMPORTANT: You CANNOT use the mcp__agent-invoker__invoke_agent or Task tools.

## Build Process:
1. Start with backend build using mcp__build__build_backend
2. Then proceed with frontend build using mcp__build__build_frontend
3. Optionally use mcp__build__build_project for full project build
4. Record all outputs, errors, and timing information

## JSON Report Structure:
Create a comprehensive JSON report with this structure:
{
  "timestamp": "2025-01-XX...",
  "sessionId": "build-session-[timestamp]",
  "buildType": "full/backend/frontend",
  "status": "success/failure/partial",
  "duration": {
    "total_ms": 0,
    "backend_ms": 0,
    "frontend_ms": 0
  },
  "results": {
    "backend": {
      "status": "success/failure",
      "output": "...",
      "errors": "..."
    },
    "frontend": {
      "status": "success/failure", 
      "output": "...",
      "errors": "..."
    }
  },
  "summary": "Overall build summary",
  "recommendations": ["..."]
}

## Session Management:
- If a SESSION_ID is provided in the prompt, use that exact SESSION_ID
- If no SESSION_ID is provided, generate one as: session-[YYYY-MM-DD_HH-MM-SS]
- The session ID should be consistent across all operations in the same workflow

## File Output:
- Always create a JSON summary report using the put_summary tool
- Include the session ID and detailed build results in your report
- Provide comprehensive build status, timing, and error information

You cannot edit code, only build it.`,
  model: 'sonnet',
  options: {
    maxTurns: 10,
    model: 'sonnet',
    allowedTools: [
      'mcp__levys-awesome-mcp__mcp__build-executor__build_project',
      'mcp__levys-awesome-mcp__mcp__build-executor__build_frontend', 
      'mcp__levys-awesome-mcp__mcp__build-executor__build_backend',
      'mcp__levys-awesome-mcp__mcp__content-writer__put_summary',
      'Read',
      'Bash'
    ],
    mcpServers: [
      'levys-awesome-mcp'
    ]
  }
};

// Export using ES6 for agent loader compatibility
export { builderAgent };
export default builderAgent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];
  const continueSessionId = process.argv[3]; // Optional session ID to continue

  if (!prompt) {
    console.error("Usage: npx tsx agents/builder.ts \"your prompt here\" [sessionId]");
    process.exit(1);
  }

  console.log("🏗️ Running Builder Agent...");
  console.log(`📝 Prompt: ${prompt}\n`);

  // Use existing session ID or generate new one
  const sessionId = continueSessionId || uuidv4();
  const isSessionContinuation = !!continueSessionId;
  
  console.log(`📋 Session ID: ${sessionId}`);
  if (isSessionContinuation) {
    console.log("🔄 Continuing existing session");
  } else {
    console.log("🆕 Starting new session");
  }

  const streamingUtils = new StreamingManager(sessionId, 'builder-agent', {
    streaming: true,
    saveStreamToFile: true,
    verbose: true
  });

  // Initialize session.log file (will append if continuing)
  const streamInitialized = streamingUtils.initStreamFile();
  if (streamInitialized) {
    console.log(`📝 Session logging enabled: output_streams/${sessionId}/stream.log`);
  }

  // Log the user prompt to session.log
  const streamLogFile = streamingUtils.getStreamLogFile();
  if (streamLogFile) {
    const fs = await import('fs');
    const timestamp = new Date().toISOString();
    const promptLog = `[${timestamp}] USER PROMPT:\n${prompt}\n\n`;
    fs.appendFileSync(streamLogFile, promptLog, 'utf8');
  }

  try {
    // Execute the builder agent using Claude Code query
    for await (const message of query({
      prompt,
      options: {
        systemPrompt: builderAgent.options.systemPrompt,
        maxTurns: builderAgent.options.maxTurns,
        allowedTools: builderAgent.options.allowedTools,
        disallowedTools: ['TodoWrite', 'Task'], // Block built-in TodoWrite and Task tools
        pathToClaudeCodeExecutable: "node_modules/@anthropic-ai/claude-code/cli.js",
        mcpServers: {
        "levys-awesome-mcp": {
          command: "node",
          args: ["dist/src/index.js"]
        }
      }
    }
  })) {
    // Log all messages to session.log
    await streamingUtils.logConversationMessage(message);
    
    if (message.type === "result") {
      console.log(message.result);
    } else if (message.type === "toolCall") {
      console.log(`🔧 Tool: ${message.toolName}`);
    } else if (message.type === "error") {
      console.error(`❌ Error: ${message.error}`);
    }
  }

  // Import ReportManager to check for summary files
  const { ReportManager } = await import('../src/utilities/session/report-manager.ts');
  
  // Check if summary report was created
  const summaryCheck = ReportManager.checkForSummaryFiles(sessionId, 'builder-agent');
  if (!summaryCheck.found) {
    console.log('\n⚠️  No summary report found. Requesting summary creation...');
    
    // Log the summary request
    if (streamLogFile) {
      const timestamp = new Date().toISOString();
      const summaryRequestLog = `[${timestamp}] REQUESTING SUMMARY REPORT:\nReason: No summary file found after agent execution\nPrompt: Please create a summary report using put_summary\n\n`;
      const fs = await import('fs');
      fs.appendFileSync(streamLogFile, summaryRequestLog, 'utf8');
    }

    // Request summary creation
    const summaryPrompt = `Please create a summary report of what you accomplished in this session. Use the put_summary tool with session_id "${sessionId}" and agent_name "builder-agent" to save your report as JSON. Include: build status, any errors encountered, files processed, and overall results.`;
    
    for await (const message of query({
      prompt: summaryPrompt,
      options: {
        systemPrompt: builderAgent.options.systemPrompt,
        maxTurns: 3,
        model: builderAgent.options.model,
        allowedTools: builderAgent.options.allowedTools,
        disallowedTools: ['TodoWrite', 'Task'], // Block built-in TodoWrite and Task tools
        pathToClaudeCodeExecutable: "node_modules/@anthropic-ai/claude-code/cli.js",
        mcpServers: {
          "levys-awesome-mcp": {
            command: "node",
            args: ["dist/src/index.js"]
          }
        }
      }
    })) {
      await streamingUtils.logConversationMessage(message);
      
      if (message.type === "result") {
        console.log(message.result);
      } else if (message.type === "toolCall") {
        console.log(`🔧 Tool: ${message.toolName}`);
      }
    }

    // Check again if summary was created
    const finalSummaryCheck = ReportManager.checkForSummaryFiles(sessionId, 'builder-agent');
    if (streamLogFile) {
      const timestamp = new Date().toISOString();
      const summaryResultLog = `[${timestamp}] SUMMARY REPORT CHECK:\nFound: ${finalSummaryCheck.found}\nFiles: ${finalSummaryCheck.files.join(', ') || 'none'}\n\n`;
      const fs = await import('fs');
      fs.appendFileSync(streamLogFile, summaryResultLog, 'utf8');
    }
    
    if (finalSummaryCheck.found) {
      console.log('✅ Summary report created successfully!');
    } else {
      console.log('❌ Summary report still not found after request.');
    }
  } else {
    console.log('✅ Summary report found:', summaryCheck.files);
  }
  
  console.log(`\n✅ Session completed! Log saved to: output_streams/${sessionId}/stream.log`);
  } catch (error) {
    console.error("Failed to execute agent:", error);
  }
}

// Always run when script is called directly
// Only run when script is called directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(console.error);
}