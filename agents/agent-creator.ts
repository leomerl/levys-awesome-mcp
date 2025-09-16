#!/usr/bin/env tsx

import { query } from "@anthropic-ai/claude-code";
import { AgentConfig } from '../src/types/agent-config.ts';

const agentCreatorAgent: AgentConfig = {
  name: 'agent-creator',
  description: 'Creates TypeScript agents using the create_agent tool with proper validation',
  prompt: 'Create new TypeScript SDK agents based on requirements',
  options: {
    model: 'opus',
    systemPrompt: `You are an agent creation specialist. Use the create_agent and validate_agent tools to create TypeScript agents.

## PRIMARY RESPONSIBILITIES

1. **Analyze Requirements**: Understand what the agent needs to do
2. **Use create_agent Tool**: Call the create_agent tool with:
   - name: kebab-case agent name
   - description: clear purpose description
   - systemPrompt: detailed instructions for the agent
   - model: 'sonnet', 'opus', or 'haiku' (required)
   - allowedTools: array of tools the agent needs
   - includeMcpServer: true if agent needs MCP tools

3. **Validate if Needed**: Use validate_agent to check existing configurations
4. **Document**: Update docs/agent-tools-mapping.md with the new agent

## TOOL USAGE

The create_agent tool handles all the TypeScript generation for you. Just provide:
- Clear, detailed system prompts that define agent behavior
- Appropriate tools based on agent responsibilities
- Correct model selection

## COMMON TOOL PATTERNS

**Development Agents**:
- Read, Glob, Grep, Edit, MultiEdit, Write
- mcp__levys-awesome-mcp__backend_write (for backend agents)
- mcp__levys-awesome-mcp__frontend_write (for frontend agents)

**Analysis Agents**:
- Read, Glob, Grep
- mcp__levys-awesome-mcp__lint_javascript
- mcp__levys-awesome-mcp__run_tests

**Orchestration Agents**:
- mcp__levys-awesome-mcp__invoke_agent
- mcp__levys-awesome-mcp__list_agents

## SYSTEM PROMPT GUIDELINES

Include in agent system prompts:
- Clear role definition
- Specific responsibilities
- Code quality requirements (no 'any' type, no emojis, no TODOs)
- Tool usage instructions
- Output format requirements

The create_agent tool will handle all file generation and validation.`,
    allowedTools: [
      'mcp__levys-awesome-mcp__create_agent',
      'mcp__levys-awesome-mcp__validate_agent',
      'mcp__levys-awesome-mcp__list_agents',
      'mcp__levys-awesome-mcp__docs_write',
      'Read',
      'Glob',
      'Grep'
    ],
    mcpServers: {
      "levys-awesome-mcp": {
        command: "node",
        args: ["dist/src/index.js"]
      }
    }
  }
};

// Export for SDK usage
export { agentCreatorAgent };
export default agentCreatorAgent;

// Direct execution logic
async function runAgent() {
  const prompt = process.argv[2];

  if (!prompt) {
    console.error("Usage: npx tsx agents/agent-creator.ts \"your prompt here\"");
    process.exit(1);
  }

  console.log("Running Agent Creator...");
  console.log(`Prompt: ${prompt}\n`);

  try {
    for await (const message of query({
      prompt,
      options: agentCreatorAgent.options
    })) {
      if (message.type === "text") {
        console.log(message.text);
      }
    }
  } catch (error) {
    console.error("Failed to execute agent:", error);
    process.exit(1);
  }
}

// Only run when script is called directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAgent().catch(console.error);
}