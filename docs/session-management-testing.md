# Session Management Testing Documentation

## Overview

The session management system is protected by comprehensive integration tests that verify the actual behavior of session ID handling, directory creation, and log file management. These tests ensure that any changes to the session management implementation will be caught immediately.

## Test Files

### 1. `tests/integration/session-id-behavior.integration.test.ts`
Fast, reliable tests that verify file system behavior without making actual Claude Code invocations.

### 2. `tests/integration/session-management.integration.test.ts`
Comprehensive tests using real agent invocations (slower but tests actual Claude Code integration).

## Key Test Scenarios

### Test 1: Session ID Directory Creation
**Purpose**: Verify that directories are created using Claude Code's actual session ID

**What it tests:**
- Directory name matches the session ID returned to the user
- `conversation.json` contains matching session IDs
- Claude Code's `session_id` in messages matches directory name

**Verification:**
```typescript
// Directory structure verification
const structure = verifyDirectoryStructure(sessionId);
expect(structure.claudeCodeSessionId).toBe(sessionId);
expect(path.basename(sessionDir)).toBe(sessionId);
```

**Why it matters**: If session IDs don't match, session resumption will fail because Claude Code won't find the session.

### Test 2: Session Resumption Directory Usage
**Purpose**: Ensure resumed sessions use the same directory

**What it tests:**
- Resumed session uses existing directory (not creating new one)
- Files in the directory are updated, not replaced
- Both `SESSION NEW:` and `SESSION RESUMED:` markers appear in logs

**Verification:**
```typescript
const logContent = fs.readFileSync(path.join(sessionDir, 'stream.log'), 'utf8');
expect(logContent).toContain('SESSION NEW:');
expect(logContent).toContain('SESSION RESUMED:');
```

**Why it matters**: Using different directories would lose conversation history and break the audit trail.

### Test 3: Log File Appending
**Purpose**: Verify logs are appended to, not replaced

**What it tests:**
- Initial log size and content
- Log grows after resumption
- Original content is preserved
- New content is added

**Verification:**
```typescript
const initialSize = fs.statSync(logPath).size;
// ... resume session ...
const finalSize = fs.statSync(logPath).size;
expect(finalSize).toBeGreaterThan(initialSize);
expect(finalContent).toContain('First message');  // Original
expect(finalContent).toContain('Resumed message'); // New
```

**Why it matters**: Replacing logs would lose conversation history and make debugging impossible.

### Test 4: conversation.json Structure Validation
**Purpose**: Ensure the session tracking file has correct structure

**What it tests:**
- `sessionId` field matches directory name
- Messages contain Claude Code's `session_id`
- Init message has matching `session_id`
- All session IDs are consistent

**Verification:**
```typescript
const conversation = JSON.parse(fs.readFileSync(conversationPath, 'utf8'));
const initMessage = conversation.messages.find(m => m.type === 'system' && m.subtype === 'init');

expect(conversation.sessionId).toBe(sessionId);
expect(initMessage.session_id).toBe(sessionId);
expect(path.basename(sessionDir)).toBe(sessionId);
```

**Why it matters**: Inconsistent session IDs would break session tracking and resumption.

### Test 5: Context Retention (Real Invocation Test)
**Purpose**: Verify actual context is maintained across sessions

**What it tests:**
- Agent remembers information from previous session
- Uses real Claude Code invocations
- Verifies actual behavior, not mocked

**Verification:**
```typescript
// First invocation
const response1 = await invokeAgent({
  prompt: `Remember this key: ${uniqueKey}`
});

// Resume session
const response2 = await invokeAgent({
  continueSessionId: sessionId,
  prompt: 'What was the key?'
});

expect(response2).toContain(uniqueKey);
```

**Why it matters**: This is the ultimate test - if context isn't retained, the feature is broken.

## Running the Tests

### Fast Tests (Recommended for CI/CD)
```bash
npm test -- tests/integration/session-id-behavior.integration.test.ts
```
- Runs in ~300ms
- Tests file system behavior
- No external dependencies
- Suitable for pre-commit hooks

### Comprehensive Tests (Periodic Validation)
```bash
npm test -- tests/integration/session-management.integration.test.ts
```
- Takes 30-60 seconds
- Makes real Claude Code invocations
- Tests actual end-to-end behavior
- Run before releases or major changes

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

## Adding New Tests

When adding session management features, ensure tests verify:
1. **Actual behavior** - Use real files and directories
2. **Critical paths** - Test what users depend on
3. **Edge cases** - Multiple resumptions, concurrent sessions
4. **Error conditions** - Missing directories, corrupted files

Example test template:
```typescript
it('should handle new session feature', async () => {
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

## Maintenance

### When to Update Tests
- Adding new session management features
- Changing directory structure
- Modifying log formats
- Updating conversation.json schema

### Test Health Indicators
- All tests should pass in < 1 second (fast suite)
- No hardcoded paths or session IDs
- Clean up all created resources
- Use descriptive test names and comments

## Conclusion

These tests ensure that session management behavior remains consistent and reliable. They test actual file system behavior and real agent invocations, making them effective guards against regression. Any change that breaks session management will be caught by these tests before it reaches production.