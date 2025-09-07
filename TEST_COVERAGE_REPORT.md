# Test Coverage Report - levys-awesome-mcp

## Current Test Status

**Test Results**: 92 passed, 4 failed (96 total tests)
**Test Files**: 14 passed, 6 failed (20 total files)

### Test Coverage Breakdown:

**Passing Tests (92)**:
- Unit tests: 17 tests (session-store, config-validation)
- Contract tests: 31 tests (build-executor, summary-tools, content-writer, agent-generator, test-executor, server-runner, code-analyzer)
- Integration tests: 44 tests (cross-tool workflow, negative cases, MCP server, agent invocation)

**Failed Tests (4)**:
- Plan creator contract tests (2 failures - missing synopsis parameter)
- Performance test (1 failure - response time >500ms)
- Golden snapshot test (1 failure - tool list mismatch)

**Missing Unit Tests**:
- `command-executor.unit.test.ts` - File not found
- `file-operations.unit.test.ts` - File not found  
- `path-validator.unit.test.ts` - File not found

### Test Coverage Issues:

1. **Missing Dependencies**: `@vitest/coverage-v8` not installed
2. **Missing Files**: Several utility modules don't exist yet
3. **Outdated Snapshots**: Golden test expects 28 tools but finds 24
4. **Performance Issues**: Tools/list response taking 1.5s vs expected 500ms

The old coverage report (12.13%) appears outdated. Current test suite shows good integration/contract test coverage but lacks unit test coverage for core utilities.