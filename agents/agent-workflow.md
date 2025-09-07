# Agent Workflow & Rules Summary

## Core System Rules

### 1. Session Management
- **session.log**: Every agent invocation MUST create a session.log file
- **Session ID format**: `session-YYYY-MM-DD_HH-MM-SS` or custom provided ID
- **Location**: `output_streams/{SESSION_ID}/session.log`

### 2. Report Creation (ENFORCED)
- **Summary reports**: All agents MUST create JSON summary reports after task completion
- **Tool**: `mcp__content-writer__put_summary`
- **Location**: `reports/{SESSION_ID}/{agent-name}-summary.json`
- **Enforcement**: Agent-invoker automatically requests summary if none created

### 3. Permission System
- **Restricted Tools**: Agents cannot use `Write`, `Edit`, `MultiEdit`, `TodoWrite`, `Task`
- **Backend Agent**: Only `backend_write` tool for backend/ folder
- **Frontend Agent**: Only `frontend_write` tool for frontend/ folder
- **Orchestrator**: Can invoke other agents via `invoke_agent` tool

## Available Agents

### 1. **backend-agent**
- **Purpose**: Backend development, APIs, server logic
- **Folder Access**: backend/ only
- **Key Tools**: `backend_write`, `Read`, `Glob`, `Grep`, `put_summary`

### 2. **frontend-agent**
- **Purpose**: Frontend components, UI, styling
- **Folder Access**: frontend/ only
- **Key Tools**: `frontend_write`, `Read`, `Glob`, `Grep`, `put_summary`

### 3. **orchestrator**
- **Purpose**: Coordinates multiple agents, manages complex workflows
- **Special Ability**: Can invoke other agents
- **Workflow**: ALWAYS starts by invoking planner agent first before any development work
- **Key Tools**: `invoke_agent`, `list_agents`, `plan_creator`, `put_summary`

### 4. **builder**
- **Purpose**: Build processes, compilation, type checking
- **Key Tools**: Build execution tools, `put_summary`

### 5. **linter**
- **Purpose**: Code quality analysis, security scanning
- **Key Tools**: `lint_javascript`, `security_scan`, `code_quality_scan`, `put_summary`

### 6. **planner**
- **Purpose**: Task analysis, execution planning
- **Key Tools**: `create_plan`, analysis tools, `put_summary`

## Workflow Process

### Orchestrator Workflow (Complex Tasks)
1. **Planning Phase**: Orchestrator MUST first invoke `planner` agent to analyze task and create execution plan
2. **Plan Analysis**: Review planner's output to understand task breakdown and agent assignments
3. **Agent Invocation**: Use `invoke_agent` tool to invoke development agents based on plan
4. **Session Creation**: System creates unique session ID and session.log for each agent
5. **Task Execution**: Agents perform work within permission boundaries following the plan
6. **Report Generation**: Each agent creates summary report (enforced if forgotten)
7. **Quality Assurance**: Builder, linter, and testing agents run sequentially
8. **Session Completion**: Final status logged to session.log

### Single Agent Workflow (Simple Tasks)
1. **Agent Invocation**: Use `invoke_agent` tool with agent name and prompt
2. **Session Creation**: System creates unique session ID and session.log
3. **Task Execution**: Agent performs work within permission boundaries
4. **Report Generation**: Agent creates summary report (enforced if forgotten)
5. **Session Completion**: Final status logged to session.log

## Security & Isolation

- **Permission Enforcement**: Built-in tools blocked, only allowed tools accessible
- **Folder Isolation**: Backend/frontend agents cannot cross-write
- **Agent Isolation**: Agents cannot directly invoke each other (except orchestrator)
- **Session Tracking**: All activities logged for audit and debugging