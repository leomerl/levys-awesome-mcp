# V1.0.0 Regression Tests

Critical tests to ensure core v1.0.0 functionality doesn't break in future releases.

## Agent System Tests

- **Agent Invocation**: All 6 agents (backend, frontend, builder, linter, orchestrator, planner) can be invoked successfully
- **Session Logging**: Every agent invocation creates session.log files
- **Report Creation**: All agents generate JSON summary reports automatically

## Permission System Tests  

- **Folder Isolation**: Backend agents cannot write to frontend/, frontend agents cannot write to backend/
- **Tool Restrictions**: Agents blocked from Write, Edit, TodoWrite, Task tools
- **Permission Enforcement**: Runtime validation prevents unauthorized operations

## Agent Generator Tests

- **Single Conversion**: Convert individual .ts agent files to .md format
- **Batch Conversion**: Convert all agents in agents/ directory 
- **Cleanup**: Remove all generated .md files

## Build & Quality Tests

- **Build Execution**: Backend typecheck, frontend build, full project build
- **Code Analysis**: ESLint, security scan, dependency check
- **Test Execution**: Multi-framework testing works

## Core Workflow Tests

- **Orchestrator**: Can invoke and coordinate other agents
- **Report Collection**: Can retrieve summary reports from completed sessions
- **Session Management**: Unique session IDs generated and tracked properly

## Critical Validations

1. No agent can bypass folder restrictions
2. All agent interactions are logged
3. Summary reports are enforced 
4. Permission system cannot be circumvented
5. Agent generator works with any .ts file structure