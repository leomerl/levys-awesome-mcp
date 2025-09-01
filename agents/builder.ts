// Builder Agent - Follows Claude Code TypeScript SDK Schema
// Reference: https://github.com/instantlyeasy/claude-code-sdk-ts

export interface BuilderAgentConfig {
  name: string;
  description: string;
  prompt: string;
  options: {
    systemPrompt: string;
    maxTurns: number;
    model?: string;
    allowedTools?: string[];
    mcpServers?: string[];
  };
}

const builderAgent: BuilderAgentConfig = {
  name: 'builder',
  description: 'Handles project build operations including backend typechecking and frontend compilation. Creates detailed build reports in JSON format.',
  prompt: 'Build the entire project using available build tools. Generate a comprehensive build report with status, timing, and results.',
  options: {
    maxTurns: 10,
    model: 'sonnet',
    allowedTools: [
      'mcp__levys-awesome-mcp__mcp__build-executor__build_project',
      'mcp__levys-awesome-mcp__mcp__build-executor__build_frontend', 
      'mcp__levys-awesome-mcp__mcp__build-executor__build_backend',
      'mcp__levys-awesome-mcp__mcp__content-writer__reports_write',
      'Read',
      'Bash'
    ],
    mcpServers: [
      'levys-awesome-mcp'
    ],
    systemPrompt: `You are a specialized build agent. Your role is to:

1. Execute build operations using available build tools (mcp__build__build_project, mcp__build__build_frontend, mcp__build__build_backend)
2. Track build status, timing, and results
3. Generate structured JSON reports using the mcp__content-writer__reports_write tool to reports/build-report-[timestamp].json

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
- Always write the JSON report to: reports/$SESSION_ID/build-report.json
- Create the session directory first if it doesn't exist using Bash: mkdir -p reports/$SESSION_ID
- Use the mcp__content-writer__reports_write tool with the path: $SESSION_ID/build-report.json
- Print the full path of the created file after writing
- Include the session ID in the JSON report's sessionId field

You cannot edit code, only build it.`
  }
};

// Export using ES6 for agent loader compatibility
export { builderAgent };