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
  state: 'pending' | 'completed' | 'in_progress' | 'failed';
  agent_session_id?: string;
  files_modified?: string[];
  summary?: string;
  started_at?: string;
  completed_at?: string;
  failed_at?: string;
  self_heal_attempts?: number;
  self_heal_history?: Array<{
    attempt: number;
    action: string;
    timestamp: string;
    result?: string;
  }>;
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
    name: 'create_plan',
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
          description: 'Session ID for tracking and directory organization (will be generated if not provided)',
          default: ''
        }
      },
      required: ['task_description', 'synopsis', 'tasks']
    }
  },
  {
    name: 'update_progress',
    description: 'Updates progress file with task state changes, agent session info, and file modifications',
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to locate the progress file (preferred)'
        },
        git_commit_hash: {
          type: 'string',
          description: 'Git commit hash to locate the progress file (legacy, use session_id when possible)'
        },
        task_id: {
          type: 'string',
          description: 'Task ID to update'
        },
        state: {
          type: 'string',
          enum: ['pending', 'in_progress', 'completed', 'failed'],
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
      required: ['task_id', 'state', 'agent_session_id']
    }
  },
  {
    name: 'compare_plan_progress',
    description: 'Compares the planned files_to_modify with actual files_modified in progress, checks task completion status and overall goal achievement',
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to locate the plan and progress files (preferred)'
        },
        git_commit_hash: {
          type: 'string',
          description: 'Git commit hash to locate the plan and progress files (legacy)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_failed_tasks',
    description: 'Returns all tasks with failed state from the progress file for self-healing workflows',
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to locate the progress file'
        }
      },
      required: ['session_id']
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

interface DirectoryInfo {
  type: 'session' | 'git';
  path: string;
  useTimestamps: boolean;
}

async function resolveDirectoryPath(params: { session_id?: string; git_commit_hash?: string }): Promise<DirectoryInfo> {
  // Try session-based directory first (new approach)
  if (params.session_id) {
    const sessionDir = path.join(process.cwd(), 'plan_and_progress', 'sessions', params.session_id);
    return {
      type: 'session',
      path: sessionDir,
      useTimestamps: false // Session-based uses simple filenames
    };
  }

  // Fallback to git-hash based directory (legacy)
  if (params.git_commit_hash) {
    const gitDir = path.join(process.cwd(), 'plan_and_progress', params.git_commit_hash);
    return {
      type: 'git',
      path: gitDir,
      useTimestamps: true // Git-based uses timestamped filenames
    };
  }

  throw new Error('Either session_id or git_commit_hash is required');
}

async function findPlanProgressFiles(dirInfo: DirectoryInfo): Promise<{ planFile: string; progressFile: string } | null> {
  if (!existsSync(dirInfo.path)) {
    return null;
  }

  const fs = await import('fs');
  const files = fs.readdirSync(dirInfo.path);

  if (dirInfo.type === 'session') {
    // Session-based: simple filenames
    const planFile = path.join(dirInfo.path, 'plan.json');
    const progressFile = path.join(dirInfo.path, 'progress.json');

    if (existsSync(planFile) && existsSync(progressFile)) {
      return { planFile, progressFile };
    }
  } else {
    // Git-based: timestamped filenames
    const planFiles = files.filter(f => f.startsWith('plan-') && f.endsWith('.json'));
    const progressFiles = files.filter(f => f.startsWith('progress-') && f.endsWith('.json'));

    if (planFiles.length > 0 && progressFiles.length > 0) {
      // Sort by timestamp (newest first)
      planFiles.sort().reverse();
      progressFiles.sort().reverse();

      return {
        planFile: path.join(dirInfo.path, planFiles[0]),
        progressFile: path.join(dirInfo.path, progressFiles[0])
      };
    }
  }

  return null;
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
      case 'create_plan':
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

        // Use session-based directory structure (new approach)
        const dirInfo: DirectoryInfo = {
          type: 'session',
          path: path.join(process.cwd(), 'plan_and_progress', 'sessions', finalSessionId),
          useTimestamps: false
        };
        const reportsDir = dirInfo.path;
        
        if (!existsSync(reportsDir)) {
          await mkdir(reportsDir, { recursive: true });
        }

        // Use locking to prevent race conditions in concurrent file creation
        const { planFilePath, progressFilePath } = await withLock(`plan-creation-${finalSessionId}`, async () => {
          // Session-based: use simple filenames
          const planFilePath = path.join(reportsDir, 'plan.json');
          const progressFilePath = path.join(reportsDir, 'progress.json');

          // Check if files already exist
          if (existsSync(planFilePath) && existsSync(progressFilePath)) {
            // Update existing files, preserving progress state
            await writeFile(planFilePath, JSON.stringify(plan, null, 2), 'utf8');

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
              progress.plan_file = 'plan.json'; // Relative path within session directory

            } catch (error) {
              // If we can't read existing progress file, use new one
              progress.plan_file = 'plan.json';
            }
          } else {
            // Create new files
            await writeFile(planFilePath, JSON.stringify(plan, null, 2), 'utf8');
            progress.plan_file = 'plan.json';
          }

          await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');

          // Return file paths from the locked operation
          return { planFilePath, progressFilePath };
        });

        // Generate a human-readable summary
        const summary = generatePlanSummary(plan, progress);

        return {
          content: [{
            type: 'text',
            text: `Plan and progress files created successfully!\n\nPlan file: ${planFilePath}\nProgress file: ${progressFilePath}\nSession ID: ${finalSessionId}\n\n${summary}`
          }]
        };
      }

      case 'update_progress':
      case 'mcp__levys-awesome-mcp__mcp__plan-creator__update_progress': {
        const { session_id, git_commit_hash, task_id, state, agent_session_id, files_modified = [], summary = '' } = args;

        // Validate required parameters
        if ((!session_id && !git_commit_hash) || !task_id || !state || !agent_session_id) {
          return {
            content: [{
              type: 'text',
              text: 'Error: either session_id or git_commit_hash is required, along with task_id, state, and agent_session_id'
            }],
            isError: true
          };
        }

        try {
          // Resolve directory using new logic
          const dirInfo = await resolveDirectoryPath({ session_id, git_commit_hash });
          const filesInfo = await findPlanProgressFiles(dirInfo);

          if (!filesInfo) {
            return {
              content: [{
                type: 'text',
                text: `Error: No progress directory found for ${session_id ? 'session: ' + session_id : 'git hash: ' + git_commit_hash}`
              }],
              isError: true
            };
          }

          const progressFilePath = filesInfo.progressFile;

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
          task.state = state as 'pending' | 'completed' | 'in_progress' | 'failed';
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
          } else if (state === 'failed') {
            task.failed_at = now;
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

      case 'compare_plan_progress':
      case 'mcp__levys-awesome-mcp__compare_plan_progress': {
        const { session_id, git_commit_hash } = args;

        if (!session_id && !git_commit_hash) {
          return {
            content: [{
              type: 'text',
              text: 'Error: either session_id or git_commit_hash is required'
            }],
            isError: true
          };
        }

        try {
          // Resolve directory using new logic
          const dirInfo = await resolveDirectoryPath({ session_id, git_commit_hash });
          const filesInfo = await findPlanProgressFiles(dirInfo);

          if (!filesInfo) {
            return {
              content: [{
                type: 'text',
                text: `Error: No plan/progress directory found for ${session_id ? 'session: ' + session_id : 'git hash: ' + git_commit_hash}`
              }],
              isError: true
            };
          }

          const planFilePath = filesInfo.planFile;
          const progressFilePath = filesInfo.progressFile;

          // Read plan and progress files
          const planContent = await readFile(planFilePath, 'utf8');
          const progressContent = await readFile(progressFilePath, 'utf8');

          const plan: PlanDocument = JSON.parse(planContent);
          const progress: ProgressDocument = JSON.parse(progressContent);

          // Helper functions for better file comparison
          function normalizePath(filePath: string): string {
            // Remove common project structure prefixes for better comparison
            return filePath
              .replace(/^backend\//, '')
              .replace(/^frontend\//, '')
              .replace(/^client\//, '')
              .replace(/^server\//, '');
          }

          function categorizeFile(filePath: string): 'implementation' | 'infrastructure' | 'test' | 'build' {
            const file = filePath.toLowerCase();

            // Infrastructure files (test runners, build scripts, etc.)
            if (file.includes('test-runner') ||
                file.includes('execute-') ||
                file.includes('vitest-runner') ||
                file.includes('run-all-tests') ||
                file.endsWith('-report.md') ||
                file.endsWith('.sh') ||
                file.includes('config') && file.includes('test')) {
              return 'infrastructure';
            }

            // Build output files
            if (file.startsWith('dist/') ||
                file.endsWith('.js') && file.includes('dist') ||
                file.endsWith('.d.ts')) {
              return 'build';
            }

            // Test files
            if (file.includes('.test.') ||
                file.includes('.spec.') ||
                file.includes('test/') ||
                file.includes('tests/')) {
              return 'test';
            }

            // Implementation files
            return 'implementation';
          }

          // Perform comparison
          const comparisonReport = {
            ...(session_id ? { session_id } : { git_commit_hash }),
            plan_file: path.basename(planFilePath),
            progress_file: path.basename(progressFilePath),
            overall_goal: plan.task_description,
            synopsis: plan.synopsis,
            task_comparisons: [] as Array<{
              task_id: string;
              description: string;
              designated_agent: string;
              state: string;
              planned_files: string[];
              actual_files: string[];
              missing_files: string[];
              unexpected_files: string[];
              infrastructure_files: string[];
              has_discrepancy: boolean;
              has_critical_discrepancy: boolean;
            }>,
            summary: {
              total_tasks: plan.tasks.length,
              completed_tasks: 0,
              in_progress_tasks: 0,
              pending_tasks: 0,
              tasks_with_discrepancies: 0,
              tasks_with_critical_discrepancies: 0,
              overall_completion_percentage: 0,
              root_task_completed: false
            },
            discrepancy_analysis: {
              critical_missing_files: [] as string[],
              all_missing_files: [] as string[],
              all_unexpected_files: [] as string[]
            }
          };

          // Compare each task
          for (const planTask of plan.tasks) {
            const progressTask = progress.tasks.find(t => t.id === planTask.id);

            if (!progressTask) {
              continue; // Skip if task not found in progress
            }

            const plannedFiles = planTask.files_to_modify || [];
            const actualFiles = progressTask.files_modified || [];

            // Normalize paths for better comparison
            const normalizedPlanned = plannedFiles.map(normalizePath);
            const normalizedActual = actualFiles.map(normalizePath);

            // Find missing and unexpected files using normalized paths
            const missingFiles = plannedFiles.filter(f => !normalizedActual.includes(normalizePath(f)));
            const unexpectedFiles = actualFiles.filter(f => !normalizedPlanned.includes(normalizePath(f)));

            // Categorize unexpected files
            const infrastructureFiles = unexpectedFiles.filter(f => categorizeFile(f) === 'infrastructure');
            const criticalUnexpectedFiles = unexpectedFiles.filter(f => {
              const category = categorizeFile(f);
              return category === 'implementation' || (category === 'test' && missingFiles.some(m => categorizeFile(m) === 'test'));
            });

            const hasDiscrepancy = missingFiles.length > 0 || unexpectedFiles.length > 0;
            const hasCriticalDiscrepancy = missingFiles.length > 0 || criticalUnexpectedFiles.length > 0;

            comparisonReport.task_comparisons.push({
              task_id: planTask.id,
              description: planTask.description,
              designated_agent: planTask.designated_agent,
              state: progressTask.state,
              planned_files: plannedFiles,
              actual_files: actualFiles,
              missing_files: missingFiles,
              unexpected_files: unexpectedFiles,
              infrastructure_files: infrastructureFiles,
              has_discrepancy: hasDiscrepancy,
              has_critical_discrepancy: hasCriticalDiscrepancy
            });

            // Update summary counts
            if (progressTask.state === 'completed') {
              comparisonReport.summary.completed_tasks++;
            } else if (progressTask.state === 'in_progress') {
              comparisonReport.summary.in_progress_tasks++;
            } else {
              comparisonReport.summary.pending_tasks++;
            }

            if (hasDiscrepancy) {
              comparisonReport.summary.tasks_with_discrepancies++;
            }

            if (hasCriticalDiscrepancy) {
              comparisonReport.summary.tasks_with_critical_discrepancies++;
            }

            // Collect all discrepancies
            comparisonReport.discrepancy_analysis.all_missing_files.push(...missingFiles);
            comparisonReport.discrepancy_analysis.all_unexpected_files.push(...unexpectedFiles);
          }

          // Calculate overall completion percentage
          if (comparisonReport.summary.total_tasks > 0) {
            comparisonReport.summary.overall_completion_percentage =
              Math.round((comparisonReport.summary.completed_tasks / comparisonReport.summary.total_tasks) * 100);
          }

          // Determine if root task was completed (all tasks completed)
          comparisonReport.summary.root_task_completed =
            comparisonReport.summary.completed_tasks === comparisonReport.summary.total_tasks;

          // Remove duplicates and identify critical missing files
          comparisonReport.discrepancy_analysis.critical_missing_files =
            [...new Set(comparisonReport.discrepancy_analysis.all_missing_files)];
          comparisonReport.discrepancy_analysis.all_missing_files =
            [...new Set(comparisonReport.discrepancy_analysis.all_missing_files)];
          comparisonReport.discrepancy_analysis.all_unexpected_files =
            [...new Set(comparisonReport.discrepancy_analysis.all_unexpected_files)];

          // Generate human-readable summary
          const readableSummary = generateComparisonSummary(comparisonReport);

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(comparisonReport, null, 2) + '\n\n' + readableSummary
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error comparing plan and progress: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }

      case 'get_failed_tasks':
      case 'mcp__levys-awesome-mcp__get_failed_tasks': {
        const { session_id } = args;

        if (!session_id) {
          return {
            content: [{
              type: 'text',
              text: 'Error: session_id is required'
            }],
            isError: true
          };
        }

        try {
          const progressFilePath = path.join(process.cwd(), 'plan_and_progress', 'sessions', session_id, 'progress.json');

          if (!existsSync(progressFilePath)) {
            return {
              content: [{
                type: 'text',
                text: `No progress file found for session: ${session_id}`
              }]
            };
          }

          const progressContent = await readFile(progressFilePath, 'utf8');
          const progress: ProgressDocument = JSON.parse(progressContent);

          // Filter for failed tasks
          const failedTasks = progress.tasks.filter(t => t.state === 'failed');

          if (failedTasks.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `No failed tasks found in session: ${session_id}`
              }]
            };
          }

          // Format failed tasks for self-healing
          const failedTasksReport = failedTasks.map(task => ({
            task_id: task.id,
            designated_agent: task.designated_agent,
            description: task.description,
            files_to_modify: task.files_to_modify,
            failure_reason: task.summary || 'No failure reason provided',
            failed_at: task.failed_at,
            agent_session_id: task.agent_session_id,
            self_heal_attempts: (task as any).self_heal_attempts || 0
          }));

          return {
            content: [{
              type: 'text',
              text: `Found ${failedTasks.length} failed task(s):\n\n${JSON.stringify(failedTasksReport, null, 2)}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error reading failed tasks: ${error instanceof Error ? error.message : String(error)}`
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

  progress.tasks.forEach((task) => {
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

function generateComparisonSummary(report: any): string {
  const summary = [
    '=== PLAN VS PROGRESS COMPARISON SUMMARY ===',
    '',
    `📋 Overall Goal: ${report.overall_goal}`,
    `📝 Synopsis: ${report.synopsis}`,
    '',
    '📊 Task Completion Status:',
    `  ✅ Completed: ${report.summary.completed_tasks}/${report.summary.total_tasks} (${report.summary.overall_completion_percentage}%)`,
    `  🔄 In Progress: ${report.summary.in_progress_tasks}`,
    `  ⏳ Pending: ${report.summary.pending_tasks}`,
    '',
    '🔍 Discrepancy Analysis:',
    `  ⚠️ Tasks with discrepancies: ${report.summary.tasks_with_discrepancies}`,
    `  🚨 Tasks with critical discrepancies: ${report.summary.tasks_with_critical_discrepancies || 0}`,
    `  📁 Critical missing files: ${report.discrepancy_analysis.critical_missing_files.length}`,
    `  📄 Unexpected files: ${report.discrepancy_analysis.all_unexpected_files.length}`,
    ''
  ];

  if (report.summary.tasks_with_discrepancies > 0) {
    summary.push('📋 Tasks with File Discrepancies:');
    for (const task of report.task_comparisons) {
      if (task.has_discrepancy) {
        summary.push(`  ${task.task_id}: ${task.description}`);
        if (task.missing_files.length > 0) {
          summary.push(`    ❌ Missing: ${task.missing_files.join(', ')}`);
        }
        if (task.unexpected_files.length > 0) {
          summary.push(`    ➕ Unexpected: ${task.unexpected_files.join(', ')}`);
        }
      }
    }
    summary.push('');
  }

  summary.push('🎯 Root Task Achievement:');
  if (report.summary.root_task_completed) {
    summary.push('  ✅ Root task COMPLETED - All planned tasks have been executed');
  } else {
    summary.push(`  ⚠️ Root task NOT completed - ${report.summary.total_tasks - report.summary.completed_tasks} tasks remaining`);
  }

  return summary.join('\n');
}