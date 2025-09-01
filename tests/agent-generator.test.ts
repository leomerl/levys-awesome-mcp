import { jest } from '@jest/globals';
import { readdir, readFile, writeFile, mkdir, unlink, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleAgentGeneratorTool } from '../src/handlers/agent-generator.js';

// Mock fs functions
jest.mock('fs');
jest.mock('fs/promises');

const mockExistsSync = jest.mocked(existsSync);
const mockReaddir = jest.mocked(readdir);
const mockWriteFile = jest.mocked(writeFile);
const mockMkdir = jest.mocked(mkdir);
const mockUnlink = jest.mocked(unlink);

// Mock module loading
const moduleMap = new Map<string, any>();
jest.unstable_mockModule('module', () => ({
  createRequire: jest.fn(() => ({
    resolve: jest.fn((id: string) => moduleMap.has(id) ? id : null)
  }))
}));

// Mock dynamic imports
const originalImport = global.import;
global.import = jest.fn((path: string) => {
  if (moduleMap.has(path)) {
    return Promise.resolve(moduleMap.get(path));
  }
  return Promise.reject(new Error(`Module not found: ${path}`));
}) as any;

// Type definitions for agent configs
interface AgentConfigOld {
  name: string;
  description: string;
  model: string;
  permissions: {
    mode: string;
    tools: { allowed: string[]; denied: string[] };
    mcpServers: Record<string, string>;
  };
  systemPrompt: string;
  context: { maxTokens: number; temperature: number };
}

interface AgentConfigNew {
  name: string;
  description: string;
  prompt: string;
  options: {
    systemPrompt: string;
    maxTurns: number;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    tools?: string[];
    mcpServers?: string[];
    permissions?: { mode: string };
  };
}

const fs = { readdir, readFile, writeFile, mkdir, unlink, rm, mkdtemp };

// Create real temp directories for testing
let tempDir: string;
let agentsDir: string;
let outputDir: string;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-gen-test-'));
  agentsDir = path.join(tempDir, 'agents');
  outputDir = path.join(tempDir, '.claude', 'agents');
  await mkdir(agentsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('Agent Generator Tool', () => {
  beforeEach(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('list_available_agents', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents';

    test('should list available agents when agents directory exists', async () => {
      // Create real agent files
      await writeFile(path.join(agentsDir, 'builder.ts'), 'export const builderAgent = { name: "builder" };');
      await writeFile(path.join(agentsDir, 'orchestrator.ts'), 'export const orchestratorAgent = { name: "orchestrator" };');
      await writeFile(path.join(agentsDir, 'non-agent.js'), 'console.log("not an agent");');
      await writeFile(path.join(agentsDir, 'readme.md'), '# Agents');

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Available agents:');
      expect(result.content[0].text).toContain('- builder');
      expect(result.content[0].text).toContain('- orchestrator');
      expect(result.content[0].text).not.toContain('non-agent');
    });

    test('should return empty list when agents directory does not exist', async () => {
      // Use different temp dir without agents
      const emptyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-test-'));
      jest.spyOn(process, 'cwd').mockReturnValue(emptyTempDir);

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No agents found');
      
      await fs.rm(emptyTempDir, { recursive: true, force: true });
    });

    test('should handle readdir error gracefully', async () => {
      // Create directory with no read permissions (if possible on current OS)
      const restrictedDir = path.join(tempDir, 'restricted-agents');
      await mkdir(restrictedDir, { recursive: true });
      
      // Mock cwd to point to directory with restricted agents folder
      jest.spyOn(process, 'cwd').mockReturnValue(path.dirname(restrictedDir));
      
      // This test may behave differently on different OS, but should not crash
      const result = await handleAgentGeneratorTool(toolName, {});
      
      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No agents found');
    });
  });

  describe('get_agent_info', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__agent-generator__get_agent_info';

    test('should return agent info for old config format', async () => {
      const mockOldConfig: AgentConfigOld = {
        name: 'test-agent',
        description: 'A test agent',
        model: 'gpt-4',
        permissions: {
          mode: 'default',
          tools: { allowed: ['Read', 'Write'], denied: ['Bash'] },
          mcpServers: { 'test-server': 'allow' }
        },
        systemPrompt: 'You are a test agent',
        context: { maxTokens: 1000, temperature: 0.7 }
      };

      const agentPath = path.join('/mock/project', 'agents', 'test-agent.ts');
      moduleMap.set(agentPath, { default: mockOldConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'test-agent' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('# test-agent');
      expect(result.content[0].text).toContain('A test agent');
      expect(result.content[0].text).toContain('**Model:** gpt-4');
      expect(result.content[0].text).toContain('**Temperature:** 0.7');
      expect(result.content[0].text).toContain('You are a test agent');
    });

    test('should return agent info for new config format', async () => {
      const mockNewConfig: AgentConfigNew = {
        name: 'modern-agent',
        description: 'A modern test agent',
        prompt: 'Execute the task',
        options: {
          systemPrompt: 'You are a modern agent',
          maxTurns: 5,
          model: 'claude-3',
          temperature: 0.3,
          tools: ['Read', 'Edit']
        }
      };

      const agentPath = path.join('/mock/project', 'agents', 'modern-agent.ts');
      moduleMap.set(agentPath, { default: mockNewConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'modern-agent' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('# modern-agent');
      expect(result.content[0].text).toContain('Execute the task');
      expect(result.content[0].text).toContain('**Max Turns:** 5');
    });

    test('should handle agent not found', async () => {
      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'nonexistent-agent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Agent 'nonexistent-agent' not found or failed to load");
    });

    test('should handle named export', async () => {
      const mockConfig: AgentConfigOld = {
        name: 'exported-agent',
        description: 'An exported agent',
        model: 'gpt-3.5',
        permissions: { mode: 'default', tools: { allowed: [], denied: [] }, mcpServers: {} },
        systemPrompt: 'Test prompt',
        context: { maxTokens: 500, temperature: 0.5 }
      };

      const agentPath = path.join('/mock/project', 'agents', 'exported-agent.ts');
      moduleMap.set(agentPath, { agent: mockConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'exported-agent' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('# exported-agent');
    });
  });

  describe('generate_all_agents', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__agent-generator__generate_all_agents';

    test('should generate markdown files for all agents', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // agents dir exists
        .mockReturnValueOnce(false); // output dir doesn't exist
      mockReaddir.mockResolvedValue(['agent1.ts', 'agent2.ts'] as any);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const mockConfig1: AgentConfigOld = {
        name: 'agent1',
        description: 'First agent',
        model: 'gpt-4',
        permissions: { mode: 'default', tools: { allowed: [], denied: [] }, mcpServers: {} },
        systemPrompt: 'Prompt 1',
        context: { maxTokens: 1000, temperature: 0.5 }
      };

      const mockConfig2: AgentConfigNew = {
        name: 'agent2',
        description: 'Second agent',
        prompt: 'Do task',
        options: { systemPrompt: 'Prompt 2', maxTurns: 5 }
      };

      moduleMap.set(path.join('/mock/project', 'agents', 'agent1.ts'), { default: mockConfig1 });
      moduleMap.set(path.join('/mock/project', 'agents', 'agent2.ts'), { default: mockConfig2 });

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Generated 2 markdown files');
      expect(result.content[0].text).toContain('Generated agent1.md');
      expect(result.content[0].text).toContain('Generated agent2.md');
      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalledTimes(2);
    });

    test('should handle failed agent loads', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // agents dir exists
        .mockReturnValueOnce(false); // output dir doesn't exist
      mockReaddir.mockResolvedValue(['good-agent.ts', 'bad-agent.ts'] as any);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      const mockConfig: AgentConfigOld = {
        name: 'good-agent',
        description: 'Good agent',
        model: 'gpt-4',
        permissions: { mode: 'default', tools: { allowed: [], denied: [] }, mcpServers: {} },
        systemPrompt: 'Good',
        context: { maxTokens: 1000, temperature: 0.5 }
      };

      moduleMap.set(path.join('/mock/project', 'agents', 'good-agent.ts'), { default: mockConfig });
      // bad-agent.ts is not in moduleMap, so it will fail to load

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.content[0].text).toContain('Generated 1 markdown files');
      expect(result.content[0].text).toContain('Generated good-agent.md');
      expect(result.content[0].text).toContain('Failed to load bad-agent');
    });
  });

  describe('remove_agent_markdowns', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__agent-generator__remove_agent_markdowns';

    test('should remove all markdown files', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockResolvedValue(['agent1.md', 'agent2.md', 'config.json'] as any);
      mockUnlink.mockResolvedValue(undefined);

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Removed 2 markdown files');
      expect(mockUnlink).toHaveBeenCalledTimes(2);
    });

    test('should handle directory not existing', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No markdown files to remove');
    });

    test('should handle readdir error', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddir.mockRejectedValue(new Error('Permission denied'));

      const result = await handleAgentGeneratorTool(toolName, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error removing files: Permission denied');
    });
  });

  describe('error handling', () => {
    test('should handle unknown tool name', async () => {
      const result = await handleAgentGeneratorTool('unknown-tool', {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown agent generator tool: unknown-tool');
    });

    test('should handle unexpected errors', async () => {
      mockExistsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      const result = await handleAgentGeneratorTool(
        'mcp__levys-awesome-mcp__mcp__agent-generator__list_available_agents', 
        {}
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error in agent generator tool: File system error');
    });
  });

  describe('minimal integration tests', () => {
    test('should create and read agent files', async () => {
      const agentContent = `
export const testAgent = {
  name: 'test-agent',
  description: 'A test agent',
  systemPrompt: 'You are a test agent'
};`;
      
      await fs.writeFile(path.join(agentsDir, 'test-agent.ts'), agentContent);
      
      expect(existsSync(path.join(agentsDir, 'test-agent.ts'))).toBe(true);
      
      const content = await fs.readFile(path.join(agentsDir, 'test-agent.ts'), 'utf8');
      expect(content).toContain('test-agent');
      expect(content).toContain('You are a test agent');
    });

    test('should handle directory operations', async () => {
      const testDir = path.join(tempDir, 'test-nested', 'deep');
      await fs.mkdir(testDir, { recursive: true });
      
      expect(existsSync(testDir)).toBe(true);
      
      await fs.writeFile(path.join(testDir, 'test.md'), '# Test Agent\nThis is a test.');
      
      const content = await fs.readFile(path.join(testDir, 'test.md'), 'utf8');
      expect(content).toContain('# Test Agent');
    });
  });

  describe('markdown generation formats', () => {
    const toolName = 'mcp__levys-awesome-mcp__mcp__agent-generator__get_agent_info';

    test('should generate complete markdown for old config', async () => {
      const mockConfig: AgentConfigOld = {
        name: 'full-agent',
        description: 'A fully configured agent',
        model: 'gpt-4-turbo',
        permissions: {
          mode: 'ask',
          tools: { allowed: ['Read', 'Write'], denied: ['Delete'] },
          mcpServers: { 'server1': 'allow', 'server2': 'deny' }
        },
        systemPrompt: 'You are a comprehensive test agent.',
        context: { maxTokens: 4000, temperature: 0.2 }
      };

      const agentPath = path.join('/mock/project', 'agents', 'full-agent.ts');
      moduleMap.set(agentPath, { default: mockConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'full-agent' });
      const markdown = result.content[0].text;

      expect(markdown).toContain('# full-agent');
      expect(markdown).toContain('## Description\nA fully configured agent');
      expect(markdown).toContain('**Model:** gpt-4-turbo');
      expect(markdown).toContain('**Permission Mode:** ask');
      expect(markdown).toContain('**Max Tokens:** 4000');
      expect(markdown).toContain('**Allowed Tools:** Read, Write');
      expect(markdown).toContain('**Denied Tools:** Delete');
      expect(markdown).toContain('server1: allow, server2: deny');
    });

    test('should generate complete markdown for new config', async () => {
      const mockConfig: AgentConfigNew = {
        name: 'modern-agent',
        description: 'A modern agent',
        prompt: 'Execute development tasks',
        options: {
          systemPrompt: 'You are a modern development agent.',
          maxTurns: 15,
          model: 'claude-3-opus',
          temperature: 0.1,
          maxTokens: 8000,
          tools: ['Read', 'Write', 'Edit'],
          mcpServers: ['build', 'test'],
          permissions: { mode: 'acceptEdits' }
        }
      };

      const agentPath = path.join('/mock/project', 'agents', 'modern-agent.ts');
      moduleMap.set(agentPath, { default: mockConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'modern-agent' });
      const markdown = result.content[0].text;

      expect(markdown).toContain('# modern-agent');
      expect(markdown).toContain('## Prompt\nExecute development tasks');
      expect(markdown).toContain('**Max Turns:** 15');
      expect(markdown).toContain('**Model:** claude-3-opus');
      expect(markdown).toContain('**Temperature:** 0.1');
      expect(markdown).toContain('**Max Tokens:** 8000');
      expect(markdown).toContain('## Tools\nRead, Write, Edit');
      expect(markdown).toContain('## MCP Servers\nbuild, test');
    });

    test('should handle minimal new config with defaults', async () => {
      const mockConfig: AgentConfigNew = {
        name: 'minimal-agent',
        description: 'Minimal config',
        prompt: 'Simple task',
        options: { systemPrompt: 'Basic prompt', maxTurns: 3 }
      };

      const agentPath = path.join('/mock/project', 'agents', 'minimal-agent.ts');
      moduleMap.set(agentPath, { default: mockConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'minimal-agent' });
      const markdown = result.content[0].text;

      expect(markdown).toContain('**Model:** default');
      expect(markdown).toContain('**Temperature:** default');
      expect(markdown).toContain('Default tools');
      expect(markdown).toContain('Default servers');
    });

    test('should handle unsupported config format', async () => {
      const invalidConfig = { name: 'invalid-agent', someProperty: 'value' };

      const agentPath = path.join('/mock/project', 'agents', 'invalid-agent.ts');
      moduleMap.set(agentPath, { default: invalidConfig });

      const result = await handleAgentGeneratorTool(toolName, { agent_name: 'invalid-agent' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('# invalid-agent');
      expect(result.content[0].text).toContain('Unsupported configuration format');
    });
  });
});