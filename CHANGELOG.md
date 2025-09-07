# Changelog

All notable changes to Levy's Awesome MCP will be documented in this file.

## [1.0.0] - 2025-09-07

### Added

#### Agent System
- **Agent Invoker**: Invoke specialized agents with enforced session logging and report creation
- **6 Specialized Agents**: Backend, Frontend, Builder, Linter, Orchestrator, Planner
- **Permission System**: Folder-restricted write access (backend/ and frontend/ isolation)
- **Session Management**: Automatic session.log creation for all agent interactions
- **Report Enforcement**: Mandatory JSON summary reports for all agent executions

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
- **Plan Creator**: Task analysis and execution planning

### Features

#### Core Capabilities
- **Session Tracking**: Every agent interaction logged to session.log files
- **Report Generation**: Automatic JSON reports for debugging and analysis  
- **Permission Enforcement**: Agents cannot cross-write between folders
- **Tool Restrictions**: Agents blocked from using dangerous built-in tools
- **Generic Design**: Works with any number of agents and file structures

#### Security
- **Agent Isolation**: Backend agents cannot write to frontend/, vice versa
- **Tool Blacklisting**: TodoWrite, Task, Write, Edit tools blocked for agents
- **Permission Validation**: Runtime permission checking for all operations

#### Workflow
- **Orchestration**: Master agent coordinates multi-step development workflows
- **Quality Assurance**: Integrated linting, building, and testing in workflows
- **Error Handling**: Comprehensive error reporting and session debugging

### Initial Release
This is the first stable release of Levy's Awesome MCP, providing a complete toolkit for Claude Code agent development with strict security boundaries and comprehensive session management.