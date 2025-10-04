# Orchestration Workflows

This document describes the orchestration workflows supported by Levy's Awesome MCP.

## Table of Contents
- [Simple Orchestration Workflow](#simple-orchestration-workflow)
- [Test Orchestration Workflow](#test-orchestration-workflow)
- [SPARC Orchestration Workflow](#sparc-orchestration-workflow)

---

## Simple Orchestration Workflow

The standard orchestration workflow coordinates specialized agents to automate the entire development lifecycle with strict task-by-task execution, automated progress tracking, and intelligent feedback loops.

### Core Principles

**ONE TASK AT A TIME**: The orchestrator MUST invoke agents with exactly ONE task from the plan
- Each agent invocation corresponds to a single task
- Only specific task details are passed to the agent
- Progress is updated after each task completion
- Multiple tasks are NEVER batched in a single invocation
- The entire plan is NEVER passed to an agent

**COMPLETE, WORKING, VALIDATED OUTPUT**: The orchestrator delivers finished, validated products
- Execute ALL tasks from the plan, even if some fail (use self-healing)
- If task fails after retries, CONTINUE with remaining tasks
- ALWAYS run validation phases (reviewer, builder, linter, testing)
- Present comprehensive status: what works, what's validated, what failed
- Use self-healing (up to 2 retries per task) to maximize success rate

### Workflow Phases

#### 1. Planning Phase (MANDATORY FIRST STEP)
- **Always begins** by invoking the `planner-agent` (Opus model)
- **Planner analyzes** requirements and creates detailed execution plan
- **Plan includes**:
  - Task breakdown with unique IDs (TASK-001, TASK-002, etc.)
  - Dependencies between tasks
  - Agent assignments for each task
  - Files to be modified
- **Orchestrator retrieves** plan using `get_plan` (NOT get_summary)
- **Only proceeds** to development after analyzing the plan

#### 2. Session Management
- **Session ID Generation**: Creates unique ID in format `YYYYMMDD-HHMMSS`
  - Example: `20250830-153642`
  - No prefixes like "build-lint-"
- **Consistent Tracking**: Session ID used throughout entire workflow
- **Report Location**: All outputs stored in `/reports/${session_ID}/`

#### 3. Task-by-Task Development Phase

For each task in sequence:
1. **Check dependencies** are completed
2. **Identify designated agent** (backend-agent, frontend-agent, etc.)
3. **Extract ONLY that task's** description and requirements
4. **Invoke agent with**:
   - Single task description
   - `taskNumber` parameter (e.g., 1 for TASK-001)
   - `sessionId` for progress tracking
   - Session ID for report generation
5. **Wait for completion**
6. **Retrieve summary** using `get_summary`
7. **Check for failures** using `get_failed_tasks`
8. **Self-heal if needed**:
   - Analyze failure_reason
   - If self_heal_attempts < 2: retry with correct agent/approach
   - If self_heal_attempts >= 2: log failure and continue
   - Update self_heal_history with retry details
9. **Only then proceed** to next task

#### 4. Review Phase
- **Invokes `reviewer-agent`** after ALL development tasks complete
- **Validates** plan vs progress, checks goal achievement
- **Reads** reviewer's summary for acceptance status
- **Triggers review feedback loop** if status is REJECTED or issues found

#### 5. Review Feedback Loop
Based on reviewer's analysis:
- **If REJECTED or requiresFeedbackLoop**:
  - Analyze criticalTasks and immediate_fixes
  - Re-invoke appropriate development agents with fixes (ONE task at a time)
  - After fixes, re-run reviewer-agent to validate
  - Maximum 2 review cycles
- **If ACCEPTED**: Proceed to build phase

#### 6. Build Phase
- **Invokes `builder-agent`** to compile and verify changes
- **Build status** determines if workflow continues
- **Failure handling**: Continues to validation even if build has issues

#### 7. Quality Assurance Phase
- **Invokes `linter-agent`** for code quality analysis
- **Style enforcement** and best practices validation
- **Categorizes issues** by severity (error/warning/info)
- **Continues to testing** even if linting has warnings

#### 8. Testing Phase
- **Invokes `testing-agent`** for comprehensive testing
- **Executes** unit, integration, and e2e tests
- **Analyzes** test failures and coverage metrics
- **Generates** `orchestratorInstructions.nextActions`

#### 9. Testing Feedback Loop
Based on testing agent's `orchestratorInstructions.nextActions`:
- **High-priority fixes**: Initiates feedback loop to development
- **Medium/low priority**: Documents for future iterations
- **No issues**: Workflow completes successfully
- Maximum 2 feedback cycles to prevent infinite loops

#### 10. Result Aggregation (MANDATORY)
- **Read all reports** from `/reports/${session_ID}/`
- **Read final progress file** to identify completed vs failed tasks
- **Use compare_plan_progress** to check overall completion
- **Present comprehensive summary**:
  - Development Status: Success/Partial/Failure with task counts
  - Tasks Completed vs Tasks Failed (with reasons)
  - Self-Healing Applied: retry count + success rate
  - Development Changes
  - Build Status & Details
  - Lint Status & Issues
  - Testing Results & Metrics
  - Feedback Loops Executed
  - Recommendations

### Task Routing Logic

**Backend Tasks (backend-agent)**:
- API endpoints and routes
- Database models and migrations
- Server middleware and authentication
- Backend configuration files
- Keywords: "API", "endpoint", "database", "server", "backend"

**Frontend Tasks (frontend-agent)**:
- React components and hooks
- UI styling and layouts
- Client-side state management
- Frontend routing and navigation
- Keywords: "component", "UI", "frontend", "React", "style"

**Full-Stack Tasks**:
- Invokes both backend and frontend agents
- Complete features spanning multiple layers
- End-to-end user flows

### Self-Healing Workflow

After EACH task completion:
1. **Check for failures** using `get_failed_tasks` with sessionId
2. **For each failed task found**:
   - Check self_heal_attempts (maximum 2 retries per task)
   - Analyze failure_reason:
     - **Wrong agent invoked**: Re-invoke with correct designated_agent
     - **Permission/scope issue**: Invoke planner-agent to revise
     - **Code/logic error**: Re-invoke same agent with additional context
     - **Unknown failure**: Retry once, then mark for human review
   - When retrying, add self_heal_history entry with attempt, action, timestamp, reason
   - After retry, update progress file with incremented self_heal_attempts
3. **If task fails after 2 retries**: CONTINUE with remaining tasks (don't stop!)
4. **Validation is mandatory**: Always run reviewer-agent after development

### Execution Workflow Summary

```
1. Planning Phase (MANDATORY)
   └─ Invoke planner-agent (Opus)
           ↓
2. Retrieve & Analyze Plan
   └─ Use get_plan
           ↓
3. Generate Session ID
   └─ Format: YYYYMMDD-HHMMSS
           ↓
4. Task-by-Task Development [For each task]
   ├─ Check dependencies
   ├─ Invoke designated agent with single task
   ├─ Retrieve summary
   ├─ Check for failures (get_failed_tasks)
   ├─ Self-heal if needed (max 2 retries)
   ├─ Auto-update progress
   └─ Continue to next task (even if current failed)
           ↓
5. Review Phase
   └─ Invoke reviewer-agent
           ↓
6. Review Feedback Loop (if needed)
   └─ Max 2 cycles
           ↓
7. Build Phase
   └─ Invoke builder-agent
           ↓
8. Quality Phase
   └─ Invoke linter-agent
           ↓
9. Testing Phase
   └─ Invoke testing-agent
           ↓
10. Testing Feedback Loop (if needed)
    └─ Max 2 cycles
           ↓
11. Result Aggregation (MANDATORY)
    └─ Present complete status report
```

### Key Features

- **Mandatory Planning**: Always starts with planner agent
- **Atomic Task Execution**: One task per agent invocation
- **Self-Healing**: Automatic retry with correct agents (max 2 attempts)
- **Continue on Failure**: Never stop mid-workflow
- **Mandatory Validation**: Always run all validation phases
- **Automated Progress**: Built-in progress tracking system
- **Session Management**: Consistent ID throughout workflow
- **Report-Driven Decisions**: JSON reports guide workflow
- **Intelligent Feedback Loops**: Maximum 2 cycles for fixes
- **Strict Sequential Execution**: No parallel agent invocations
- **Comprehensive Error Handling**: Graceful failure management

---

## Test Orchestration Workflow

A comprehensive, multi-layered testing strategy that ensures complete test coverage across all testing dimensions through specialized test agents.

### Core Architecture

**Orchestration Strategy**:
- **Sequential Mode**: Ordered execution when tests have dependencies
- **Parallel Mode**: Maximizes efficiency for independent test creation
- **Hybrid Mode**: Combines both based on dependency graph analysis

### Phase 1: Test Planning (MANDATORY FIRST STEP)

#### Test Planner Agent (Opus Model)
Analyzes the codebase and requirements to create a comprehensive test strategy.

**Planning Process**:

1. **Codebase Analysis**:
   - Examines recent changes and modifications
   - Identifies critical code paths and dependencies
   - Maps component relationships and interactions
   - Analyzes existing test coverage gaps

2. **Test Strategy Development**:
   - Determines test types needed (unit, integration, e2e, golden, playwright)
   - Identifies priority areas requiring extensive testing
   - Establishes coverage goals for each component
   - Defines test boundaries and scope

3. **Task Breakdown**:
   - Creates detailed tasks for each test agent
   - Assigns unique identifiers (TEST-TASK-001, TEST-TASK-002, etc.)
   - Establishes dependencies between test tasks
   - Maps files and components to specific test types

4. **Resource Allocation**:
   - Determines sequential vs parallel execution strategy
   - Estimates time requirements for each phase
   - Identifies potential bottlenecks
   - Suggests optimization opportunities

**Test Plan Structure** saved to `plan_and_progress/test_${git_hash}/`:
```json
{
  "testPlan": {
    "planId": "TEST-PLAN-20250114-120000",
    "gitCommitHash": "a3f5b2c",
    "synopsis": "Comprehensive test coverage for user authentication feature",
    "scope": {
      "components": ["auth-service", "user-api", "login-ui"],
      "testTypes": ["unit", "integration", "e2e", "golden"],
      "priorityLevel": "high"
    },
    "tasks": [
      {
        "id": "TEST-TASK-001",
        "type": "unit",
        "designatedAgent": "unit-tests-agent",
        "description": "Create unit tests for authentication service validators",
        "targetFiles": ["src/services/auth/validator.ts"],
        "dependencies": [],
        "estimatedTests": 25,
        "priority": "high"
      }
    ],
    "executionStrategy": {
      "phase1": {
        "parallel": ["TEST-TASK-001", "TEST-TASK-003"],
        "sequential": ["TEST-TASK-002", "TEST-TASK-004"]
      },
      "estimatedDuration": "45 minutes",
      "parallelizationLevel": 3
    },
    "coverageTargets": {
      "overall": 85,
      "unit": 90,
      "integration": 80,
      "e2e": 70
    }
  }
}
```

### Phase 2: Test Creation Pipeline

#### Specialized Test Agents

**1. Unit Tests Agent**
- Scope: Single functions, classes, methods
- Coverage Goals: 100% of public APIs
- Test Patterns: Happy path, edge cases, error handling, input validation
- Output: `unit-tests.json` with test metadata

**2. Integration Tests Agent**
- Scope: Module interfaces, service integrations
- Coverage Goals: All critical integration points
- Test Patterns: Component communication, data transformation, service layers
- Output: `integration-tests.json`

**3. E2E Test Agent**
- Scope: Full application workflows from UI to backend
- Coverage Goals: All critical user journeys
- Test Patterns: Authentication flows, CRUD operations, multi-step processes
- Output: `e2e-tests.json`

**4. Golden Tests Agent**
- Scope: Output validation, API responses, UI rendering
- Coverage Goals: All stable outputs requiring consistency
- Test Patterns: API response snapshots, generated file validation, UI snapshots
- Output: `golden-tests.json`

**5. Playwright Agent**
- Scope: Browser automation and visual regression
- Coverage Goals: All user-facing interfaces
- Test Patterns: Cross-browser testing, visual regression, accessibility, performance
- Output: `playwright-tests.json`

### Phase 3: Validation Pipeline (Parallel Execution)

**Test Validator Agent**:
- Test naming conventions
- Assertion quality and coverage
- Test isolation and independence
- Proper setup/teardown implementation
- Output: `validation-report.json`

**Code Coverage Agent**:
- Line coverage (target: >80%)
- Branch coverage (target: >75%)
- Function coverage (target: >85%)
- Statement coverage (target: >80%)
- Identifies uncovered code paths, missing edge cases, dead code
- Output: `coverage-report.json`

**Mock Detector Agent**:
- Detects mock library imports, stubs/spies, fake implementations
- Zero-mock policy for integration tests
- Minimal mocks for unit tests
- Real service usage in E2E tests
- Output: `mock-detection-report.json`

### Phase 4: Remediation Loop

1. **Issue Prioritization**:
   - High: Blocking issues (mocks in integration tests, <60% coverage)
   - Medium: Quality issues (naming conventions, missing assertions)
   - Low: Optimization opportunities

2. **Task Assignment**:
   - Maps each issue to responsible test agent
   - Creates TASK-XXX identifiers for tracking
   - Establishes dependencies between fixes

3. **Progress Tracking**:
   - Uses `plan_and_progress/` directory
   - Monitors fix completion status
   - Validates fixes don't introduce new issues

### Phase 5: Test Execution Pipeline

**Test Executor Agent**:
1. Pre-execution validation (environment, dependencies, database state)
2. Execution order: unit → integration → e2e → golden → playwright
3. Failure handling: immediate logging, categorization, retry logic

### Phase 6: Failure Resolution Loop

1. **Failure Analysis**: Categorize failure type, identify code areas, determine complexity
2. **Agent Re-invocation**: Pass specific failure context with error messages
3. **Fix Validation**: Re-run affected tests, then full suite
4. **Termination Criteria**: All tests passing OR max 3 iterations OR manual intervention needed

### Directory Structure

```
plan_and_progress/
└── test_${git_hash}/
    ├── test-plan.json
    └── progress.json

reports/
└── TEST-20250114-113000/
    ├── phase1-planning/
    │   └── test-planner-summary.json
    ├── phase2-creation/
    │   ├── unit-tests.json
    │   ├── integration-tests.json
    │   ├── e2e-tests.json
    │   ├── golden-tests.json
    │   └── playwright-tests.json
    ├── phase3-validation/
    │   ├── validation-report.json
    │   ├── coverage-report.json
    │   └── mock-detection-report.json
    ├── phase4-remediation/
    │   └── remediation-plan.json
    ├── phase5-execution/
    │   └── execution-report.json
    └── phase6-resolution/
        └── resolution-summary.json
```

### Success Criteria

The workflow completes successfully when:
1. All test types have been created
2. Coverage targets are met (>80% overall)
3. No mocks detected in integration/E2E tests
4. All tests pass execution
5. No high-severity issues remain
6. Complete documentation generated

### Configuration Options

```json
{
  "parallelization": {
    "creationPhase": true,
    "validationPhase": true,
    "maxConcurrentAgents": 5
  },
  "coverage": {
    "lineTarget": 80,
    "branchTarget": 75,
    "functionTarget": 85,
    "statementTarget": 80
  },
  "retries": {
    "flakyTestRetries": 3,
    "fixAttempts": 3,
    "validationRetries": 2
  },
  "timeouts": {
    "agentInvocation": 300000,
    "testExecution": 600000,
    "totalWorkflow": 3600000
  }
}
```

### Key Features

- **Mandatory Test Planning**: Always starts with Opus-powered test planner
- **Multi-Agent Coordination**: Specialized agents for each test type
- **Comprehensive Validation**: Three-layer validation system
- **Zero-Mock Enforcement**: Ensures tests validate real behavior
- **Automated Remediation**: Self-healing test creation
- **Progressive Execution**: Fail-fast with detailed diagnostics
- **Complete Traceability**: Full audit trail of all operations
- **Parallel Processing**: Optimized execution where possible
- **Intelligent Retry Logic**: Handles transient failures gracefully

---

## SPARC Orchestration Workflow

The SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) workflow is a structured, research-driven approach to software development that emphasizes comprehensive planning, TDD implementation, and parallel execution.

### Overview

SPARC is a 6-phase methodology (including Phase 0: Research) that ensures thorough analysis, robust design, and high-quality implementation through systematic progression and continuous validation.

### Phase 0: Research & Discovery

**Purpose**: Comprehensive domain research and technology analysis before specification

**Parallel Research Tracks**:
1. **Domain Research**: Understanding problem space and user needs
2. **Technology Stack Analysis**: Best practices, framework comparisons, tool evaluation
3. **Implementation Patterns**: Code examples, architectural patterns, design patterns
4. **Competitive Analysis**: Existing solutions, industry trends, market research

**Tools Used**:
- `WebSearch` - Domain research and competitive analysis
- `WebFetch` - Documentation gathering and pattern research
- `Read` + `Glob` - Codebase analysis and pattern detection
- `Grep` - Code search and analysis

**Deliverables**:
- Technology stack recommendations
- Implementation pattern library
- Competitive landscape analysis
- Domain knowledge documentation

### Phase 1: Specification

**Purpose**: Define requirements, constraints, and success criteria

**Activities**:
1. **Requirements Analysis**:
   - Functional requirements extraction
   - Non-functional requirements (performance, security, scalability)
   - User stories with acceptance criteria
   - System boundaries and interfaces

2. **Technical Constraints**:
   - Technology stack decisions
   - Deployment requirements
   - Integration constraints
   - Compliance requirements

3. **Performance Targets**:
   - SLA definitions
   - Scalability goals
   - Response time requirements
   - Throughput targets

**Agent**: `planner-agent` (Opus) for superior analytical capabilities

**Tools Used**:
- `Read`, `Glob`, `Grep` - Codebase analysis
- `WebSearch`, `WebFetch` - Research and best practices
- `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan` - Generate execution plan

**Deliverables**:
- Detailed specification document
- User stories and acceptance criteria
- Technical constraints documentation
- Performance requirements specification

### Phase 2: Pseudocode

**Purpose**: Break down approach into logical steps and algorithms

**Activities**:
1. **High-Level Architecture**:
   - Major components identification
   - Data flow design
   - Integration points mapping
   - API contract definitions

2. **Algorithm Design**:
   - Core business logic pseudocode
   - Optimization strategies
   - Data structure selection
   - Complexity analysis

3. **Test Strategy**:
   - TDD approach planning
   - Test coverage goals (100%)
   - Test types (unit, integration, e2e)
   - Mock strategy (zero-mock for integration)

4. **Error Handling**:
   - Recovery strategies
   - Validation algorithms
   - Fallback mechanisms
   - Logging and monitoring approach

**Agent**: `planner-agent` continues specification into pseudocode

**Tools Used**:
- `Read`, `Grep` - Pattern analysis
- `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan` - Task breakdown with pseudocode

**Deliverables**:
- Algorithm pseudocode
- Component interaction diagrams
- Test strategy document
- Error handling specifications

### Phase 3: Architecture

**Purpose**: Detailed design of all system components

**Architecture Layers**:

1. **Component Architecture**:
   - Detailed component specifications
   - Interface definitions
   - Dependency injection patterns
   - Module boundaries

2. **Data Architecture**:
   - Database schema design
   - Data access patterns
   - Caching strategy
   - Data migration approach

3. **Infrastructure Architecture**:
   - Deployment topology
   - CI/CD pipeline design
   - Scaling strategy
   - Disaster recovery

4. **Security Architecture**:
   - Authentication/authorization
   - Access controls
   - Encryption strategy
   - Compliance requirements

**Agent**: `planner-agent` creates detailed architecture plan

**Tools Used**:
- `Read`, `Glob`, `Grep` - Existing architecture analysis
- `WebFetch` - Best practices research
- `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan` - Architecture task breakdown

**Deliverables**:
- Architecture documentation
- Component diagrams
- Database schema
- Infrastructure specifications
- Security documentation

### Phase 4: Refinement (TDD Implementation)

**Purpose**: Implement with Test-Driven Development and continuous quality assurance

**Parallel Development Tracks**:

**Track 1: Backend Development (TDD London School)**
- Agent: `backend-agent`
- Tools: `mcp__levys-awesome-mcp__mcp__content-writer__backend_write`
- Approach: Red-Green-Refactor cycles
- Testing: Behavior-driven with real implementations

**Track 2: Frontend Development (TDD)**
- Agent: `frontend-agent`
- Tools: `mcp__levys-awesome-mcp__mcp__content-writer__frontend_write`
- Approach: Component testing with user interaction focus
- Testing: Integration tests with real DOM

**Track 3: Integration & QA**
- Agent: `testing-agent`
- Tools: `mcp__levys-awesome-mcp__mcp__test-executor__run_tests`, `mcp__levys-awesome-mcp__mcp__test-executor__validate_and_run_tests`
- Approach: End-to-end testing with real services
- Testing: Zero-mock integration tests

**Quality Gates** (Parallel Execution):

```json
{
  "qualityChecks": [
    {
      "tool": "mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript",
      "agent": "linter-agent",
      "parameters": {"fix": true, "path": "."}
    },
    {
      "tool": "mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan",
      "agent": "linter-agent",
      "parameters": {"type": "all"}
    },
    {
      "tool": "mcp__levys-awesome-mcp__mcp__code-analyzer__code_quality_scan",
      "agent": "linter-agent",
      "parameters": {"path": "."}
    },
    {
      "tool": "mcp__levys-awesome-mcp__mcp__test-executor__run_tests",
      "agent": "testing-agent",
      "parameters": {"coverage": true, "framework": "all"}
    }
  ]
}
```

**Performance Optimization**:
- Benchmarking critical paths
- Profiling and optimization
- Load testing
- Performance monitoring setup

**Development Standards**:
- **Modularity**: Files ≤ 500 lines, functions ≤ 50 lines
- **Security**: No hardcoded secrets, comprehensive input validation
- **Testing**: 100% test coverage with TDD London School approach
- **Documentation**: Self-documenting code with strategic comments
- **Performance**: Optimized critical paths with benchmarking

### Phase 5: Completion

**Purpose**: Integration, validation, and production deployment

**Activities**:

1. **System Integration**:
   - Agent: `testing-agent`
   - Tool: `mcp__levys-awesome-mcp__mcp__test-executor__validate_and_run_tests`
   - End-to-end testing
   - Integration validation
   - Requirement verification

2. **Build Verification**:
   - Agent: `builder-agent`
   - Tools:
     - `mcp__levys-awesome-mcp__mcp__build-executor__build_project`
     - `mcp__levys-awesome-mcp__mcp__build-executor__build_backend`
     - `mcp__levys-awesome-mcp__mcp__build-executor__build_frontend`
   - Compilation verification
   - Asset optimization
   - Build artifact validation

3. **Documentation**:
   - Agent: Specialized documentation agent or orchestrator
   - API documentation generation
   - Deployment guides
   - Operational runbooks
   - Architecture documentation

4. **Production Readiness**:
   - Agent: `linter-agent` for final validation
   - Tools:
     - `mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan` - Final security review
     - `mcp__levys-awesome-mcp__mcp__code-analyzer__dependency_check` - Dependency audit
   - Monitoring setup
   - Alerting configuration
   - Incident response procedures

5. **Deployment**:
   - Automated deployment scripts
   - Environment validation
   - Smoke tests
   - Rollback procedures

### Tool Utilization Matrix

| Phase | Primary Tools | Agents | Purpose |
|-------|---------------|--------|---------|
| Phase 0 | `WebSearch`, `WebFetch`, `Read`, `Grep` | planner-agent | Research & Discovery |
| Phase 1 | `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan` | planner-agent | Specification |
| Phase 2 | `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan` | planner-agent | Pseudocode & Design |
| Phase 3 | `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan` | planner-agent | Architecture |
| Phase 4 | `mcp__levys-awesome-mcp__mcp__content-writer__backend_write`<br>`mcp__levys-awesome-mcp__mcp__content-writer__frontend_write`<br>`mcp__levys-awesome-mcp__mcp__test-executor__run_tests`<br>`mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript` | backend-agent<br>frontend-agent<br>testing-agent<br>linter-agent | TDD Implementation |
| Phase 5 | `mcp__levys-awesome-mcp__mcp__build-executor__build_project`<br>`mcp__levys-awesome-mcp__mcp__test-executor__validate_and_run_tests`<br>`mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan` | builder-agent<br>testing-agent<br>linter-agent | Integration & Deployment |

### Parallel Execution Strategy

**Research Phase** (Phase 0):
```
Parallel Research:
├─ WebSearch("domain research")
├─ WebFetch("technology analysis")
├─ WebSearch("competitive landscape")
└─ WebFetch("implementation patterns")
```

**Development Phase** (Phase 4):
```
Concurrent Tracks:
├─ Track 1: Backend TDD (backend-agent)
│   └─ mcp__levys-awesome-mcp__mcp__content-writer__backend_write
├─ Track 2: Frontend TDD (frontend-agent)
│   └─ mcp__levys-awesome-mcp__mcp__content-writer__frontend_write
└─ Track 3: Integration QA (testing-agent)
    └─ mcp__levys-awesome-mcp__mcp__test-executor__run_tests
```

**Quality Assurance** (Phase 4 & 5):
```
Parallel QA:
├─ mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript (linter-agent)
├─ mcp__levys-awesome-mcp__mcp__test-executor__run_tests --coverage (testing-agent)
├─ mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan (linter-agent)
└─ mcp__levys-awesome-mcp__mcp__code-analyzer__code_quality_scan (linter-agent)
```

### Commit Convention

- `feat:` - New features and major functionality
- `test:` - Test implementation and coverage improvements
- `fix:` - Bug fixes and issue resolution
- `docs:` - Documentation updates and improvements
- `arch:` - Architectural changes and design updates
- `quality:` - Code quality improvements and refactoring
- `deploy:` - Deployment and infrastructure changes

### Success Criteria

The SPARC workflow completes successfully when:

- ✅ **100% Test Coverage**: All code covered by comprehensive tests (unit, integration, e2e)
- ✅ **Quality Gates Passed**: All linting, security, and performance validation complete
- ✅ **Zero-Mock Integration**: Integration tests use real implementations
- ✅ **Production Deployment**: Successful deployment with monitoring and alerting
- ✅ **Documentation Complete**: Comprehensive API docs, deployment guides, and runbooks
- ✅ **Security Validated**: All security scans passed, no vulnerabilities
- ✅ **Performance Optimized**: Benchmarks meet or exceed targets
- ✅ **Build Successful**: All build steps complete without errors

### SPARC Workflow Execution

```
Phase 0: Research & Discovery
├─ Parallel web research (WebSearch, WebFetch)
├─ Technology stack analysis
├─ Implementation patterns research
└─ Competitive analysis
         ↓
Phase 1: Specification
├─ Requirements analysis (planner-agent)
├─ User stories and acceptance criteria
├─ Technical constraints documentation
└─ Performance targets definition
         ↓
Phase 2: Pseudocode
├─ High-level architecture design
├─ Algorithm pseudocode
├─ Test strategy (TDD planning)
└─ Error handling specifications
         ↓
Phase 3: Architecture
├─ Component architecture (planner-agent)
├─ Data architecture
├─ Infrastructure architecture
└─ Security architecture
         ↓
Phase 4: Refinement (TDD Implementation)
├─ Parallel Development Tracks:
│   ├─ Backend TDD (backend-agent)
│   ├─ Frontend TDD (frontend-agent)
│   └─ Integration QA (testing-agent)
├─ Quality Gates (Parallel):
│   ├─ Linting (linter-agent)
│   ├─ Security scanning (linter-agent)
│   ├─ Testing (testing-agent)
│   └─ Code quality (linter-agent)
└─ Performance optimization
         ↓
Phase 5: Completion
├─ System integration (testing-agent)
├─ Build verification (builder-agent)
├─ Documentation generation
├─ Production readiness check (linter-agent)
└─ Automated deployment
         ↓
Success: Validated, tested, documented, deployed ✅
```

### Key Differentiators

**SPARC vs Simple Orchestration**:
- ✅ Explicit research phase (Phase 0)
- ✅ Structured pseudocode design phase
- ✅ Comprehensive architecture documentation
- ✅ TDD London School approach (behavior-driven)
- ✅ Zero-mock integration testing
- ✅ Parallel development tracks
- ✅ 100% test coverage requirement
- ✅ Performance benchmarking

**When to Use SPARC**:
- Complex, greenfield projects requiring thorough planning
- Projects with strict quality/security requirements
- Systems requiring comprehensive documentation
- High-performance applications
- Mission-critical applications
- Long-term maintainable codebases

**When to Use Simple Orchestration**:
- Quick features or bug fixes
- Well-understood problem domains
- Iterative improvements to existing code
- Prototypes and MVPs
- Time-sensitive deliverables
