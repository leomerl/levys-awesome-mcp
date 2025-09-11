# Agent Tools Mapping

This document defines which tools each agent has access to. All agents follow the same structure:
- Import `query` from `@anthropic-ai/claude-code`
- No agent has access to `Bash` tool (security restriction)
- Each agent has specific, limited tool access based on their role

## Agent Tool Assignments

### orchestrator
**Role**: Coordinates development workflows, routes tasks to specialized agents
**Tools**:
- Core: `Glob`, `Grep`, `Read`, `WebFetch`, `WebSearch`, `BashOutput`
- MCP: 
  - `mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent`
  - `mcp__levys-awesome-mcp__mcp__agent-invoker__list_agents`
  - `mcp__levys-awesome-mcp__mcp__agent-invoker__get_agent_info`
  - `mcp__levys-awesome-mcp__mcp__agent-invoker__get_agent_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__get_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__put_summary`

### backend-agent
**Role**: Backend development, API endpoints, server logic
**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__mcp__content-writer__backend_write`
  - `mcp__levys-awesome-mcp__mcp__content-writer__put_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__get_summary`

### frontend-agent
**Role**: Frontend development, React components, UI
**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__mcp__content-writer__frontend_write`
  - `mcp__levys-awesome-mcp__mcp__content-writer__put_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__get_summary`

### builder
**Role**: Build processes, compilation, verification
**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__mcp__build-executor__build_project`
  - `mcp__levys-awesome-mcp__mcp__build-executor__build_backend`
  - `mcp__levys-awesome-mcp__mcp__build-executor__build_frontend`
  - `mcp__levys-awesome-mcp__mcp__content-writer__put_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__get_summary`

### linter
**Role**: Code quality analysis, linting
**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript`
  - `mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan`
  - `mcp__levys-awesome-mcp__mcp__code-analyzer__dependency_check`
  - `mcp__levys-awesome-mcp__mcp__code-analyzer__code_quality_scan`
  - `mcp__levys-awesome-mcp__mcp__content-writer__put_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__get_summary`

### planner
**Role**: Task analysis, execution planning
**Tools**:
- Core: `Glob`, `Grep`, `Read`, `WebFetch`, `WebSearch`
- MCP:
  - `mcp__levys-awesome-mcp__mcp__plan-creator__create_plan`
  - `mcp__levys-awesome-mcp__mcp__content-writer__put_summary`
  - `mcp__levys-awesome-mcp__mcp__content-writer__get_summary`

## Security Restrictions

### Prohibited Tools
- **Bash**: No agent has access to `Bash` tool for security reasons
- **Task**: Blocked to prevent infinite loops
- **TodoWrite**: Blocked for orchestrator sub-agents (only main orchestrator can use)

### Tool Naming Convention
- All MCP tools use format: `mcp__levys-awesome-mcp__mcp__[handler]__[tool]`
- Core Claude Code tools use their standard names

## Agent Structure Template

All agents must follow this structure:

```typescript
import { query } from "@anthropic-ai/claude-code";

interface AgentConfig {
  name: string;
  description: string;
  model: string;
  permissions: {
    mode: 'default' | 'acceptEdits' | 'ask';
    tools: {
      allowed: string[];
      denied: string[];
    };
    mcpServers: Record<string, 'allow' | 'deny' | 'ask'>;
  };
  systemPrompt: string;
  context: {
    maxTokens: number;
    temperature: number;
  };
}

const agentConfig: AgentConfig = {
  // ... configuration
};

export { agentConfig };
export default agentConfig;

// Direct execution logic with query() import
async function runAgent() {
  // ... implementation using query from @anthropic-ai/claude-code
}
```