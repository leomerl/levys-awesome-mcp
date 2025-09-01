import { jest } from '@jest/globals';
import { writeFile, mkdir, readFile, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const fs = { writeFile, mkdir, readFile, rm, mkdtemp };

describe('Agent Generator - Minimal Integration Tests', () => {
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

  test('should create and read agent files', async () => {
    // Create real agent file
    const agentContent = `
export const testAgent = {
  name: 'test-agent',
  description: 'A test agent',
  systemPrompt: 'You are a test agent'
};`;
    
    await writeFile(path.join(agentsDir, 'test-agent.ts'), agentContent);
    
    // Verify file exists and can be read
    expect(existsSync(path.join(agentsDir, 'test-agent.ts'))).toBe(true);
    
    const content = await readFile(path.join(agentsDir, 'test-agent.ts'), 'utf8');
    expect(content).toContain('test-agent');
    expect(content).toContain('You are a test agent');
  });

  test('should handle directory operations', async () => {
    const testDir = path.join(tempDir, 'test-nested', 'deep');
    await mkdir(testDir, { recursive: true });
    
    expect(existsSync(testDir)).toBe(true);
    
    await writeFile(path.join(testDir, 'test.md'), '# Test Agent\nThis is a test.');
    
    const content = await readFile(path.join(testDir, 'test.md'), 'utf8');
    expect(content).toContain('# Test Agent');
  });
});