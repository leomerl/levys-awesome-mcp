---
description: Execute SPARC workflow for complex tasks
argument-hint: [task-description]
---

Invoke the sparc-orchestrator agent using the invoke_agent mcp tool to execute the complete SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) workflow.

IMPORTANT: The sparc-orchestrator will:
1. **Phase 0 - Research**: Invoke research-agent to understand the codebase and requirements
2. **Phase 1 - Specification**: Invoke specification-agent to create detailed specifications
3. **Phase 2 - Pseudocode**: Invoke pseudocode-agent for high-level architectural design
4. **Phase 3 - Architecture**: Invoke architecture-agent for detailed technical design
5. **Phase 4 - Refinement**: Invoke refinement-agent for TDD implementation
6. **Phase 5 - Completion**: Invoke completion-agent for final integration and deployment

The orchestrator coordinates these phases sequentially, tracking progress and handling failures automatically.

Use this command for:
- Complex feature implementations
- Large refactoring projects
- New system components
- Multi-agent workflows requiring structured approach

The task: $ARGUMENTS
