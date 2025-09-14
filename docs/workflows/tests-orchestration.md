# Test Orchestration Workflow

## Overview
The Test Orchestration workflow implements a comprehensive, multi-layered testing strategy that ensures complete test coverage across all testing dimensions. Unlike the simple orchestration workflow which uses a single testing-agent, this workflow coordinates multiple specialized test agents to create, validate, and execute different types of tests systematically.

## Core Architecture

### Orchestration Strategy
The test orchestrator manages a sophisticated pipeline of specialized agents, each responsible for a specific testing domain. The workflow supports both sequential and parallel execution patterns based on task dependencies and system resources.

**Execution Modes:**
- **Sequential Mode**: Ensures ordered execution when tests have dependencies
- **Parallel Mode**: Maximizes efficiency for independent test creation tasks
- **Hybrid Mode**: Combines both strategies based on dependency graph analysis

## Phase 1: Test Planning Phase (MANDATORY FIRST STEP)

### Test Planner Agent (Opus Model)
**Purpose**: Analyzes the codebase and requirements to create a comprehensive test strategy and execution plan

This is the **MANDATORY FIRST STEP** in the test orchestration workflow. The Test Planner Agent uses the Opus model for its superior analytical and planning capabilities.

#### Planning Process

1. **Codebase Analysis**:
   - Examines recent changes and modifications
   - Identifies critical code paths and dependencies
   - Maps component relationships and interactions
   - Analyzes existing test coverage gaps

2. **Test Strategy Development**:
   - Determines which test types are needed (unit, integration, e2e, golden, playwright)
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

#### Test Plan Structure
The test planner generates a comprehensive plan saved to `plan_and_progress/test_${git_hash}/`:

```json
{
  "testPlan": {
    "planId": "TEST-PLAN-20250114-120000",
    "gitCommitHash": "a3f5b2c",
    "timestamp": "2025-01-14T12:00:00Z",
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
        "targetFiles": [
          "src/services/auth/validator.ts",
          "src/services/auth/tokenGenerator.ts"
        ],
        "dependencies": [],
        "estimatedTests": 25,
        "priority": "high"
      },
      {
        "id": "TEST-TASK-002",
        "type": "integration",
        "designatedAgent": "integration-tests-agent",
        "description": "Test authentication flow with database interactions",
        "targetFiles": [
          "src/api/auth/login.ts",
          "src/database/userRepository.ts"
        ],
        "dependencies": ["TEST-TASK-001"],
        "estimatedTests": 15,
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

#### Critical Planning Rules

1. **Mandatory Invocation**: The test orchestrator MUST always begin by invoking the test-planner-agent
2. **Plan Retrieval**: Use `get_plan` to retrieve the test plan from `plan_and_progress/test_${git_hash}/`
3. **Plan Analysis**: Parse and validate the plan before proceeding to test creation
4. **No Skipping**: NEVER skip the planning phase, even for simple test requirements
5. **Single Source of Truth**: The plan becomes the authoritative guide for all subsequent phases

#### Planner Agent Invocation Example

```
"Analyze the codebase and create a comprehensive test plan for [specific feature/requirement].
Identify all components requiring testing, determine appropriate test types,
and create a detailed task breakdown with dependencies.
Focus on achieving maximum coverage while maintaining test quality.
SESSION_ID: TEST-20250114-120000"
```

## Phase 2: Test Creation Pipeline

### Specialized Test Agents

#### 1. Unit Tests Agent
**Purpose**: Creates isolated tests for individual functions and components
- **Scope**: Single functions, classes, methods
- **Coverage Goals**: 100% of public APIs
- **Test Patterns**:
  - Happy path scenarios
  - Edge cases and boundary conditions
  - Error handling and exceptions
  - Input validation
- **Output**: `unit-tests.json` with test metadata

#### 2. Integration Tests Agent
**Purpose**: Tests interactions between multiple components
- **Scope**: Module interfaces, service integrations
- **Coverage Goals**: All critical integration points
- **Test Patterns**:
  - Component communication flows
  - Data transformation pipelines
  - Service layer interactions
  - Database transactions
- **Output**: `integration-tests.json` with test metadata

#### 3. E2E Test Agent
**Purpose**: Validates complete user workflows
- **Scope**: Full application workflows from UI to backend
- **Coverage Goals**: All critical user journeys
- **Test Patterns**:
  - User authentication flows
  - CRUD operations
  - Multi-step processes
  - Cross-browser compatibility
- **Output**: `e2e-tests.json` with test metadata

#### 4. Golden Tests Agent
**Purpose**: Creates snapshot and regression tests
- **Scope**: Output validation, API responses, UI rendering
- **Coverage Goals**: All stable outputs requiring consistency
- **Test Patterns**:
  - API response snapshots
  - Generated file validation
  - UI component snapshots
  - Configuration output validation
- **Output**: `golden-tests.json` with test metadata

#### 5. Playwright Agent
**Purpose**: Browser automation and visual regression testing
- **Scope**: UI interactions, visual consistency
- **Coverage Goals**: All user-facing interfaces
- **Test Patterns**:
  - Cross-browser testing
  - Visual regression detection
  - Accessibility validation
  - Performance metrics
- **Output**: `playwright-tests.json` with test metadata

### Test Metadata Structure
Each agent produces a standardized JSON output:
```json
{
  "agent": "unit-tests-agent",
  "timestamp": "2025-01-14T10:30:00Z",
  "tests": [
    {
      "id": "TEST-001",
      "name": "validateUserInput",
      "file": "tests/unit/validation.test.ts",
      "description": "Validates user input sanitization",
      "dependencies": [],
      "category": "validation",
      "priority": "high"
    }
  ],
  "summary": {
    "total": 45,
    "byCategory": {
      "validation": 12,
      "calculation": 15,
      "transformation": 18
    }
  }
}
```

## Phase 2: Test Validation Pipeline

### Validation Agents (Parallel Execution)

#### Test Validator Agent
**Purpose**: Ensures test quality and completeness
- **Validations**:
  - Test naming conventions
  - Assertion quality and coverage
  - Test isolation and independence
  - Proper setup/teardown implementation
- **Output**: `validation-report.json`

#### Code Coverage Agent
**Purpose**: Analyzes test coverage metrics
- **Metrics Tracked**:
  - Line coverage (target: >80%)
  - Branch coverage (target: >75%)
  - Function coverage (target: >85%)
  - Statement coverage (target: >80%)
- **Identifies**:
  - Uncovered code paths
  - Missing edge case tests
  - Dead code detection
- **Output**: `coverage-report.json`

#### Mock Detector Agent
**Purpose**: Ensures tests use real implementations
- **Detection Patterns**:
  - Mock library imports
  - Stub/spy usage
  - Fake implementations
  - Test doubles
- **Enforcement**:
  - Zero-mock policy for integration tests
  - Minimal mocks for unit tests
  - Real service usage in E2E tests
- **Output**: `mock-detection-report.json`

### Validation Report Structure
```json
{
  "validationPhase": {
    "timestamp": "2025-01-14T11:00:00Z",
    "agents": ["test-validator", "code-coverage", "mock-detector"],
    "issues": [
      {
        "severity": "high",
        "agent": "mock-detector",
        "test": "TEST-015",
        "issue": "Mock detected in integration test",
        "file": "tests/integration/api.test.ts",
        "line": 45,
        "recommendation": "Replace mock with real service call"
      }
    ],
    "metrics": {
      "totalIssues": 8,
      "highSeverity": 2,
      "mediumSeverity": 4,
      "lowSeverity": 2
    }
  }
}
```

## Phase 3: Remediation Loop

### Plan and Progress Management
Following the validation phase, the test orchestrator creates a remediation plan:

1. **Issue Prioritization**:
   - High: Blocking issues (mocks in integration tests, <60% coverage)
   - Medium: Quality issues (naming conventions, missing assertions)
   - Low: Optimization opportunities

2. **Task Assignment**:
   - Maps each issue to the responsible test agent
   - Creates TASK-XXX identifiers for tracking
   - Establishes dependencies between fixes

3. **Progress Tracking**:
   - Uses `plan_and_progress/` directory structure
   - Monitors fix completion status
   - Validates fixes don't introduce new issues

### Remediation Workflow
```
Validation Issues Identified
         ↓
Create Remediation Plan (TASK-001 to TASK-NNN)
         ↓
Assign Tasks to Original Test Agents
         ↓
[For Each Task]
  ├─ Invoke Agent with Specific Fix Instructions
  ├─ Update Progress Tracking
  └─ Re-validate Fixed Tests
         ↓
All Issues Resolved?
  ├─ [No] → Continue Remediation Loop
  └─ [Yes] → Proceed to Execution Phase
```

## Phase 4: Test Execution Pipeline

### Test Executor Agent
**Purpose**: Runs all tests and collects results

#### Execution Strategy
1. **Pre-execution Validation**:
   - Environment readiness check
   - Dependency verification
   - Database state preparation

2. **Execution Order**:
   - Unit tests (fastest, fail-fast)
   - Integration tests (moderate duration)
   - E2E tests (longest duration)
   - Golden tests (comparison validation)
   - Playwright tests (browser automation)

3. **Failure Handling**:
   - Immediate failure logging
   - Failure categorization
   - Retry logic for flaky tests

#### Execution Report Structure
```json
{
  "execution": {
    "sessionId": "20250114-113000",
    "startTime": "2025-01-14T11:30:00Z",
    "endTime": "2025-01-14T11:45:00Z",
    "results": {
      "unit": {
        "passed": 143,
        "failed": 2,
        "skipped": 0,
        "duration": "4.2s"
      },
      "integration": {
        "passed": 67,
        "failed": 1,
        "skipped": 3,
        "duration": "28.5s"
      }
    },
    "failures": [
      {
        "test": "TEST-045",
        "type": "unit",
        "file": "tests/unit/parser.test.ts",
        "error": "Expected 'foo' but received 'bar'",
        "stackTrace": "...",
        "category": "assertion"
      }
    ]
  }
}
```

## Phase 5: Failure Resolution Loop

### Automated Fix Attempts
When test failures occur, the orchestrator initiates targeted fixes:

1. **Failure Analysis**:
   - Categorize failure type (assertion, timeout, error)
   - Identify responsible code areas
   - Determine fix complexity

2. **Agent Re-invocation**:
   - Pass specific failure context to test agent
   - Include error messages and stack traces
   - Provide previous test implementation for reference

3. **Fix Validation**:
   - Re-run only affected tests first
   - If passed, run full test suite
   - Maximum 3 fix attempts per test

### Fix Loop Termination Criteria
- All tests passing
- Maximum iteration count reached (3)
- Unrecoverable errors identified
- Manual intervention required flag

## Session Management

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
    │   ├── remediation-plan.json
    │   └── progress-tracking.json
    ├── phase5-execution/
    │   └── execution-report.json
    └── phase6-resolution/
        └── resolution-summary.json
```

## Complete Workflow Summary

```
1. Test Planning Phase (MANDATORY)
   └─ Test Planner Agent (Opus)
           ↓
2. Test Creation Phase
   ├─ Unit Tests Agent
   ├─ Integration Tests Agent
   ├─ E2E Tests Agent
   ├─ Golden Tests Agent
   └─ Playwright Agent
           ↓
3. Validation Phase (Parallel)
   ├─ Test Validator Agent
   ├─ Code Coverage Agent
   └─ Mock Detector Agent
           ↓
4. Remediation Loop
   ├─ Create Fix Plan
   ├─ Re-invoke Test Agents
   └─ Validate Fixes
           ↓
5. Execution Phase
   └─ Test Executor Agent
           ↓
6. Resolution Loop
   ├─ Analyze Failures
   ├─ Re-invoke for Fixes
   └─ Re-execute Tests
           ↓
7. Final Report Generation
```

## Key Features

- **Mandatory Test Planning**: Always starts with Opus-powered test planner agent
- **Multi-Agent Coordination**: Specialized agents for each test type
- **Comprehensive Validation**: Three-layer validation system
- **Zero-Mock Enforcement**: Ensures tests validate real behavior
- **Automated Remediation**: Self-healing test creation
- **Progressive Execution**: Fail-fast with detailed diagnostics
- **Complete Traceability**: Full audit trail of all operations
- **Parallel Processing**: Optimized execution where possible
- **Intelligent Retry Logic**: Handles transient failures gracefully
- **Plan-Driven Execution**: All phases guided by initial test plan

## Success Criteria

The workflow completes successfully when:
1. All test types have been created
2. Coverage targets are met (>80% overall)
3. No mocks detected in integration/E2E tests
4. All tests pass execution
5. No high-severity issues remain
6. Complete documentation generated

## Configuration Options

### Orchestrator Settings
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