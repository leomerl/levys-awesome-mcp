import { describe, it, expect } from 'vitest';
import { PathValidator } from '../../src/utilities/fs/path-validator.ts';

describe('PathValidator Unit Tests', () => {
  describe('validateFilePath', () => {
    it('should accept valid paths within allowed folder', () => {
      const result = PathValidator.validateFilePath('frontend/src/app.js', 'frontend');
      expect(result.isValid).toBe(true);
    });

    it('should reject directory traversal attempts', () => {
      const result = PathValidator.validateFilePath('../etc/passwd', 'frontend');
      expect(result.isValid).toBe(false);
    });

    it('should reject absolute paths', () => {
      const result = PathValidator.validateFilePath('/etc/passwd', 'frontend');
      expect(result.isValid).toBe(false);
    });
  });

  describe('normalizeFolderPath', () => {
    it('should prepend folder when missing', () => {
      const normalized = PathValidator.normalizeFolderPath('src/app.js', 'frontend');
      expect(normalized).toBe('frontend/src/app.js');
    });

    it('should throw on absolute paths', () => {
      expect(() => PathValidator.normalizeFolderPath('/etc/passwd', 'frontend')).toThrow();
    });
  });
});

