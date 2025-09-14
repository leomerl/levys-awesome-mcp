/**
 * Retry Operations for Deterministic File System Access
 * Provides retry logic with exponential backoff for file operations
 */

import { promisify } from 'util';

const sleep = promisify(setTimeout);

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffFactor: 2,
  retryableErrors: ['EBUSY', 'ENOENT', 'EACCES', 'EPERM', 'EMFILE', 'ENFILE']
};

/**
 * Execute an operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = opts.retryableErrors.some(code => 
        error.code === code || error.message?.includes(code)
      );

      if (!isRetryable || attempt === opts.maxAttempts) {
        throw error;
      }

      // Wait before retry with exponential backoff
      await sleep(Math.min(delay, opts.maxDelay));
      delay *= opts.backoffFactor;
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Retry wrapper for sync operations
 */
export function withRetrySync<T>(
  operation: () => T,
  options: RetryOptions = {}
): T {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = opts.retryableErrors.some(code => 
        error.code === code || error.message?.includes(code)
      );

      if (!isRetryable || attempt === opts.maxAttempts) {
        throw error;
      }

      // Sync sleep (blocking)
      const start = Date.now();
      while (Date.now() - start < Math.min(delay, opts.maxDelay)) {
        // Busy wait
      }
      delay *= opts.backoffFactor;
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Wrapper for file system operations that may need stabilization
 */
export async function waitForStable(
  checkFn: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      // Extra wait to ensure stability
      await sleep(interval);
      if (await checkFn()) {
        return;
      }
    }
    await sleep(interval);
  }
  
  throw new Error(`Operation did not stabilize within ${timeout}ms`);
}

/**
 * Ensure file write is complete and flushed
 */
export async function ensureWriteComplete(
  filePath: string,
  expectedSize?: number,
  timeout: number = 3000
): Promise<void> {
  const fs = await import('fs');
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const stats = fs.statSync(filePath);
      
      // If we know expected size, wait for it
      if (expectedSize !== undefined && stats.size !== expectedSize) {
        await sleep(50);
        continue;
      }
      
      // File exists and has content
      if (stats.size > 0 || expectedSize === 0) {
        // Wait a bit more to ensure flush
        await sleep(100);
        return;
      }
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    await sleep(50);
  }
  
  throw new Error(`File write did not complete within ${timeout}ms`);
}