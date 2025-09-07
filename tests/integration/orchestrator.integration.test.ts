import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Integration test for the orchestrator workflow tool.  The test starts
 * the MCP server, invokes the orchestrator's `run_workflow` tool and
 * verifies that downstream agents (planner -> builder -> test-runner)
 * were executed by inspecting returned content and any generated report
 * files.
 */
describe('Orchestrator Workflow Integration Test', () => {
  let client: MCPClient;
  const reportsDir = join(process.cwd(), 'reports');
  let preExistingSessions: string[] = [];

  beforeAll(async () => {
    if (existsSync(reportsDir)) {
      preExistingSessions = readdirSync(reportsDir);
    }

    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
  });

  afterAll(async () => {
    await client.stop();
  });

  it('executes planner, builder and test-runner agents', async () => {
    const response = await client.call('tools/call', {
      name: 'mcp__levys-awesome-mcp__mcp__orchestrator__run_workflow',
      arguments: {
        task: 'create a sample file and ensure tests run'
      }
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();

    let text = '';
    if (response.result?.content?.[0]?.type === 'text') {
      text = response.result.content[0].text;
    }

    // Check response mentions downstream agents
    expect(text).toMatch(/planner/i);
    expect(text).toMatch(/builder/i);
    expect(text).toMatch(/test[- ]?runner/i);

    // If a new session directory was created, ensure expected summaries exist
    if (existsSync(reportsDir)) {
      const sessions = readdirSync(reportsDir);
      const newSessions = sessions.filter(s => !preExistingSessions.includes(s));
      if (newSessions.length > 0) {
        const sessionDir = join(reportsDir, newSessions[0]);
        const files = readdirSync(sessionDir);
        const hasPlanner = files.some(f => /planner|plan-creator/i.test(f));
        const hasBuilder = files.some(f => /builder/i.test(f));
        const hasTestRunner = files.some(f => /test-runner|testing-agent/i.test(f));

        expect(hasPlanner).toBe(true);
        expect(hasBuilder).toBe(true);
        expect(hasTestRunner).toBe(true);
      }
    }
  });
});
