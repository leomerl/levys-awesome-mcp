---
description: Execute SPARC workflow for complex tasks
argument-hint: [task-description]
---

Launch the sparc-orchestrator sub-agent to execute the complete SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) workflow.

The sparc-orchestrator will execute these phases sequentially:
- Phase 0: Research (research-agent)
- Phase 1: Specification (specification-agent)
- Phase 2: Pseudocode (pseudocode-agent)
- Phase 3: Architecture (architecture-agent)
- Phase 4: Refinement (refinement-agent)
- Phase 5: Completion (completion-agent)

The orchestrator coordinates these phases, tracking progress and handling failures automatically.

Use /sparc for:
- Complex feature implementations
- Large refactoring projects
- New system components
- Multi-agent workflows requiring structured approach

Use the Task tool to launch the sparc-orchestrator with the following task:

$ARGUMENTS
