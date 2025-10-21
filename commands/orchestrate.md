---
description: Orchestrate complex multi-agent workflows
argument-hint: [task-description]
---

Launch the orchestrator-agent sub-agent to coordinate a complete development workflow with planning, execution, review, and validation phases.

The orchestrator-agent will execute:
- Planning Phase with planner-agent
- Development Phase with specialized agents (backend-agent, frontend-agent)
- Review Phase with reviewer-agent
- Build, lint, and testing phases
- Automated feedback loops for fixes
- Comprehensive status reporting

Use the Task tool to launch the orchestrator-agent with the following task:

$ARGUMENTS 