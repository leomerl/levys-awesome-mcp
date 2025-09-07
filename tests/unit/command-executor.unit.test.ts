import { describe, it, expect, vi } from 'vitest';
import { executeCommand, executeParallel } from '../../src/utilities/process/command-executor.ts';

describe('Command Executor Unit Tests', () => {
  describe('executeCommand', () => {
    it('should execute simple commands successfully', async () => {
      const result = await executeCommand('echo "Hello World"');
      
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Hello World');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
    });

    it('should handle command failures', async () => {
      const result = await executeCommand('exit 1');
      
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it('should respect timeout settings', async () => {
      const start = Date.now();
      const result = await executeCommand('sleep 5', { timeout: 1000 });
      const duration = Date.now() - start;
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(duration).toBeLessThan(2000);
    });

    it('should handle working directory changes', async () => {
      const result = await executeCommand('pwd', { cwd: '/tmp' });
      
      if (process.platform !== 'win32') {
        expect(result.stdout).toContain('/tmp');
      }
    });

    it('should capture stderr output', async () => {
      const result = await executeCommand('node -e "console.error(\'error message\')"');
      
      expect(result.stderr).toContain('error message');
    });
  });

  describe('executeParallel', () => {
    it('should execute multiple commands in parallel', async () => {
      const commands = [
        'echo "Command 1"',
        'echo "Command 2"',
        'echo "Command 3"'
      ];
      
      const start = Date.now();
      const results = await executeParallel(commands);
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be much faster than sequential
    });

    it('should handle mixed success/failure results', async () => {
      const commands = [
        'echo "Success"',
        'exit 1',
        'echo "Another success"'
      ];
      
      const results = await executeParallel(commands);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should respect individual command timeouts', async () => {
      const commands = [
        'echo "Fast"',
        'sleep 5'
      ];
      
      const results = await executeParallel(commands, { timeout: 1000 });
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('timeout');
    });
  });
});