# Session Management Implementation

## Overview

The session management system in levys-awesome-mcp ensures proper context retention and directory organization when invoking agents through Claude Code. This implementation solves the critical issue of session ID mismatch between our internal tracking and Claude Code's actual session management.

### How Session Resumption Works

Session resumption allows agents to maintain memory and context across multiple invocations. The system works as follows:

1. **Session State Storage**: When an agent is invoked, Claude Code maintains the conversation state internally (separate from any log files)
2. **Session ID**: Each session gets a unique ID from Claude Code that serves as the key to retrieve the stored state
3. **Resume Mechanism**: When `continueSessionId` is provided, the system passes it to Claude Code's `--resume` parameter, which retrieves the stored conversation state
4. **Memory Persistence**: The agent retains all previous context, variables, and conversation history from the original session
5. **Log Files**: While `.log` files are created for debugging/audit purposes, they are NOT required for session resumption - Claude Code handles state persistence independently

## Key Features

### 1. Claude Code Session ID Capture
- **Problem Solved**: Previously, we generated our own UUIDs for session tracking, which didn't match Claude Code's internal session IDs, breaking session resumption
- **Solution**: We now capture Claude Code's actual session ID from the message stream and use it for directory naming

### 2. Unified Directory Structure
- Session directories are created under `output_streams/{claude-code-session-id}/`
- Both initial and resumed sessions use the same directory
- Files created:
  - `conversation.json`: Complete message history with session metadata
  - `stream.log`: Real-time conversation log with timestamps

### 3. Session Resumption
- When `continueSessionId` is provided, the system:
  - Uses the existing session directory
  - Appends to the existing `stream.log` file
  - Passes the session ID to Claude Code's `--resume` parameter
  - Maintains conversation context across sessions

## Implementation Details

### Session ID Flow

```typescript
// src/handlers/agent-invoker.ts

1. Initial Invocation (no continueSessionId):
   - Start with undefined sessionId
   - Capture Claude Code's session_id from first message
   - Use captured ID for directory creation
   - Return Claude Code's session ID to user

2. Session Resumption (with continueSessionId):
   - Use provided continueSessionId as sessionId
   - Directory already exists, append to logs
   - Pass continueSessionId to Claude Code via resume parameter
   - Return new Claude Code session ID (different but context maintained)
```

### Key Code Components

#### Session ID Capture Logic
```typescript
// Capture Claude Code's actual session ID on first message
if (isFirstMessage && (message.type === 'system' || message.type === 'assistant' || message.type === 'result')) {
  if (message.session_id) {
    claudeCodeSessionId = message.session_id;
  }
  
  // Use Claude Code's session ID for directory
  if (!sessionId) {
    sessionId = claudeCodeSessionId || randomUUID();
  }
  
  // Initialize streaming with correct session ID
  if (!streamingUtils && sessionId) {
    const sessionDir = path.join('output_streams', sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
    
    streamingUtils = new StreamingManager(sessionId, agentName, {...});
    streamingUtils.initStreamFile();
  }
}
```

#### Session Resumption
```typescript
// Build query options with conditional resume parameter
const queryOptions: any = {
  model: agentConfig.options?.model || 'sonnet',
  allowedTools: permissions.allowedTools,
  // ... other options
};

// Only add resume parameter if continueSessionId is provided
if (continueSessionId) {
  queryOptions.resume = String(continueSessionId);
}
```

### Directory Structure Example

```
output_streams/
├── a7038563-fdba-49e4-bf96-f80bba9e8472/  # Claude Code's session ID
│   ├── conversation.json                   # Full message history
│   └── stream.log                          # Real-time log (appended on resume)
```

### conversation.json Structure

```json
{
  "sessionId": "a7038563-fdba-49e4-bf96-f80bba9e8472",  // Matches directory name
  "agentName": "backend-agent",
  "messages": [
    {
      "type": "system",
      "subtype": "init",
      "session_id": "a7038563-fdba-49e4-bf96-f80bba9e8472",  // Claude Code's ID
      "uuid": "...",
      // ... other fields
    },
    // ... more messages
  ],
  "createdAt": "2025-09-11T22:05:28.591Z",
  "lastUpdated": "2025-09-11T22:05:57.019Z"
}
```

### stream.log Format

```
[2025-09-11T22:05:28.591Z] SESSION NEW:
Agent: backend-agent
Session ID: a7038563-fdba-49e4-bf96-f80bba9e8472
Claude Code Session ID: a7038563-fdba-49e4-bf96-f80bba9e8472

[2025-09-11T22:05:28.592Z] USER PROMPT:
Remember this key: TEST_KEY_123

[2025-09-11T22:05:30.123Z] ASSISTANT:
I've noted the key TEST_KEY_123

[2025-09-11T22:05:30.124Z] SESSION COMPLETED:
Status: success

=== Session Continued ===
Continued at: 2025-09-11T22:05:48.974Z

[2025-09-11T22:05:48.974Z] SESSION RESUMED:
Agent: backend-agent
Session ID: a7038563-fdba-49e4-bf96-f80bba9e8472

[2025-09-11T22:05:48.975Z] USER PROMPT:
What was the key I gave you?

[2025-09-11T22:05:50.456Z] ASSISTANT:
TEST_KEY_123

[2025-09-11T22:05:50.457Z] SESSION COMPLETED:
Status: success
```

## Benefits

1. **Consistent Directory Naming**: Directory names match Claude Code's actual session IDs
2. **Reliable Session Resumption**: Context is properly maintained across sessions
3. **Complete Audit Trail**: All conversations are logged with timestamps
4. **Debugging Support**: Easy to trace session flow through logs
5. **No Session ID Mismatch**: Eliminates the "session not found" errors

## Usage Example

```typescript
// Initial invocation
const response1 = await invokeAgent({
  agentName: 'backend-agent',
  prompt: 'Remember this key: SECRET_123'
});
// Returns: Session ID: a7038563-fdba-49e4-bf96-f80bba9e8472

// Resume the session
const response2 = await invokeAgent({
  agentName: 'backend-agent',
  continueSessionId: 'a7038563-fdba-49e4-bf96-f80bba9e8472',
  prompt: 'What was the key?'
});
// Returns: SECRET_123 (context maintained)
```

## Testing

The implementation is verified by integration tests that ensure:
- Claude Code's session ID is used for directory naming
- Session resumption uses the same directory
- Logs are appended (not replaced) on resumption
- Context is maintained across sessions

See `tests/integration/session-id-behavior.integration.test.ts` for details.