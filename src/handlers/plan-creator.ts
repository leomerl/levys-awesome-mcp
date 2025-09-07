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
    description: 'Analyzes a task and creates a detailed execution plan with task breakdown, agent assignments, and dependencies. Saves the plan to reports/$git_commit_hash/',
    inputSchema: {
      type: 'object' as const,
      properties: {
        task_description: {
          type: 'string',
          description: 'The main task or project description to analyze and create a plan for'
        },
        context: {
          type: 'string',
          description: 'Additional context about the current codebase, project structure, or requirements (optional)',
          default: ''
        }
      },
      required: ['task_description']
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

async function analyzeTaskAndCreatePlan(taskDescription: string, context: string = '', sessionId: string = ''): Promise<PlanDocument> {
  // This is a simplified planning algorithm. In a real implementation,
  // you might want to integrate with an AI model (like Opus) for more sophisticated analysis
  
  const gitHash = await getGitCommitHash();
  const createdAt = new Date().toISOString();
  
  // Generate session_id if not provided
  const finalSessionId = sessionId || generateSessionId();
  
  // Analyze the task and break it down into components
  const plan: PlanDocument = {
    task_description: taskDescription,
    synopsis: generateSynopsis(taskDescription),
    created_at: createdAt,
    git_commit_hash: gitHash,
    tasks: generateTaskBreakdown(taskDescription, context, finalSessionId)
  };


  return plan;
}

function generateSynopsis(taskDescription: string): string {
  // Simple synopsis generation based on task analysis
  const lowerTask = taskDescription.toLowerCase();
  
  if (lowerTask.includes('api') || lowerTask.includes('endpoint')) {
    return 'This task involves backend API development, requiring database models, API endpoints, validation, and testing.';
  } else if (lowerTask.includes('component') || lowerTask.includes('ui') || lowerTask.includes('frontend')) {
    return 'This task involves frontend development, requiring component creation, state management, styling, and user interaction handling.';
  } else if (lowerTask.includes('database') || lowerTask.includes('migration')) {
    return 'This task involves database work, requiring schema design, migration scripts, and data validation.';
  } else if (lowerTask.includes('test') || lowerTask.includes('testing')) {
    return 'This task focuses on testing implementation, requiring test case design, automation setup, and validation scripts.';
  } else if (lowerTask.includes('refactor') || lowerTask.includes('optimize')) {
    return 'This task involves code refactoring and optimization, requiring code analysis, restructuring, and performance improvements.';
  } else {
    return 'This task requires analysis of requirements, implementation of core functionality, and comprehensive testing.';
  }
}

function generateTaskBreakdown(taskDescription: string, context: string, sessionId: string): Task[] {
  const tasks: Task[] = [];
  const lowerTask = taskDescription.toLowerCase();
  
  // Analysis phase (always first)
  tasks.push({
    id: 'TASK-001',
    session_id: sessionId,
    designated_agent: determineAgent(context, 'analysis'),
    state: 'pending',
    dependencies: [],
    description: 'Analyze requirements and current codebase structure',
    files_to_modify: []
  });

  let taskCounter = 2;

  // Authentication-specific tasks
  if (lowerTask.includes('auth') || lowerTask.includes('login') || lowerTask.includes('register') || lowerTask.includes('password')) {
    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'backend'),
      state: 'pending',
      dependencies: ['TASK-001'],
      description: 'Design authentication database schema and models',
      files_to_modify: ['src/models/User.js', 'migrations/', 'src/models/Session.js'],
    });
    taskCounter++;

    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'backend'),
      state: 'pending',
      dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
      description: 'Implement registration and login API endpoints',
      files_to_modify: ['src/routes/auth.js', 'src/controllers/auth.js', 'src/middleware/auth.js'],
    });
    taskCounter++;

    if (lowerTask.includes('password') && lowerTask.includes('reset')) {
      tasks.push({
        id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
        session_id: sessionId,
        designated_agent: determineAgent(context, 'backend'),
        state: 'pending',
        dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
        description: 'Implement password reset functionality with email verification',
        files_to_modify: ['src/routes/auth.js', 'src/services/email.js', 'src/controllers/auth.js'],
      });
      taskCounter++;
    }

    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'backend'),
      state: 'pending',
      dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
      description: 'Add input validation and security middleware',
      files_to_modify: ['src/validation/auth.js', 'src/middleware/security.js'],
    });
    taskCounter++;

    if (lowerTask.includes('frontend') || lowerTask.includes('react') || context.toLowerCase().includes('react')) {
      tasks.push({
        id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
        session_id: sessionId,
        designated_agent: determineAgent(context, 'frontend'),
        state: 'pending',
        dependencies: ['TASK-001'],
        description: 'Create authentication UI components (login, register, password reset forms)',
        files_to_modify: ['src/components/auth/', 'src/pages/Login.jsx', 'src/pages/Register.jsx'],
        });
      taskCounter++;

      tasks.push({
        id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
        session_id: sessionId,
        designated_agent: determineAgent(context, 'frontend'),
        state: 'pending',
        dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
        description: 'Implement authentication state management and API integration',
        files_to_modify: ['src/context/AuthContext.jsx', 'src/hooks/useAuth.js', 'src/services/authService.js'],
      });
      taskCounter++;
    }
  }
  // Backend/API development tasks  
  else if (lowerTask.includes('api') || lowerTask.includes('endpoint') || lowerTask.includes('backend')) {
    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'backend'),
      state: 'pending',
      dependencies: ['TASK-001'],
      description: 'Design and implement API endpoints',
      files_to_modify: inferFilesToModify(taskDescription, 'backend'),
    });
    taskCounter++;

    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'backend'),
      state: 'pending',
      dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
      description: 'Add input validation and error handling',
      files_to_modify: inferFilesToModify(taskDescription, 'validation'),
    });
    taskCounter++;
  }

  // Frontend/UI development tasks
  if (lowerTask.includes('component') || lowerTask.includes('ui') || lowerTask.includes('frontend')) {
    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'frontend'),
      state: 'pending',
      dependencies: ['TASK-001'],
      description: 'Create frontend components and user interface',
      files_to_modify: inferFilesToModify(taskDescription, 'frontend'),
    });
    taskCounter++;

    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'frontend'),
      state: 'pending',
      dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
      description: 'Implement state management and data flow',
      files_to_modify: inferFilesToModify(taskDescription, 'state'),
      });
    taskCounter++;
  }

  // Database tasks
  if (lowerTask.includes('database') || lowerTask.includes('migration') || lowerTask.includes('model')) {
    tasks.push({
      id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
      session_id: sessionId,
      designated_agent: determineAgent(context, 'backend'),
      state: 'pending',
      dependencies: ['TASK-001'],
      description: 'Design database schema and create migration scripts',
      files_to_modify: inferFilesToModify(taskDescription, 'database'),
    });
    taskCounter++;
  }

  // Testing tasks (always added)
  tasks.push({
    id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
    session_id: sessionId,
    designated_agent: determineAgent(context, 'testing'),
    state: 'pending',
    dependencies: tasks.slice(1, -1).map(t => t.id), // Depends on all implementation tasks
    description: 'Write comprehensive tests for the implemented functionality',
    files_to_modify: inferFilesToModify(taskDescription, 'tests'),
  });
  taskCounter++;

  // Documentation task
  tasks.push({
    id: `TASK-${taskCounter.toString().padStart(3, '0')}`,
    session_id: sessionId,
    designated_agent: determineAgent(context, 'general'),
    state: 'pending',
    dependencies: [`TASK-${(taskCounter-1).toString().padStart(3, '0')}`],
    description: 'Update documentation and add usage examples',
    files_to_modify: ['README.md', 'docs/'],
  });

  return tasks;
}

function determineAgent(context: string, taskType: string): string {
  // Use the actual available agents from the system
  switch (taskType) {
    case 'backend':
      return 'backend-agent';
    case 'frontend':
      return 'frontend-agent';
    case 'testing':
      return 'testing-agent';
    case 'analysis':
      return 'general-purpose';
    case 'build':
      return 'builder';
    case 'lint':
      return 'linter';
    case 'orchestration':
      return 'orchestrator';
    case 'planning':
      return 'planner';
    case 'general':
    default:
      return 'general-purpose';
  }
}

function inferFilesToModify(taskDescription: string, category: string): string[] {
  const lowerTask = taskDescription.toLowerCase();
  
  switch (category) {
    case 'backend':
      if (lowerTask.includes('user') || lowerTask.includes('auth')) {
        return ['src/routes/auth.js', 'src/models/User.js', 'src/middleware/auth.js'];
      } else if (lowerTask.includes('api')) {
        return ['src/routes/', 'src/controllers/', 'src/models/'];
      }
      return ['src/'];
    
    case 'frontend':
      if (lowerTask.includes('component')) {
        return ['src/components/', 'src/pages/'];
      } else if (lowerTask.includes('dashboard')) {
        return ['src/pages/Dashboard.jsx', 'src/components/'];
      }
      return ['src/components/', 'src/pages/'];
    
    case 'database':
      return ['migrations/', 'src/models/', 'database/'];
    
    case 'tests':
      return ['tests/', 'src/__tests__/', '*.test.js'];
    
    case 'validation':
      return ['src/validation/', 'src/middleware/'];
    
    case 'state':
      return ['src/store/', 'src/context/', 'src/hooks/'];
    
    default:
      return [];
  }
}


export async function handlePlanCreatorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__plan-creator__create_plan': {
        const { task_description, context = '', session_id = '' } = args;
        
        if (!task_description || task_description.trim().length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'Error: task_description is required and cannot be empty'
            }],
            isError: true
          };
        }

        // Generate the plan
        const plan = await analyzeTaskAndCreatePlan(task_description, context, session_id);
        
        // Create the reports directory structure
        const gitHash = plan.git_commit_hash || 'no-commit';
        const reportsDir = path.join(process.cwd(), 'reports', gitHash);
        
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