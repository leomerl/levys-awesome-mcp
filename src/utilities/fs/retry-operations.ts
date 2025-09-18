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

/* ========================================================================
 * COMPILE-TIME TYPE TESTS
 * ======================================================================== */

// Test helper type for assertions
type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

const typeTests = {
  // Test withRetry<T> generic function type behavior
  withRetryGenericTests: {
    // Test return type preservation for primitive types
    stringReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<string>>,
      Promise<string>
    >>,
    
    numberReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<number>>,
      Promise<number>
    >>,
    
    booleanReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<boolean>>,
      Promise<boolean>
    >>,
    
    // Test return type preservation for complex types
    objectReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<{ id: number; name: string }>>,
      Promise<{ id: number; name: string }>
    >>,
    
    arrayReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<string[]>>,
      Promise<string[]>
    >>,
    
    // Test void return type
    voidReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<void>>,
      Promise<void>
    >>,
    
    // Test union types
    unionReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<string | number>>,
      Promise<string | number>
    >>,
    
    // Test function operation parameter type
    operationParamType: null as unknown as Expect<Equal<
      Parameters<typeof withRetry<string>>[0],
      () => Promise<string>
    >>,
    
    // Test optional options parameter
    optionsParamType: null as unknown as Expect<Equal<
      Parameters<typeof withRetry<string>>[1],
      RetryOptions | undefined
    >>,
  },

  // Test withRetrySync<T> generic function type behavior
  withRetrySyncGenericTests: {
    // Test return type preservation (sync version)
    stringReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<string>>,
      string
    >>,
    
    numberReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<number>>,
      number
    >>,
    
    booleanReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<boolean>>,
      boolean
    >>,
    
    // Test complex types (sync version)
    objectReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<{ data: any; status: number }>>,
      { data: any; status: number }
    >>,
    
    arrayReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<Buffer[]>>,
      Buffer[]
    >>,
    
    // Test void return type (sync version)
    voidReturn: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<void>>,
      void
    >>,
    
    // Test sync operation parameter type
    operationParamType: null as unknown as Expect<Equal<
      Parameters<typeof withRetrySync<string>>[0],
      () => string
    >>,
    
    // Test that sync version doesn't return Promise
    notPromise: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<string>>,
      Promise<string>
    > extends true ? false : true>,
  },

  // Test RetryOptions interface type structure
  retryOptionsTests: {
    // Test all properties are optional
    emptyObject: null as unknown as Expect<Equal<
      {},
      RetryOptions
    > extends true ? false : true>, // Should be assignable but not equal
    
    // Test partial assignment compatibility
    partialOptions: null as unknown as RetryOptions extends {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
      retryableErrors?: string[];
    } ? true : false,
    
    // Test Required<RetryOptions> type
    requiredOptions: null as unknown as Expect<Equal<
      Required<RetryOptions>,
      {
        maxAttempts: number;
        initialDelay: number;
        maxDelay: number;
        backoffFactor: number;
        retryableErrors: string[];
      }
    >>,
  },

  // Test waitForStable function types
  waitForStableTests: {
    // Test checkFn parameter type
    checkFnType: null as unknown as Expect<Equal<
      Parameters<typeof waitForStable>[0],
      () => Promise<boolean>
    >>,
    
    // Test optional timeout parameter
    timeoutType: null as unknown as Expect<Equal<
      Parameters<typeof waitForStable>[1],
      number | undefined
    >>,
    
    // Test optional interval parameter
    intervalType: null as unknown as Expect<Equal<
      Parameters<typeof waitForStable>[2],
      number | undefined
    >>,
    
    // Test return type
    returnType: null as unknown as Expect<Equal<
      ReturnType<typeof waitForStable>,
      Promise<void>
    >>,
  },

  // Test ensureWriteComplete function types
  ensureWriteCompleteTests: {
    // Test filePath parameter type
    filePathType: null as unknown as Expect<Equal<
      Parameters<typeof ensureWriteComplete>[0],
      string
    >>,
    
    // Test optional expectedSize parameter
    expectedSizeType: null as unknown as Expect<Equal<
      Parameters<typeof ensureWriteComplete>[1],
      number | undefined
    >>,
    
    // Test optional timeout parameter
    timeoutType: null as unknown as Expect<Equal<
      Parameters<typeof ensureWriteComplete>[2],
      number | undefined
    >>,
    
    // Test return type
    returnType: null as unknown as Expect<Equal<
      ReturnType<typeof ensureWriteComplete>,
      Promise<void>
    >>,
  },

  // Test generic type parameter constraints and inference
  genericConstraintTests: {
    // Test that withRetry infers type from operation return type
    typeInference: async () => {
      // These should compile without explicit type parameters
      const stringResult = await withRetry(async () => "hello");
      const numberResult = await withRetry(async () => 42);
      const objectResult = await withRetry(async () => ({ id: 1, name: "test" }));
      
      // Type assertions to verify inference worked correctly
      const _stringCheck: string = stringResult;
      const _numberCheck: number = numberResult;
      const _objectCheck: { id: number; name: string } = objectResult;
      
      return true;
    },
    
    // Test that withRetrySync infers type from operation return type
    syncTypeInference: () => {
      // These should compile without explicit type parameters
      const stringResult = withRetrySync(() => "hello");
      const numberResult = withRetrySync(() => 42);
      const objectResult = withRetrySync(() => ({ id: 1, name: "test" }));
      
      // Type assertions to verify inference worked correctly
      const _stringCheck: string = stringResult;
      const _numberCheck: number = numberResult;
      const _objectCheck: { id: number; name: string } = objectResult;
      
      return true;
    },
  },

  // Test async vs sync transformation types
  asyncSyncTransformationTests: {
    // Test that async version wraps return type in Promise
    asyncWrapsInPromise: null as unknown as Expect<Equal<
      Awaited<ReturnType<typeof withRetry<string>>>,
      string
    >>,
    
    // Test that sync version doesn't wrap in Promise
    syncDoesNotWrapInPromise: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<string>>,
      string
    >>,
    
    // Test operation parameter differences
    asyncOperationReturnsPromise: null as unknown as Expect<Equal<
      ReturnType<Parameters<typeof withRetry<string>>[0]>,
      Promise<string>
    >>,
    
    syncOperationReturnsValue: null as unknown as Expect<Equal<
      ReturnType<Parameters<typeof withRetrySync<string>>[0]>,
      string
    >>,
  },

  // Test error handling in type system
  errorHandlingTypeTests: {
    // Test that functions can throw (doesn't affect return type)
    asyncCanThrow: null as unknown as Expect<Equal<
      ReturnType<typeof withRetry<string>>,
      Promise<string> // Still Promise<string>, not Promise<string | never>
    >>,
    
    syncCanThrow: null as unknown as Expect<Equal<
      ReturnType<typeof withRetrySync<string>>,
      string // Still string, not string | never
    >>,
    
    // Test that error types don't leak into return types
    errorTypesContained: async () => {
      try {
        const result = await withRetry(async () => {
          throw new Error("test");
        });
        // If we get here, result should still be the expected type
        const _check: never = result; // This line should never execute
      } catch (error) {
        // Error should be catchable but doesn't affect return type
        const _errorCheck: unknown = error;
      }
      return true;
    },
  },

  // Test DEFAULT_OPTIONS type compatibility
  defaultOptionsTests: {
    // Test that DEFAULT_OPTIONS satisfies Required<RetryOptions>
    defaultOptionsType: null as unknown as Expect<Equal<
      typeof DEFAULT_OPTIONS,
      Required<RetryOptions>
    >>,
    
    // Test individual property types
    maxAttemptsType: null as unknown as Expect<Equal<
      typeof DEFAULT_OPTIONS.maxAttempts,
      number
    >>,
    
    retryableErrorsType: null as unknown as Expect<Equal<
      typeof DEFAULT_OPTIONS.retryableErrors,
      string[]
    >>,
  },
};

// Ensure all tests are properly typed (this line should compile without errors)
const _typeTestsCheck: typeof typeTests = typeTests;