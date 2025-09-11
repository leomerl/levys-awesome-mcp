# Changelog

All notable changes to Levy's Awesome MCP will be documented in this file.

## [1.0.0] - 2025-09-12

### Added

#### Agent System
- **Agent Invoker**: Invoke specialized agents with enforced session logging and report creation
- **7 Specialized Agents**: Backend, Frontend, Builder, Linter, Orchestrator, Planner, Testing-Agent
- **Permission System**: Folder-restricted write access (backend/ and frontend/ isolation)
- **Session Management**: Automatic session.log creation for all agent interactions
- **Session Resumption**: Support for continuing agent sessions with proper Claude Code session ID integration
- **Report Enforcement**: Mandatory JSON summary reports for all agent executions
- **Testing Agent**: Comprehensive test automation agent for integration and unit testing

#### Agent Generator Tools
- **Convert Single Agent**: Transform TypeScript agent files to Claude markdown format
- **Convert All Agents**: Batch convert all agents in agents/ directory
- **Remove All Agents**: Clean up generated markdown files

#### Build System
- **Build Executor**: Backend typecheck, frontend build, full project build
- **Build Reports**: Structured JSON build result reports

#### Code Quality
- **Code Analyzer**: ESLint, security scanning, dependency checking
- **Comprehensive Analysis**: Multi-language code quality assessment

#### Content Management  
- **Restricted Writers**: Backend-only and frontend-only file writers
- **Summary Reports**: Create and retrieve agent execution summaries
- **Folder Isolation**: Strict permission boundaries between backend/frontend

#### Development Tools
- **Server Runner**: Start backend, frontend, or both development servers
- **Test Executor**: Multi-framework testing (Jest, Vitest, Playwright)
- **Plan Creator**: Enhanced task analysis with session ID tracking and git commit hash integration
- **Plan & Progress Management**: Multiple plan support per git commit with progress tracking

### Features

#### Core Capabilities
- **Session Tracking**: Every agent interaction logged to session.log files
- **Report Generation**: Automatic JSON reports for debugging and analysis  
- **Permission Enforcement**: Agents cannot cross-write between folders
- **Tool Restrictions**: Dynamic tool restriction with allowed/disallowed tool configurations
- **Generic Design**: Works with any number of agents and file structures
- **Agent Naming Convention**: Standardized xxx-agent format for all agents

#### Security
- **Agent Isolation**: Backend agents cannot write to frontend/, vice versa
- **Tool Blacklisting**: TodoWrite, Task, Write, Edit tools blocked for agents
- **Permission Validation**: Runtime permission checking for all operations

#### Workflow
- **Orchestration**: Master agent coordinates multi-step development workflows
- **Quality Assurance**: Integrated linting, building, and testing in workflows
- **Error Handling**: Comprehensive error reporting and session debugging
- **Dynamic Agent Loading**: Orchestrator can dynamically discover and load agents
- **AI-Driven Planning**: Intelligent task breakdown and agent assignment

### Testing
- **Integration Tests**: Comprehensive test suite for permissions, session management, and agent behavior
- **Session Resumption Tests**: Verify proper session continuation functionality
- **Permission Verification**: Tests for tool restriction and folder access control
- **Summary Enforcement Tests**: Ensure mandatory report creation

### Improvements
- **Agent Configuration**: Enhanced with allowed_tools, disallowed_tools, and mcp_servers support
- **Session ID Integration**: Proper handling of Claude Code's actual session IDs
- **Plan File Management**: Session ID added to plan files for better tracking
- **Tool Restriction Logic**: Fixed generateToolRestrictionPrompt to properly exclude allowed tools
- **MaxTurns Removal**: Agents now run until task completion without artificial timeouts

### Initial Release
This is the first stable release of Levy's Awesome MCP, providing a complete toolkit for Claude Code agent development with strict security boundaries, comprehensive session management, and robust testing infrastructure.