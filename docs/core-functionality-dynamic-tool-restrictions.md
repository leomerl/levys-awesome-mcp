# Dynamic Tool Restriction System - Core MCP Functionality

## Overview

The Dynamic Tool Restriction System is a **core MCP functionality** that provides comprehensive, automated tool security enforcement across all agents in the system. This system ensures that agents can only access explicitly allowed tools while automatically blocking access to all other available tools through dynamic discovery and restriction enforcement.

## Key Features

### 1. **Dynamic Tool Discovery**
- Automatically discovers all available MCP tools from all registered handlers
- Catalogs Claude Code built-in tools (Bash, Read, Write, Edit, etc.)
- Maintains real-time inventory of all tools with caching for performance
- Categorizes tools by functionality for better management

### 2. **Automatic Disallowed Tool Calculation**
- **Formula**: `disallowed_tools = all_available_tools - allowed_tools`
- Ensures comprehensive security by blocking ALL tools not explicitly allowed
- Updates automatically as new tools are added to the system
- Prevents security gaps from unknown or forgotten tools

### 3. **Explicit Prompt Injection**
- Injects clear, categorized warnings about forbidden tools into agent prompts
- Provides human-readable restrictions organized by tool category
- Ensures agents receive explicit guidance about what tools they cannot use
- Logged to session files for audit and debugging purposes

### 4. **Type-Safe Tool Management**
- Generates TypeScript types for all discovered tools
- Validates tool configurations against known tools
- Provides compile-time safety for tool references
- Offers comprehensive tool usage statistics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tool Registry                            │
│  • Discovers all MCP tools from handlers                   │
│  • Catalogs Claude Code built-in tools                     │
│  • Maintains cached inventory with TTL                     │
│  • Provides tool validation and statistics                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Permission Manager                           │
│  • Calculates disallowed tools dynamically                 │
│  • Generates restriction prompts                           │
│  • Validates tool configurations                           │
│  • Provides security analytics                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 Agent Invoker                               │
│  • Applies dynamic restrictions to all agents              │
│  • Injects tool restriction prompts                        │
│  • Logs restriction enforcement details                    │
│  • Ensures backward compatibility                          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### ToolRegistry (`src/utilities/tools/tool-registry.ts`)

The ToolRegistry is the foundation of the dynamic tool restriction system:

```typescript
// Get all available MCP tools
const allTools = await ToolRegistry.getAllMCPTools();

// Calculate disallowed tools automatically
const disallowed = await ToolRegistry.calculateDisallowedTools(allowedTools);

// Validate tool configurations
const validation = await ToolRegistry.validateToolList(tools);

// Get comprehensive statistics
const stats = await ToolRegistry.getToolStatistics();
```

**Key Methods:**
- `getAllMCPTools()`: Returns complete tool inventory
- `calculateDisallowedTools()`: Core restriction calculation
- `getToolsByCategory()`: Organized tool catalog
- `validateToolList()`: Tool configuration validation
- `generateToolTypes()`: TypeScript type generation

### Enhanced PermissionManager (`src/utilities/agents/permission-manager.ts`)

Extended with dynamic restriction capabilities:

```typescript
// Apply dynamic restrictions (CORE MCP FUNCTION)
const permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions({
  allowedTools: ['Read', 'Grep', 'mcp__example__tool'],
  agentRole: 'read-only',
  useDynamicRestrictions: true
});

// Generate human-readable restriction prompt
const restrictionPrompt = await PermissionManager.generateToolRestrictionPrompt(
  permissions.disallowedTools
);

// Validate agent configuration
const validation = await PermissionManager.validateAgentToolConfiguration(config);
```

**New Core Methods:**
- `getAgentPermissionsWithDynamicRestrictions()`: Main restriction enforcement
- `generateToolRestrictionPrompt()`: Creates injected warnings
- `validateAgentToolConfiguration()`: Comprehensive validation
- `getAgentToolStatistics()`: Security analytics

### Agent Configuration Types (`src/types/agent-config.ts`)

Enhanced with dynamic restriction support:

```typescript
interface EnhancedAgentConfig extends AgentConfig {
  computedPermissions?: {
    allowedTools: string[];
    disallowedTools: string[]; // Auto-populated from ToolRegistry
    lastUpdated: number;
    toolValidation: ValidationResult;
    securityAnalysis: SecurityAnalysis;
  };
  restrictionPrompt?: string; // Auto-generated warning text
}
```

### Agent Invoker Enhancement (`src/handlers/agent-invoker.ts`)

All agent invocations now include dynamic restrictions:

```typescript
// Dynamic restriction enforcement applied to ALL agents
const permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions(config);

// Generate and inject tool restriction warnings
const restrictionPrompt = await PermissionManager.generateToolRestrictionPrompt(
  permissions.disallowedTools
);

// Enhanced prompt with explicit tool restrictions
const finalPrompt = originalPrompt + restrictionPrompt;
```

## Configuration

### Default Dynamic Restriction Configuration

```typescript
const DEFAULT_DYNAMIC_RESTRICTION_CONFIG: DynamicRestrictionConfig = {
  enabled: true,                    // Enable by default for maximum security
  refreshIntervalMs: 5 * 60 * 1000, // Refresh every 5 minutes
  includePromptInjection: true,      // Always inject tool restriction warnings
  logLevel: 'basic',                 // Basic logging for debugging
  cacheTTL: 10 * 60 * 1000          // 10 minute cache TTL
};
```

### Agent Configuration Examples

#### Legacy Agent with Dynamic Restrictions
```typescript
const agentConfig = {
  name: 'backend-agent',
  options: {
    allowedTools: [
      'Read',
      'Grep', 
      'mcp__content-writer__backend_write'
    ]
    // Dynamic restrictions automatically calculated:
    // disallowedTools = all_available_tools - allowedTools
  }
};
```

#### Enhanced Agent Configuration
```typescript
const enhancedConfig: EnhancedAgentConfig = {
  name: 'secure-agent',
  permissions: {
    useDynamicRestrictions: true,
    tools: {
      allowed: ['Read', 'Grep'],
      denied: [], // Will be auto-populated
      autoPopulatedDisallowed: [], // Computed at runtime
      lastDiscoveryTime: 0
    }
  },
  options: {
    useDynamicRestrictions: true,
    securityProfile: {
      level: 'high',
      allowedCount: 2,
      totalAvailable: 50,
      lastCalculated: Date.now()
    }
  }
};
```

## Security Benefits

### 1. **Zero-Gap Security**
- **Problem**: Manual tool restriction lists can miss new tools
- **Solution**: Automatic calculation ensures ALL tools are considered
- **Result**: No security gaps from unknown or forgotten tools

### 2. **Maintenance-Free**
- **Problem**: Tool lists become outdated as system evolves
- **Solution**: Dynamic discovery keeps restrictions current
- **Result**: Security maintains effectiveness without manual updates

### 3. **Explicit Communication**
- **Problem**: Agents may not understand tool restrictions
- **Solution**: Clear, injected warnings about forbidden tools
- **Result**: Agents receive explicit guidance about limitations

### 4. **Comprehensive Audit Trail**
- **Problem**: Difficult to track tool restriction enforcement
- **Solution**: Detailed logging of restrictions and violations
- **Result**: Complete visibility into security enforcement

## Example Restriction Prompt Injection

When an agent has dynamic restrictions enabled, they receive explicit warnings:

```
## 🚫 TOOL RESTRICTIONS ENFORCED

**CRITICAL: You are FORBIDDEN from using the following 23 tools:**

**Agent Generator Tools:** mcp__agent-generator__convert_agent_ts_to_claude_md, mcp__agent-generator__convert_all_agents_ts_to_claude_md

**Build Executor Tools:** mcp__build-executor__build_project, mcp__build-executor__build_backend

**Content Writer Tools:** mcp__content-writer__frontend_write, mcp__content-writer__restricted_write

**Claude Code Builtin Tools:** Bash, Write, Edit, MultiEdit, Task, TodoWrite

**If you attempt to use any restricted tool, your request will be blocked.**
**Only use tools explicitly listed in your allowed tools configuration.**

---
```

## Integration Examples

### Basic Integration
```typescript
// Any agent invocation automatically gets dynamic restrictions
const result = await AgentInvoker.invoke({
  agentName: 'backend-agent',
  prompt: 'Fix the authentication bug'
  // Dynamic restrictions applied automatically
});
```

### Advanced Integration with Validation
```typescript
// Validate configuration before use
const validation = await PermissionManager.validateAgentToolConfiguration({
  allowedTools: ['Read', 'Write', 'UnknownTool'],
  useDynamicRestrictions: true
});

if (!validation.valid) {
  console.log('Unknown tools:', validation.unknownAllowedTools);
  console.log('Recommendations:', validation.recommendations);
}

// Get security statistics
const stats = await PermissionManager.getAgentToolStatistics(config);
console.log(`Security level: ${stats.securityLevel}`);
console.log(`Tool coverage: ${stats.coveragePercent}%`);
```

### Tool Discovery and Analysis
```typescript
// Discover all available tools
const allTools = await ToolRegistry.getAllMCPTools();
console.log(`Total tools available: ${allTools.length}`);

// Get categorized tool inventory
const categorized = await ToolRegistry.getToolsByCategory();
console.log('MCP Tools by category:', categorized);

// Generate TypeScript types
const types = await ToolRegistry.generateToolTypes();
// Use types for compile-time safety
```

## Performance Considerations

### Caching Strategy
- Tool discovery results cached for 10 minutes by default
- Permission calculations cached per agent configuration
- TypeScript type generation cached until tools change
- Restriction prompt generation cached by disallowed tool list

### Memory Usage
- Tool registry maintains in-memory catalog of all tools
- Agent permissions computed on-demand and cached
- Session logs include restriction enforcement details
- Cache TTL prevents indefinite memory growth

### Network Impact
- No network calls required for tool discovery (local scanning)
- Tool validation happens locally against cached registry
- MCP tool discovery occurs during server initialization
- Minimal overhead for existing agent invocation patterns

## Migration Guide

### For Existing Agents

**No Breaking Changes Required** - The system is designed for backward compatibility:

1. **Legacy TypeScript Agents**: Automatically enhanced with dynamic restrictions
2. **Markdown-based Agents**: Dynamic restrictions applied transparently  
3. **Manual Configurations**: Continue to work while gaining enhanced security

### Recommended Enhancements

1. **Enable Explicit Dynamic Restrictions**:
   ```typescript
   agentConfig.options.useDynamicRestrictions = true;
   ```

2. **Add Security Profiling**:
   ```typescript
   const stats = await PermissionManager.getAgentToolStatistics(config);
   ```

3. **Implement Tool Validation**:
   ```typescript
   const validation = await PermissionManager.validateAgentToolConfiguration(config);
   ```

## Monitoring and Debugging

### Log Analysis
Dynamic restriction enforcement is logged at multiple levels:

```
[AgentInvoker] Applying dynamic tool restriction enforcement for agent: backend-agent
[PermissionManager] Using dynamic tool restriction enforcement  
[PermissionManager] Dynamic restrictions calculated: 45 tools disallowed dynamically
[AgentInvoker] Generated restriction prompt with 45 disallowed tools
[AgentInvoker] Injected tool restriction prompt (1247 characters)
```

### Session Log Tracking
All restriction enforcement details saved to session logs:

```
[2025-09-11T18:46:37.297Z] DYNAMIC TOOL RESTRICTIONS APPLIED:
Allowed Tools: 6
Disallowed Tools: 45  
Restriction Prompt Injected: true
```

### Performance Metrics
```typescript
// Get comprehensive tool statistics
const stats = await ToolRegistry.getToolStatistics();
console.log(`Total MCP Tools: ${stats.totalMCPTools}`);
console.log(`Total Built-in Tools: ${stats.totalBuiltInTools}`);
console.log('Tools by Category:', stats.toolsByCategory);
```

## Future Enhancements

### Planned Features

1. **Policy-Based Restrictions**
   - Define restriction policies by agent role
   - Apply organization-wide security policies
   - Support for compliance requirements

2. **Dynamic Risk Assessment**
   - Real-time security risk scoring
   - Automatic restriction level adjustment
   - Integration with security monitoring systems

3. **Tool Usage Analytics**
   - Track tool usage patterns across agents
   - Identify unused or risky tool access grants
   - Optimize permission configurations

4. **Advanced Validation**
   - Semantic tool compatibility checking
   - Dependency analysis for tool combinations
   - Automated security recommendations

## API Reference

### ToolRegistry Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAllMCPTools()` | Get complete tool inventory | `Promise<string[]>` |
| `calculateDisallowedTools(allowed)` | Core restriction calculation | `Promise<string[]>` |
| `getToolsByCategory()` | Categorized tool catalog | `Promise<ToolsByCategory>` |
| `validateToolList(tools)` | Validate tool configuration | `Promise<ValidationResult>` |
| `generateToolTypes()` | Generate TypeScript types | `Promise<string>` |
| `getToolStatistics()` | Comprehensive statistics | `Promise<ToolStatistics>` |

### PermissionManager Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAgentPermissionsWithDynamicRestrictions(config)` | Main restriction enforcement | `Promise<PermissionResult>` |
| `generateToolRestrictionPrompt(disallowed)` | Create injected warnings | `Promise<string>` |
| `validateAgentToolConfiguration(config)` | Comprehensive validation | `Promise<ValidationResult>` |
| `getAgentToolStatistics(config)` | Security analytics | `Promise<SecurityStats>` |

## Conclusion

The Dynamic Tool Restriction System represents a **core MCP functionality** that ensures comprehensive, automated security across all agents. By dynamically discovering all available tools and automatically calculating restrictions, the system provides:

- **Zero-gap security**: No tools can bypass restrictions
- **Maintenance-free operation**: Automatically adapts to system changes  
- **Clear communication**: Agents receive explicit restriction guidance
- **Complete auditability**: Full logging of security enforcement

This system scales with the MCP ecosystem, ensuring that as new tools are added, security restrictions automatically adapt to maintain comprehensive protection.