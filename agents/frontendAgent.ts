import { AgentConfig } from '../src/types/agent-config.js';

const frontendagentAgent: AgentConfig = {
  name: 'frontend-agent',
  description: 'Test agent',
  systemPrompt: 'Test prompt',
  model: 'sonnet',
  options: {
    model: 'sonnet',
    allowedTools: ['Read'],
    systemPrompt: 'Test prompt'
  }
};

export default frontendagentAgent;