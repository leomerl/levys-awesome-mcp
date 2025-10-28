/**
 * All Agents Invocation Test
 * Tests that every agent can be successfully invoked with a minimal prompt
 *
 * NOTE: Tests run SEQUENTIALLY to avoid memory allocation problems.
 * Each agent is tested one at a time with a delay between invocations.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MCPClient } from '../helpers/mcp-client.js';

// List of all agents to test (excluding base-agent which has no name field)
const ALL_AGENTS = [
  // Workflow orchestrators
  'orchestrator-agent',
  'planner-agent',
  'sparc-orchestrator',

  // SPARC phase agents
  'research-agent',
  'sparc-research-agent',
  'specification-agent',
  'pseudocode-agent',
  'architecture-agent',
  'refinement-agent',
  'completion-agent',

  // Development agents
  'backend-agent',
  'builder-agent',
  'frontend-agent',
  'linter-agent',
  'reviewer-agent',

  // Testing agents
  'testing-agent',
  'static-test-creator',
  'static-test-absence-detector',

  // Tooling agents
  'agent-creator',
  'github-issue-creator',

  // Utility agents
  'memory-test-agent'
];

describe('All Agents Invocation Tests', () => {
  let client: MCPClient;

  beforeAll(async () => {
    client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    // Set timeout for agent invocations (30 seconds per agent)
    client.setTimeout(30000);
  }, 15000);

  afterAll(async () => {
    await client.stop();
  });

  describe('Individual Agent Invocation', () => {
    // Test each agent can be invoked successfully
    // NOTE: These tests run SEQUENTIALLY (one after another) to avoid memory issues
    for (const agentName of ALL_AGENTS) {
      it(`should successfully invoke ${agentName}`, async () => {
        console.log(`\n🤖 Testing agent: ${agentName}`);
        const startTime = Date.now();

        // Small delay between agents to prevent memory issues
        await new Promise(resolve => setTimeout(resolve, 1000));

        const response = await client.call('tools/call', {
          name: 'invoke_agent',
          arguments: {
            agentName,
            prompt: 'Test connectivity: Please respond with a brief confirmation that you are working.',
            streaming: false
          }
        });

        const duration = (Date.now() - startTime) / 1000;
        console.log(`   ✅ ${agentName} responded in ${duration.toFixed(2)}s`);

        // Verify response structure
        expect(response).toBeDefined();
        expect(response.jsonrpc).toBe('2.0');
        expect(response.result).toBeDefined();
        expect(response.error).toBeUndefined();

        // Verify content exists
        expect(response.result.content).toBeDefined();
        expect(Array.isArray(response.result.content)).toBe(true);
        expect(response.result.content.length).toBeGreaterThan(0);

        // Verify text response
        const textContent = response.result.content.find((c: any) => c.type === 'text');
        expect(textContent).toBeDefined();
        expect(textContent.text).toBeDefined();
        expect(typeof textContent.text).toBe('string');
        expect(textContent.text.length).toBeGreaterThan(0);

      }, 35000); // 35 second timeout per agent test
    }
  });

  describe('Agent List Verification', () => {
    it('should list all expected agents', async () => {
      console.log('\n📋 Verifying agent list...');

      const response = await client.call('tools/call', {
        name: 'list_agents',
        arguments: {}
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();

      // Extract agent list from response text
      const textContent = response.result.content.find((c: any) => c.type === 'text');
      expect(textContent).toBeDefined();

      const agentListText = textContent.text;
      console.log('   Agent list response:', agentListText);

      // Verify all expected agents are in the list
      const missingAgents: string[] = [];
      for (const agentName of ALL_AGENTS) {
        if (!agentListText.includes(agentName)) {
          missingAgents.push(agentName);
        }
      }

      if (missingAgents.length > 0) {
        console.log('   ❌ Missing agents:', missingAgents.join(', '));
      } else {
        console.log('   ✅ All agents found in list');
      }

      expect(missingAgents).toHaveLength(0);
    }, 10000);
  });

  describe('Agent Count Verification', () => {
    it('should have exactly 21 agents available', async () => {
      console.log('\n🔢 Counting agents...');

      const response = await client.call('tools/call', {
        name: 'list_agents',
        arguments: {}
      });

      const textContent = response.result.content.find((c: any) => c.type === 'text');
      const agentListText = textContent.text;

      // Count agents in the list (each agent appears as "- agent-name")
      const agentMatches = agentListText.match(/^- .+$/gm) || [];
      const agentCount = agentMatches.length;

      console.log(`   Found ${agentCount} agents`);
      console.log(`   Expected ${ALL_AGENTS.length} agents`);

      expect(agentCount).toBe(ALL_AGENTS.length);
    }, 10000);
  });
});