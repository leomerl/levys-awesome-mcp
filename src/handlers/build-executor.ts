import { executeCommand, validateProjectDirectory } from '../shared/utils.js';
import * as path from 'path';
import { existsSync } from 'fs';
import { loadContentWriterConfigSync, getDefaultPath } from '../config/content-writer-config.js';

export const buildExecutorTools = [
  {
    name: 'build_project',
    description: 'Build the entire project (backend typecheck + frontend build). Folders are configurable via content-writer.json',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'build_backend',
    description: 'Build/typecheck the backend only. Backend folder is configurable via content-writer.json',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'build_frontend',
    description: 'Build the frontend only. Frontend folder is configurable via content-writer.json',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      additionalProperties: false
    }
  }
];

export async function handleBuildExecutorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'build_project':
      case 'mcp__levys-awesome-mcp__mcp__build-executor__build_project': {
        const results = [];
        let allSuccess = true;

        // Load configuration with fallback to defaults
        const config = loadContentWriterConfigSync();

        // Validate and build backend
        const backendPath = getDefaultPath(config, 'backend');
        const backendDir = path.join(process.cwd(), backendPath);
        const backendValidation = validateProjectDirectory(backendDir, ['typecheck']);
        if (backendValidation.valid) {
          const backendResult = await executeCommand('npm', ['run', 'typecheck'], backendDir);
          results.push(`Backend Typecheck (${backendPath}): ${backendResult.success ? 'SUCCESS' : 'FAILED'}`);
          if (!backendResult.success) {
            results.push(`Backend Error: ${backendResult.stderr || backendResult.error}`);
            allSuccess = false;
          }
        } else {
          results.push(`Backend (${backendPath}): SKIPPED - ${backendValidation.error}`);
        }

        // Validate and build frontend
        const frontendPath = getDefaultPath(config, 'frontend');
        const frontendDir = path.join(process.cwd(), frontendPath);
        const frontendValidation = validateProjectDirectory(frontendDir, ['build']);
        if (frontendValidation.valid) {
          const frontendResult = await executeCommand('npm', ['run', 'build'], frontendDir);
          results.push(`Frontend Build (${frontendPath}): ${frontendResult.success ? 'SUCCESS' : 'FAILED'}`);
          if (!frontendResult.success) {
            results.push(`Frontend Error: ${frontendResult.stderr || frontendResult.error}`);
            allSuccess = false;
          }
        } else {
          results.push(`Frontend (${frontendPath}): SKIPPED - ${frontendValidation.error}`);
        }

        return {
          content: [{
            type: 'text',
            text: `Project Build ${allSuccess ? 'COMPLETED' : 'FAILED'}:\n${results.join('\n')}`
          }],
          isError: !allSuccess
        };
      }

      case 'build_backend':
      case 'mcp__levys-awesome-mcp__mcp__build-executor__build_backend': {
        // Load configuration with fallback to defaults
        const config = loadContentWriterConfigSync();
        const backendPath = getDefaultPath(config, 'backend');
        const backendDir = path.join(process.cwd(), backendPath);
        const validation = validateProjectDirectory(backendDir, ['typecheck']);

        if (!validation.valid) {
          return {
            content: [{
              type: 'text',
              text: `Backend build failed (${backendPath}): ${validation.error}`
            }],
            isError: true
          };
        }

        const result = await executeCommand('npm', ['run', 'typecheck'], backendDir);
        return {
          content: [{
            type: 'text',
            text: `Backend Typecheck (${backendPath}) ${result.success ? 'SUCCESS' : 'FAILED'}:\n${result.stdout}\n${result.stderr}`
          }],
          isError: !result.success
        };
      }

      case 'build_frontend':
      case 'mcp__levys-awesome-mcp__mcp__build-executor__build_frontend': {
        // Load configuration with fallback to defaults
        const config = loadContentWriterConfigSync();
        const frontendPath = getDefaultPath(config, 'frontend');
        const frontendDir = path.join(process.cwd(), frontendPath);
        const validation = validateProjectDirectory(frontendDir, ['build']);

        if (!validation.valid) {
          return {
            content: [{
              type: 'text',
              text: `Frontend build failed (${frontendPath}): ${validation.error}`
            }],
            isError: true
          };
        }

        const result = await executeCommand('npm', ['run', 'build'], frontendDir);
        return {
          content: [{
            type: 'text',
            text: `Frontend Build (${frontendPath}) ${result.success ? 'SUCCESS' : 'FAILED'}:\n${result.stdout}\n${result.stderr}`
          }],
          isError: !result.success
        };
      }

      default:
        throw new Error(`Unknown build executor tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in build executor tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}