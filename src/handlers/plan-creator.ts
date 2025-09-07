import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { executeCommand } from '../shared/utils.js';

interface Task {
  id: string;
  session_id: string;
  designated_agent: string;
  state: 'pending' | 'completed' | 'in_progress';
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
  tasks: Omit<Task, 'session_id' | 'state'>[],
  sessionId: string = ''
): Promise<PlanDocument> {
  const gitHash = await getGitCommitHash();
  const createdAt = new Date().toISOString();
  
  // Generate session_id if not provided
  const finalSessionId = sessionId || generateSessionId();
  
  // Add session_id and state to each task
  const tasksWithSession: Task[] = tasks.map(task => ({
    ...task,
    session_id: finalSessionId,
    state: 'pending' as const
  }));
  
  const plan: PlanDocument = {
    task_description: taskDescription,
    synopsis: synopsis,
    created_at: createdAt,
    git_commit_hash: gitHash,
    tasks: tasksWithSession
  };

  return plan;
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

        // Create the plan from AI-provided data
        const plan = await createPlanFromAIData(task_description, synopsis, tasks, session_id);
        
        // Create the plan_and_progress directory structure
        const gitHash = plan.git_commit_hash || 'no-commit';
        const reportsDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
        
        if (!existsSync(reportsDir)) {
          await mkdir(reportsDir, { recursive: true });
        }

        // Save the plan to a JSON file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const planFileName = `plan-${timestamp}.json`;
        const planFilePath = path.join(reportsDir, planFileName);
        
        await writeFile(planFilePath, JSON.stringify(plan, null, 2), 'utf8');

        // Generate a human-readable summary
        const summary = generatePlanSummary(plan);

        return {
          content: [{
            type: 'text',
            text: `Plan created successfully!\n\nFile saved: ${planFilePath}\n\n${summary}`
          }]
        };
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

function generatePlanSummary(plan: PlanDocument): string {
  const summary = [
    '=== EXECUTION PLAN SUMMARY ===',
    '',
    `📋 Task: ${plan.task_description}`,
    `📝 Synopsis: ${plan.synopsis}`,
    `⏰ Created: ${new Date(plan.created_at).toLocaleString()}`,
    `🔧 Git Commit: ${plan.git_commit_hash || 'No commit available'}`,
    ''
  ];


  summary.push(`📊 Tasks Breakdown (${plan.tasks.length} tasks):`);
  summary.push('');

  plan.tasks.forEach((task, index) => {
    const status = task.state === 'pending' ? '⏳' : 
                  task.state === 'in_progress' ? '🔄' : '✅';
    const dependencies = task.dependencies.length > 0 ? ` [depends on: ${task.dependencies.join(', ')}]` : '';
    
    summary.push(`  ${status} ${task.id}: ${task.description}`);
    summary.push(`     👤 Agent: ${task.designated_agent}`);
    summary.push(`     🔖 Session: ${task.session_id}`);
    
    if (task.files_to_modify.length > 0) {
      summary.push(`     📁 Files: ${task.files_to_modify.join(', ')}`);
    }
    
    if (dependencies) {
      summary.push(`     🔗${dependencies}`);
    }
    
    summary.push('');
  });

  return summary.join('\n');
}