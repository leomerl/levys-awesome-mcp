# MCP Tools Documentation

## Overview
Levy's Awesome MCP Toolkit provides 8 core tools unified in a single MCP server for agent management, build automation, and secure content operations.

## Tools

### 1. create_plan
**Purpose**: Analyzes user tasks and generates detailed execution plans.

**Parameters**:
- `task_description` (string): The task to be analyzed and planned
- `git_commit_hash` (string, optional): Commit hash for report organization

**Functionality**:
- Uses Opus model for intelligent task analysis
- Creates structured JSON plan files in `reports/$git_commit_hash/plan.json`
- Generates task breakdown with:
  - Unique task IDs
  - Agent assignments based on directory relevancy
  - Dependency mapping
  - File modification lists
- Plan files are immutable once created

---

### 2. agent_invoker
**Purpose**: Executes specialized agents in separate threads with session management and real-time monitoring.

**Parameters**:
- `agent_name` (string): Name of the agent to invoke
- `task_description` (string): Task for the agent to complete
- `session_id` (string, optional): Session identifier for continuity
- `context_files` (array, optional): Files to provide as context

**Functionality**:
- Spawns second-thread agents for task execution
- Real-time output streaming to `output_streams/$session_id/`
- Session persistence for related tasks
- Automatic report generation in `reports/$session_id/`
- Conversation debugging and monitoring
- Agent lifecycle management

---

### 3. content_writer
**Purpose**: Provides secure file operations with folder-based access controls and path validation.

**Parameters**:
- `file_path` (string): Target file path for writing
- `content` (string): Content to write to file
- `operation` (string): Operation type (create, append, overwrite)
- `access_folder` (string, optional): Restricted folder scope

**Functionality**:
- Folder-based access controls (frontend/, backend/, reports/, tests/)
- Path validation and directory traversal protection
- Support for restricted writes to specific directories
- JSON validation for report files
- Safe file operations with error handling

---

### 4. build_executor
**Purpose**: Automates project builds with parallel execution and comprehensive error reporting.

**Parameters**:
- `project_type` (string): Type of project (frontend, backend, fullstack)
- `build_commands` (array, optional): Custom build commands
- `parallel` (boolean, optional): Enable parallel execution

**Functionality**:
- Frontend build automation (`npm run build`)
- Backend type checking (`npm run typecheck`)
- Parallel execution for improved performance
- Comprehensive error reporting
- Build status tracking
- Output capture and formatting

---

### 5. agent_generator
**Purpose**: Converts TypeScript agent configurations to Claude-compatible markdown files.

**Parameters**:
- `agent_config_path` (string): Path to TypeScript agent configuration
- `output_path` (string, optional): Output directory for generated files
- `format` (string, optional): Output format (markdown, yaml)

**Functionality**:
- Dynamic TypeScript module loading
- YAML frontmatter generation
- Markdown conversion with proper formatting
- Generated file tracking and cleanup
- Agent configuration validation
- Template processing

---

### 6. get_plans
**Purpose**: Retrieves plan context for agents working on specific tasks.

**Parameters**:
- `git_commit_hash` (string): Commit hash to identify the plan
- `task_id` (string, optional): Specific task ID to filter

**Functionality**:
- Reads JSON plan files from `reports/$git_commit_hash/plan.json`
- Provides agents with task context and dependencies
- Enables agents to understand their role in the overall workflow
- Returns structured plan data for agent decision-making

---

### 7. write_progress
**Purpose**: Records task progress and completion status by working agents.

**Parameters**:
- `git_commit_hash` (string): Commit hash to identify the plan
- `task_id` (string): Task being worked on
- `state` (string): Task state (pending, in_progress, completed)
- `agent_name` (string): Agent working on the task
- `modified_files` (array, optional): List of files modified
- `description` (string, optional): Progress description

**Functionality**:
- Writes JSON progress files to `reports/$git_commit_hash/progress.json`
- Tracks task state changes and agent assignments
- Records file modifications and work descriptions
- Maintains progress history for review and debugging
- Separate from immutable plan files

---

### 8. review (To Be Implemented)
**Purpose**: Analyzes completed work against plans and generates review reports with fix recommendations.

**Parameters**:
- `git_commit_hash` (string): Commit hash to review
- `include_build_output` (boolean, optional): Include build/lint results

**Functionality**:
- Compares plan.json and progress.json files
- Analyzes build executor and linter outputs
- Identifies bugs, issues, and deviations from plan
- Generates review.json with:
  - Issue summaries
  - Bug reports
  - Fix recommendations
  - Additional tasks if needed
- Creates structured review reports in same JSON format as plans

---

## Security Features
- Path validation across all file operations
- Folder-based access controls
- Directory traversal protection
- Session isolation
- Safe command execution

## Output Locations
- **Plans**: `reports/$git_commit_hash/plan.json`
- **Progress**: `reports/$git_commit_hash/progress.json`
- **Reviews**: `reports/$git_commit_hash/review.json`
- **Streams**: `output_streams/$session_id/`
- **Reports**: `reports/$session_id/`
- **Generated Agents**: Configurable output paths
- **Build Artifacts**: Project-specific locations

## JSON File Formats
- **plan.json**: Immutable task breakdown with IDs, agents, dependencies,files to be changed
- **progress.json**: Mutable state tracking with agent assignments and file changes
- **review.json**: Analysis results with bug reports and fix recommendations