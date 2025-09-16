---
description: orchestrate a task
argument-hint: [task-description]
---

Invoke the orchestrator-agent subagent using the invoke_agent mcp tool to orchestrate the task stated according to the workflow.

IMPORTANT: The orchestrator-agent will:
1. First invoke the planner-agent to create a detailed execution plan
2. Execute tasks from the plan ONE AT A TIME (never batching multiple tasks)
3. Update progress after each individual task completion
4. Coordinate the workflow through sequential single-task agent invocations

Give the orchestrator the task description and workflow requirements.
The orchestrator MUST process tasks individually, never passing multiple tasks to any agent.

The task: $ARGUMENTS 