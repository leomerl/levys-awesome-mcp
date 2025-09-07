import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';
import { ReportManager } from '../../src/utilities/session/report-manager.js';

describe('Report Collection Integration Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('should collect summaries from multiple agents', async () => {
    const backendSessionId = `backend-${Date.now()}`;
    const frontendSessionId = `frontend-${Date.now() + 1}`;

    // Create backend agent summary
    await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary',
      arguments: {
        session_id: backendSessionId,
        agent_name: 'backend-agent',
        content: JSON.stringify({ task: 'backend task', status: 'done' })
      }
    });

    // Create frontend agent summary
    await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary',
      arguments: {
        session_id: frontendSessionId,
        agent_name: 'frontend-agent',
        content: JSON.stringify({ task: 'frontend task', status: 'done' })
      }
    });

    const backendSummary = ReportManager.getAgentSummary(backendSessionId, 'backend-agent');
    const frontendSummary = ReportManager.getAgentSummary(frontendSessionId, 'frontend-agent');

    expect(backendSummary.success).toBe(true);
    expect(frontendSummary.success).toBe(true);

    const summaries = [backendSummary.summary, frontendSummary.summary];
    const sessionIds = summaries.map(s => s.sessionId);

    expect(sessionIds).toContain(backendSessionId);
    expect(sessionIds).toContain(frontendSessionId);
    expect(sessionIds[0]).not.toBe(sessionIds[1]);

    expect(backendSummary.summary.agentName || backendSummary.summary.agentType).toBe('backend-agent');
    expect(frontendSummary.summary.agentName || frontendSummary.summary.agentType).toBe('frontend-agent');
  });
});

