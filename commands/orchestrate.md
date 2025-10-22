---
description: Orchestrate complex multi-agent workflows
argument-hint: [task-description]
---

**Launch orchestrator-agent as a SUB-AGENT** that will coordinate other agents to complete the task.

**CRITICAL Tool Usage:**
- **YOU launch orchestrator**: Use Task tool with subagent_type: "orchestrator-agent"
- **Orchestrator coordinates work**: It will invoke other agents (planner, backend-agent, frontend-agent, etc.) using mcp__levys-awesome-mcp__invoke_agent

**The orchestrator is a COORDINATOR ONLY:**
- It does NOT write code itself
- It does NOT create plans itself
- It does NOT make any changes itself
- It ONLY invokes other specialized agents to do the work
- It tracks progress and returns a final report to you

**Workflow the orchestrator will coordinate:**
1. Planning Phase → invokes planner-agent
2. Development Phase → invokes backend-agent, frontend-agent
3. Review Phase → invokes reviewer-agent
4. Build/Lint/Test phases → invokes builder-agent, linter-agent, testing-agent
5. Returns comprehensive status report to you

**Launch orchestrator as sub-agent:**
Use Task tool with:
- subagent_type: "orchestrator-agent"
- prompt: $ARGUMENTS 