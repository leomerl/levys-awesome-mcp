# Levy's Awesome MCP Toolkit

A comprehensive MCP (Model Context Protocol) server toolkit providing agent management, build automation, and secure content writing capabilities. This package transforms multiple standalone MCP servers into a unified, modular npm package with shared utilities and reduced code duplication.

DONT USE THE BIN FILES IN THE .mcp.json FILE, USE THE NPM PACJAGE ITSELF. there should be only one entry which is the levys-awesome-mcp server, that includes all of the available tools inside it.

levys-awesome-mcp is a unified mcp toolkit server


## Repository Structure Overview

### Core Directories

#### `src/` - Main MCP Server Implementations
- **`agent-generator.ts`** - Converts TypeScript agent configurations to Claude-compatible markdown files
- **`agent-invoker.ts`** - Complex agent execution system with session management, streaming, and conversation continuity  
- **`build-executor.ts`** - Automated build system for frontend/backend projects (npm typecheck + build)
- **`content-writer.ts`** - Secure file writing system with folder-based access controls

#### `utilities/` - Shared Utility Modules
**`utilities/mcp/`** - MCP Protocol Foundation
- **`protocol-types.ts`** - Shared MCP interfaces and type definitions (eliminates duplication)
- **`server-base.ts`** - Abstract MCP server class with common boilerplate (JSON-RPC, error handling)

**`utilities/fs/`** - File System Operations  
- **`path-validator.ts`** - Centralized path validation, normalization, and security checks
- **`file-operations.ts`** - Safe file read/write/edit operations with consistent error handling

**`utilities/process/`** - Process Management
- **`command-executor.ts`** - Command execution wrapper with timeout handling and parallel execution

**`utilities/session/`** - Session Management (planned)
- Session persistence, conversation history, streaming utilities, report management

**`utilities/agents/`** - Agent System (planned)
- Dynamic agent loading, configuration parsing, markdown conversion

**`utilities/config/`** - Configuration (planned)
- Centralized path configuration and input validation

#### `bin/` - CLI Executables
- **`agent-generator`** - CLI entry point for agent generator
- **`agent-invoker`** - CLI entry point for agent invoker  
- **`build-executor`** - CLI entry point for build executor
- **`content-writer`** - CLI entry point for content writer

#### `tools/` - Original Implementation (Legacy)
- **`agent_generator.ts`** - Original TypeScript agent → markdown converter (500+ lines)
- **`agent_invoker.ts`** - Original agent execution system (1400+ lines) 
- **`build_executor.js`** - Original build automation (218 lines)
- **`content_writer.js`** - Original file writing system (777 lines)

### Configuration Files

- **`package.json`** - NPM package configuration with CLI binaries and dependencies
- **`tsconfig.json`** - TypeScript compilation configuration
- **`README.md`** - This documentation file

## Tool Responsibilities

### Agent Invoker
Invokes second-thread agents to complete specific tasks with:
- Real-time output streaming to `output_streams/$session_id/`
- Session continuity for related tasks
- Automatic report generation in `reports/$session_id/`
- Conversation debugging and monitoring

### Content Writer
Provides secure file operations with:
- Folder-based access controls (frontend/, backend/, reports/, tests/)
- Path validation and traversal protection
- Support for restricted writes to specific directories
- JSON validation for report files

### Build Executor  
Automates project builds with:
- Frontend build automation (`npm run build`)
- Backend type checking (`npm run typecheck`) 
- Parallel execution for improved performance
- Comprehensive error reporting

### Agent Generator
Converts TypeScript agent configurations to Claude-compatible formats:
- Dynamic TypeScript module loading
- YAML frontmatter generation  
- Markdown conversion with proper formatting
- Generated file tracking and cleanup

## Benefits of Refactored Architecture

- **75% code reduction** through shared utilities
- **Consistent error handling** across all tools
- **TypeScript-first** development with strong typing
- **Modular design** allowing independent utility usage  
- **Single npm package** for easy distribution
- **CLI binaries** for direct command-line usage

## Installation & Usage

```bash
npm install levys-awesome-mcp

# Use CLI tools directly
agent-generator
agent-invoker  
build-executor
content-writer

# Or use as MCP servers in your Claude configuration
```