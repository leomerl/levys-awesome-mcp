# Architecture Overview

Levy's Awesome MCP is an AI agent orchestration toolkit for Claude Code that automates complex development tasks through specialized agents working in coordination.

## Core Functionalities

1. **Agent Detection** - AgentLoader can detect all agents in agents/ directory
2. **Session Management** - Can resume by session ID with retained memory
3. **Streaming Utility** - All conversation output saved to .log files, both original and resumed invocations visible
4. **Plan and Progress** - Task completion tracked using plan and progress files
5. **Agent Invocation** - Agents orchestrated via CLI and MCP tool
6. **Summary Enforcement** - Mandatory summary creation after each invocation via resume
7. **User-Defined Directories** - Configurable backend and frontend directories
8. **Dynamic Write Permissions** - Agents can only write to specific configured folders

## Session Management

### How It Works

Session resumption allows agents to maintain memory and context across multiple invocations:

1. **Session State Storage**: Claude Code maintains conversation state internally
2. **Session ID**: Each session gets a unique ID from Claude Code
3. **Resume Mechanism**: `continueSessionId` parameter retrieves stored conversation state
4. **Memory Persistence**: Agent retains all previous context, variables, and history
5. **Log Files**: Created for debugging/audit, but NOT required for resumption

### Session ID Flow

**Initial Invocation (no continueSessionId):**
- Start with undefined sessionId
- Capture Claude Code's session_id from first message
- Use captured ID for directory creation
- Return Claude Code's session ID to user

**Session Resumption (with continueSessionId):**
- Use provided continueSessionId as sessionId
- Directory already exists, append to logs
- Pass continueSessionId to Claude Code via resume parameter
- Return new Claude Code session ID (different but context maintained)

### Directory Structure

```
output_streams/
├── {claude-code-session-id}/
│   ├── conversation.json    # Full message history with metadata
│   └── stream.log           # Real-time log (appended on resume)
```

### Benefits

- **Consistent Directory Naming**: Directories match Claude Code's actual session IDs
- **Reliable Session Resumption**: Context properly maintained across sessions
- **Complete Audit Trail**: All conversations logged with timestamps
- **Debugging Support**: Easy to trace session flow through logs
- **No Session ID Mismatch**: Eliminates "session not found" errors

## Dynamic Tool Restriction System

The Dynamic Tool Restriction System provides comprehensive, automated tool security enforcement across all agents.

### Key Features

1. **Dynamic Tool Discovery**
   - Automatically discovers all available MCP tools from registered handlers
   - Catalogs Claude Code built-in tools (Bash, Read, Write, Edit, etc.)
   - Maintains real-time inventory with caching for performance
   - Categorizes tools by functionality

2. **Automatic Disallowed Tool Calculation**
   - Formula: `disallowed_tools = all_available_tools - allowed_tools`
   - Ensures comprehensive security by blocking ALL tools not explicitly allowed
   - Updates automatically as new tools are added
   - Prevents security gaps from unknown or forgotten tools

3. **Explicit Prompt Injection**
   - Injects clear, categorized warnings about forbidden tools
   - Provides human-readable restrictions organized by category
   - Ensures agents receive explicit guidance about limitations
   - Logged to session files for audit and debugging

4. **Type-Safe Tool Management**
   - Generates TypeScript types for all discovered tools
   - Validates tool configurations against known tools
   - Provides compile-time safety for tool references
   - Offers comprehensive tool usage statistics

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Registry                            │
│  • Discovers all MCP tools from handlers                   │
│  • Catalogs Claude Code built-in tools                     │
│  • Maintains cached inventory with TTL                     │
│  • Provides tool validation and statistics                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Permission Manager                           │
│  • Calculates disallowed tools dynamically                 │
│  • Generates restriction prompts                           │
│  • Validates tool configurations                           │
│  • Provides security analytics                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Agent Invoker                               │
│  • Applies dynamic restrictions to all agents              │
│  • Injects tool restriction prompts                        │
│  • Logs restriction enforcement details                    │
│  • Ensures backward compatibility                          │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### ToolRegistry (`src/utilities/tools/tool-registry.ts`)

```typescript
// Get all available MCP tools
const allTools = await ToolRegistry.getAllMCPTools();

// Calculate disallowed tools automatically
const disallowed = await ToolRegistry.calculateDisallowedTools(allowedTools);

// Validate tool configurations
const validation = await ToolRegistry.validateToolList(tools);

// Get comprehensive statistics
const stats = await ToolRegistry.getToolStatistics();
```

#### PermissionManager (`src/utilities/agents/permission-manager.ts`)

```typescript
// Apply dynamic restrictions
const permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions({
  allowedTools: ['Read', 'Grep', 'mcp__example__tool'],
  agentRole: 'read-only',
  useDynamicRestrictions: true
});

// Generate restriction prompt
const restrictionPrompt = await PermissionManager.generateToolRestrictionPrompt(
  permissions.disallowedTools
);

// Validate agent configuration
const validation = await PermissionManager.validateAgentToolConfiguration(config);
```

### Security Benefits

1. **Zero-Gap Security**: Automatic calculation ensures ALL tools are considered
2. **Maintenance-Free**: Dynamic discovery keeps restrictions current
3. **Explicit Communication**: Clear, injected warnings about forbidden tools
4. **Comprehensive Audit Trail**: Detailed logging of restrictions and violations

### Configuration

```typescript
const DEFAULT_DYNAMIC_RESTRICTION_CONFIG = {
  enabled: true,                    // Enable by default for maximum security
  refreshIntervalMs: 5 * 60 * 1000, // Refresh every 5 minutes
  includePromptInjection: true,      // Always inject tool restriction warnings
  logLevel: 'basic',                 // Basic logging for debugging
  cacheTTL: 10 * 60 * 1000          // 10 minute cache TTL
};
```

## File Structure

```
project/
├── plan_and_progress/          # Plans and progress tracking
│   └── sessions/
│       └── {session-id}/
│           ├── plan.json       # Task breakdown
│           └── progress.json   # Execution status
├── output_streams/             # Agent execution logs
│   └── {session-id}/
│       ├── conversation.json   # Full message history
│       └── stream.log         # Real-time output
└── reports/                   # Agent summaries
    └── {session-id}/
        └── *-summary.json
```

## Agent System

### Agent Types

- **orchestrator-agent** - Coordinates multi-agent workflows
- **backend-agent** - API and server development
- **frontend-agent** - UI and client-side code
- **testing-agent** - Test creation and execution
- **builder-agent** - Build and deployment
- **linter-agent** - Code quality checks
- **planner-agent** - Project planning
- **reviewer-agent** - Plan validation and progress review

### Permission System

- **Folder-Restricted Write Access**: Backend and frontend isolation
- **Session Management**: Automatic session.log creation
- **Session Resumption**: Continue agent sessions with Claude Code integration
- **Report Enforcement**: Mandatory JSON summary reports
- **Dynamic Tool Restrictions**: Runtime tool restriction enforcement

## Key Design Principles

1. **Security First**: All agents have minimal, explicitly defined permissions
2. **Auditability**: Complete logging of all agent interactions
3. **Reliability**: Session management ensures context retention
4. **Automation**: Progress tracking and summary enforcement
5. **Flexibility**: Configurable directories and tool restrictions
6. **Type Safety**: Compile-time validation of tool configurations
