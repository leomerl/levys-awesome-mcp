# Simulate SPARC Orchestration

## Description
This dev command simulates a complete SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) orchestration workflow to validate the sparc-orchestrator agent's behavior. It creates a test task, executes it through all SPARC phases, and validates:
- Correct phase sequencing and execution
- Proper handoffs between phases
- Report generation at each phase
- Success criteria achievement across all phases
- Absence of unexpected behaviors or inconsistencies

All outputs are written to git-ignored directories (reports/, plan_and_progress/, output_streams/) to avoid polluting the source code.

## Task
Create a complete feature following SPARC methodology in the test-projects/ directory (git-ignored). The task should:
1. **Phase 0 - Research**: Research best practices for user authentication
2. **Phase 1 - Specification**: Define functional and non-functional requirements
3. **Phase 2 - Pseudocode**: Design high-level algorithms and test strategy
4. **Phase 3 - Architecture**: Create detailed component and data architecture
5. **Phase 4 - Refinement**: Implement TDD with parallel development tracks
6. **Phase 5 - Completion**: Perform final integration, testing, and documentation

## Test Feature Requirements
Build a simple user login feature with:
- Frontend login form component (test-projects/frontend/LoginForm.tsx)
- Backend authentication endpoint (test-projects/backend/auth.ts)
- Unit tests for both components
- Integration tests for the authentication flow

## Validation Criteria
After SPARC orchestration completes, validate:

### Phase 0 - Research & Discovery
1. **Research Report Exists**: Check reports/SESSION_ID/sparc-research-agent-summary.json
2. **Research Findings**: Verify domain analysis, tech stack recommendations, competitive analysis
3. **Implementation Patterns**: Ensure research includes relevant patterns and best practices

### Phase 1 - Specification
1. **Specification Report Exists**: Check reports/SESSION_ID/specification-agent-summary.json
2. **Functional Requirements**: Verify user stories, acceptance criteria defined
3. **Non-Functional Requirements**: Check performance, security, scalability specs
4. **API Contracts**: Validate endpoint definitions and data schemas

### Phase 2 - Pseudocode
1. **Pseudocode Report Exists**: Check reports/SESSION_ID/pseudocode-agent-summary.json
2. **Algorithm Design**: Verify high-level algorithm descriptions
3. **Test Strategy**: Ensure comprehensive test approach defined
4. **Data Flow**: Check system interaction diagrams

### Phase 3 - Architecture
1. **Architecture Report Exists**: Check reports/SESSION_ID/architecture-agent-summary.json
2. **Component Design**: Verify frontend/backend component specifications
3. **Data Architecture**: Check database schemas, data models
4. **Infrastructure**: Validate deployment and infrastructure design

### Phase 4 - Refinement (TDD Implementation)
1. **Refinement Report Exists**: Check reports/SESSION_ID/refinement-agent-summary.json
2. **Parallel Development**: Verify backend, frontend, and integration tracks
3. **Test Coverage**: Ensure unit and integration tests implemented
4. **Code Quality**: Check that implementation follows TDD principles

### Phase 5 - Completion
1. **Completion Report Exists**: Check reports/SESSION_ID/completion-agent-summary.json
2. **Files Created**: Verify test-projects/frontend/LoginForm.tsx and test-projects/backend/auth.ts exist
3. **Tests Passing**: Ensure all unit and integration tests pass
4. **Documentation**: Check that README and API docs generated
5. **Build Success**: Validate that build and lint checks pass

### Overall Validation
1. **All Phase Reports**: Verify reports from all 6 phases exist
2. **Phase Sequencing**: Ensure phases executed in correct order (0→1→2→3→4→5)
3. **No Phase Skipped**: Confirm no SPARC phases were bypassed
4. **Handoff Quality**: Validate that each phase's output properly informed the next phase
5. **Final Success**: Ensure deliverables meet all specifications from Phase 1

## Expected Behavior
- sparc-orchestrator invokes sparc-research-agent (Phase 0)
- sparc-research-agent provides domain analysis and tech recommendations
- specification-agent extracts requirements (Phase 1)
- pseudocode-agent designs algorithms and test strategy (Phase 2)
- architecture-agent creates detailed system design (Phase 3)
- refinement-agent implements with TDD in parallel tracks (Phase 4)
- completion-agent performs final integration and testing (Phase 5)
- All phase reports generated in reports/SESSION_ID/
- Final summary shows successful SPARC workflow completion

## Failure Detection
Report any of the following as failures:
- Missing phase reports (any of the 6 phases)
- Phases executed out of order
- Any phase skipped or bypassed
- Missing plan or progress files
- Tasks marked as "failed" in progress file
- Expected files not created in test-projects/
- Tests failing in Phase 5
- Build or lint failures in Phase 5
- Reports with unexpected structure or missing fields
- Poor handoff quality between phases (e.g., Phase 3 doesn't use Phase 2 output)
- Incomplete specifications or architecture
- Refinement phase not following TDD methodology
- Missing documentation in completion phase

## Cleanup
After validation, optionally clean up:
- test-projects/frontend/LoginForm.tsx
- test-projects/backend/auth.ts
- Related test files
- Session reports (keep for debugging if failures detected)

## Usage
This command should:
1. Generate a unique session ID
2. Invoke the sparc-orchestrator with the test task
3. Wait for all 6 phases to complete
4. Validate all phase reports and success criteria
5. Report findings with clear pass/fail status for each phase
6. Provide detailed failure analysis if issues found
7. Show phase-by-phase execution timeline and handoffs

## Success Metrics
- All 6 phase reports generated ✓
- Phases executed in correct sequence ✓
- All deliverables created ✓
- Tests passing ✓
- Build and lint successful ✓
- Documentation complete ✓
- No unexpected failures ✓
