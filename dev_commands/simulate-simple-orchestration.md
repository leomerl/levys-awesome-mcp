# Simulate Simple Orchestration

## Description
This dev command simulates a simple orchestration workflow to validate the orchestrator agent's behavior. It creates a test task, executes it through the orchestrator, and validates:
- Correct task routing and execution
- Proper report generation
- Success criteria achievement1
- Absence of unexpected behaviors or inconsistencies

All outputs are written to git-ignored directories (reports/, plan_and_progress/, output_streams/) to avoid polluting the source code.

## Task
Create a simple test feature in the test-projects/ directory (git-ignored). The task should:
1. Create a basic "Hello World" component in test-projects/frontend/HelloWorld.tsx
2. Create a basic API endpoint in test-projects/backend/hello.ts
3. Validate that both files are created correctly
4. Check for any failures, inconsistencies, or unexpected behaviors

## Validation Criteria
After orchestration completes, validate:
1. **Plan File Exists**: Check that plan_and_progress/ contains the session plan
2. **Progress File Exists**: Check that plan_and_progress/ contains progress tracking
3. **Reports Generated**: Verify all expected reports in reports/ directory
4. **Tasks Completed**: Ensure all tasks show "completed" status in progress file
5. **Files Created**: Verify test-projects/frontend/HelloWorld.tsx and test-projects/backend/hello.ts exist
6. **No Unexpected Failures**: Check that no tasks failed unexpectedly
7. **Success Criteria Met**: Compare plan vs progress to ensure goals were achieved
8. **Report Consistency**: Validate that agent reports match expected structure

## Expected Behavior
- Orchestrator invokes planner-agent first
- Planner creates a plan with 2 tasks (frontend + backend)
- Orchestrator executes tasks one-by-one
- Frontend-agent creates HelloWorld.tsx
- Backend-agent creates hello.ts
- Reviewer-agent validates execution
- Builder-agent, linter-agent, testing-agent run successfully
- All reports are generated in reports/SESSION_ID/
- Final summary shows all tasks completed

## Failure Detection
Report any of the following as failures:
- Missing plan or progress files
- Tasks marked as "failed" in progress file
- Missing expected reports
- Files not created in test-projects/
- Reports with unexpected structure or missing fields
- Orchestrator skipping any phases (plan, develop, review, build, lint, test)
- Orchestrator batching multiple tasks to a single agent
- Progress file showing wrong agent assignments

## Cleanup
After validation, optionally clean up:
- test-projects/frontend/HelloWorld.tsx
- test-projects/backend/hello.ts
- Session reports (keep for debugging if failures detected)

## Implementation Instructions

**CRITICAL: Launch orchestrator as a SUB-AGENT using Task tool**

This is a **SUB-AGENT workflow** where you delegate work and receive results back.

**Step 1: Launch orchestrator-agent as SUB-AGENT**
Use `Task` tool with `subagent_type: "orchestrator-agent"` to launch the orchestrator as a sub-agent that will:
- Execute the task
- Return results to you
- Allow you to validate the outcome

**DO NOT use `mcp__levys-awesome-mcp__invoke_agent`** - that creates a separate independent agent session (fire-and-forget). You need a sub-agent that returns results.

**Task prompt for the orchestrator sub-agent:**
```
Execute a simple orchestration workflow to create:
1. A basic 'Hello World' component in test-projects/frontend/HelloWorld.tsx
2. A basic API endpoint in test-projects/backend/hello.ts

Ensure all files are created in the test-projects/ directory (git-ignored).
```

**Step 2: After sub-agent returns results, validate:**
- Plan file exists in plan_and_progress/
- Progress file shows all tasks completed
- Reports generated in reports/ directory
- Both files created: test-projects/frontend/HelloWorld.tsx and test-projects/backend/hello.ts
- No unexpected failures in progress file
- Success criteria met (compare plan vs progress)
