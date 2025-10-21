---
description: Generate Claude agent markdown files from TypeScript agents
---

Convert all TypeScript agent files in the agents/ directory to Claude-compatible markdown format in .claude/agents/.

This command scans the entire agents/ directory tree (including subdirectories) and generates markdown agent configurations that can be used directly with Claude Code.

The converter extracts:
- Agent name, description, and model
- System prompts
- Allowed/disallowed tools
- MCP server configurations

Generated files are placed in .claude/agents/ with the same filename but .md extension.
