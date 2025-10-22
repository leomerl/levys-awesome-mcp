import { AgentConfig } from '../src/types/agent-config.js';

const testingagentAgent: AgentConfig = {
  name: 'testing-agent',
  description: 'Test agent',
  systemPrompt: 'Test prompt',
  model: 'sonnet',
  options: {
    model: 'sonnet',
    allowedTools: ['Read'],
    systemPrompt: 'Test prompt'
  }
};

export default testingagentAgent;