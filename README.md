# Levy's Awesome MCP

AI agent orchestration toolkit for Claude Code. Automates complex development tasks through specialized agents with intelligent coordination, self-healing, and comprehensive validation.

## Installation

```bash
npm install @leomerl/levys-awesome-mcp
```

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

- **orchestrator-agent** - Coordinates multi-agent workflows with self-healing
- **planner-agent** - Creates detailed execution plans
- **backend-agent** - API and server development (restricted to backend folders)
- **frontend-agent** - UI and client-side code (restricted to frontend folders)
- **reviewer-agent** - Validates plan vs progress and goal achievement
- **builder-agent** - Build and compilation verification
- **linter-agent** - Code quality checks
- **testing-agent** - Test creation and execution

## Key Features

- ✅ **Self-Healing**: Automatically retries failed tasks with correct agents (max 2 attempts)
- ✅ **Never Stops Mid-Workflow**: Continues with remaining tasks even if some fail
- ✅ **Mandatory Validation**: Always runs all validation phases
- ✅ **Session Management**: Resume agent sessions with retained memory
- ✅ **Dynamic Tool Restrictions**: Automatic security enforcement across all agents
- ✅ **Progress Tracking**: Automatic task state management and file modification tracking
- ✅ **Folder Isolation**: Backend/frontend agents restricted to their respective directories

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