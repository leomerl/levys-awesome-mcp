import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { executeCommand } from '../shared/utils.js';

// Simple file-based locking mechanism to prevent race conditions
const activeLocks = new Map<string, Promise<void>>();

async function withLock<T>(lockKey: string, operation: () => Promise<T>): Promise<T> {
  // If there's already a lock for this key, wait for it
  if (activeLocks.has(lockKey)) {
    await activeLocks.get(lockKey);
  }

  // Create a new lock
  let resolveLock: () => void;
  const lockPromise = new Promise<void>(resolve => {
    resolveLock = resolve;
  });
  
  activeLocks.set(lockKey, lockPromise);

  try {
    const result = await operation();
    return result;
  } finally {
    // Release the lock
    resolveLock!();
    activeLocks.delete(lockKey);
  }
}

interface Task {
  id: string;
  designated_agent: string;
  dependencies: string[];
  description: string;
  files_to_modify: string[];
}

interface PlanDocument {
  task_description: string;
  synopsis: string;
  created_at: string;
  git_commit_hash: string | null;
  tasks: Task[];
}

interface ProgressTask extends Task {
  state: 'pending' | 'completed' | 'in_progress';
  agent_session_id?: string;
  files_modified?: string[];
  summary?: string;
  started_at?: string;
  completed_at?: string;
}

interface ProgressDocument {
  plan_file: string;
  created_at: string;
  last_updated: string;
  git_commit_hash: string | null;
  tasks: ProgressTask[];
}

export const planCreatorTools = [
  {
    name: 'mcp__levys-awesome-mcp__mcp__plan-creator__create_plan',
    description: 'Creates a detailed execution plan from AI-generated task breakdown, agent assignments, and dependencies. Saves the plan to plan_and_progress/$git_commit_hash/',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_description: {
          type: 'string',
          description: 'The main task or project description'
        },
        synopsis: {
          type: 'string',
          description: 'Brief summary of what the task involves'
        },
        tasks: {
          type: 'array',
          description: 'Array of task objects with id, designated_agent, description, files_to_modify, and dependencies',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique task ID (e.g., TASK-001)' },
              designated_agent: { type: 'string', description: 'Agent assigned to this task (backend-agent, frontend-agent, builder, linter, testing-agent)' },
              description: { type: 'string', description: 'What this task accomplishes' },
              files_to_modify: { type: 'array', items: { type: 'string' }, description: 'Specific files that need to be created or modified' },
              dependencies: { type: 'array', items: { type: 'string' }, description: 'Task IDs this task depends on' }
            },
            required: ['id', 'designated_agent', 'description', 'files_to_modify', 'dependencies']
          }
        },
        session_id: {
          type: 'string',
          description: 'Optional session ID for tracking (will be generated if not provided)',
          default: ''
        }
      },
      required: ['task_description', 'synopsis', 'tasks']
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__plan-creator__update_progress',
    description: 'Updates progress file with task state changes, agent session info, and file modifications',
    inputSchema: {
      type: 'object' as const,
      properties: {
        git_commit_hash: {
          type: 'string',
          description: 'Git commit hash to locate the progress file'
        },
        task_id: {
          type: 'string',
          description: 'Task ID to update'
        },
        state: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed'],
          description: 'New state for the task'
        },
        agent_session_id: {
          type: 'string',
          description: 'Session ID of the agent working on this task'
        },
        files_modified: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of files that were actually modified (optional)'
        },
        summary: {
          type: 'string',
          description: 'Summary of work completed (optional)'
        }
      },
      required: ['git_commit_hash', 'task_id', 'state', 'agent_session_id']
    }
  }
];

async function getGitCommitHash(): Promise<string | null> {
  try {
    const result = await executeCommand('git', ['rev-parse', 'HEAD'], process.cwd());
    if (result.success && result.stdout) {
      return result.stdout.trim();
    }
  } catch (error) {
    // Fall back to a timestamp-based hash if git is not available or no commits
  }
  
  // Generate a pseudo-hash based on current timestamp if no git commit available
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `no-commit-${timestamp}`;
}

function generateSessionId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp-based
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback method
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

async function createPlanFromAIData(
  taskDescription: string, 
  synopsis: string,
  tasks: Task[],
  sessionId: string = ''
): Promise<{ plan: PlanDocument; progress: ProgressDocument; sessionId: string }> {
  const gitHash = await getGitCommitHash();
  const createdAt = new Date().toISOString();
  
  // Generate session_id if not provided
  const finalSessionId = sessionId || generateSessionId();
  
  // Create clean plan without state
  const plan: PlanDocument = {
    task_description: taskDescription,
    synopsis: synopsis,
    created_at: createdAt,
    git_commit_hash: gitHash,
    tasks: tasks
  };

  // Create progress document with state tracking
  const progressTasks: ProgressTask[] = tasks.map(task => ({
    ...task,
    state: 'pending' as const
  }));

  const progress: ProgressDocument = {
    plan_file: '', // Will be set after plan file is saved
    created_at: createdAt,
    last_updated: createdAt,
    git_commit_hash: gitHash,
    tasks: progressTasks
  };

  return { plan, progress, sessionId: finalSessionId };
}

// All hardcoded logic removed - AI now provides the plan structure directly


export async function handlePlanCreatorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__plan-creator__create_plan': {
        const { task_description, synopsis, tasks, session_id = '' } = args;
        
        // Validate required parameters
        if (!task_description || task_description.trim().length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'Error: task_description is required and cannot be empty'
            }],
            isError: true
          };
        }

        if (!synopsis || synopsis.trim().length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'Error: synopsis is required and cannot be empty'
            }],
            isError: true
          };
        }

        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'Error: tasks array is required and cannot be empty'
            }],
            isError: true
          };
        }

        // Validate each task has required fields
        for (const task of tasks) {
          if (!task.id || !task.designated_agent || !task.description) {
            return {
              content: [{
                type: 'text',
                text: 'Error: Each task must have id, designated_agent, and description'
              }],
              isError: true
            };
          }
          
          if (!Array.isArray(task.files_to_modify)) {
            return {
              content: [{
                type: 'text',
                text: 'Error: Each task must have files_to_modify as an array'
              }],
              isError: true
            };
          }
          
          if (!Array.isArray(task.dependencies)) {
            return {
              content: [{
                type: 'text',
                text: 'Error: Each task must have dependencies as an array'
              }],
              isError: true
            };
          }
        }

        // Create the plan and progress from AI-provided data
        const { plan, progress, sessionId: finalSessionId } = await createPlanFromAIData(task_description, synopsis, tasks, session_id);
        
        // Create the plan_and_progress directory structure
        const gitHash = plan.git_commit_hash || 'no-commit';
        const reportsDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
        
        if (!existsSync(reportsDir)) {
          await mkdir(reportsDir, { recursive: true });
        }

        // Use locking to prevent race conditions in concurrent file creation
        const { planFilePath, progressFilePath } = await withLock(`plan-creation-${gitHash}`, async () => {
          // Check if plan/progress files already exist (within the lock)
          let planFilePath: string;
          let progressFilePath: string;
        
          if (existsSync(reportsDir)) {
            const fs = await import('fs');
            const existingFiles = fs.readdirSync(reportsDir);
            const existingPlanFiles = existingFiles.filter(f => f.startsWith('plan-') && f.endsWith('.json'));
            const existingProgressFiles = existingFiles.filter(f => f.startsWith('progress-') && f.endsWith('.json'));
            
            if (existingPlanFiles.length > 0 && existingProgressFiles.length > 0) {
              // Use existing files (most recent ones)
              existingPlanFiles.sort().reverse();
              existingProgressFiles.sort().reverse();
              
              planFilePath = path.join(reportsDir, existingPlanFiles[0]);
              progressFilePath = path.join(reportsDir, existingProgressFiles[0]);
              
              // Update existing files instead of creating new ones
              await writeFile(planFilePath, JSON.stringify(plan, null, 2), 'utf8');
              
              // For progress file, preserve existing task states but update the structure
              try {
                const existingProgressContent = await readFile(progressFilePath, 'utf8');
                const existingProgress: ProgressDocument = JSON.parse(existingProgressContent);
                
                // Merge existing task states with new plan
                const mergedTasks = progress.tasks.map(newTask => {
                  const existingTask = existingProgress.tasks.find(t => t.id === newTask.id);
                  if (existingTask) {
                    // Preserve existing state and metadata, but update structure from new plan
                    return {
                      ...newTask,
                      state: existingTask.state,
                      agent_session_id: existingTask.agent_session_id,
                      files_modified: existingTask.files_modified,
                      summary: existingTask.summary,
                      started_at: existingTask.started_at,
                      completed_at: existingTask.completed_at
                    };
                  }
                  return newTask;
                });
                
                // Update progress document
                progress.tasks = mergedTasks;
                progress.last_updated = new Date().toISOString();
                progress.plan_file = planFilePath;
                
              } catch (error) {
                // If we can't read existing progress file, use new one
                progress.plan_file = planFilePath;
              }
              
              await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');
              
            } else {
              // Create new files with timestamp
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const planFileName = `plan-${timestamp}.json`;
              const progressFileName = `progress-${timestamp}.json`;
              
              planFilePath = path.join(reportsDir, planFileName);
              progressFilePath = path.join(reportsDir, progressFileName);
              
              await writeFile(planFilePath, JSON.stringify(plan, null, 2), 'utf8');
              
              progress.plan_file = planFilePath;
              await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');
            }
          } else {
            // Directory doesn't exist, create new files
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const planFileName = `plan-${timestamp}.json`;
            const progressFileName = `progress-${timestamp}.json`;
            
            planFilePath = path.join(reportsDir, planFileName);
            progressFilePath = path.join(reportsDir, progressFileName);
            
            await writeFile(planFilePath, JSON.stringify(plan, null, 2), 'utf8');
            
            progress.plan_file = planFilePath;
            await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');
          }

          // Return file paths from the locked operation
          return { planFilePath, progressFilePath };
        });

        // Save the progress file (with state tracking)
        const progressFileName = `progress-${timestamp}.json`;
        const progressFilePath = path.join(reportsDir, progressFileName);
        
        // Update progress document with plan file reference
        progress.plan_file = planFilePath;
        
        await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');

        // Generate a human-readable summary
        const summary = generatePlanSummary(plan, progress);

        return {
          content: [{
            type: 'text',
            text: `Plan and progress files created successfully!\n\nPlan file: ${planFilePath}\nProgress file: ${progressFilePath}\nSession ID: ${finalSessionId}\n\n${summary}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__plan-creator__update_progress': {
        const { git_commit_hash, task_id, state, agent_session_id, files_modified = [], summary = '' } = args;
        
        // Validate required parameters
        if (!git_commit_hash || !task_id || !state || !agent_session_id) {
          return {
            content: [{
              type: 'text',
              text: 'Error: git_commit_hash, task_id, state, and agent_session_id are required'
            }],
            isError: true
          };
        }

        try {
          // Find the latest progress file for this git hash
          const reportsDir = path.join(process.cwd(), 'plan_and_progress', git_commit_hash);
          
          if (!existsSync(reportsDir)) {
            return {
              content: [{
                type: 'text',
                text: `Error: No progress directory found for git hash: ${git_commit_hash}`
              }],
              isError: true
            };
          }

          // Find the most recent progress file
          const fs = await import('fs');
          const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('progress-') && f.endsWith('.json'));
          
          if (files.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `Error: No progress files found in directory: ${reportsDir}`
              }],
              isError: true
            };
          }

          // Sort by creation time (newest first) - using filename timestamp
          files.sort().reverse();
          const progressFilePath = path.join(reportsDir, files[0]);

          // Read current progress
          const progressContent = await readFile(progressFilePath, 'utf8');
          const progress: ProgressDocument = JSON.parse(progressContent);

          // Find and update the task
          const taskIndex = progress.tasks.findIndex(t => t.id === task_id);
          if (taskIndex === -1) {
            return {
              content: [{
                type: 'text',
                text: `Error: Task ${task_id} not found in progress file`
              }],
              isError: true
            };
          }

          const now = new Date().toISOString();
          const task = progress.tasks[taskIndex];

          // Update task with new information
          task.state = state as 'pending' | 'completed' | 'in_progress';
          task.agent_session_id = agent_session_id;
          
          if (files_modified.length > 0) {
            task.files_modified = files_modified;
          }
          
          if (summary) {
            task.summary = summary;
          }

          // Set timestamps based on state
          if (state === 'in_progress' && !task.started_at) {
            task.started_at = now;
          } else if (state === 'completed') {
            task.completed_at = now;
          }

          // Update the last_updated timestamp
          progress.last_updated = now;

          // Save updated progress
          await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');

          return {
            content: [{
              type: 'text',
              text: `Progress updated successfully!\n\nTask: ${task_id}\nState: ${state}\nAgent Session: ${agent_session_id}\nUpdated: ${now}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error updating progress: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      default:
        throw new Error(`Unknown plan creator tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in plan creator tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

function generatePlanSummary(plan: PlanDocument, progress: ProgressDocument): string {
  const summary = [
    '=== EXECUTION PLAN SUMMARY ===',
    '',
    `📋 Task: ${plan.task_description}`,
    `📝 Synopsis: ${plan.synopsis}`,
    `⏰ Created: ${new Date(plan.created_at).toLocaleString()}`,
    `🔧 Git Commit: ${plan.git_commit_hash || 'No commit available'}`,
    `📄 Progress File: Available for state tracking`,
    ''
  ];

  summary.push(`📊 Tasks Breakdown (${plan.tasks.length} tasks):`);
  summary.push('');

  progress.tasks.forEach((task, index) => {
    const status = task.state === 'pending' ? '⏳' : 
                  task.state === 'in_progress' ? '🔄' : '✅';
    const dependencies = task.dependencies.length > 0 ? ` [depends on: ${task.dependencies.join(', ')}]` : '';
    
    summary.push(`  ${status} ${task.id}: ${task.description}`);
    summary.push(`     👤 Agent: ${task.designated_agent}`);
    summary.push(`     📊 State: ${task.state}`);
    
    if (task.files_to_modify.length > 0) {
      summary.push(`     📁 Files to modify: ${task.files_to_modify.join(', ')}`);
    }
    
    if (dependencies) {
      summary.push(`     🔗${dependencies}`);
    }
    
    summary.push('');
  });

  summary.push('📝 Note: Progress file will track task execution state, agent sessions, and file modifications.');

  return summary.join('\n');
}