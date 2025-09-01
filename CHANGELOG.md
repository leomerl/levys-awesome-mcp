# Changelog

## [1.0.0] - 2024-01-XX - Initial Release

### Complete Architecture Refactor

**Transformed multiple standalone MCP servers into a unified, modular npm package**

### New Features

#### Shared Utility System
- **MCP Protocol Foundation**: `MCPServerBase` class eliminates 200+ lines of boilerplate per server
- **File System Operations**: Centralized path validation, security checks, and file operations
- **Process Management**: Command execution with timeout handling and parallel execution
- **Session Management**: Persistent conversation history, streaming, and report management
- **Agent System**: Dynamic agent loading, configuration parsing, markdown conversion
- **Configuration Management**: Centralized paths and input validation

#### Refactored MCP Servers
- **Agent Generator**: Reduced from 500+ lines to 200 lines (-60% reduction)
- **Agent Invoker**: Reduced from 1400+ lines to 350 lines (-75% reduction)  
- **Build Executor**: Reduced from 218 lines to 95 lines (-56% reduction)
- **Content Writer**: Reduced from 777 lines to 145 lines (-81% reduction)

#### Package Distribution
- **NPM Package**: Single `levys-awesome-mcp` installation
- **CLI Binaries**: Direct command-line access to all tools
- **TypeScript-First**: Strong typing throughout with declarations
- **Modular Imports**: Use utilities independently in other projects

### Improvements

#### Code Quality
- **75% reduction** in overall code duplication
- **Consistent error handling** across all tools  
- **Standardized patterns** for MCP server implementation
- **Comprehensive testing** framework with Jest

#### Developer Experience
- **Single source of truth** for common functionality
- **Easy maintenance** - changes in utilities affect all tools
- **Better documentation** with inline JSDoc comments
- **Linting and formatting** with ESLint and TypeScript

#### Architecture Benefits
- **Separation of concerns** - business logic vs infrastructure
- **Dependency injection** pattern for utilities
- **Abstract base classes** for consistent implementations
- **Type safety** with shared interfaces and types

### New Structure

```
src/                     # Refactored MCP server implementations
utilities/               # Shared utility modules
├── mcp/                # MCP protocol abstractions
├── fs/                 # File system operations
├── process/            # Command execution
├── session/            # Session management
├── agents/             # Agent configuration system
└── config/             # Configuration and validation

types/                   # Shared TypeScript types
bin/                     # CLI executables
tests/                   # Test suite
tools/                   # Original implementations (legacy)
```

### Installation & Usage

```bash
# Install the package
npm install levys-awesome-mcp

# Use CLI tools directly
agent-generator
agent-invoker  
build-executor
content-writer

# Or use as MCP servers in Claude configuration
```

### Testing

- **Jest test framework** with TypeScript support
- **Path validation tests** for security
- **Utility function tests** for reliability  
- **Mock support** for isolated testing

### Distribution

- **ES Modules** for modern JavaScript support
- **CommonJS compatibility** for legacy systems
- **Source maps** for debugging
- **Declaration files** for TypeScript users

### Security

- **Path traversal protection** in all file operations
- **Input validation** for all parameters
- **Working directory restrictions** for file access
- **Timeout handling** for long-running operations

---

**Breaking Changes**: This is a complete rewrite. The original `tools/` implementations are preserved for reference but should be migrated to use the new `src/` implementations and shared utilities.

**Migration Guide**: Replace tool imports from `tools/` with the new CLI binaries or programmatic imports from the npm package.