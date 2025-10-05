# Agent Reference

This document defines all available agents, their roles, and tool permissions.

## Agent Structure

All agents follow this standardized structure:
- Import `query` from `@anthropic-ai/claude-code`
- Specific, limited tool access based on role
- No access to `Bash` tool (security restriction)
- Export both config and instance for flexible usage

## Agent Catalog

### Orchestrator Agent
**Role**: Coordinates development workflows, routes tasks to specialized agents

**Model**: Opus (for superior planning and coordination)

**Tools**:
- Core: `Glob`, `Grep`, `Read`, `WebFetch`, `WebSearch`, `BashOutput`
- MCP:
  - `mcp__levys-awesome-mcp__invoke_agent`
  - `mcp__levys-awesome-mcp__list_agents`
  - `mcp__levys-awesome-mcp__get_summary`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_plan`
  - `mcp__levys-awesome-mcp__create_plan`
  - `mcp__levys-awesome-mcp__compare_plan_progress`
  - `mcp__levys-awesome-mcp__get_failed_tasks`
  - `mcp__levys-awesome-mcp__update_progress`

**Key Features**:
- Coordinates multi-agent workflows
- Enforces one-task-at-a-time execution
- Automatic progress tracking
- Self-healing (up to 2 retries per task)
- Always runs validation phases (reviewer, builder, linter, testing)
- Delivers complete, working, validated output

### Backend Agent
**Role**: Backend development, API endpoints, server logic

**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__backend_write` (restricted to backend folders)
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Restrictions**:
- Can only write to backend folders (configurable via `.content-writer.json`)
- Cannot access frontend directories

### Frontend Agent
**Role**: Frontend development, React components, UI

**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__frontend_write` (restricted to frontend folders)
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Restrictions**:
- Can only write to frontend folders (configurable via `.content-writer.json`)
- Cannot access backend directories

### Builder Agent
**Role**: Build processes, compilation, verification

**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__build_project`
  - `mcp__levys-awesome-mcp__build_backend`
  - `mcp__levys-awesome-mcp__build_frontend`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Output**: Structured JSON build result reports

### Linter Agent
**Role**: Code quality analysis, linting

**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__lint_javascript`
  - `mcp__levys-awesome-mcp__security_scan`
  - `mcp__levys-awesome-mcp__dependency_check`
  - `mcp__levys-awesome-mcp__code_quality_scan`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Features**:
- ESLint integration
- Security scanning (npm audit, bandit)
- Dependency checking
- Comprehensive code quality assessment

### Planner Agent
**Role**: Task analysis, execution planning

**Model**: Opus (for superior analytical capabilities)

**Tools**:
- Core: `Glob`, `Grep`, `Read`, `WebFetch`, `WebSearch`
- MCP:
  - `mcp__levys-awesome-mcp__create_plan`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Output**: Detailed execution plan with:
- Task breakdown (TASK-001, TASK-002, etc.)
- Dependencies between tasks
- Agent assignments
- Files to modify
- Estimated duration

### Reviewer Agent
**Role**: Plan validation and progress review

**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__get_plan`
  - `mcp__levys-awesome-mcp__compare_plan_progress`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Key Features**:
- Compares plan vs progress
- Validates goal achievement
- Provides acceptance status (ACCEPTED/REJECTED)
- Identifies critical tasks needing fixes
- Triggers review feedback loops

### Testing Agent
**Role**: Test creation and execution

**Tools**:
- Core: `Glob`, `Grep`, `Read`
- MCP:
  - `mcp__levys-awesome-mcp__run_tests`
  - `mcp__levys-awesome-mcp__validate_and_run_tests`
  - `mcp__levys-awesome-mcp__put_summary`
  - `mcp__levys-awesome-mcp__get_summary`

**Features**:
- Multi-framework support (Jest, Vitest, Playwright)
- Comprehensive test suite execution
- Failure analysis
- Coverage reporting
- Generates orchestrator instructions for feedback loops

### Agent Creator
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

**Features**:
- Validates agent configurations for Claude Code query API compatibility
- Assigns appropriate tools based on agent role
- Follows established naming and structure patterns

### Static Test Creator
**Role**: Creates compile-time type tests for TypeScript code with generics and type transformations

**Tools**:
- Core: `Read`, `Glob`, `Grep`
- MCP:
  - `mcp__levys-awesome-mcp__backend_write`
  - `mcp__levys-awesome-mcp__frontend_write`
  - `mcp__levys-awesome-mcp__docs_write`

**Features**:
- Static type validation tests
- Compile-time guarantees
- No runtime overhead

### Development Server Runners

Tools available to start development servers:
- `mcp__levys-awesome-mcp__run_dev_backend` - Start backend server
- `mcp__levys-awesome-mcp__run_dev_frontend` - Start frontend server
- `mcp__levys-awesome-mcp__run_dev_all` - Start both servers

## Security Restrictions

### Prohibited Tools (All Agents)
- **Bash**: No agent has access to `Bash` tool for security reasons
- **Task**: Blocked to prevent infinite loops
- **TodoWrite**: Blocked for orchestrator sub-agents

### Tool Naming Convention
- MCP tools use format: `mcp__levys-awesome-mcp__[tool_name]`
- Core Claude Code tools use standard names

### Permission Enforcement
- **Backend agents**: Can only write to backend folders
- **Frontend agents**: Can only write to frontend folders
- **Agent isolation**: Strict folder boundaries enforced
- **Runtime validation**: All operations checked against permissions

## Agent Template Structure

```typescript
import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../src/types/agent-config.js';

const agentConfig: AgentConfig = {
  name: 'agent-name',
  description: 'Agent purpose and capabilities',
  model: 'sonnet', // or 'opus' for planning/coordination
  options: {
    model: 'sonnet',
    allowedTools: [
      // Core Claude Code tools
      'Read', 'Grep', 'Glob',
      // MCP tools
      'mcp__levys-awesome-mcp__specific_tool'
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    },
    systemPrompt: \`...\`
  }
};

export { agentConfig };
export default agentConfig;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  for await (const message of query({
    prompt,
    options: agentConfig.options
  })) {
    // Handle messages
  }
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  runAgent().catch(console.error);
}
```

## Invoking Agents

### Via MCP Tool
```typescript
await handleAgentInvokerTool('invoke_agent', {
  agentName: 'backend-agent',
  prompt: 'Create user authentication API',
  sessionId: 'unique-session-id',
  taskNumber: 1  // For automatic progress tracking
});
```

### Via CLI
```bash
npx tsx agents/backend-agent.ts "Create user authentication API"
```

## Agent Discovery

The system automatically discovers all agents in the `agents/` directory:

```bash
# List available agents
npm run list-agents

# Agents are automatically detected by AgentLoader
# No manual registration required
```

## Best Practices

1. **Minimal Permissions**: Each agent has only the tools it needs
2. **Explicit Tool Lists**: Always specify exact tools, never use wildcards
3. **Session Tracking**: Include sessionId for all agent invocations
4. **Summary Reports**: Always create summary reports via put_summary
5. **Progress Updates**: Use taskNumber for automatic progress tracking
6. **Error Handling**: Log all errors to session files
7. **Tool Validation**: Use PermissionManager to validate configurations
