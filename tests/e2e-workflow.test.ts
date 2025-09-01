import { jest } from '@jest/globals';
import { readFile, rm, mkdtemp, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { handleOrchestratorTool } from '../src/handlers/orchestrator.js';
import { handleTestRunnerTool } from '../src/handlers/test-runner.js';
import { handleBuildExecutorTool } from '../src/handlers/build-executor.js';
import { handleContentWriterTool } from '../src/handlers/content-writer.js';

describe('End-to-End Workflow Tests', () => {
  let tempDir: string;
  let frontendDir: string;
  let backendDir: string;

  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'e2e-test-'));
    frontendDir = path.join(tempDir, 'frontend');
    backendDir = path.join(tempDir, 'backend');
    
    // Create project structure
    await mkdir(frontendDir, { recursive: true });
    await mkdir(backendDir, { recursive: true });
    
    // Create package.json files
    await writeFile(
      path.join(frontendDir, 'package.json'),
      JSON.stringify({
        scripts: { build: 'vite build', dev: 'vite', lint: 'eslint .' }
      })
    );
    await writeFile(
      path.join(backendDir, 'package.json'),
      JSON.stringify({
        scripts: { typecheck: 'tsc --noEmit', dev: 'tsx watch src/server.ts', lint: 'eslint .' }
      })
    );
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  test('complete development workflow: write -> build -> test', async () => {
    // 1. Write frontend component
    const frontendResult = await handleContentWriterTool(
      'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
      {
        file_path: 'src/components/Button.tsx',
        content: 'export const Button = () => <button>Click me</button>;'
      }
    );
    expect(frontendResult.isError).toBe(false);
    
    // 2. Write backend API
    const backendResult = await handleContentWriterTool(
      'mcp__levys-awesome-mcp__mcp__content-writer__backend_write',
      {
        file_path: 'src/routes/api.ts',
        content: 'export const handler = (req: Request) => new Response("OK");'
      }
    );
    expect(backendResult.isError).toBe(false);
    
    // 3. Build project
    const buildResult = await handleBuildExecutorTool(
      'mcp__levys-awesome-mcp__mcp__build-executor__build_project',
      {}
    );
    // Build may fail due to missing dependencies, but should attempt both
    expect(buildResult.content[0].text).toContain('Backend Typecheck:');
    expect(buildResult.content[0].text).toContain('Frontend Build:');
    
    // 4. Run tests
    const testResult = await handleTestRunnerTool(
      'mcp__levys-awesome-mcp__mcp__test-runner__test_runner',
      {}
    );
    expect(testResult.content[0].text).toContain('Backend:');
    expect(testResult.content[0].text).toContain('Frontend:');
    
    // Verify files were created
    expect(existsSync(path.join(frontendDir, 'src', 'components', 'Button.tsx'))).toBe(true);
    expect(existsSync(path.join(backendDir, 'src', 'routes', 'api.ts'))).toBe(true);
  });

  test('orchestrator multi-agent workflow', async () => {
    const workflowResult = await handleOrchestratorTool(
      'mcp__levys-awesome-mcp__mcp__orchestrator__coordinate_workflow',
      {
        workflow_description: 'Full development cycle',
        agents: [
          {
            agent_type: 'backend-agent',
            task: 'Create API endpoints'
          },
          {
            agent_type: 'frontend-agent',
            task: 'Create UI components',
            depends_on: ['backend-agent']
          },
          {
            agent_type: 'testing-agent',
            task: 'Validate implementation',
            depends_on: ['backend-agent', 'frontend-agent']
          }
        ]
      }
    );

    expect(workflowResult.isError).toBe(false);
    expect(workflowResult.content[0].text).toContain('Multi-Agent Workflow Complete');
    expect(workflowResult.content[0].text).toContain('Agents executed: 3');
    expect(workflowResult.content[0].text).toContain('backend-agent');
    expect(workflowResult.content[0].text).toContain('frontend-agent');
    expect(workflowResult.content[0].text).toContain('testing-agent');
  });

  test('error handling in workflow chain', async () => {
    // Test workflow with circular dependency
    const circularResult = await handleOrchestratorTool(
      'mcp__levys-awesome-mcp__mcp__orchestrator__coordinate_workflow',
      {
        workflow_description: 'Circular dependency test',
        agents: [
          {
            agent_type: 'backend-agent',
            task: 'Task A',
            depends_on: ['frontend-agent']
          },
          {
            agent_type: 'frontend-agent',
            task: 'Task B',
            depends_on: ['backend-agent']
          }
        ]
      }
    );

    expect(circularResult.isError).toBe(true);
    expect(circularResult.content[0].text).toContain('Circular dependency detected');
  });

  test('testing agent validates all MCP tools', async () => {
    const testingResult = await handleOrchestratorTool(
      'mcp__levys-awesome-mcp__mcp__orchestrator__invoke_agent',
      {
        agent_type: 'testing-agent',
        task_description: 'Validate MCP tools',
        detailed_prompt: 'Test all test-runner variants: run_backend_tests, run_frontend_tests, run_e2e_tests, and test_runner',
        options: {
          allowed_tools: ['test-runner', 'validation']
        }
      }
    );

    expect(testingResult.isError).toBe(false);
    expect(testingResult.content[0].text).toContain('Agent Invocation Complete');
    expect(testingResult.content[0].text).toContain('testing-agent');
    expect(testingResult.content[0].text).toContain('run_backend_tests');
    expect(testingResult.content[0].text).toContain('run_frontend_tests');
    expect(testingResult.content[0].text).toContain('run_e2e_tests');
    expect(testingResult.content[0].text).toContain('test_runner');
  });

  test('session management across workflow steps', async () => {
    // Invoke agent and verify session structure
    const agentResult = await handleOrchestratorTool(
      'mcp__levys-awesome-mcp__mcp__orchestrator__invoke_agent',
      {
        agent_type: 'backend-agent',
        task_description: 'Create backend structure',
        detailed_prompt: 'Set up basic backend project structure'
      }
    );

    expect(agentResult.isError).toBe(false);
    
    // Verify session structure is mentioned in response
    expect(agentResult.content[0].text).toContain('Session ID:');
    expect(agentResult.content[0].text).toContain('output_streams');
    expect(agentResult.content[0].text).toContain('reports');
    expect(agentResult.content[0].text).toContain('conversation.jsonl');
    expect(agentResult.content[0].text).toContain('session-metadata.json');
  });
});