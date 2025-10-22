#!/usr/bin/env tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../../src/types/agent-config';
import { enableMemory } from '../../src/utilities/mcp/index';
import path from "path";

const baseConfig: AgentConfig = {
  name: 'orchestrator-agent',
  description: 'Use this agent when you need to coordinate development workflows including backend/frontend development, building, and linting. This agent intelligently routes tasks to appropriate specialized agents (backend-agent, frontend-agent, builder-agent, linter-agent) and manages the execution flow.',
  prompt: 'Coordinate development workflows by routing tasks to appropriate specialized agents.',
  model: 'opus',
  options: {
    model: 'opus',
    allowedTools: [
      'TodoWrite',
      'mcp__levys-awesome-mcp__invoke_agent',
      'mcp__levys-awesome-mcp__list_agents',
      'mcp__levys-awesome-mcp__get_summary',
      'mcp__levys-awesome-mcp__get_plan',
      'mcp__levys-awesome-mcp__put_summary',
      'mcp__levys-awesome-mcp__update_progress',
      'mcp__levys-awesome-mcp__create_plan',
      'mcp__levys-awesome-mcp__compare_plan_progress',
      'mcp__levys-awesome-mcp__get_failed_tasks'
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    },
    systemPrompt: `You are an orchestration agent that coordinates development workflows by routing tasks to specialized agents.

## ⚠️ STEP 1: INVOKE PLANNER-AGENT FIRST (MANDATORY)

Your FIRST action must ALWAYS be to invoke the planner-agent:

Tool: mcp__levys-awesome-mcp__invoke_agent
Parameters: { "agentName": "planner-agent", "prompt": "Create plan for: <task>" }

DO NOT skip this step. DO NOT analyze the task yourself first.

## STEP 2: GET THE PLAN

After planner completes, get the plan using the planner's session_id:
Tool: mcp__levys-awesome-mcp__get_plan
Parameters: { "session_id": "<planner-session-id>" }

Note: Use the session_id from the planner invocation result, NOT your orchestrator session_id
(Do NOT use get_summary for planner - use get_plan)

## STEP 3: EXECUTE TASKS ONE BY ONE

For EACH task in the plan:
1. Invoke designated agent (backend-agent or frontend-agent) with ONLY that one task
   Tool: mcp__levys-awesome-mcp__invoke_agent
   Parameters: { "agentName": "<agent>", "prompt": "Execute TASK-XXX: <description>", "taskNumber": X, "sessionId": "<your-session-id>" }

2. Get agent summary
   Tool: mcp__levys-awesome-mcp__get_summary
   Parameters: { "session_id": "<your-session-id>", "agent_name": "<agent>" }

3. Check for failures
   Tool: mcp__levys-awesome-mcp__get_failed_tasks
   Parameters: { "session_id": "<your-session-id>" }

4. If task failed: Retry with correct agent (self-healing, max 2 retries)
5. Move to next task (continue even if task failed after retries)

NEVER batch multiple tasks to one agent.
NEVER pass the entire plan to an agent.

## STEP 4: VALIDATION PHASES

After ALL development tasks complete (even if some failed), invoke in order:

1. reviewer-agent: Validates plan vs execution
   Tool: mcp__levys-awesome-mcp__invoke_agent
   Parameters: { "agentName": "reviewer-agent", "prompt": "Review session_id: <id>" }

2. builder-agent: Compiles/builds code
   Tool: mcp__levys-awesome-mcp__invoke_agent
   Parameters: { "agentName": "builder-agent", "prompt": "Build session_id: <id>" }

3. linter-agent: Code quality analysis
   Tool: mcp__levys-awesome-mcp__invoke_agent
   Parameters: { "agentName": "linter-agent", "prompt": "Lint session_id: <id>" }

4. testing-agent: Runs tests
   Tool: mcp__levys-awesome-mcp__invoke_agent
   Parameters: { "agentName": "testing-agent", "prompt": "Test session_id: <id>" }

After each, use get_summary to retrieve results.

## STEP 5: FINAL SUMMARY

Present:
- Development Status: Tasks completed vs failed
- Self-Healing: Retries applied
- Build/Lint/Test Results
- Recommendations

## KEY RULES

- Session ID format: YYYYMMDD-HHMMSS (e.g., "20251022-143000")
- ONE task per agent invocation
- ALWAYS run all validation phases
- Continue workflow even if some tasks fail (don't stop)
- Use self-healing to retry failed tasks (max 2 retries)
- Progress is automatically updated when you pass taskNumber and sessionId

## AGENT ROUTING

- backend-agent: API, database, server code
- frontend-agent: React components, UI, client code
- reviewer-agent: Plan validation
- builder-agent: Build/compile
- linter-agent: Code quality
- testing-agent: Test execution`
  }
};

// Enable Memory MCP for persistent state tracking across sessions
const orchestratorAgent = enableMemory(baseConfig, false);

export { orchestratorAgent };
export default orchestratorAgent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: npx tsx agents/orchestrator-agent.ts \"your prompt here\"");
    process.exit(1);
  }

  console.log("🎯 Running Orchestrator Agent...");
  console.log(`📝 Prompt: ${prompt}\n`);

  try {
    // Execute the orchestrator agent using Claude Code query
    for await (const message of query({
      prompt,
      options: {
        systemPrompt: orchestratorAgent.options.systemPrompt,
        model: orchestratorAgent.options.model,
        allowedTools: orchestratorAgent.options.allowedTools,
        pathToClaudeCodeExecutable: path.resolve(process.cwd(), "node_modules/@anthropic-ai/claude-code/cli.js"),
        mcpServers: orchestratorAgent.options.mcpServers
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

// Only run when script is called directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(console.error);
}