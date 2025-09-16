import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import { DevServerResult } from '../shared/types.js';
import { validateProjectDirectory } from '../shared/utils.js';

export const serverRunnerTools = [
  {
    name: 'run_dev_backend',
    description: 'Start the backend development server',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'run_dev_frontend',
    description: 'Start the frontend development server',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'run_dev_all',
    description: 'Start both backend and frontend development servers',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  }
];

// Global process tracking for server runner
const runningProcesses: Map<string, ChildProcess> = new Map();

async function runCommand(command: string, args: string[], cwd: string): Promise<ChildProcess | null> {
  try {
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      detached: false,
      shell: true
    });

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    return child.pid ? child : null;
  } catch (error) {
    return null;
  }
}

async function runBackendDev(): Promise<DevServerResult> {
  try {
    const backendDir = path.join(process.cwd(), 'backend');
    
    // Validate backend directory has proper structure
    const validation = validateProjectDirectory(backendDir, ['dev']);
    if (!validation.valid) {
      return {
        success: false,
        message: `ERROR: Backend validation failed: ${validation.error}`,
        error: validation.error!
      };
    }

    const child = await runCommand('npm', ['run', 'dev'], backendDir);
    
    if (child) {
      runningProcesses.set('backend', child);
      return {
        success: true,
        message: `Backend dev server started (PID: ${child.pid})\nRunning: tsx watch src/server.ts\nCheck console for server URL`,
        pids: [child.pid!]
      };
    } else {
      return {
        success: false,
        message: "ERROR: Failed to start backend dev server",
        error: "Process did not start properly"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "ERROR: Error starting backend dev server",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runFrontendDev(): Promise<DevServerResult> {
  try {
    const frontendDir = path.join(process.cwd(), 'frontend');
    
    // Validate frontend directory has proper structure
    const validation = validateProjectDirectory(frontendDir, ['dev']);
    if (!validation.valid) {
      return {
        success: false,
        message: `ERROR: Frontend validation failed: ${validation.error}`,
        error: validation.error!
      };
    }

    const child = await runCommand('npm', ['run', 'dev'], frontendDir);
    
    if (child) {
      runningProcesses.set('frontend', child);
      return {
        success: true,
        message: `Frontend dev server started (PID: ${child.pid})\nRunning: vite\nTypically available at: http://localhost:5173`,
        pids: [child.pid!]
      };
    } else {
      return {
        success: false,
        message: "ERROR: Failed to start frontend dev server",
        error: "Process did not start properly"
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "ERROR: Error starting frontend dev server",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runBothDevServers(): Promise<DevServerResult> {
  try {
    const backendDir = path.join(process.cwd(), 'backend');
    const frontendDir = path.join(process.cwd(), 'frontend');
    const errors: string[] = [];
    const pids: number[] = [];
    
    // Validate both directories
    const backendValidation = validateProjectDirectory(backendDir, ['dev']);
    if (!backendValidation.valid) {
      errors.push(`Backend: ${backendValidation.error}`);
    }
    
    const frontendValidation = validateProjectDirectory(frontendDir, ['dev']);
    if (!frontendValidation.valid) {
      errors.push(`Frontend: ${frontendValidation.error}`);
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `ERROR: Validation failed:\n${errors.join('\n')}`,
        error: errors.join('; ')
      };
    }

    // Start backend dev server
    const backendChild = await runCommand('npm', ['run', 'dev'], backendDir);
    if (backendChild) {
      runningProcesses.set('backend', backendChild);
      pids.push(backendChild.pid!);
    } else {
      errors.push("Failed to start backend server");
    }

    // Start frontend dev server
    const frontendChild = await runCommand('npm', ['run', 'dev'], frontendDir);
    if (frontendChild) {
      runningProcesses.set('frontend', frontendChild);
      pids.push(frontendChild.pid!);
    } else {
      errors.push("Failed to start frontend server");
    }

    if (pids.length === 2) {
      return {
        success: true,
        message: `Both dev servers started!\n` +
                `Backend (PID: ${pids[0]}): tsx watch src/server.ts\n` +
                `Frontend (PID: ${pids[1]}): vite\n` +
                `Frontend typically at: http://localhost:5173\n` +
                `Backend check console for server URL`,
        pids
      };
    } else if (pids.length === 1) {
      return {
        success: false,
        message: `WARNING: Partially started - only ${pids.length}/2 servers running\nErrors: ${errors.join(', ')}`,
        pids,
        error: errors.join(', ')
      };
    } else {
      return {
        success: false,
        message: `ERROR: Failed to start dev servers\nErrors: ${errors.join(', ')}`,
        error: errors.join(', ')
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `ERROR: Error starting dev servers: ${error instanceof Error ? error.message : String(error)}`,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function handleServerRunnerTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    let result: DevServerResult;

    switch (name) {
      case 'run_dev_backend':
      case 'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_backend':
        result = await runBackendDev();
        break;
      case 'run_dev_frontend':
      case 'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_frontend':
        result = await runFrontendDev();
        break;
      case 'run_dev_all':
      case 'mcp__levys-awesome-mcp__mcp__server-runner__run_dev_all':
        result = await runBothDevServers();
        break;
      default:
        throw new Error(`Unknown server runner tool: ${name}`);
    }

    return {
      content: [{
        type: 'text',
        text: result.message
      }],
      isError: !result.success
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in server runner tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}