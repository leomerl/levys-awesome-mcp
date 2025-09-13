# Claude Code MCP Tool Permission Issue

## Issue Summary
When invoking agents through the Claude Code SDK with MCP servers configured, agents cannot execute MCP tools even when they are explicitly listed in `allowedTools`. Claude Code reports "Claude requested permissions to use [tool], but you haven't granted it yet" despite the tool being in the allowed list.

## Symptoms
1. Agents see MCP tools in their available tools list
2. Agents attempt to use the tools (e.g., `backend_write`)
3. Claude Code blocks execution with a permission error
4. Tasks fail with "Tool access denied"

## What We Fixed
The following issues were successfully resolved:

### 1. Duplicate Tool Prefixes
- **Problem**: Agent configs had duplicate prefixes like `mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__content-writer__backend_write`
- **Solution**: Fixed all agent configuration files to use correct format: `mcp__levys-awesome-mcp__mcp__content-writer__backend_write`
- **Files Modified**: All files in `/agents/*.ts`

### 2. Permission Manager Not Preserving MCP Tools
- **Problem**: When using `agentRole`, the permission manager was only keeping role-based built-in tools, losing explicitly allowed MCP tools
- **Solution**: Modified `getAgentPermissions` to preserve ALL explicitly allowed tools when combining with role-based permissions
- **File Modified**: `src/utilities/agents/permission-manager.ts`

### 3. Tools Listed as Forbidden in Restriction Prompt
- **Problem**: Even allowed tools were being listed in the "FORBIDDEN" section of the restriction prompt
- **Solution**: Tools are no longer incorrectly marked as forbidden; the restriction prompt only shows truly disallowed tools
- **Impact**: Agents no longer see conflicting messages about tool availability

### 4. Content Writer Handler Tool Name Matching
- **Problem**: The handler used exact string matching, failing when Claude Code used different prefixes
- **Solution**: Added normalization to handle both short and long form tool names
- **File Modified**: `src/handlers/content-writer.ts`

## Remaining Issue
Despite these fixes, Claude Code's permission system still blocks MCP tool execution:

### The Problem
- Claude Code uses a long form when calling MCP tools: `mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__content-writer__backend_write`
- We pass this long form in `allowedTools` to match what Claude Code expects
- The MCP server correctly handles both forms
- BUT: Claude Code still says "permissions not granted"

### Attempted Solutions That Didn't Work
1. Changing `permissionMode` from `'acceptEdits'` to `'auto'`
2. Converting tool names between short and long forms
3. Passing both forms in allowedTools

## Root Cause Analysis
The issue appears to be a fundamental limitation in how Claude Code's SDK handles MCP tool permissions when:
1. Using the programmatic `query()` API
2. With `mcpServers` configured
3. Passing MCP tools in `allowedTools`

Claude Code seems to expect an additional permission grant mechanism that isn't available through the programmatic API, possibly related to interactive permission prompts that only work in the CLI context.

## Current Workaround
None identified. The agents can see and attempt to use the tools, but Claude Code's permission system blocks execution.

## Test Case
```javascript
// This should work but doesn't due to permission issues
import { query } from '@anthropic-ai/claude-code';

const result = await query({
  prompt: 'Use backend_write to create a file',
  options: {
    allowedTools: [
      'mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__content-writer__backend_write'
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    }
  }
});
// Result: "Claude requested permissions... but you haven't granted it yet"
```

## Impact
- Agents cannot use write operations through MCP tools
- Backend and frontend agents cannot create or modify files
- Summary reports cannot be created via `put_summary`

## Attempted Fix (2025-09-13)

### Changes Made
1. **Created MCP configuration file** (`mcp-config.json`):
   - Proper JSON structure with `mcpServers` wrapper
   - Contains the levys-awesome-mcp server configuration

2. **Updated agent-invoker.ts**:
   - Replaced inline `mcpServers` object with `mcpConfig` file path
   - Removed tool name conversion logic (no longer needed)

3. **Updated all agent files**:
   - Removed inconsistent `mcpServers` array from AgentConfig
   - Updated `runAgent()` functions to use `mcpConfig` instead of inline object

4. **Updated type definitions**:
   - Replaced `mcpServers?: string[]` with `mcpConfig?: string` in AgentConfig type

### Test Results
- ✅ Code compiles successfully
- ✅ Integration tests pass without errors
- ✅ MCP server responds correctly when tested directly
- ❌ Claude Code SDK still doesn't execute MCP tools despite seeing them

### Current Status
The permission issue persists even with proper mcpConfig file format. The Claude Code SDK:
1. Successfully loads the MCP server configuration
2. Shows the MCP tools as available to agents
3. Completes without error
4. But doesn't actually execute the MCP tool calls

## Next Steps
1. The issue appears to be a deeper limitation in Claude Code SDK's programmatic API
2. May need to file an issue with the Claude Code SDK repository
3. Consider using stdio-based direct MCP communication as an alternative
4. Investigate if there's an undocumented permission grant mechanism required

## Related Files
- `/src/handlers/agent-invoker.ts` - Where agents are invoked with Claude Code
- `/src/handlers/content-writer.ts` - MCP tool implementations
- `/src/utilities/agents/permission-manager.ts` - Permission management logic
- `/agents/*.ts` - Agent configuration files