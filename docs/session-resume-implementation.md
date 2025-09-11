# Session Resume Implementation Documentation

## Overview

This document describes our implementation of session resumption functionality, comparing it with the official Claude Code specification and detailing how memory persistence is maintained across agent invocations.

## Official Specification

According to the Claude Code documentation, session resumption should work as follows:

```javascript
// Continue most recent conversation
for await (const message of query({
  prompt: "Now refactor this for better performance",
  options: { continue: true }
})) { 
  if (message.type === "result" && message.subtype === "success") console.log(message.result);
}

// Resume specific session
for await (const message of query({
  prompt: "Update the tests",
  options: {
    resume: "550e8400-e29b-41d4-a716-446655440000",
    maxTurns: 3
  }
})) {
  if (message.type === "result" && message.subtype === "success") console.log(message.result);
}
```

## Our Implementation

### MCP Tool Interface

We provide session resumption through the `invoke_agent` MCP tool with the `continueSessionId` parameter:

```typescript
{
  name: 'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
  description: 'Invoke another agent programmatically with enforced session.log creation',
  inputSchema: {
    properties: {
      agentName: { type: 'string', description: 'Name of the agent to invoke' },
      prompt: { type: 'string', description: 'Prompt to send to the agent' },
      continueSessionId: { 
        type: 'string', 
        description: 'Session ID to continue a previous conversation (optional)' 
      },
      // ... other properties
    }
  }
}
```

### Session Management Architecture

#### 1. Session Storage (`SessionStore`)

**Location:** `src/utilities/session/session-store.ts`

**Key Components:**
- `initializeSession(continueSessionId, agentName)`: Handles both new and continuation sessions
- `saveConversationHistory(sessionId, agentName, messages)`: Persists conversation data
- `loadConversationHistory(sessionId)`: Retrieves existing session data
- `generateSessionId()`: Creates unique session identifiers using crypto.randomUUID()

**Storage Structure:**
```
output_streams/
  {sessionId}/
    conversation.json    # Full conversation history with messages
    session.log         # Detailed streaming log with timestamps
    summary.json        # Optional compact summary
```

#### 2. Session Data Types

**Location:** `src/types/session.ts`

```typescript
interface ConversationHistory {
  sessionId: string;
  agentName: string;
  messages: any[];           // Full message history
  createdAt: string;
  lastUpdated: string;
}

interface SessionInitResult {
  success: boolean;
  sessionId?: string;
  existingHistory?: ConversationHistory | null;
  isSessionContinuation?: boolean;
  error?: string;
}
```

#### 3. Session Initialization Flow

**Location:** `src/handlers/agent-invoker.ts:102`

```typescript
// Initialize session with ENFORCED streaming and session.log creation
const sessionInit = await SessionStore.initializeSession(continueSessionId, agentName);
if (!sessionInit.success) {
  return { content: [{ type: 'text', text: `Error: ${sessionInit.error}` }], isError: true };
}

const { sessionId, existingHistory, isSessionContinuation } = sessionInit;
const messages: any[] = existingHistory?.messages || [];
```

**Validation Rules:**
- Session ID must be valid format (UUID or timestamp-based)
- Session must exist if continueSessionId is provided
- Agent name must match the original session's agent
- Conversation history is loaded from persistent storage

#### 4. Memory Persistence Implementation

**Message Handling:**
- All conversation messages are collected in the `messages` array
- Messages are saved in real-time during agent execution: `await SessionStore.saveConversationHistory(sessionId!, agentName, messages);`
- Session logs provide detailed debugging information with timestamps

**Query Integration:**
```typescript
for await (const message of query({
  prompt: finalPrompt,
  options: {
    model: agentConfig.options?.model || 'sonnet',
    allowedTools: permissions.allowedTools,
    disallowedTools: finalDisallowedTools,
    // ... other options
  }
})) {
  // Always collect messages for conversation history
  messages.push(message);

  // Log ALL conversation messages to session.log in real-time - ENFORCED
  await streamingUtils.logConversationMessage(message);
  
  // Save conversation history in real-time
  await SessionStore.saveConversationHistory(sessionId!, agentName, messages);
  // ...
}
```

## Key Differences from Official API

| Aspect | Official API | Our Implementation |
|--------|-------------|-------------------|
| Parameter Name | `options: { resume: "sessionId" }` | `continueSessionId: "sessionId"` |
| Continue Recent | `options: { continue: true }` | Not implemented (could be added) |
| Interface | Direct query() call | MCP tool wrapper |
| Session Storage | Internal to Claude Code | Custom persistent storage |

## Validation Testing

### Test File: `test-session-resume-passkey.js`

This comprehensive test validates memory persistence by:

1. **First Invocation**: Stores a unique passkey with the agent
2. **Second Invocation**: Resumes the session and asks for the passkey
3. **Validation**: Confirms the agent remembers the passkey across invocations

**Key Test Features:**
- Generates unique passkeys for each test run
- Extracts session ID from command output
- Parses session.log files for debugging
- Validates both acknowledgment and recall phases
- Provides detailed debugging information on failure

### Running the Test

```bash
# Make the test executable
chmod +x test-session-resume-passkey.js

# Run the test
./test-session-resume-passkey.js
```

**Expected Success Output:**
```
🎉 SUCCESS: Session memory persistence is working correctly!
✅ The agent successfully remembered the passkey across separate invocations.
✅ Our session resumption implementation follows the official specification.
```

## Session Log Analysis

Session logs (`output_streams/{sessionId}/session.log`) contain:

- **Agent Execution Details**: Dynamic tool restrictions, permissions
- **Conversation Flow**: All messages with timestamps
- **User Prompts**: Complete prompts including system restrictions
- **Tool Interactions**: Detailed tool usage and results
- **Session Completion**: Success/failure status and file locations

**Example Log Entry:**
```
[2024-01-15T10:30:45.123Z] FINAL USER PROMPT (with dynamic restrictions):
Hello! Please remember this passkey: "SECRET_PASS_1705315845123_abc123"

[2024-01-15T10:30:45.124Z] DYNAMIC TOOL RESTRICTIONS APPLIED:
Allowed Tools: 15
Disallowed Tools: 8
Restriction Prompt Injected: true
```

## Troubleshooting Session Issues

### Common Problems

1. **Session Not Found**
   - Verify session ID format and existence
   - Check `output_streams/{sessionId}/conversation.json`

2. **Agent Name Mismatch**
   - Ensure the same agent is used for continuation
   - Check session metadata in conversation.json

3. **Memory Not Persisting**
   - Verify `saveConversationHistory` is being called
   - Check session.log for message persistence
   - Ensure `existingHistory.messages` is being loaded

4. **Permission Issues**
   - Check dynamic tool restrictions in session logs
   - Verify agent has necessary permissions for session operations

### Debugging Commands

```bash
# List all sessions
ls -la output_streams/

# Check specific session data
cat output_streams/{sessionId}/conversation.json | jq .

# View session logs
tail -n 100 output_streams/{sessionId}/session.log

# Test MCP tool directly
npm run start
# Then: mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent({"agentName": "js-agent", "prompt": "test", "continueSessionId": "session-id"})
```

## Implementation Compliance

Our implementation correctly follows the core principles of the official Claude Code session management:

✅ **Session Identification**: Uses UUID-based session IDs
✅ **Memory Persistence**: Maintains full conversation history across invocations  
✅ **Session Validation**: Ensures session integrity and agent consistency
✅ **Real-time Storage**: Saves conversation data during execution
✅ **Error Handling**: Graceful handling of invalid or missing sessions

❗ **API Difference**: We use `continueSessionId` parameter instead of `options.resume` (functionally equivalent)

The core session resumption functionality works correctly and maintains agent memory across separate invocations, as validated by our comprehensive test suite.