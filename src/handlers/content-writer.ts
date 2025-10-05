import { writeFile, mkdir } from 'fs/promises';
import { existsSync, readdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { validatePath, validateProjectDirectory } from '../shared/utils.js';
import { loadContentWriterConfigWithFallback, getFolderMappings, getDefaultPath, isPathAllowed } from '../config/content-writer-config.js';
import type { ContentWriterConfig } from '../config/content-writer-config.js';

export const contentWriterTools = [
  {
    name: 'restricted_write',
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
    name: 'frontend_write',
    description: 'Write files to frontend folders. Allowed folders are configurable via .content-writer.json and may include frontend/, ui/, client/, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within configured frontend folders)'
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
    name: 'backend_write',
    description: 'Write files to backend folders. Allowed folders are configurable via .content-writer.json and may include backend/, src/, api/, server/, etc.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within configured backend folders)'
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
    name: 'agents_write',
    description: 'Write files to the agents/ folder only.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within agents/ folder)'
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
    name: 'docs_write',
    description: 'Write files to the docs/ folder only.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the file to write (must be within docs/ folder)'
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
    name: 'put_summary',
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
    name: 'get_summary',
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
    name: 'get_plan',
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
  },
  {
    name: 'get_content_writer_config',
    description: 'Shows the current content-writer configuration being used, including folder mappings and settings.',
    inputSchema: {
      type: 'object' as const,
      properties: {}
    }
  }
];

/**
 * Resolves the appropriate target directory and validates path for frontend writes
 */
function resolveFrontendPath(filePath: string, config: ContentWriterConfig): {
  targetDir: string;
  targetDirName: string;
  fullPath: string;
  isValid: boolean;
} {
  // Use configuration-based approach
  const frontendFolders = getFolderMappings(config, 'frontend');
  const defaultFrontendPath = getDefaultPath(config, 'frontend');

  // If path doesn't start with any configured folder, prepend the default path
  let processedPath = filePath;
  const normalizedFilePath = path.normalize(filePath);
  const hasConfiguredPrefix = frontendFolders.some(folder => {
    const normalizedFolder = path.normalize(folder);
    const normalizedFolderNoSlash = normalizedFolder.replace(/[\/\\]$/, '');
    return normalizedFilePath.startsWith(normalizedFolder) ||
           normalizedFilePath.startsWith(normalizedFolderNoSlash + path.sep) ||
           normalizedFilePath.startsWith(normalizedFolderNoSlash + '/') ||
           normalizedFilePath.startsWith(normalizedFolderNoSlash + '\\');
  });

  if (!hasConfiguredPrefix) {
    // Check if we should restrict to configured folders only and the path has an explicit folder prefix
    if (config.pathValidation.restrictToConfiguredFolders && (filePath.includes('/') || filePath.includes('\\'))) {
      // Path has a folder prefix but it's not in configured folders - reject
      return {
        targetDir: '',
        targetDirName: '',
        fullPath: '',
        isValid: false
      };
    }
    // Prepend default path if no prefix exists or restriction is disabled
    processedPath = path.join(defaultFrontendPath, filePath);
  }

  // Check if the path is allowed for frontend category
  if (!isPathAllowed(config, processedPath, 'frontend')) {
    return {
      targetDir: '',
      targetDirName: '',
      fullPath: '',
      isValid: false
    };
  }
  
  // Find which frontend folder the path belongs to
  for (const frontendFolder of frontendFolders) {
    const normalizedFrontendFolder = path.normalize(frontendFolder);
    const frontendDir = path.join(process.cwd(), normalizedFrontendFolder);

    // Check if path starts with this frontend folder
    const normalizedFilePath = path.normalize(filePath);
    const normalizedFolderNoSlash = normalizedFrontendFolder.replace(/[\/\\]$/, '');
    if (normalizedFilePath.startsWith(normalizedFrontendFolder) ||
        normalizedFilePath.startsWith(normalizedFolderNoSlash + path.sep) ||
        normalizedFilePath.startsWith(normalizedFolderNoSlash + '/') ||
        normalizedFilePath.startsWith(normalizedFolderNoSlash + '\\')) {
      const cleanPath = filePath.replace(new RegExp(`^${normalizedFrontendFolder.replace(/[\/\\]/g, '[/\\\\]')}`), '');
      // Remove leading separators and normalize the clean path to handle cross-platform separators
      const normalizedCleanPath = path.normalize(cleanPath.replace(/^[\/\\]+/, ''));
      const fullPath = path.resolve(frontendDir, normalizedCleanPath);

      // Validate the resolved path is within the frontend directory
      if (fullPath.startsWith(path.resolve(frontendDir))) {
        return {
          targetDir: frontendDir,
          targetDirName: normalizedFrontendFolder.replace(/\/$/, ''),
          fullPath,
          isValid: true
        };
      }
    }
  }

  // Default to the primary frontend folder if no specific match
  const defaultDir = path.join(process.cwd(), defaultFrontendPath);
  // Normalize the processed path to handle cross-platform separators
  const normalizedProcessedPath = path.normalize(processedPath);
  // Since processedPath already includes the default path, resolve against cwd
  const fullPath = path.resolve(process.cwd(), normalizedProcessedPath);

  if (fullPath.startsWith(path.resolve(defaultDir))) {
    return {
      targetDir: defaultDir,
      targetDirName: defaultFrontendPath.replace(/\/$/, ''),
      fullPath,
      isValid: true
    };
  }
  
  return {
    targetDir: '',
    targetDirName: '',
    fullPath: '',
    isValid: false
  };
}

/**
 * Resolves the appropriate target directory and validates path for backend writes
 */
function resolveBackendPath(filePath: string, config: ContentWriterConfig): {
  targetDir: string;
  targetDirName: string;
  fullPath: string;
  isValid: boolean;
} {
  // Use configuration-based approach
  const backendFolders = getFolderMappings(config, 'backend');
  const defaultBackendPath = getDefaultPath(config, 'backend');

  // If path doesn't start with any configured folder, prepend the default path
  let processedPath = filePath;
  const normalizedFilePath = path.normalize(filePath);
  const hasConfiguredPrefix = backendFolders.some(folder => {
    const normalizedFolder = path.normalize(folder);
    const normalizedFolderNoSlash = normalizedFolder.replace(/[\/\\]$/, '');
    return normalizedFilePath.startsWith(normalizedFolder) ||
           normalizedFilePath.startsWith(normalizedFolderNoSlash + path.sep) ||
           normalizedFilePath.startsWith(normalizedFolderNoSlash + '/') ||
           normalizedFilePath.startsWith(normalizedFolderNoSlash + '\\');
  });

  if (!hasConfiguredPrefix) {
    // Check if we should restrict to configured folders only and the path has an explicit folder prefix
    if (config.pathValidation.restrictToConfiguredFolders && (filePath.includes('/') || filePath.includes('\\'))) {
      // Path has a folder prefix but it's not in configured folders - reject
      return {
        targetDir: '',
        targetDirName: '',
        fullPath: '',
        isValid: false
      };
    }
    // Prepend default path if no prefix exists or restriction is disabled
    processedPath = path.join(defaultBackendPath, filePath);
  }

  // Check if the path is allowed for backend category
  if (!isPathAllowed(config, processedPath, 'backend')) {
    return {
      targetDir: '',
      targetDirName: '',
      fullPath: '',
      isValid: false
    };
  }
  
  // Find which backend folder the path belongs to
  for (const backendFolder of backendFolders) {
    const normalizedBackendFolder = path.normalize(backendFolder);
    const backendDir = path.join(process.cwd(), normalizedBackendFolder);

    // Check if path starts with this backend folder
    const normalizedFilePath = path.normalize(filePath);
    const normalizedFolderNoSlash = normalizedBackendFolder.replace(/[\/\\]$/, '');
    if (normalizedFilePath.startsWith(normalizedBackendFolder) ||
        normalizedFilePath.startsWith(normalizedFolderNoSlash + path.sep) ||
        normalizedFilePath.startsWith(normalizedFolderNoSlash + '/') ||
        normalizedFilePath.startsWith(normalizedFolderNoSlash + '\\')) {
      const cleanPath = filePath.replace(new RegExp(`^${normalizedBackendFolder.replace(/[\/\\]/g, '[/\\\\]')}`), '');
      // Remove leading separators and normalize the clean path to handle cross-platform separators
      const normalizedCleanPath = path.normalize(cleanPath.replace(/^[\/\\]+/, ''));
      const fullPath = path.resolve(backendDir, normalizedCleanPath);

      // Validate the resolved path is within the backend directory
      if (fullPath.startsWith(path.resolve(backendDir))) {
        return {
          targetDir: backendDir,
          targetDirName: normalizedBackendFolder.replace(/\/$/, ''),
          fullPath,
          isValid: true
        };
      }
    }
  }

  // Default to the primary backend folder if no specific match
  const defaultDir = path.join(process.cwd(), defaultBackendPath);
  // Normalize the processed path to handle cross-platform separators
  const normalizedProcessedPath = path.normalize(processedPath);
  // Since processedPath already includes the default path, resolve against cwd
  const fullPath = path.resolve(process.cwd(), normalizedProcessedPath);

  if (fullPath.startsWith(path.resolve(defaultDir))) {
    return {
      targetDir: defaultDir,
      targetDirName: defaultBackendPath.replace(/\/$/, ''),
      fullPath,
      isValid: true
    };
  }
  
  return {
    targetDir: '',
    targetDirName: '',
    fullPath: '',
    isValid: false
  };
}

export async function handleContentWriterTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    // Normalize tool names - handle both short and long forms from Claude Code
    const normalizedName = name.replace('mcp__levys-awesome-mcp__mcp__levys-awesome-mcp__mcp__', 'mcp__levys-awesome-mcp__mcp__');
    
    switch (normalizedName) {
      case 'restricted_write':
      case 'mcp__levys-awesome-mcp__mcp__content-writer__restricted_write':
      case 'mcp__levys-awesome-mcp__mcp__restricted_write': {
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
        // Remove the allowed_folder prefix if it exists to avoid creating nested directories
        const folderName = path.basename(normalizedAllowedFolder);
        const cleanPath = file_path.replace(new RegExp(`^${folderName}[/\\\\]`), '');
        const fullPath = path.resolve(normalizedAllowedFolder, cleanPath);
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

      case 'frontend_write':
      case 'mcp__levys-awesome-mcp__mcp__content-writer__frontend_write':
      case 'mcp__levys-awesome-mcp__mcp__frontend_write': {
        const { file_path, content } = args;

        // Load configuration with fallback for backward compatibility
        const config = loadContentWriterConfigWithFallback();

        // Configuration-aware path validation
        if (!config.pathValidation.allowPathTraversal && file_path.includes('..')) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Path traversal not allowed'
            }],
            isError: true
          };
        }

        // Basic path validation (no absolute paths)
        if (file_path.startsWith('/') || file_path.includes('\\..')) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Absolute paths not allowed'
            }],
            isError: true
          };
        }
        
        // Resolve frontend path using configuration
        const pathResult = resolveFrontendPath(file_path, config);
        
        if (!pathResult.isValid) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within frontend/ folder'
            }],
            isError: true
          };
        }

        const { targetDir, targetDirName, fullPath } = pathResult;

        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf8');

        // Check if this looks like a proper frontend project structure
        const validation = validateProjectDirectory(targetDir);
        let message = `File written successfully to ${targetDirName}/${file_path.replace(/^frontend[\/\\]/, '')}`;
        if (!validation.valid && existsSync(targetDir)) {
          message += `\n\nWARNING: The ${targetDirName}/ directory exists but doesn't appear to be a proper frontend project (${validation.error}). This may not be the intended project structure.`;
        }

        return {
          content: [{
            type: 'text',
            text: message
          }]
        };
      }

      case 'backend_write':
      case 'mcp__levys-awesome-mcp__mcp__content-writer__backend_write':
      case 'mcp__levys-awesome-mcp__mcp__backend_write': {
        const { file_path, content } = args;

        // Load configuration with fallback for backward compatibility
        const config = loadContentWriterConfigWithFallback();

        // Configuration-aware path validation
        if (!config.pathValidation.allowPathTraversal && file_path.includes('..')) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Path traversal not allowed'
            }],
            isError: true
          };
        }

        // Basic path validation (no absolute paths)
        if (file_path.startsWith('/') || file_path.includes('\\..')) {
          return {
            content: [{
              type: 'text',
              text: 'Invalid file path: Absolute paths not allowed'
            }],
            isError: true
          };
        }
        
        // Resolve backend path using configuration
        const pathResult = resolveBackendPath(file_path, config);
        
        if (!pathResult.isValid) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within backend/ or src/ folder'
            }],
            isError: true
          };
        }

        const { targetDir, targetDirName, fullPath } = pathResult;

        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf8');

        // Only validate project structure for backend directory
        let message = `File written successfully to ${targetDirName}/${file_path.replace(/^(src|backend)[\/\\]/, '')}`;
        if (targetDirName === 'backend') {
          const validation = validateProjectDirectory(targetDir);
          if (!validation.valid && existsSync(targetDir)) {
            message += `\n\nWARNING: The backend/ directory exists but doesn't appear to be a proper backend project (${validation.error}). This may not be the intended project structure.`;
          }
        }

        return {
          content: [{
            type: 'text',
            text: message
          }]
        };
      }

      case 'agents_write':
      case 'mcp__levys-awesome-mcp__mcp__content-writer__agents_write': {
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

        const agentsDir = path.join(process.cwd(), 'agents');
        // Remove 'agents/' prefix if it exists to avoid creating nested directories
        const cleanPath = file_path.replace(/^agents[/\\]/, '');
        const fullPath = path.resolve(agentsDir, cleanPath);

        if (!fullPath.startsWith(path.resolve(agentsDir))) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within agents/ folder'
            }],
            isError: true
          };
        }

        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf8');

        return {
          content: [{
            type: 'text',
            text: `File written successfully to agents/${cleanPath}`
          }]
        };
      }

      case 'docs_write':
      case 'mcp__levys-awesome-mcp__mcp__content-writer__docs_write': {
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

        const docsDir = path.join(process.cwd(), 'docs');
        // Remove 'docs/' prefix if it exists to avoid creating nested directories
        const cleanPath = file_path.replace(/^docs[/\\]/, '');
        const fullPath = path.resolve(docsDir, cleanPath);

        if (!fullPath.startsWith(path.resolve(docsDir))) {
          return {
            content: [{
              type: 'text',
              text: 'Access denied: File path must be within docs/ folder'
            }],
            isError: true
          };
        }

        const dir = path.dirname(fullPath);
        if (!existsSync(dir)) {
          await mkdir(dir, { recursive: true });
        }

        await writeFile(fullPath, content, 'utf8');

        return {
          content: [{
            type: 'text',
            text: `File written successfully to docs/${cleanPath}`
          }]
        };
      }

      case 'put_summary':
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

      case 'get_summary':
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

      case 'get_content_writer_config':
      case 'mcp__levys-awesome-mcp__mcp__content-writer__get_content_writer_config': {
        try {
          // Load the current configuration
          const config = loadContentWriterConfigWithFallback();

          // Get the current working directory
          const cwd = process.cwd();

          // Check if config file exists
          const configPath = path.resolve(cwd, '.content-writer.json');
          const configFileExists = existsSync(configPath);

          return {
            content: [{
              type: 'text',
              text: `Content Writer Configuration:\n\nWorking Directory: ${cwd}\nConfig File Path: ${configPath}\nConfig File Exists: ${configFileExists}\n\nCurrent Configuration:\n${JSON.stringify(config, null, 2)}\n\n${!configFileExists ? 'Note: Using default configuration since .content-writer.json was not found in the project root.' : ''}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error loading configuration: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case 'get_plan':
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