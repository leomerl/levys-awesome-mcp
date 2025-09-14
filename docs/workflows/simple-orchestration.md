# Orchestrator Agent Workflow

## Overview
The orchestrator agent implements a sophisticated workflow that coordinates specialized agents to automate the entire development lifecycle. It enforces strict task-by-task execution, automated progress tracking, and intelligent feedback loops for optimal software delivery.

## Core Principles

### Critical Orchestration Rule
**ONE TASK AT A TIME**: The orchestrator MUST invoke agents with exactly ONE task from the plan file
- Each agent invocation corresponds to a single task
- Only the specific task details are passed to the agent
- Progress is updated after each task completion
- Multiple tasks are NEVER batched in a single invocation
- The entire plan is NEVER passed to an agent

## Workflow Phases

### 1. Planning Phase (MANDATORY FIRST STEP)
- **Always begins** by invoking the `planner-agent` for any complex task
- **Planner analyzes** requirements and creates a detailed execution plan
- **Plan includes**:
  - Task breakdown with unique IDs (TASK-001, TASK-002, etc.)
  - Dependencies between tasks
  - Agent assignments for each task
  - Files to be modified
- **Orchestrator retrieves** plan using `get_plan` (NOT get_summary)
- **Only proceeds** to development after receiving and analyzing the plan

### 2. Session Management
- **Session ID Generation**: Creates unique ID in format `YYYYMMDD-HHMMSS`
  - Example: `20250830-153642`
  - No prefixes like "build-lint-"
- **Consistent Tracking**: Session ID used throughout entire workflow
- **Report Location**: All outputs stored in `/reports/${session_ID}/`

### 3. Task-by-Task Development Phase
**CRITICAL**: Process tasks from the plan ONE AT A TIME

For each task in sequence:
1. **Check dependencies** are completed
2. **Identify designated agent** (backend-agent, frontend-agent, etc.)
3. **Extract ONLY that task's** description and requirements
4. **Invoke agent with**:
   - Single task description
   - `taskNumber` parameter (e.g., 1 for TASK-001)
   - `updateProgress: true` for automatic progress tracking
   - Session ID for report generation
5. **Wait for completion**
6. **Retrieve summary** using `get_summary`
7. **Progress automatically updated** by invocation system
8. **Only then proceed** to next task

Example invocation:
```
"Execute TASK-001: Implement user authentication API endpoint.
Create POST /api/auth/login endpoint with JWT token generation.
SESSION_ID: 20250830-153642"
```

### 4. Build Phase
- **Invokes `builder-agent`** after ALL development tasks complete
- **Compilation and verification** of all changes
- **Build status** determines if workflow continues
- **Failure handling**: If build fails, workflow stops (no lint/test)

### 5. Quality Assurance Phase
- **Invokes `linter-agent`** for code quality analysis
- **Style enforcement** and best practices validation
- **Categorizes issues** by severity (error/warning/info)
- **Continues to testing** even if linting has warnings

### 6. Testing Phase
- **Invokes `testing-agent`** for comprehensive testing
- **Executes** unit, integration, and e2e tests
- **Analyzes** test failures and coverage metrics
- **Generates** `orchestratorInstructions.nextActions` for feedback decisions
- **Critical output** for determining if fixes are needed

### 7. Feedback Loop Decision
Based on testing agent's `orchestratorInstructions.nextActions`:

- **High-priority fixes required**:
  - Initiates feedback loop to development phase
  - Passes specific fix instructions to appropriate agent
  - Re-runs entire workflow after fixes
  - Maximum 2 feedback cycles to prevent infinite loops

- **Medium/low priority issues**:
  - Documents for future iterations
  - Completes current workflow

- **No issues found**:
  - Workflow completes successfully

## Task Routing Logic

### Backend Tasks (backend-agent)
- API endpoints and routes
- Database models and migrations
- Server middleware and authentication
- Backend configuration files
- Keywords: "API", "endpoint", "database", "server", "backend"

### Frontend Tasks (frontend-agent)
- React components and hooks
- UI styling and layouts
- Client-side state management
- Frontend routing and navigation
- Keywords: "component", "UI", "frontend", "React", "style"

### Full-Stack Tasks
- Invokes both backend and frontend agents
- Complete features spanning multiple layers
- End-to-end user flows

## Automated Progress Management

Progress updates are handled automatically:
- Task marked as `in_progress` before agent starts
- Agent automatically reinvoked to update progress
- Task marked as `completed` when finished
- No manual `update_progress` calls needed

Enable by including in agent invocation:
- `taskNumber`: Extract from TASK-XXX (e.g., 1 for TASK-001)
- `updateProgress: true`

## Report Processing

### After Planner Agent
- Use `get_plan` to retrieve plan file from `plan_and_progress/`
- Parse plan to understand task breakdown and dependencies

### After Other Agents
- Use `get_summary` to retrieve JSON reports
- Expected files:
  - `${agent_name}-summary.json`
  - `build-report.json`
  - `lint-report.json`
  - `testing-agent-report.json`

### Report Contents
- Status (success/failure/partial/degraded)
- Duration and timing information
- Detailed results per agent type
- Error messages and stack traces
- Testing: `orchestratorInstructions.nextActions`

## Execution Workflow Summary

```
1. Planning Phase (MANDATORY)
   ↓
2. Retrieve & Analyze Plan
   ↓
3. Generate Session ID
   ↓
4. Task-by-Task Development [Loop through each task]
   ├─ Check dependencies
   ├─ Invoke designated agent with single task
   ├─ Retrieve summary
   └─ Auto-update progress
   ↓
5. Build Phase
   ↓
6. Quality Phase (Linting)
   ↓
7. Testing Phase
   ↓
8. Feedback Loop Decision
   ├─ [High-priority fixes] → Return to Step 4
   └─ [No/low-priority issues] → Continue
   ↓
9. Result Synthesis & Reporting
```

## Key Features

- **Mandatory Planning**: Always starts with planner agent
- **Atomic Task Execution**: One task per agent invocation
- **Automated Progress**: Built-in progress tracking system
- **Session Management**: Consistent ID throughout workflow
- **Report-Driven Decisions**: JSON reports guide workflow
- **Intelligent Feedback Loops**: Maximum 2 cycles for fixes
- **Strict Sequential Execution**: No parallel agent invocations
- **Comprehensive Error Handling**: Graceful failure management
- **Quality Gates**: Build must pass before lint/test

## Communication & Output

The orchestrator provides:
- Real-time status updates per phase
- Clear section headers for organization
- Consolidated final summary including:
  - Development Status & Changes
  - Build Status & Details
  - Lint Status & Issues
  - Testing Results & Metrics
  - Feedback Loops Executed
  - Recommendations for remaining issues