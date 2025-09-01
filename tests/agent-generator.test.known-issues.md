# Known Issues - Agent Generator Tests

This document summarizes the known issues with the agent generator test suite that require attention.

## Overview

The agent generator tests achieve **79.45% statement coverage** but have some failures related to dynamic import mocking complexity.

## Specific Issues

### 1. Dynamic Import Mocking Failures

**Issue**: Tests that require dynamic module loading fail because the global `import()` mocking doesn't properly intercept the `path.resolve()` transformed paths.

**Affected Tests**:
- `get_agent_info` - All variants that require actual agent config loading
- `generate_all_agents` - Tests that load multiple agent configs
- `markdown generation formats` - Tests that need to load configs for markdown generation

**Error Pattern**:
```
ModuleNotFoundError: Cannot find module 'C:\mock\project\agents\test-agent.ts' from 'src/handlers/agent-generator.ts'
```

**Root Cause**: 
- The handler uses `path.resolve(agentPath)` which transforms paths differently than expected
- Our moduleMap keys don't match the resolved paths
- Jest's dynamic import interception conflicts with our global import override

### 2. Build Executor Test Conflicts

**Issue**: Some build executor tests are failing due to changes in the build executor implementation that now uses `validateProjectDirectory()`.

**Affected Tests**:
- Path handling tests expecting `existsSync` calls
- Error handling expecting specific error messages

**Root Cause**: 
- Build executor now validates projects differently
- Our mocks don't account for the new validation logic

## Test Results Summary

### Working Tests (10/37):
- `list_available_agents` - All variants work correctly
- `remove_agent_markdowns` - File operations work well
- Basic error handling tests
- Build executor basic functionality tests

### Failing Tests (27/37):
- All `get_agent_info` tests requiring dynamic imports
- All `generate_all_agents` tests requiring config loading  
- All markdown generation format tests
- Some build executor path handling tests

## Proposed Solutions

### Long-term Solutions:
1. **Dependency Injection**: Refactor agent-generator to accept a configurable module loader
2. **Test Environment**: Create a Jest custom environment that handles dynamic imports better
3. **Separate Concerns**: Extract file system and module loading into separate testable services

DONT SOLVE PROBLEMS USING TODOS WITHOUT ACTUAL IMPLEMENTATION NOR MOCKING THINGS THAT BLOCK FROM TESTING ACTUAL FUNCTIONALITY

## Coverage Analysis

Despite the failing tests, we achieved good coverage on the parts that work:

| Metric | Coverage | Notes |
|--------|----------|-------|
| Statements | 79.45% | Core logic well tested |
| Functions | 84.61% | Most functions covered |
| Branches | 34.14% | Error paths need work |

## Immediate Actions Needed

1. Fix the build executor test conflicts
2. Implement proper dynamic import mocking strategy
3. Add integration tests that use real agent files
4. Consider splitting unit tests from integration tests

## Test File Status

- **File**: `tests/agent-generator.test.ts`
- **Total Tests**: 37
- **Passing**: 10 (27%)  
- **Failing**: 27 (73%)
- **Coverage**: 79.45% statements

---

*Last Updated: 2025-09-01*
*Next Review: When dynamic import mocking is resolved*