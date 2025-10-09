# MCP Orchestration Web UI

A Next.js web interface for initiating MCP (Model Context Protocol) orchestration workflows.

## Features

- **Simple Orchestration**: Standard workflow with planning, development, review, build, lint, and test phases
- **SPARC Workflow**: Comprehensive workflow following Specification → Pseudocode → Architecture → Refinement → Completion phases
- **Modern UI**: Clean, responsive design using Tailwind CSS
- **Dark Mode**: Automatic dark mode support based on system preferences

## Getting Started

### Installation

```bash
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Usage

1. Select the orchestration type (Simple or SPARC)
2. Enter your task description
3. Click "Start Orchestration"

The UI will call the MCP backend to initiate the selected orchestration workflow.

## API Routes

### POST /api/orchestrate

Initiates an orchestration workflow.

**Request Body:**
```json
{
  "type": "simple" | "sparc",
  "task": "Task description here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orchestration started with orchestrator-agent",
  "sessionId": "1234567890",
  "agentName": "orchestrator-agent"
}
```

## Architecture

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **UI Components**: Custom components with Tailwind

## Integration

The UI integrates with the MCP backend through the `/api/orchestrate` endpoint. In production, this endpoint should invoke the actual MCP agent using:

- `mcp__levys-awesome-mcp__invoke_agent` for simple orchestration
- `sparc-orchestrator` agent for SPARC workflows

## Future Enhancements

- [ ] Real-time progress tracking
- [ ] Session history and logs
- [ ] Download orchestration reports
- [ ] WebSocket support for streaming updates
- [ ] Multi-session management
