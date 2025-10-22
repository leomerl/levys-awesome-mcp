import { AgentConfig } from '../src/types/agent-config.js';

const backendagentAgent: AgentConfig = {
  name: 'backend-agent',
  description: 'Test agent',
  systemPrompt: 'Test prompt',
  model: 'sonnet',
  options: {
    model: 'sonnet',
    allowedTools: ['Read'],
    systemPrompt: 'Test prompt'
  }
};

export default backendagentAgent;