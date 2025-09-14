import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { executeCommand } from '../../shared/utils.js';

interface ProgressTask {
  id: string;
  designated_agent: string;
  dependencies: string[];
  description: string;
  files_to_modify: string[];
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

/**
 * Updates a task from pending to in_progress state
 * @param taskNumber The task number (e.g., 1 for TASK-001, 2 for TASK-002)
 * @returns true if successful, false otherwise
 */
export async function updateTaskToInProgress(taskNumber: number): Promise<boolean> {
  try {
    // Get the current git commit hash
    const gitHash = await getGitCommitHash();
    if (!gitHash) {
      return false;
    }

    // Find the progress file
    const reportsDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
    if (!existsSync(reportsDir)) {
      return false;
    }

    const fs = await import('fs');
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('progress-') && f.endsWith('.json'));
    
    if (files.length === 0) {
      return false;
    }

    // Get the most recent progress file
    files.sort().reverse();
    const progressFilePath = path.join(reportsDir, files[0]);

    // Use locking to prevent race conditions
    return await withLock(`task-update-${gitHash}-${taskNumber}`, async () => {
      // Read current progress
      const progressContent = await readFile(progressFilePath, 'utf8');
      const progress: ProgressDocument = JSON.parse(progressContent);

      // Find the task by number (assuming task IDs are like TASK-001, TASK-002, etc.)
      const taskId = `TASK-${String(taskNumber).padStart(3, '0')}`;
      const taskIndex = progress.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return false;
      }

      const task = progress.tasks[taskIndex];
      
      // Only update if task is currently pending
      if (task.state !== 'pending') {
        return false;
      }

      // Update task state
      const now = new Date().toISOString();
      task.state = 'in_progress';
      task.started_at = now;
      progress.last_updated = now;

      // Save updated progress
      await writeFile(progressFilePath, JSON.stringify(progress, null, 2), 'utf8');
      
      return true;
    });
  } catch (error) {
    console.error('Error updating task to in_progress:', error);
    return false;
  }
}

/**
 * Checks if a task is currently in_progress
 * @param taskNumber The task number (e.g., 1 for TASK-001, 2 for TASK-002)
 * @returns true if task is in_progress, false otherwise
 */
export async function isTaskInProgress(taskNumber: number): Promise<boolean> {
  try {
    // Get the current git commit hash
    const gitHash = await getGitCommitHash();
    if (!gitHash) {
      return false;
    }

    // Find the progress file
    const reportsDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
    if (!existsSync(reportsDir)) {
      return false;
    }

    const fs = await import('fs');
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('progress-') && f.endsWith('.json'));
    
    if (files.length === 0) {
      return false;
    }

    // Get the most recent progress file
    files.sort().reverse();
    const progressFilePath = path.join(reportsDir, files[0]);

    // Read current progress
    const progressContent = await readFile(progressFilePath, 'utf8');
    const progress: ProgressDocument = JSON.parse(progressContent);

    // Find the task by number
    const taskId = `TASK-${String(taskNumber).padStart(3, '0')}`;
    const task = progress.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return false;
    }

    return task.state === 'in_progress';
  } catch (error) {
    console.error('Error checking if task is in_progress:', error);
    return false;
  }
}

/**
 * Gets the first task that is currently in_progress
 * @returns The in-progress task or null if none found
 */
export async function getInProgressTask(): Promise<ProgressTask | null> {
  try {
    // Get the current git commit hash
    const gitHash = await getGitCommitHash();
    if (!gitHash) {
      return null;
    }

    // Find the progress file
    const reportsDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
    if (!existsSync(reportsDir)) {
      return null;
    }

    const fs = await import('fs');
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('progress-') && f.endsWith('.json'));
    
    if (files.length === 0) {
      return null;
    }

    // Get the most recent progress file
    files.sort().reverse();
    const progressFilePath = path.join(reportsDir, files[0]);

    // Read current progress
    const progressContent = await readFile(progressFilePath, 'utf8');
    const progress: ProgressDocument = JSON.parse(progressContent);

    // Find the first in_progress task
    const inProgressTask = progress.tasks.find(t => t.state === 'in_progress');
    
    return inProgressTask || null;
  } catch (error) {
    console.error('Error getting in_progress task:', error);
    return null;
  }
}

/**
 * Gets a task by its number
 * @param taskNumber The task number (e.g., 1 for TASK-001, 2 for TASK-002)
 * @returns The task or null if not found
 */
export async function getTaskByNumber(taskNumber: number): Promise<ProgressTask | null> {
  try {
    // Get the current git commit hash
    const gitHash = await getGitCommitHash();
    if (!gitHash) {
      return null;
    }

    // Find the progress file
    const reportsDir = path.join(process.cwd(), 'plan_and_progress', gitHash);
    if (!existsSync(reportsDir)) {
      return null;
    }

    const fs = await import('fs');
    const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('progress-') && f.endsWith('.json'));
    
    if (files.length === 0) {
      return null;
    }

    // Get the most recent progress file
    files.sort().reverse();
    const progressFilePath = path.join(reportsDir, files[0]);

    // Read current progress
    const progressContent = await readFile(progressFilePath, 'utf8');
    const progress: ProgressDocument = JSON.parse(progressContent);

    // Find the task by number
    const taskId = `TASK-${String(taskNumber).padStart(3, '0')}`;
    const task = progress.tasks.find(t => t.id === taskId);
    
    return task || null;
  } catch (error) {
    console.error('Error getting task by number:', error);
    return null;
  }
}

/**
 * Gets the current git commit hash for locating progress files
 */
export async function getCurrentGitHash(): Promise<string | null> {
  return await getGitCommitHash();
}