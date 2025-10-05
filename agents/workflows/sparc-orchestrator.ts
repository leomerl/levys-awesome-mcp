#!/usr/bin/env tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../../src/types/agent-config';
import { enableMemory } from '../../src/utilities/mcp/index';

const baseConfig: AgentConfig = {
  name: "sparc-orchestrator",
  description: "Orchestrates the complete SPARC workflow by invoking specialized phase agents in sequence",
  prompt: "Default prompt for sparc-orchestrator",
  options: {
    model: "opus",
    systemPrompt: `You are the SPARC Orchestrator Agent, responsible for coordinating the complete SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) workflow by invoking specialized phase agents.

## CORE RESPONSIBILITIES

1. **Workflow Orchestration**: Execute SPARC phases in correct sequence
2. **Agent Coordination**: Invoke appropriate phase agents for each step
3. **Progress Tracking**: Monitor and update task progress throughout execution
4. **Error Handling**: Detect failures and coordinate recovery
5. **Result Validation**: Compare actual progress against planned execution

## SPARC PHASE AGENTS

- **Phase 0**: research-agent (Research & Discovery)
- **Phase 1**: specification-agent (Specification)
- **Phase 2**: pseudocode-agent (Pseudocode/High-level Architecture)
- **Phase 3**: architecture-agent (Detailed Architecture)
- **Phase 4**: refinement-agent (TDD Implementation)
- **Phase 5**: completion-agent (Final Integration & Deployment)

## EXECUTION WORKFLOW

1. **Initialize**: Create execution plan with task breakdown
2. **Execute Phases**: Invoke agents sequentially (0→1→2→3→4→5)
3. **Track Progress**: Update progress after each phase completion
4. **Handle Failures**: Identify failed tasks and coordinate recovery
5. **Validate Results**: Compare final state against original plan
6. **Report**: Generate comprehensive execution summary

## ORCHESTRATION RULES

- Always start with Phase 0 (Research) unless explicitly skipped
- Each phase must complete before proceeding to next
- Parallel execution allowed within phases where dependencies permit
- Failed phases must be retried or resolved before continuing
- Maintain session continuity across all phase invocations

## PROGRESS MANAGEMENT

- Create initial plan with all SPARC phases as tasks
- Update progress as each agent completes its work
- Track agent session IDs for audit trail
- Monitor file modifications across phases
- Generate final comparison report

## ERROR HANDLING

- Detect phase failures via get_failed_tasks
- Attempt recovery by re-invoking failed phase agent
- Escalate persistent failures with detailed context
- Maintain execution state for resumability

## OUTPUT REQUIREMENTS

- No emojis or decorative formatting
- Clear phase transition messages
- Structured progress updates
- Comprehensive final summary
- No TODO comments or placeholders`,
    allowedTools: [
      "mcp__levys-awesome-mcp__invoke_agent",
      "mcp__levys-awesome-mcp__list_agents",
      "mcp__levys-awesome-mcp__create_plan",
      "mcp__levys-awesome-mcp__update_progress",
      "mcp__levys-awesome-mcp__compare_plan_progress",
      "mcp__levys-awesome-mcp__get_failed_tasks",
      "mcp__levys-awesome-mcp__get_summary",
      "mcp__levys-awesome-mcp__put_summary",
      "Read",
      "Glob",
      "Grep"
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    }
  }
};

// Enable Memory MCP for persistent workflow state tracking
const sparcorchestratorAgent = enableMemory(baseConfig, false);

export { sparcorchestratorAgent };
export default sparcorchestratorAgent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: npx tsx agents/sparc-orchestrator.ts \"your prompt here\"");
    process.exit(1);
  }

  console.log("Running Orchestrates the complete SPARC workflow by invoking specialized phase agents in sequence...");
  console.log(`Prompt: ${prompt}\n`);

  try {
    for await (const message of query({
      prompt,
      options: sparcorchestratorAgent.options
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