import { AgentConfig } from '../src/types/agent-config.ts';

const testingAgent: AgentConfig = {
  name: 'testing-agent',
  description: 'Simple agent for testing purposes',
  prompt: 'Run simple tests and create summary reports',
  options: {
    model: 'sonnet',
    systemPrompt: `You are a testing agent. Your role is to:
1. Execute simple test operations
2. Validate expected results
3. Create summary reports using put_summary

IMPORTANT: You must create a summary report after completing your task.`,
    allowedTools: [
      'Bash(*)',
      'Read(*)',
      'mcp__levys-awesome-mcp__mcp__content-writer__put_summary'
    ]
  }
};

export { testingAgent };
export default testingAgent;