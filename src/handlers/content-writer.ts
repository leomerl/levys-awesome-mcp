import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readdirSync, readFileSync } from 'fs';
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
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary',
    description: 'Create a summary report file in reports/$SESSION_ID/${agent_name}-summary.json. Use this to create summary reports of agent execution.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to create the summary for'
        },
        agent_name: {
          type: 'string',
          description: 'Name of the agent creating the summary'
        },
        content: {
          type: 'string',
          description: 'JSON content of the summary report'
        }
      },
      required: ['session_id', 'agent_name', 'content']
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__content-writer__get_summary',
    description: 'Read a summary report file from reports/$SESSION_ID/ directory. Looks for any summary files in the session directory.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to read the summary from'
        },
        agent_name: {
          type: 'string',
          description: 'Optional: specific agent name to look for (e.g., "builder", "testing-agent"). If not provided, returns the first summary found.'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__content-writer__get_plan',
    description: 'Read a plan file from plan_and_progress/$GIT_HASH/ directory. Looks for plan files created by the planner agent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        git_hash: {
          type: 'string',
          description: 'Optional: specific git hash to look for. If not provided, uses current git commit hash.'
        }
      }
    }
  }
];

export async function handleContentWriterTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Normalize tool names - handle both short and long forms from Claude Code
    const normalizedName = name.replace('mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__', 'mcp__levys-awesome-mcp__mcp__');
    
    switch (normalizedName) {
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

      case 'mcp__levys-awesome-mcp__mcp__content-writer__put_summary': {
        const { session_id, agent_name, content } = args;
        
        // Validate session_id
        if (!session_id || typeof session_id !== 'string') {
          return {
            content: [{
              type: 'text',
              text: 'Invalid session_id: must be a non-empty string'
            }],
            isError: true
          };
        }

        // Validate agent_name
        if (!agent_name || typeof agent_name !== 'string') {
          return {
            content: [{
              type: 'text',
              text: 'Invalid agent_name: must be a non-empty string'
            }],
            isError: true
          };
        }

        // Create reports directory structure
        const reportsDir = path.resolve(process.cwd(), 'reports', session_id);
        if (!existsSync(reportsDir)) {
          await mkdir(reportsDir, { recursive: true });
        }

        // Validate JSON content
        let jsonContent;
        try {
          jsonContent = JSON.parse(content);
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid JSON content: Content must be valid JSON string'
            }],
            isError: true
          };
        }

        // Ensure the JSON has the session_id and agent_name
        if (!jsonContent.sessionId) {
          jsonContent.sessionId = session_id;
        }
        if (!jsonContent.agentName) {
          jsonContent.agentName = agent_name;
        }

        // Write summary file with agent name format
        const summaryFileName = `${agent_name}-summary.json`;
        const summaryPath = path.join(reportsDir, summaryFileName);
        await writeFile(summaryPath, JSON.stringify(jsonContent, null, 2), 'utf8');

        return {
          content: [{
            type: 'text',
            text: `Summary report created successfully at reports/${session_id}/${summaryFileName}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__content-writer__get_summary': {
        const { session_id, agent_name } = args;
        
        // Validate session_id
        if (!session_id || typeof session_id !== 'string') {
          return {
            content: [{
              type: 'text',
              text: 'Invalid session_id: must be a non-empty string'
            }],
            isError: true
          };
        }

        // Check if reports directory exists
        const reportsDir = path.resolve(process.cwd(), 'reports', session_id);
        if (!existsSync(reportsDir)) {
          return {
            content: [{
              type: 'text',
              text: `No reports directory found for session: ${session_id}`
            }],
            isError: true
          };
        }

        try {
          // Get all JSON files in the session directory
          const files = readdirSync(reportsDir).filter((file: string) => file.endsWith('.json'));
          
          if (files.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No summary files found in reports/${session_id}/`
              }],
              isError: true
            };
          }

          // If agent_name is specified, look for that specific summary
          let targetFile: string | null = null;
          if (agent_name) {
            const expectedFileName = `${agent_name}-summary.json`;
            if (files.includes(expectedFileName)) {
              targetFile = expectedFileName;
            } else {
              return {
                content: [{
                  type: 'text',
                  text: `Summary file not found for agent '${agent_name}' in session ${session_id}. Available files: ${files.join(', ')}`
                }],
                isError: true
              };
            }
          } else {
            // Find the first summary file
            targetFile = files.find((file: string) => file.includes('-summary.json')) || files[0];
          }

          if (!targetFile) {
            return {
              content: [{
                type: 'text',
                text: `No valid summary file found in reports/${session_id}/`
              }],
              isError: true
            };
          }

          // Read the summary file
          const summaryPath = path.join(reportsDir, targetFile);
          const summaryContent = readFileSync(summaryPath, 'utf8');
          const summaryData = JSON.parse(summaryContent);

          return {
            content: [{
              type: 'text',
              text: `Summary for session ${session_id} (${targetFile}):\n\n${JSON.stringify(summaryData, null, 2)}`
            }]
          };

        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error reading summary file: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case 'mcp__levys-awesome-mcp__mcp__content-writer__get_plan': {
        const { git_hash } = args;
        
        try {
          // Get git commit hash for directory structure
          const { executeCommand } = await import('../shared/utils.js');
          let finalGitHash = git_hash;
          
          if (!finalGitHash) {
            const result = await executeCommand('git', ['rev-parse', 'HEAD'], process.cwd());
            if (result.success && result.stdout) {
              finalGitHash = result.stdout.trim();
            } else {
              // Generate a pseudo-hash based on current timestamp if no git commit available
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              finalGitHash = `no-commit-${timestamp}`;
            }
          }
          
          // Check plan_and_progress directory
          const planDir = path.resolve(process.cwd(), 'plan_and_progress', finalGitHash);
          if (!existsSync(planDir)) {
            return {
              content: [{
                type: 'text',
                text: `No plan directory found for git hash: ${finalGitHash}`
              }],
              isError: true
            };
          }

          // Get all JSON files in the plan directory
          const files = readdirSync(planDir).filter((file: string) => file.startsWith('plan-') && file.endsWith('.json'));
          
          if (files.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No plan files found in plan_and_progress/${finalGitHash}/`
              }],
              isError: true
            };
          }

          // Get the most recent plan file (they have timestamps)
          const planFile = files.sort().reverse()[0]; // Most recent first
          
          // Read the plan file
          const planPath = path.join(planDir, planFile);
          const planContent = readFileSync(planPath, 'utf8');
          const planData = JSON.parse(planContent);

          return {
            content: [{
              type: 'text',
              text: `Plan for git hash ${finalGitHash} (${planFile}):\n\n${JSON.stringify(planData, null, 2)}`
            }]
          };

        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error reading plan file: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
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