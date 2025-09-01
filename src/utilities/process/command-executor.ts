/**
 * Command Execution Utilities
 * Centralizes process spawning with consistent error handling
 */

import { spawn, ChildProcess } from 'child_process';

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface CommandOptions {
  cwd?: string;
  timeout?: number;
  shell?: boolean;
  env?: Record<string, string>;
}

export class CommandExecutor {
  /**
   * Execute a command and return the result
   */
  static async runCommand(
    command: string, 
    args: string[] = [], 
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const {
        cwd = process.cwd(),
        timeout = 30000,
        shell = true,
        env = process.env
      } = options;

      const proc: ChildProcess = spawn(command, args, {
        cwd,
        stdio: 'pipe',
        shell,
        env: { ...env }
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | null = null;

      // Set up timeout
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          proc.kill('SIGTERM');
          resolve({
            success: false,
            stdout,
            stderr: stderr + '\nCommand timed out',
            exitCode: null
          });
        }, timeout);
      }

      // Collect stdout
      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process completion
      proc.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        resolve({
          success: code === 0,
          stdout,
          stderr,
          exitCode: code
        });
      });

      // Handle process errors
      proc.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        resolve({
          success: false,
          stdout,
          stderr: stderr + `\nProcess error: ${error.message}`,
          exitCode: null
        });
      });
    });
  }

  /**
   * Execute a build command (npm run build, etc.)
   */
  static async runBuildCommand(
    command: string,
    args: string[],
    workingDirectory: string
  ): Promise<{ success: boolean; output: string }> {
    const result = await this.runCommand(command, args, {
      cwd: workingDirectory,
      timeout: 120000 // 2 minutes for builds
    });

    const output = result.success 
      ? `Build completed successfully:\n${result.stdout}`
      : `Build failed:\n${result.stderr || result.stdout}`;

    return {
      success: result.success,
      output
    };
  }

  /**
   * Execute multiple commands in sequence
   */
  static async runCommandSequence(
    commands: Array<{ command: string; args: string[]; options?: CommandOptions }>
  ): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const cmd of commands) {
      const result = await this.runCommand(cmd.command, cmd.args, cmd.options);
      results.push(result);

      // Stop on first failure
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Execute commands in parallel
   */
  static async runCommandsParallel(
    commands: Array<{ command: string; args: string[]; options?: CommandOptions }>
  ): Promise<CommandResult[]> {
    const promises = commands.map(cmd =>
      this.runCommand(cmd.command, cmd.args, cmd.options)
    );

    return Promise.all(promises);
  }
}