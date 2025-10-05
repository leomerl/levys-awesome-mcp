import { describe, it, expect, vi } from 'vitest';

class CustomError extends Error {
  constructor(message: string, public code: string, public statusCode?: number) {
    super(message);
    this.name = 'CustomError';
  }
}

const wrapError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error(String(error));
};

const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 100
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = wrapError(error);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
};

const isNetworkError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const networkErrorMessages = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'network'];
  return networkErrorMessages.some(msg =>
    error.message.toLowerCase().includes(msg.toLowerCase())
  );
};

const formatErrorMessage = (error: unknown): string => {
  if (error instanceof CustomError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

const handleAsyncError = async <T>(
  promise: Promise<T>,
  fallback?: T
): Promise<[T | undefined, Error | null]> => {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    return [fallback, wrapError(error)];
  }
};

describe('Error Handling Utilities', () => {
  describe('CustomError', () => {
    it('should create custom error with code and status', () => {
      const error = new CustomError('Test error', 'TEST_ERROR', 400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('CustomError');
    });

    it('should be instanceof Error', () => {
      const error = new CustomError('Test', 'TEST');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CustomError);
    });
  });

  describe('wrapError', () => {
    it('should return Error instances as-is', () => {
      const error = new Error('Original error');
      expect(wrapError(error)).toBe(error);
    });

    it('should convert strings to Error', () => {
      const result = wrapError('String error');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('String error');
    });

    it('should convert other types to Error', () => {
      expect(wrapError(123).message).toBe('123');
      expect(wrapError(null).message).toBe('null');
      expect(wrapError(undefined).message).toBe('undefined');
      expect(wrapError({ key: 'value' }).message).toBe('[object Object]');
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const result = await retry(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retry(fn, 2, 10)).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success');

      const start = Date.now();
      await retry(fn, 3, 50);
      const elapsed = Date.now() - start;

      // Allow small timing variance (±5ms) due to system timing precision
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      expect(isNetworkError(new Error('ECONNREFUSED: connection refused'))).toBe(true);
      expect(isNetworkError(new Error('Request failed with ETIMEDOUT'))).toBe(true);
      expect(isNetworkError(new Error('ENOTFOUND: DNS lookup failed'))).toBe(true);
      expect(isNetworkError(new Error('Network request failed'))).toBe(true);
    });

    it('should reject non-network errors', () => {
      expect(isNetworkError(new Error('File not found'))).toBe(false);
      expect(isNetworkError(new Error('Invalid argument'))).toBe(false);
      expect(isNetworkError('Not an error object')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format custom errors with code', () => {
      const error = new CustomError('Something went wrong', 'ERR_CUSTOM', 500);
      expect(formatErrorMessage(error)).toBe('[ERR_CUSTOM] Something went wrong');
    });

    it('should format regular errors', () => {
      const error = new Error('Regular error');
      expect(formatErrorMessage(error)).toBe('Regular error');
    });

    it('should handle non-error types', () => {
      expect(formatErrorMessage('String error')).toBe('String error');
      expect(formatErrorMessage(404)).toBe('404');
      expect(formatErrorMessage(null)).toBe('null');
    });
  });

  describe('handleAsyncError', () => {
    it('should return result on success', async () => {
      const promise = Promise.resolve('success');
      const [result, error] = await handleAsyncError(promise);
      expect(result).toBe('success');
      expect(error).toBeNull();
    });

    it('should return error on failure', async () => {
      const promise = Promise.reject(new Error('Failed'));
      const [result, error] = await handleAsyncError(promise);
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('Failed');
    });

    it('should use fallback value on error', async () => {
      const promise = Promise.reject(new Error('Failed'));
      const [result, error] = await handleAsyncError(promise, 'fallback');
      expect(result).toBe('fallback');
      expect(error).toBeInstanceOf(Error);
    });

    it('should wrap non-error rejections', async () => {
      const promise = Promise.reject('String rejection');
      const [result, error] = await handleAsyncError(promise);
      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe('String rejection');
    });
  });
});