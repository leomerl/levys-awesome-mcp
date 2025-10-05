---
description: Orchestrate complex multi-agent workflows
argument-hint: [task-description]
---

Invoke the orchestrator-agent using the invoke_agent mcp tool to coordinate a complete development workflow with planning, execution, review, and validation phases.

## WORKFLOW OVERVIEW

The orchestrator-agent executes a comprehensive workflow:

1. **Planning Phase**: Invokes planner-agent to analyze requirements and create detailed execution plan
2. **Development Phase**: Executes tasks ONE AT A TIME using specialized agents (backend-agent, frontend-agent)
3. **Review Phase**: Invokes reviewer-agent to validate execution against plan and goals
4. **Review Feedback Loop**: Re-invokes agents to fix critical issues if reviewer rejects (unlimited iterations until acceptance)
5. **Build Phase**: Invokes builder-agent for compilation and verification
6. **Quality Phase**: Invokes linter-agent for code quality analysis
7. **Testing Phase**: Invokes testing-agent for comprehensive test execution
8. **Testing Feedback Loop**: Re-invokes agents to fix test failures (unlimited iterations until all tests pass)
9. **Result Synthesis**: Provides comprehensive status report of entire workflow

## SELF-HEALING & COMPLETION GUARANTEE

- Automatically retries failed tasks (unlimited attempts until success)
- Continues workflow and ensures all tasks eventually complete
- ALWAYS runs validation phases (review, build, lint, test)
- Iterates until goals are achieved and all validations pass
- Delivers complete, working, validated solution

## WHEN TO USE

Use /orchestrate for:
- Complex features requiring multiple specialized agents
- Full-stack development (backend + frontend coordination)
- Tasks requiring planning, implementation, and validation
- Workflows that benefit from automated review and testing feedback loops
- Projects requiring guaranteed completion with all tests passing

For simpler structured workflows, consider /sparc instead.

The task: $ARGUMENTS 