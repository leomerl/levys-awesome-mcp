# MCP Agent Assignment Matrix

This document tracks which third-party MCPs are enabled for each agent.

**Last Updated**: 2025-10-04

---

## Agent MCP Assignments

| Agent | Context7 | Memory | GitHub | Playwright | Notes |
|-------|----------|--------|--------|------------|-------|
| **research-agent** | ✅ | ❌ | ❌ | ❌ | Needs library documentation |
| **orchestrator-agent** | ❌ | ✅ | ❌ | ❌ | Workflow state persistence |
| **sparc-orchestrator** | ❌ | ✅ | ❌ | ❌ | SPARC workflow state tracking |
| **specification-agent** | ⚠️ | ❌ | ❌ | ❌ | Recommended: Context7 |
| **architecture-agent** | ⚠️ | ❌ | ❌ | ❌ | Recommended: Context7 |
| **github-issue-creator** | ❌ | ❌ | ⚠️ | ❌ | Recommended: GitHub |
| **reviewer-agent** | ❌ | ❌ | ⚠️ | ❌ | Recommended: GitHub |
| **testing-agent** | ❌ | ❌ | ❌ | ⚠️ | Playwright available but not recommended |
| **builder-agent** | ❌ | ❌ | ❌ | ❌ | No MCP needed |
| **linter-agent** | ❌ | ❌ | ❌ | ❌ | No MCP needed |

**Legend**:
- ✅ **Enabled**: MCP is active for this agent
- ❌ **Not Enabled**: MCP not configured
- ⚠️ **Recommended**: Should consider enabling

---

## MCP Details

### Context7 MCP
**Type**: HTTP
**Purpose**: AI-powered documentation and code examples
**Requires**: `CONTEXT7_API_KEY` in `.env`

**Tools**:
- `mcp__context7__resolve-library-id`
- `mcp__context7__get-library-docs`

**Enabled For**:
- research-agent ✅

**Recommended For**:
- specification-agent (API references)
- architecture-agent (implementation patterns)

---

### Memory MCP
**Type**: Command (local)
**Purpose**: Persistent key-value storage across sessions
**Requires**: None (runs locally)

**Tools**:
- `mcp__memory__store`
- `mcp__memory__retrieve`
- `mcp__memory__delete`
- `mcp__memory__list`

**Enabled For**:
- orchestrator-agent ✅
- sparc-orchestrator ✅

**Use Cases**:
- Track workflow state across agent invocations
- Persist task progress and session data
- Share context between sequential agent calls

---

### GitHub MCP
**Type**: Command
**Purpose**: GitHub API integration for repos, issues, PRs
**Requires**: `GITHUB_PERSONAL_ACCESS_TOKEN` in `.env`

**Tools**:
- `mcp__github__create-or-update-file`
- `mcp__github__search-repositories`
- `mcp__github__create-repository`
- `mcp__github__get-file-contents`
- `mcp__github__push-files`
- `mcp__github__create-issue`
- `mcp__github__create-pull-request`
- `mcp__github__fork-repository`
- `mcp__github__create-branch`

**Enabled For**:
- None (available but not yet enabled)

**Recommended For**:
- github-issue-creator (automated issue creation)
- reviewer-agent (PR comments and reviews)
- deployment agents (release automation)

---

### Playwright MCP
**Type**: Command (local)
**Purpose**: Browser automation for testing
**Requires**: None (runs locally)

**Tools**:
- `mcp__playwright__navigate`
- `mcp__playwright__screenshot`
- `mcp__playwright__click`
- `mcp__playwright__fill`
- `mcp__playwright__evaluate`

**Enabled For**:
- None (intentionally not enabled)

**Notes**:
- Heavy resource usage
- Use sparingly for E2E testing only
- Available in registry but not recommended for general use

---

## How to Enable MCPs for Agents

### For New Agents

```typescript
import { enableContext7, enableMemory, enableGitHub } from '../src/utilities/mcp/index.js';

const baseConfig: AgentConfig = {
  name: "my-agent",
  // ... config
};

// Enable single MCP
const agent = enableContext7(baseConfig, true);

// Enable multiple MCPs
const agent = enableThirdPartyMcps(baseConfig, {
  mcpIds: ['context7', 'memory'],
  validateEnvVars: true
});
```

### For Existing Agents

1. Import the enabler function
2. Rename existing config to `baseConfig`
3. Call enabler and assign to agent variable
4. Export the enhanced agent

See `agents/research-agent.ts` for example.

---

## Environment Setup

Required environment variables in `.env`:

```bash
# Context7 (required for research-agent)
CONTEXT7_API_KEY=your_api_key_here

# GitHub (optional, for future use)
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token_here

# Memory and Playwright run locally (no credentials needed)
```

---

## Testing MCP Integration

### Verify Context7
```bash
npx tsx agents/research-agent.ts "Research React hooks using Context7"
# Check output_streams/*/stream.log for mcp__context7__* tools
```

### Verify Memory
```bash
# Memory tools available to orchestrator-agent and sparc-orchestrator
# Check agent logs for mcp__memory__* tools
```

### Verify GitHub (when enabled)
```bash
# After enabling for an agent:
npx tsx agents/github-issue-creator.ts "Create issue in repo..."
```

---

## Future Recommendations

1. **Enable Context7** for:
   - specification-agent
   - architecture-agent

2. **Enable GitHub** for:
   - github-issue-creator
   - reviewer-agent

3. **Keep Playwright** disabled unless specifically needed for E2E testing

4. **Consider adding**:
   - Brave Search MCP for research-agent (better web search)
   - PostgreSQL/MongoDB MCP for database agents

---

## Registry Status

All MCPs are registered and available:

```typescript
// src/utilities/mcp/third-party-mcp-registry.ts
THIRD_PARTY_MCP_REGISTRY = {
  context7: { ... },   // ✅ HTTP MCP
  memory: { ... },     // ✅ Command MCP
  github: { ... },     // ✅ Command MCP
  playwright: { ... }  // ✅ Command MCP
}
```

All enabler functions exported:

```typescript
// src/utilities/mcp/index.ts
export {
  enableContext7,
  enableMemory,
  enableGitHub,
  enablePlaywright
}
```
