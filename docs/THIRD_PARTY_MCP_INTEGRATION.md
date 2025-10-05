# Third-Party MCP Integration Guide

This guide explains how to integrate third-party MCP servers into levys-awesome-mcp agents.

## Overview

The third-party MCP integration system provides:
- **Agent-level opt-in**: Agents explicitly choose which MCPs to use
- **Environment variable support**: Secure credential management via `.env` files
- **Runtime resolution**: MCP configs are resolved at agent invocation time
- **Extensible registry**: Easy to add new third-party MCPs

## Quick Start

### 1. Set up environment variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API keys
# For example:
# CONTEXT7_API_KEY=your_actual_api_key_here
```

### 2. Enable an MCP in your agent

```typescript
// agents/my-agent.ts
import { AgentConfig } from '../src/types/agent-config.ts';
import { enableContext7 } from '../src/utilities/mcp/index.js';

const baseConfig: AgentConfig = {
  name: "my-agent",
  description: "My custom agent",
  options: {
    model: "sonnet",
    systemPrompt: `...`,
    allowedTools: [
      "Read",
      "Write"
      // Context7 tools will be added automatically
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    }
  }
};

// Enable context7 MCP
const myAgentAgent = enableContext7(baseConfig, true);

export { myAgentAgent };
export default myAgentAgent;
```

### 3. Build and run

```bash
npm run build
npx tsx agents/my-agent.ts "your task here"
```

## Available Third-Party MCPs

### Context7

**Description**: AI-powered documentation and code examples from Upstash

**Setup**:
```bash
# Add to .env
CONTEXT7_API_KEY=your_context7_api_key
```

**Tools**:
- `mcp__context7__resolve-library-id` - Find library IDs for documentation
- `mcp__context7__get-library-docs` - Get up-to-date library documentation

**Usage**:
```typescript
import { enableContext7 } from '../src/utilities/mcp/index.js';
const agent = enableContext7(baseConfig, true);
```

**Recommended For**: `research-agent`, `specification-agent`, `architecture-agent`

**Get API Key**: https://upstash.com/docs/context7

---

### Memory MCP

**Description**: Persistent key-value storage for agent state across sessions

**Setup**: No API key required (runs locally)

**Tools**:
- `mcp__memory__store` - Store key-value pairs
- `mcp__memory__retrieve` - Retrieve stored values
- `mcp__memory__delete` - Delete stored values
- `mcp__memory__list` - List all stored keys

**Usage**:
```typescript
import { enableMemory } from '../src/utilities/mcp/index.js';
const agent = enableMemory(baseConfig, true);
```

**Recommended For**: `orchestrator-agent`, `sparc-orchestrator` (track workflow state)

---

### GitHub MCP

**Description**: GitHub API integration for repositories, issues, PRs, and workflows

**Setup**:
```bash
# Add to .env
# Create token at: https://github.com/settings/tokens
# Required scopes: repo, workflow
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token
```

**Tools**:
- `mcp__github__create-or-update-file` - Create or update files in repos
- `mcp__github__search-repositories` - Search for repositories
- `mcp__github__create-repository` - Create new repositories
- `mcp__github__get-file-contents` - Read file contents
- `mcp__github__push-files` - Push multiple files
- `mcp__github__create-issue` - Create GitHub issues
- `mcp__github__create-pull-request` - Create PRs
- `mcp__github__fork-repository` - Fork repositories
- `mcp__github__create-branch` - Create branches

**Usage**:
```typescript
import { enableGitHub } from '../src/utilities/mcp/index.js';
const agent = enableGitHub(baseConfig, true);
```

**Recommended For**: `github-issue-creator`, `reviewer-agent`, `deployment agents`

**Get API Token**: https://github.com/settings/tokens

---

### Playwright MCP

**Description**: Browser automation for testing and web scraping

**Setup**: No API key required (runs locally)

**Tools**:
- `mcp__playwright__navigate` - Navigate to URLs
- `mcp__playwright__screenshot` - Take screenshots
- `mcp__playwright__click` - Click elements
- `mcp__playwright__fill` - Fill form fields
- `mcp__playwright__evaluate` - Execute JavaScript

**Usage**:
```typescript
import { enablePlaywright } from '../src/utilities/mcp/index.js';
const agent = enablePlaywright(baseConfig, true);
```

**Recommended For**: `testing-agent`, `e2e-test agents` (use sparingly, heavy resource usage)

---

### Language Server MCP

**Description**: TypeScript/JavaScript language server for code intelligence, symbol navigation, and diagnostics

**Setup**:
```bash
# 1. Install Go
# Download from: https://golang.org/

# 2. Install mcp-language-server
go install github.com/isaacphi/mcp-language-server@latest

# 3. Install TypeScript language server
npm install -g typescript-language-server typescript

# 4. Add to .env
WORKSPACE_PATH=/absolute/path/to/your/project
```

**Tools**:
- `mcp__languageServer__getDefinition` - Get symbol definitions
- `mcp__languageServer__getReferences` - Find all symbol references
- `mcp__languageServer__getDiagnostics` - Get code diagnostics/errors
- `mcp__languageServer__getHover` - Get hover information
- `mcp__languageServer__renameSymbol` - Rename symbols across project
- `mcp__languageServer__editFile` - Edit files with precise line-number edits

**Usage**:
```typescript
import { enableLanguageServer } from '../src/utilities/mcp/index.js';
const agent = enableLanguageServer(baseConfig, true);
```

**Recommended For**: `backend-agent`, `frontend-agent`, SPARC development agents

**Installation Guide**: See detailed steps in `.env.example`

**GitHub**: https://github.com/isaacphi/mcp-language-server

## Adding New Third-Party MCPs

### 1. Add MCP to registry

Edit `src/utilities/mcp/third-party-mcp-registry.ts`:

```typescript
export const THIRD_PARTY_MCP_REGISTRY: ThirdPartyMcpRegistry = {
  context7: { /* ... */ },

  // Add your new MCP
  myNewMcp: {
    id: 'myNewMcp',
    name: 'My New MCP',
    description: 'What this MCP does',
    command: 'npx',
    args: ['-y', '@scope/my-mcp-package', '--api-key', '${MY_MCP_API_KEY}'],
    requiredEnvVars: ['MY_MCP_API_KEY'],
    tools: [
      'mcp__myNewMcp__tool1',
      'mcp__myNewMcp__tool2'
    ],
    enabled: true
  }
};
```

### 2. Add to .env.example

```bash
# .env.example
MY_MCP_API_KEY=your_api_key_here
```

### 3. Create convenience enabler (optional)

Edit `src/utilities/mcp/agent-mcp-enabler.ts`:

```typescript
export const enableMyNewMcp = createMcpEnabler('myNewMcp');
```

### 4. Export from index

Edit `src/utilities/mcp/index.ts`:

```typescript
export {
  enableThirdPartyMcps,
  createMcpEnabler,
  enableContext7,
  enableMyNewMcp, // Add this
  // ...
} from './agent-mcp-enabler.js';
```

## Manual MCP Enablement

For more control, use `enableThirdPartyMcps` directly:

```typescript
import { enableThirdPartyMcps } from '../src/utilities/mcp/index.js';

const agent = enableThirdPartyMcps(baseConfig, {
  mcpIds: ['context7', 'myNewMcp'],
  validateEnvVars: true,        // Validate env vars are present
  throwOnMissingEnv: false      // Log warning instead of throwing
});
```

## Environment Variable Resolution

The system supports `${VAR_NAME}` placeholders in MCP args:

```typescript
args: ['--api-key', '${MY_API_KEY}', '--secret', '${MY_SECRET}']
```

At runtime:
1. `.env` file is loaded (if present)
2. Placeholders are replaced with actual env var values
3. Missing required env vars trigger warnings/errors

## Validation

### Check if MCP is enabled

```typescript
import { hasThirdPartyMcp } from '../src/utilities/mcp/index.js';

const hasContext7 = hasThirdPartyMcp(agentConfig, 'context7');
```

### Get enabled MCPs

```typescript
import { getEnabledMcpIds } from '../src/utilities/mcp/index.js';

const enabledMcps = getEnabledMcpIds(agentConfig);
// Returns: ['context7', 'myNewMcp']
```

### Get available tools

```typescript
import { getThirdPartyMcpTools } from '../src/utilities/mcp/index.js';

const tools = getThirdPartyMcpTools(agentConfig);
// Returns: ['mcp__context7__resolve-library-id', 'mcp__context7__get-library-docs', ...]
```

## Security Best Practices

1. **Never commit .env**: Already in `.gitignore`, keep it that way
2. **Use read-only API keys**: When possible, use keys with minimal permissions
3. **Agent-level opt-in**: Only enable MCPs for agents that need them
4. **Validate env vars**: Set `validateEnvVars: true` to catch missing credentials early
5. **Audit tool usage**: Check session logs in `output_streams/` for tool usage

## Troubleshooting

### MCP not working

1. **Check env vars are set**:
   ```bash
   # Verify .env file exists and has the key
   cat .env | grep CONTEXT7_API_KEY
   ```

2. **Check agent logs**:
   ```bash
   # Look for MCP resolution messages
   grep "AgentInvoker.*MCP" output_streams/*/session.log
   ```

3. **Verify MCP is enabled**:
   ```typescript
   // In your agent file, ensure enableContext7 is called
   const agent = enableContext7(baseConfig, true);
   ```

### Environment variables not loading

- Ensure `.env` is in project root directory
- Check file permissions (`chmod 600 .env`)
- Rebuild after changes: `npm run build`

### Tools not available

- Verify tools are in MCP registry's `tools` array
- Check that tools are added to agent's `allowedTools` (done automatically by `enableContext7`)
- Review `PermissionManager` logs for tool restrictions

## Examples

### Research Agent with Context7

See `agents/research-agent.ts` for a complete example of Context7 integration.

Key features:
- Loads library documentation for technology stack analysis
- Resolves library IDs automatically
- Fetches up-to-date API references and code examples

### Custom Agent with Multiple MCPs

```typescript
import { enableThirdPartyMcps } from '../src/utilities/mcp/index.js';

const agent = enableThirdPartyMcps(baseConfig, {
  mcpIds: ['context7', 'github', 'jira'],
  validateEnvVars: true
});
```

## Architecture

```
Agent File (agents/my-agent.ts)
    ↓
enableContext7(config) / enableThirdPartyMcps(config, {...})
    ↓
Agent Invoker (src/handlers/agent-invoker.ts)
    ↓
resolveMcpConfig(mcpId) - Resolves env vars
    ↓
Third-Party MCP Registry (src/utilities/mcp/third-party-mcp-registry.ts)
    ↓
Env Resolver (src/utilities/mcp/env-resolver.ts) - Loads .env
    ↓
Claude Code Query API - Invokes agent with resolved MCP servers
```

## API Reference

See TypeScript types in:
- `src/types/third-party-mcp.ts` - Core types
- `src/utilities/mcp/index.ts` - Exported utilities

## Contributing

To add support for a new third-party MCP:

1. Add to registry in `third-party-mcp-registry.ts`
2. Add env var template to `.env.example`
3. Create convenience enabler function
4. Update this documentation
5. Add example agent usage
6. Submit PR with tests

## Further Reading

- [Context7 Documentation](https://upstash.com/docs/context7)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Agent Configuration Guide](./AGENTS.md)
