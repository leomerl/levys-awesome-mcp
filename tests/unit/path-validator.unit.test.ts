import { describe, it, expect } from 'vitest';
import { validatePath, normalizePath } from '../../src/utilities/fs/path-validator.ts';

describe('Path Validator Unit Tests', () => {
  describe('validatePath', () => {
    it('should accept valid relative paths', () => {
      expect(() => validatePath('frontend/src/app.js')).not.toThrow();
      expect(() => validatePath('backend/models/user.ts')).not.toThrow();
      expect(() => validatePath('tests/unit/test.spec.ts')).not.toThrow();
    });

    it('should reject directory traversal attempts', () => {
      expect(() => validatePath('../../../etc/passwd')).toThrow('Invalid file path');
      expect(() => validatePath('frontend/../../../secrets')).toThrow('Invalid file path');
      expect(() => validatePath('..\\windows\\system32')).toThrow('Invalid file path');
    });

    it('should reject absolute paths', () => {
      expect(() => validatePath('/etc/passwd')).toThrow('Invalid file path');
      expect(() => validatePath('C:\\Windows\\System32')).toThrow('Invalid file path');
    });

    it('should reject null bytes', () => {
      expect(() => validatePath('file\0.txt')).toThrow('Invalid file path');
    });

    it('should handle empty paths', () => {
      expect(() => validatePath('')).toThrow('Invalid file path');
      expect(() => validatePath('   ')).toThrow('Invalid file path');
    });
  });

  describe('normalizePath', () => {
    it('should normalize path separators', () => {
      expect(normalizePath('frontend\\src\\app.js')).toBe('frontend/src/app.js');
      expect(normalizePath('backend/models/user.ts')).toBe('backend/models/user.ts');
    });

    it('should resolve relative segments safely', () => {
      expect(normalizePath('frontend/./src/app.js')).toBe('frontend/src/app.js');
      expect(normalizePath('frontend/src/../components/button.js')).toBe('frontend/components/button.js');
    });

    it('should handle multiple slashes', () => {
      expect(normalizePath('frontend//src///app.js')).toBe('frontend/src/app.js');
    });
  });
});