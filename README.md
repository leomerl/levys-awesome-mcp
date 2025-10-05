# Levy's Awesome MCP

AI agent orchestration toolkit for Claude Code. Automates complex development tasks through specialized agents with intelligent coordination, self-healing, and comprehensive validation.

## Installation

### Option 1: From GitHub (Recommended)

```bash
npm install git+https://github.com/leomerl/levys-awesome-mcp.git
```

Or add to your `package.json`:
```json
{
  "dependencies": {
    "@leomerl/levys-awesome-mcp": "github:leomerl/levys-awesome-mcp"
  }
}
```

### Option 2: From npm (when published)

```bash
npm install @leomerl/levys-awesome-mcp
```

### Configure Claude Code

Add to `.claude/claude.json`:
```json
{
  "mcpServers": {
    "levys-awesome-mcp": {
      "command": "npx",
      "args": ["@leomerl/levys-awesome-mcp"]
    }
  }
}
```

### Environment Configuration

Create a `.env` file in your project root:
```bash
# Required for Language Server MCP
WORKSPACE_PATH=/path/to/your/project

# Optional: Context7 MCP for documentation
CONTEXT7_API_KEY=your_api_key_here

# Optional: GitHub MCP for repository automation
GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token
```

## Quick Start

### Orchestrate Development Tasks

```bash
/orchestrate build a complete user authentication system with tests
```

The orchestrator will:
1. **Plan** - Analyze requirements and create execution plan
2. **Execute** - Assign tasks to specialized agents (backend, frontend, testing, etc.)
3. **Self-Heal** - Automatically retry failed tasks with correct agents (up to 2 retries)
4. **Validate** - Run reviewer, builder, linter, and testing agents
5. **Report** - Provide comprehensive status of what works and what's validated

### Available Agents

- **orchestrator-agent** - Coordinates multi-agent workflows with self-healing (Memory MCP enabled)
- **planner-agent** - Creates detailed execution plans
- **backend-agent** - API and server development (Language Server MCP enabled)
- **frontend-agent** - UI and client-side code (Language Server MCP enabled)
- **reviewer-agent** - Validates plan vs progress and goal achievement
- **builder-agent** - Build and compilation verification
- **linter-agent** - Code quality checks
- **testing-agent** - Test creation and execution
- **research-agent** - Technology research and documentation (Context7 MCP enabled)

## Key Features

- ✅ **Self-Healing**: Automatically retries failed tasks with correct agents (max 2 attempts)
- ✅ **Never Stops Mid-Workflow**: Continues with remaining tasks even if some fail
- ✅ **Mandatory Validation**: Always runs all validation phases
- ✅ **Session Management**: Resume agent sessions with retained memory
- ✅ **Dynamic Tool Restrictions**: Automatic security enforcement across all agents
- ✅ **Progress Tracking**: Automatic task state management and file modification tracking
- ✅ **Folder Isolation**: Backend/frontend agents restricted to their respective directories

## Optional Third-Party MCPs

### Language Server MCP - TypeScript/JavaScript Code Intelligence (✅ Enabled)
```bash
# Install dependencies
brew install go  # or: sudo apt-get install golang-go
go install github.com/isaacphi/mcp-language-server@latest
npm install -g typescript-language-server typescript

# Add to .env
WORKSPACE_PATH=/path/to/your/project
```

**Enabled for**: backend-agent, frontend-agent | **Tools**: diagnostics, definition, references, hover, rename, edit

### Other MCPs
- **Context7** - Library docs (research-agent) | Requires: `CONTEXT7_API_KEY`
- **Memory** - Workflow state (orchestrators) | Auto-enabled
- **GitHub** - Repository ops | Requires: `GITHUB_PERSONAL_ACCESS_TOKEN`
- **Playwright** - Browser automation | Auto-available

See [THIRD_PARTY_MCP_INTEGRATION.md](docs/THIRD_PARTY_MCP_INTEGRATION.md) for details.

## Documentation

- **[Architecture](docs/ARCHITECTURE.md)** - Core system design, session management, dynamic tool restrictions
- **[Agents](docs/AGENTS.md)** - Complete agent reference with roles and permissions
- **[Workflows](docs/WORKFLOWS.md)** - Simple and test orchestration workflows
- **[Testing](docs/TESTING.md)** - Comprehensive testing guide and test coverage
- **[Changelog](CHANGELOG.md)** - Version history and changes

## Debugging

### Check Progress
```bash
# View task progress
cat plan_and_progress/sessions/{session-id}/progress.json

# Shows: task states, agent sessions, files modified, self-healing attempts
```

### View Agent Logs
```bash
# Real-time agent output
cat output_streams/{session-id}/stream.log

# Full conversation history
cat output_streams/{session-id}/conversation.json
```

### Review Plans
```bash
# Task breakdown and dependencies
cat plan_and_progress/sessions/{session-id}/plan.json
```

## File Structure

```
project/
├── plan_and_progress/
│   └── sessions/{session-id}/
│       ├── plan.json           # Task breakdown
│       └── progress.json       # Execution status
├── output_streams/{session-id}/
│   ├── conversation.json       # Full message history
│   └── stream.log             # Real-time output
└── reports/{session-id}/
    └── *-summary.json          # Agent summaries
```

## Troubleshooting

- **Task stuck**: Check `output_streams/{session-id}/stream.log` for errors
- **Self-healing not working**: Verify orchestrator has `get_failed_tasks` tool
- **Permission errors**: Check `content-writer.json` for folder configuration
- **Session resume fails**: Verify session ID matches directory name

See [TESTING.md](docs/TESTING.md) for detailed troubleshooting guide.

## License

MIT