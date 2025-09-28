# Levy's Awesome MCP

AI agent orchestration toolkit for Claude. Automates complex development tasks through specialized agents working in parallel.

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

## Usage

### Orchestrate Tasks

```
/orchestrate build a complete user authentication system with tests
```

Claude will:
1. Create a plan in `plan_and_progress/{git-hash}/plan.json`
2. Assign tasks to specialized agents (backend, frontend, testing, etc.)
3. Execute tasks in parallel where possible
4. Track progress in `plan_and_progress/{git-hash}/progress.json`

### Available Agents

- **orchestrator-agent** - Coordinates multi-agent workflows
- **backend-agent** - API and server development
- **frontend-agent** - UI and client-side code
- **testing-agent** - Test creation and execution
- **builder-agent** - Build and deployment
- **linter-agent** - Code quality checks
- **planner-agent** - Project planning

## Debugging AI Performance

### Check Progress
```bash
cat plan_and_progress/{git-hash}/progress*.json
```

Shows:
- Task states (pending/in_progress/completed)
- Which agent worked on what
- Files modified
- Session IDs for each agent

### View Agent Logs
```bash
cat output_streams/{session-id}/stream.log
```

Real-time agent output for debugging what went wrong.

### Review Plans
```bash
cat plan_and_progress/{git-hash}/plan*.json
```

See task breakdown, dependencies, and agent assignments.

## File Structure

```
project/
├── plan_and_progress/     # Plans and progress tracking
│   └── {git-hash}/
│       ├── plan.json      # Task breakdown
│       └── progress.json  # Execution status
├── output_streams/        # Agent execution logs
│   └── {session-id}/
│       └── stream.log    # Real-time output
└── reports/              # Agent summaries
    └── {session-id}/
        └── *-summary.json
```

## Tips

1. **Use `/orchestrate` for complex tasks** - Let the AI break down and delegate work
2. **Check progress.json** - See which tasks failed and why
3. **Review session.log** - Debug agent behavior and errors
4. **Git commit before orchestrating** - Plans are tied to commit hashes

## Troubleshooting

- **Task stuck in_progress**: Check `output_streams/{session-id}/session.log`
- **Agent errors**: Look for error messages in session logs
- **Files not created**: Verify agent has correct write permissions in progress.json

## License

MIT