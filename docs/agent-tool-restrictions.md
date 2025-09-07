# Agent Tool Restrictions - Implementation Guide

This document explains how to implement tool restrictions for Claude Code agents using patterns from the awesome-claude-code community.

## Overview

The `PermissionManager` class provides a security-first approach to agent tool restrictions, supporting both legacy TypeScript configurations and modern YAML frontmatter patterns.

## Security Principles

1. **Whitelist-based security**: Only explicitly allowed tools are permitted
2. **Role-based restrictions**: Pre-defined security profiles for common agent types
3. **Inheritance patterns**: Support for awesome-claude-code tool inheritance
4. **Defense in depth**: Multiple layers of tool restriction

## Security Profiles

### Read-Only (`read-only`)
**Use case**: Code reviewers, analyzers, security auditors
```yaml
---
name: code-reviewer
description: "Reviews code without making changes"
tools: Read, Grep, Glob, WebFetch
role: read-only
---
```

**Allowed built-in tools**: `Read`, `Grep`, `Glob`, `WebFetch`
**Denied tools**: `Bash`, `Write`, `Edit`, `MultiEdit`, `Task`, `TodoWrite`

### Write-Restricted (`write-restricted`)
**Use case**: Frontend/backend agents with folder-specific access
```yaml
---
name: frontend-agent
description: "Frontend development with restricted write access"
tools: Read, Grep, Glob, WebFetch
role: write-restricted
---
```

**Allowed built-in tools**: `Read`, `Grep`, `Glob`, `WebFetch`
**Custom tools**: MCP tools like `mcp__content-writer__frontend_write`
**Denied tools**: `Bash`, `Write`, `Edit`, `MultiEdit`, `Task`, `TodoWrite`

### Security-Sensitive (`security-sensitive`)
**Use case**: Security scanners, sensitive operations
```yaml
---
name: security-scanner
description: "Minimal tools for security analysis"
tools: Read, Grep
role: security-sensitive
---
```

**Allowed built-in tools**: `Read`, `Grep`
**Denied tools**: Everything else including `WebFetch`, `WebSearch`

### Full-Access (`full-access`)
**Use case**: Orchestrators, planners
```yaml
---
name: orchestrator
description: "Strategic planning and coordination"
# tools: omit for all tools inheritance
role: full-access
---
```

**Allowed built-in tools**: `Read`, `Grep`, `Glob`, `WebFetch`, `WebSearch`, `Bash`
**Still denied**: `Write`, `Edit`, `MultiEdit` (agents should use MCP tools)

## YAML Frontmatter Patterns

### Explicit Tool Restriction (Security-First)
```yaml
---
name: code-reviewer
description: "Reviews code without making changes"
tools: Read, Grep, Glob, WebFetch  # Only these tools allowed
role: read-only
---
```

### Tool Inheritance (Awesome-Claude-Code Pattern)
```yaml
---
name: orchestrator-planner
description: "Strategic planning agent"
# tools: omit for all tools inheritance
role: full-access
---
```

When `tools` field is omitted, the agent inherits tools based on its role.

### Mixed Approach
```yaml
---
name: specialized-agent
description: "Custom agent with specific needs"
tools: Read, Grep, custom-mcp-tool
role: write-restricted
---
```

## Implementation Examples

### Creating a Security-Aware Agent
```typescript
// Method 1: Using YAML frontmatter (recommended)
const permissionConfig = PermissionManager.fromMarkdownFile(markdownContent);
const permissions = PermissionManager.getAgentPermissions(permissionConfig);

// Method 2: Direct configuration
const permissions = PermissionManager.getAgentPermissions({
  allowedTools: ['Read', 'Grep', 'Glob'],
  agentRole: 'read-only'
});
```

### Integration with Agent Invoker
```typescript
// The agent invoker automatically detects:
// 1. .claude/agents/${agentName}.md files (YAML frontmatter)
// 2. Legacy TypeScript configs
// 3. Falls back to read-only for security

// Priority order:
// 1. TypeScript config allowedTools (legacy)
// 2. YAML frontmatter from .claude/agents/*.md
// 3. Default read-only permissions
```

## Always Denied Tools

These tools are **always blocked** regardless of configuration:
- `TodoWrite`: Agents shouldn't create todos
- `Task`: Prevents infinite agent loops
- `Write`: Agents should use restricted MCP write tools
- `Edit`: Agents should use restricted MCP edit tools
- `MultiEdit`: Agents should use restricted MCP edit tools

## Best Practices

### 1. Use Role-Based Profiles
```typescript
// Good: Use predefined security profiles
const config = { allowedTools: [], agentRole: 'read-only' };

// Avoid: Manual tool lists without roles
const config = { allowedTools: ['Read', 'Grep', 'Bash'] }; // No role context
```

### 2. Follow Awesome-Claude-Code Patterns
```yaml
# Good: Explicit tools for security-sensitive agents
---
name: security-scanner
tools: Read, Grep
role: security-sensitive
---

# Good: Omit tools for flexible agents
---
name: orchestrator
# tools: omit for inheritance
role: full-access
---
```

### 3. Validate Tool Permissions
```typescript
// Always validate that critical tools are available
const permissions = PermissionManager.getSummaryPermissions(baseConfig);
// This ensures put_summary is added for report generation
```

### 4. Use MCP Tools for File Operations
```yaml
# Good: Use restricted MCP tools instead of built-ins
tools: 
  - Read
  - Grep
  - mcp__content-writer__frontend_write  # Restricted to frontend/

# Avoid: Using built-in Write/Edit tools
tools:
  - Read
  - Write  # Too permissive, no folder restrictions
```

## Migration Guide

### From Legacy TypeScript Configs
```typescript
// Before (TypeScript only)
const frontendAgent = {
  name: 'frontend-agent',
  options: {
    allowedTools: [
      'mcp__content-writer__frontend_write',
      'Read', 'Grep', 'Glob'
    ]
  }
};

// After (YAML frontmatter)
// .claude/agents/frontend-agent.md
---
name: frontend-agent
description: "Frontend development agent"
tools: Read, Grep, Glob
role: write-restricted
---
```

### Adding Role-Based Security
```typescript
// Before: Manual tool lists
allowedTools: ['Read', 'Grep', 'Glob', 'WebFetch']

// After: Role-based with validation
{
  allowedTools: ['mcp__custom-tool'],
  agentRole: 'read-only'
}
```

## Security Validation

The system provides comprehensive logging for security auditing:

```
[DEBUG] Agent 'code-reviewer' explicitly specified tools: ['Read', 'Grep', 'Glob']
[DEBUG] Role-based permissions for 'read-only': ['Read', 'Grep', 'Glob', 'WebFetch']
[DEBUG] Final allowed tools: ['Read', 'Grep', 'Glob', 'WebFetch']
[DEBUG] Built-in tools being denied: ['Bash', 'Write', 'Edit', 'MultiEdit', 'Task', 'TodoWrite']
```

## Troubleshooting

### Agent Can't Access Required Tools
1. Check the YAML frontmatter syntax
2. Verify the role permissions match your needs
3. Check the debug logs for permission resolution
4. Ensure MCP tools are properly included

### Tool Inheritance Not Working
1. Ensure `tools` field is completely omitted (not empty array)
2. Verify the `role` field is set correctly
3. Check that the markdown file is in `.claude/agents/`

### Security Warnings
1. Review denied tools in debug logs
2. Ensure agents aren't trying to use `Write`/`Edit` directly
3. Use MCP restricted tools instead of built-in tools
4. Validate that security-sensitive agents have minimal tools

## Security Considerations

1. **Never allow `Bash` for untrusted agents**: Can execute arbitrary commands
2. **Block direct `Write`/`Edit` tools**: Use MCP restricted tools instead  
3. **Prevent `Task` tool abuse**: Could create infinite agent loops
4. **Audit tool usage regularly**: Monitor debug logs for permission violations
5. **Use least privilege principle**: Start with minimal tools and add as needed