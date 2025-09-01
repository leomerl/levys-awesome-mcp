import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import { CommandResult } from './types.js';

// Shared utility functions

export function executeCommand(command: string, args: string[], cwd: string = process.cwd()): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { 
      cwd, 
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        code: code || 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });
    
    child.on('error', (error) => {
      resolve({
        success: false,
        code: -1,
        stdout: '',
        stderr: '',
        error: error.message
      });
    });
  });
}

export function validatePath(filePath: string): boolean {
  // Basic security check - no path traversal
  if (filePath.includes('..')) return false;
  if (filePath.startsWith('/')) return false;
  if (filePath.includes('\\..')) return false;
  return true;
}

export function isAgentConfigOld(config: any): boolean {
  return config.permissions && config.systemPrompt && config.context;
}

export function isAgentConfigNew(config: any): boolean {
  return config.prompt && config.options;
}

export interface ProjectValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProjectDirectory(dirPath: string, requiredScripts?: string[]): ProjectValidationResult {
  // Check if directory exists
  if (!existsSync(dirPath)) {
    return {
      valid: false,
      error: `Directory '${dirPath}' does not exist`
    };
  }

  // Check if package.json exists in the directory
  const packageJsonPath = path.join(dirPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return {
      valid: false,
      error: `Directory '${dirPath}' exists but does not contain package.json`
    };
  }

  // If specific scripts are required, check they exist
  if (requiredScripts && requiredScripts.length > 0) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const missingScripts = requiredScripts.filter(script => !scripts[script]);
      if (missingScripts.length > 0) {
        return {
          valid: false,
          error: `Directory '${dirPath}' package.json is missing required scripts: ${missingScripts.join(', ')}`
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `Directory '${dirPath}' contains invalid package.json: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  return { valid: true };
}