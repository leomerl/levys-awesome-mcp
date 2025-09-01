# Any Type Usage Summary

This document catalogs all uses of the `any` type in the Levy's Awesome MCP Toolkit codebase, excluding node_modules dependencies.

## Core Source Files

### Agent Invocation Module

**src/agent-invocation/claude-agent-invoker.ts**
- Line 10: `metadata: Record<string, any>` - ClaudeSDKResponse interface for flexible metadata
- Line 25: `let config: any = {}` - Mock configuration object for testing

**src/agent-invocation/session-manager.ts**
- Line 19: `metadata?: Record<string, any>` - ConversationMessage interface for flexible metadata
- Line 30: `results: Record<string, any>` - AgentSummary interface for flexible results storage

### Handler Modules

**src/handlers/agent-generator.ts**
- Line 132: `args: any` - Generic tool arguments parameter

**src/handlers/build-executor.ts**
- Line 35: `args: any` - Generic tool arguments parameter

**src/handlers/code-analyzer.ts**
- Line 69: `args: any` - Generic tool arguments parameter

**src/handlers/content-writer.ts**
- Line 67: `args: any` - Generic tool arguments parameter

**src/handlers/orchestrator.ts**
- Line 146: `options: any = {}` - Default options parameter
- Line 189: `results: any[]` - Array of flexible result objects
- Line 191: `results: any[] = []` - Results array initialization
- Line 306: `args: any` - Generic tool arguments parameter

**src/handlers/server-runner.ts**
- Line 213: `args: any` - Generic tool arguments parameter

**src/handlers/test-executor.ts**
- Line 152: `args: any` - Generic tool arguments parameter

**src/handlers/test-runner.ts**
- Line 197: `args: any` - Generic tool arguments parameter

### Shared Utilities

**src/shared/utils.ts**
- Line 56: `config: any` - Agent configuration type guard parameter
- Line 60: `config: any` - Agent configuration type guard parameter

## Type Definitions

### Session Types

**types/session.ts**
- Line 9: `messages: any[]` - ConversationHistory interface for flexible message storage
- Line 54: `messages?: any[]` - AgentInvocationResult interface for optional messages

## Utility Modules

### Agent Configuration

**utilities/agents/agent-config-parser.ts**
- Line 20: `rawConfig: any` - Raw configuration parsing parameter
- Line 81: `rawConfig: any` - Configuration normalization parameter

**utilities/agents/markdown-converter.ts**
- Line 63: `const info: any = {}` - Flexible info object for markdown generation

### Configuration Validation

**utilities/config/validation.ts**
- Line 74: `value: any` - Generic validation parameter

### MCP Protocol Types

**utilities/mcp/protocol-types.ts**
- Line 10: `params?: any` - MCPRequest flexible parameters
- Line 16: `result?: any` - MCPResponse flexible result
- Line 23: `params?: any` - MCPNotification flexible parameters
- Line 29: `data?: any` - MCPError flexible error data
- Line 37: `properties: Record<string, any>` - MCPToolSchema flexible properties
- Line 62: `arguments: Record<string, any>` - MCPToolCall flexible arguments

**utilities/mcp/server-base.ts**
- Line 147: `args: Record<string, any>` - Abstract tool execution parameters

### Session Management

**utilities/session/report-manager.ts**
- Line 17: `summary?: any` - Flexible summary object
- Line 191: `messages: any[]` - Message array parameter

**utilities/session/session-store.ts**
- Line 73: `messages: any[]` - Message storage parameter
- Line 198: `message: any` - Message compaction parameter

**utilities/session/streaming-utils.ts**
- Line 94: `message: any` - Conversation logging parameter
- Line 130: `message: any` - Message processing parameter

## Test Files

### Agent Invoker Tests

**tests/agent-invoker.test.minimal.ts**
- Line 123: `(msg: any) => msg.role === 'user'` - Type assertion for message filtering
- Line 124: `(msg: any) => msg.role === 'assistant'` - Type assertion for message filtering

### Other Test Files

**tests/agent-generator.test.ts**
- Multiple lines: Various `as any` type assertions for mock data

**tests/orchestrator.test.ts**
- Line 47: `(callback: any)` - Mock setTimeout callback

**tests/server-runner.test.ts**
- Multiple lines: Various `as any` type assertions for mock child processes

## Legacy Tools (Deprecated)

**tools/agent_generator.ts**
- Lines 9, 15, 19, 26: Various `any` types for legacy tool interfaces

**tools/agent_invoker.ts**
- Lines 11, 17, 21, 28, 60, 153, 158, 159, 215, 232, 254, 492, 549, 577, 826: Extensive `any` usage in legacy implementation

**tools/server_runner.ts**
- Line 248: `request: any`, `Promise<any>` - Legacy request handling

**tools/test_executor.ts**
- Lines 360, 361: `any` types for Jest result processing

**tools/test_runner.ts**
- Line 266: `request: any`, `Promise<any>` - Legacy request handling

## Summary Statistics

- **Total `any` usages**: 89 instances (excluding node_modules)
- **Core source files**: 15 instances
- **Type definitions**: 2 instances  
- **Utility modules**: 16 instances
- **Test files**: 6 instances
- **Legacy tools**: 50 instances

## Recommendations

1. **High Priority**: Replace `any` types in core interfaces with proper type definitions
2. **Medium Priority**: Add generic constraints to utility functions
3. **Low Priority**: Maintain `any` types in test files for flexibility
4. **Deprecated**: Legacy tools should be removed entirely

## Type Safety Improvements

Most `any` usages can be replaced with:
- `Record<string, unknown>` for object types
- Generic type parameters `<T>` for reusable functions
- Union types for known value sets
- `unknown` type for truly unknown data