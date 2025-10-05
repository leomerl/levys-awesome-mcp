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

**Option 1: Using Claude CLI (Recommended)**

```bash
# Add the MCP server
claude mcp add levys-awesome-mcp

# When prompted, enter:
# Command: npx
# Args: @leomerl/levys-awesome-mcp

# Restart Claude Code to load the MCP
claude mcp restart
```

**Option 2: Manual Configuration**

Add to `.mcp.json` in your project root:
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

Then restart Claude Code or use `/mcp` command.

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

### Folder Configuration

Create a `.content-writer.json` file to configure agent folder access:
```json
{
  "folderMappings": {
    "backend": ["backend/", "lib/", "api/", "server/"],
    "frontend": ["frontend/", "ui/", "app/", "components/"],
    "agents": ["agents/"],
    "docs": ["docs/"]
  },
  "defaultPaths": {
    "backend": "backend/",
    "frontend": "frontend/",
    "agents": "agents/",
    "docs": "docs/"
  },
  "pathValidation": {
    "allowPathTraversal": false,
    "restrictToConfiguredFolders": true,
    "createDirectoriesIfNotExist": true
  }
}
```

Then create your project folders:
```bash
mkdir -p backend frontend agents docs
```

## Quick Start

### Complete Setup Example

```bash
# 1. Install the package (automatically creates .claude/commands/ with slash commands)
npm install git+https://github.com/leomerl/levys-awesome-mcp.git

# 2. Create .mcp.json
cat > .mcp.json << 'EOF'
{
  "mcpServers": {
    "levys-awesome-mcp": {
      "command": "npx",
      "args": ["@leomerl/levys-awesome-mcp"]
    }
  }
}
EOF

# 3. Create .env file
cat > .env << 'EOF'
WORKSPACE_PATH=/absolute/path/to/your/project
EOF

# 4. Create .content-writer.json
cat > .content-writer.json << 'EOF'
{
  "folderMappings": {
    "backend": ["backend/", "lib/", "api/", "server/"],
    "frontend": ["frontend/", "ui/", "app/", "components/"],
    "agents": ["agents/"],
    "docs": ["docs/"]
  },
  "defaultPaths": {
    "backend": "backend/",
    "frontend": "frontend/"
  },
  "pathValidation": {
    "restrictToConfiguredFolders": true,
    "createDirectoriesIfNotExist": true
  }
}
EOF

# 5. Create project folders
mkdir -p backend frontend agents docs

# 6. Restart Claude Code
# Use /mcp command in Claude Code or run: claude mcp restart
```

### Verify Installation

```bash
# Check that slash commands and agents were installed automatically
ls .claude/commands/
# Should show: orchestrate.md, create-agent.md, analyze-and-create-static-tests.md

ls .claude/agents/
# Should show: 21 agent markdown files (backend-agent.md, frontend-agent.md, orchestrator-agent.md, etc.)

# List installed MCP servers
claude mcp list

# Check if levys-awesome-mcp is loaded
claude mcp status levys-awesome-mcp

# View available tools (in Claude Code)
/tools

# Test slash commands (in Claude Code)
/orchestrate
```

**Note**: During installation, the postinstall script automatically:
1. Copies slash commands to `.claude/commands/`
2. Converts all TypeScript agents from `agents/` to markdown in `.claude/agents/`

### Manual Agent Conversion (Optional)

If you want to regenerate agent markdown files after modifying agent TypeScript files:

```bash
# In Claude Code
/generate-agents
```

This scans the entire `agents/` directory tree and regenerates markdown configurations in `.claude/agents/`. The converter extracts agent names, descriptions, models, system prompts, and tool configurations.

### Orchestrate Development Tasks

```bash
/orchestrate build a complete user authentication system with tests
```

The orchestrator will:
1. **Plan** - Analyze requirements and create execution plan
2. **Execute** - Assign tasks to specialized agents (backend, frontend, testing, etc.)
3. **Self-Heal** - Automatically retry failed tasks indefinitely until success
4. **Validate** - Run reviewer, builder, linter, and testing agents
5. **Iterate** - Continue review and testing loops until all validations pass
6. **Report** - Provide comprehensive status of what works and what's validated

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

- ✅ **Self-Healing**: Automatically retries failed tasks indefinitely until success
- ✅ **Unlimited Iterations**: Review and testing loops continue until all validations pass
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

### MCP Server Issues
- **MCP not loading**: Run `claude mcp restart` or `/mcp` in Claude Code
- **Tools not available**: Check `claude mcp list` - ensure levys-awesome-mcp is listed
- **Environment variables not loaded**: Verify `.env` file exists in project root
- **Language Server not working**: Check `WORKSPACE_PATH` is set and mcp-language-server is installed

### Agent Issues
- **Task stuck**: Check `output_streams/{session-id}/stream.log` for errors
- **Self-healing not working**: Verify orchestrator has `get_failed_tasks` tool
- **Permission errors**: Check `.content-writer.json` for folder configuration
- **Session resume fails**: Verify session ID matches directory name

### Debug Commands
```bash
# View MCP server logs
claude mcp logs levys-awesome-mcp

# Restart MCP server
claude mcp restart

# Remove and re-add MCP server
claude mcp remove levys-awesome-mcp
claude mcp add levys-awesome-mcp
```

See [TESTING.md](docs/TESTING.md) for detailed troubleshooting guide.

## License

MIT