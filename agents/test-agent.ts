import { AgentConfig } from '../src/types/agent-config.ts';

const testingAgent: AgentConfig = {
  name: 'test-agent',
  description: 'Simple agent for testing purposes',
  prompt: 'Run simple tests and create summary reports',
  options: {
    model: 'sonnet',
    systemPrompt: `You are a testing agent. Your role is to do nothing`,
    allowedTools: [
      'Read(*)'
    ]
  }
};

export { testingAgent };
export default testingAgent;