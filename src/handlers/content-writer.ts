import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { validatePath, validateProjectDirectory } from '../shared/utils.js';

export const contentWriterTools = [
  {
    name: 'mcp__levys-awesome-mcp__mcp__content-writer__restricted_write',
    description: 'Write files to a specified folder only. The invoking agent must provide the allowed folder.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within the allowed folder)'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        },
        allowed_folder: {
          type: 'string',
          description: 'The folder path that the agent is allowed to write to'
        }
      },
      required: ['file_path', 'content', 'allowed_folder']
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write',
    description: 'Write files to the frontend/ folder only.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within frontend/ folder)'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['file_path', 'content']
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__content-writer__backend_write',
    description: 'Write files to the backend/ folder only.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within backend/ folder)'
        },
        content: {
          type: 'string',
          description: 'Content to write to the file'
        }
      },
      required: ['file_path', 'content']
    }
  }
];

export async function handleContentWriterTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__content-writer__restricted_write': {
        const { file_path, content, allowed_folder } = args;
        
        if (!validatePath(file_path)) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Path traversal not allowed'
            }],
            isError: true
          };
        }

        const normalizedAllowedFolder = path.normalize(allowed_folder);
        const fullPath = path.resolve(normalizedAllowedFolder, file_path);
        const normalizedFullPath = path.normalize(fullPath);

        if (!normalizedFullPath.startsWith(path.resolve(normalizedAllowedFolder))) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within the allowed folder'
            }],
            isError: true
          };
        }

        const dir = path.dirname(normalizedFullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(normalizedFullPath, content, 'utf8');
        return {
          content: [{
            type: 'text',
            text: `File written successfully to ${normalizedFullPath}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write': {
        const { file_path, content } = args;
        
        if (!validatePath(file_path)) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Path traversal not allowed'
            }],
            isError: true
          };
        }

        const frontendDir = path.join(process.cwd(), 'frontend');
        const fullPath = path.resolve(frontendDir, file_path);

        if (!fullPath.startsWith(path.resolve(frontendDir))) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within frontend/ folder'
            }],
            isError: true
          };
        }

        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf8');

        // Check if this looks like a proper frontend project structure
        const validation = validateProjectDirectory(frontendDir);
        let message = `File written successfully to frontend/${file_path}`;
        if (!validation.valid && existsSync(frontendDir)) {
          message += `\n\nWARNING: The frontend/ directory exists but doesn't appear to be a proper frontend project (${validation.error}). This may not be the intended project structure.`;
        }

        return {
          content: [{
            type: 'text',
            text: message
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__content-writer__backend_write': {
        const { file_path, content } = args;
        
        if (!validatePath(file_path)) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Path traversal not allowed'
            }],
            isError: true
          };
        }

        const backendDir = path.join(process.cwd(), 'backend');
        const fullPath = path.resolve(backendDir, file_path);

        if (!fullPath.startsWith(path.resolve(backendDir))) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within backend/ folder'
            }],
            isError: true
          };
        }

        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf8');

        // Check if this looks like a proper backend project structure
        const validation = validateProjectDirectory(backendDir);
        let message = `File written successfully to backend/${file_path}`;
        if (!validation.valid && existsSync(backendDir)) {
          message += `\n\nWARNING: The backend/ directory exists but doesn't appear to be a proper backend project (${validation.error}). This may not be the intended project structure.`;
        }

        return {
          content: [{
            type: 'text',
            text: message
          }]
        };
      }

      default:
        throw new Error(`Unknown content writer tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in content writer tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}