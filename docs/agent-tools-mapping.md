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

### agent-creator
**Role**: Creates new TypeScript SDK agents following established patterns
**Tools**:
- Core: `Read`, `Glob`, `Grep`, `WebSearch`, `WebFetch`
- MCP:
  - `mcp__levys-awesome-mcp__agents_write`
  - `mcp__levys-awesome-mcp__docs_write`
  - `mcp__levys-awesome-mcp__list_agents`
  - `mcp__levys-awesome-mcp__convert_agent_ts_to_claude_md`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

### static-test-creator
**Role**: Creates compile-time type tests for TypeScript code with generics and type transformations
**Tools**:
- Core: `Read`, `Glob`, `Grep`
- MCP:
  - `mcp__levys-awesome-mcp__backend_write`
  - `mcp__levys-awesome-mcp__frontend_write`
  - `mcp__levys-awesome-mcp__docs_write`

### static-test-absence-detector
**Role**: Analyzes TypeScript code to identify where static type tests are missing, creates plans for adding them, and coordinates with static-test-writer agent
**Tools**:
- Core: `Read`, `Glob`, `Grep`
- MCP:
  - `mcp__levys-awesome-mcp__create_plan`
  - `mcp__levys-awesome-mcp__update_progress`
  - `mcp__levys-awesome-mcp__invoke_agent`
  - `mcp__levys-awesome-mcp__list_agents`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_plan`

### static-test-writer
**Role**: Writes comprehensive compile-time type tests for TypeScript code based on specifications from static-test-absence-detector
**Tools**:
- Core: `Read`, `Glob`, `Grep`
- MCP:
  - `mcp__levys-awesome-mcp__backend_write`
  - `mcp__levys-awesome-mcp__frontend_write`
  - `mcp__levys-awesome-mcp__update_progress`
  - `mcp__levys-awesome-mcp__put_summary`

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