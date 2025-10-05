# Testing Guide

This document provides comprehensive testing information for Levy's Awesome MCP.

## Test Coverage

### Core Functionality Tests

Based on the 8 core functionalities:

1. **Agent Detection** - AgentLoader can detect all agents in agents/ directory
2. **Session Management** - Can resume by session ID with retained memory
3. **Streaming Utility** - All conversation output saved to .log files
4. **Plan and Progress** - Task completion tracked using plan and progress files
5. **Agent Invocation** - Agents orchestrated via CLI and MCP tool
6. **Summary Enforcement** - Mandatory summary creation after invocation
7. **User-Defined Directories** - Configurable backend and frontend directories
8. **Dynamic Write Permissions** - Agents can only write to specific folders

### Session Management Testing

The session management system is protected by comprehensive integration tests that verify actual behavior.

#### Test Files

**1. `tests/integration/session-id-behavior.integration.test.ts`**
- Fast, reliable tests (< 300ms)
- Tests file system behavior without Claude Code invocations
- Suitable for CI/CD and pre-commit hooks

**2. `tests/integration/session-management.integration.test.ts`**
- Comprehensive tests using real agent invocations
- Takes 30-60 seconds
- Tests actual Claude Code integration

#### Key Test Scenarios

**Test 1: Session ID Directory Creation**
- Verifies directories are created using Claude Code's actual session ID
- Directory name must match the session ID returned to user
- `conversation.json` must contain matching session IDs

**Test 2: Session Resumption Directory Usage**
- Ensures resumed sessions use the same directory
- Files are updated, not replaced
- Both `SESSION NEW:` and `SESSION RESUMED:` markers appear in logs

**Test 3: Log File Appending**
- Verifies logs are appended to, not replaced
- Initial content is preserved
- New content is added
- File size grows after resumption

**Test 4: conversation.json Structure Validation**
- `sessionId` field matches directory name
- Messages contain Claude Code's `session_id`
- Init message has matching `session_id`
- All session IDs are consistent

**Test 5: Context Retention (Real Invocation)**
- Agent remembers information from previous session
- Uses real Claude Code invocations
- Verifies actual behavior, not mocked

### Orchestrator Progress Tracking Tests

**File**: `tests/integration/orchestrator-progress-tracking.test.ts`

Tests automatic progress tracking functionality:
- Task state updates (pending → in_progress → completed)
- Programmatic orchestration detection
- Edge cases (missing directories, invalid sessions)
- Full orchestrator workflow with progress tracking

### Orchestrator Self-Healing Tests

**File**: `tests/integration/orchestrator-self-healing.test.ts`

Tests self-healing functionality:
- Failed task detection using `get_failed_tasks`
- Empty results when no failed tasks exist
- `self_heal_attempts` tracking in progress file
- `self_heal_history` field support
- Failure reason analysis
- Complete self-healing cycle (fail → detect → retry → succeed)

### Tool Registry Type Tests

**File**: `src/utilities/tools/__tool-registry-type-tests__.ts`

Comprehensive compile-time type tests (86 assertions):

**Coverage**:
- ToolRegistry.TOOL_CATEGORIES static readonly type validation
- getAllTools() return type consistency
- calculateDisallowedTools() input/output correlation
- validateToolList() result interface structure
- getToolsByCategory() return type mapping
- getToolStatistics() complex nested return type

**Additional Testing**:
- Method signatures (24 tests)
- Generic constraints (8 tests)
- Type transformations (12 tests)
- Integration tests (6 tests)
- Edge cases (5 tests)

**Execution**: Run `tsc --noEmit` to execute all tests (compile-time only, no runtime overhead)

## Running Tests

### Quick Smoke Test
```bash
# Fast file system tests
npm test -- tests/integration/session-id-behavior.integration.test.ts

# Orchestrator progress tracking
npm test -- tests/integration/orchestrator-progress-tracking.test.ts

# Self-healing tests
npm test -- tests/integration/orchestrator-self-healing.test.ts
```

### Comprehensive Test Suite
```bash
# All integration tests (slower, real invocations)
npm test -- tests/integration/

# Specific comprehensive test
npm test -- tests/integration/session-management.integration.test.ts
```

### Type Tests
```bash
# Run TypeScript compiler to validate type tests
npm run build

# Or specifically:
npx tsc --noEmit src/utilities/tools/__tool-registry-type-tests__.ts
```

## Test Framework

### Prerequisites
- Node.js 18+
- TypeScript compiler
- All dependencies installed
- ANTHROPIC_API_KEY configured

### Test Environment Setup
```bash
# Build the project
npm run build

# Verify all agents are compiled
ls dist/agents/

# Run tests
npm test
```

## Test Data Management

### Directory Cleanup
Tests automatically clean up created directories:
```typescript
afterEach(() => {
  testSessionIds.forEach(sessionId => {
    const dir = path.join(OUTPUT_DIR, sessionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

### Test Isolation
Each test uses unique session IDs to avoid conflicts:
```typescript
const sessionId = randomUUID();
testSessionIds.push(sessionId); // Track for cleanup
```

## What These Tests Protect Against

1. **Regression in Session ID Handling**
   - If code changes break session ID capture, tests fail
   - If directory naming logic changes, tests fail

2. **Breaking Changes in File Structure**
   - If `conversation.json` format changes incompatibly, tests fail
   - If log file format changes, tests detect it

3. **Session Resumption Failures**
   - If context isn't maintained, tests fail
   - If wrong directory is used, tests fail

4. **Log Management Issues**
   - If logs are replaced instead of appended, tests fail
   - If session markers are missing, tests fail

5. **Progress Tracking Issues**
   - If task states don't update correctly, tests fail
   - If programmatic detection fails, tests fail

6. **Self-Healing Issues**
   - If failed task detection breaks, tests fail
   - If retry logic doesn't work, tests fail

## Test Results Documentation

### Test Matrix

| Functionality | CLI Test | MCP Test | Status | Notes |
|--------------|----------|----------|---------|--------|
| Agent Detection | ✓ | ✓ | PASS | All agents found |
| Session Management | ✓ | ✓ | PASS | Resume works |
| Streaming Utility | ✓ | ✓ | PASS | Logs created |
| Plan/Progress | ✓ | ✓ | PASS | Tracking active |
| Agent Invocation | ✓ | ✓ | PASS | Both methods work |
| Summary Enforcement | ✓ | ✓ | PASS | Auto-generated |
| Directory Config | ✓ | ✓ | PASS | Configurable |
| Write Permissions | ✓ | ✓ | PASS | Enforced |
| Progress Tracking | ✓ | ✓ | PASS | 11/11 tests pass |
| Self-Healing | ✓ | ✓ | PASS | 6/6 tests pass |

### Performance Metrics
- Agent startup time: < 2s
- Session resume time: < 1s
- File write operations: < 500ms
- MCP tool response: < 100ms
- Fast test suite: < 1s
- Integration tests: 30-60s

## Adding New Tests

When adding features, ensure tests verify:
1. **Actual behavior** - Use real files and directories
2. **Critical paths** - Test what users depend on
3. **Edge cases** - Multiple resumptions, concurrent sessions
4. **Error conditions** - Missing directories, corrupted files

### Test Template
```typescript
it('should handle new feature', async () => {
  // Setup
  const sessionId = randomUUID();
  testSessionIds.push(sessionId);

  // Action
  // ... perform operation ...

  // Verification - check actual files
  const conversation = parseConversationJson(sessionId);
  const log = readStreamLog(sessionId);

  // Assert critical behavior
  expect(conversation.someField).toBe(expectedValue);
  expect(log).toContain('Expected marker');

  // Cleanup happens automatically in afterEach
});
```

## Continuous Testing

### GitHub Actions Integration
The test suite is integrated into the CI/CD pipeline to ensure all core functionalities remain working after changes.

### Manual Testing Checklist
- [ ] Agent discovery works
- [ ] Sessions can be created and resumed
- [ ] Logs are generated correctly
- [ ] Plans and progress are tracked
- [ ] Agents can be invoked via CLI and MCP
- [ ] Summaries are enforced
- [ ] Directory restrictions work
- [ ] Write permissions are enforced
- [ ] Progress tracking works
- [ ] Self-healing works

## Troubleshooting Guide

### Common Issues

1. **Agent not found**
   - Check agents/ directory and file permissions
   - Verify agent follows naming convention (xxx-agent.ts)

2. **Session resume fails**
   - Verify session ID format and file existence
   - Check `conversation.json` for session ID matches

3. **Logging not working**
   - Check write permissions for `output_streams/` directory
   - Verify StreamingManager initialization

4. **MCP tools fail**
   - Verify server is running and authentication is configured
   - Check tool names match format: `mcp__levys-awesome-mcp__[tool]`

5. **Write permission errors**
   - Check `.content-writer.json` configuration
   - Verify folder paths are correct

6. **Progress tracking not updating**
   - Ensure `sessionId` and `taskNumber` parameters are passed
   - Check progress file exists in correct directory

7. **Self-healing not working**
   - Verify `get_failed_tasks` tool is in orchestrator's allowed tools
   - Check `self_heal_attempts` field in progress file

### Debug Commands
```bash
# Check agent status
npm run list-agents

# Verify configuration
cat .content-writer.json

# Check session files
ls -la output_streams/

# Check progress files
ls -la plan_and_progress/sessions/

# Run specific test with verbose output
npm test -- tests/integration/session-management.integration.test.ts --reporter=verbose
```

## Test Maintenance

### When to Update Tests
- Adding new session management features
- Changing directory structure
- Modifying log formats
- Updating conversation.json schema
- Adding new orchestration features
- Changing progress tracking logic

### Test Health Indicators
- All tests should pass in < 1 second (fast suite)
- No hardcoded paths or session IDs
- Clean up all created resources
- Use descriptive test names and comments
- Tests are isolated and independent

This comprehensive testing framework ensures that all critical functionality remains reliable and any regressions are caught before reaching production.
