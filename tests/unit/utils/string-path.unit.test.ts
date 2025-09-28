import { describe, it, expect } from 'vitest';
import * as path from 'path';

const capitalizeFirst = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const kebabToCamel = (str: string): string => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

const camelToKebab = (str: string): string => {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
};

const truncateString = (str: string, maxLength: number, suffix = '...'): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
};

const sanitizePath = (inputPath: string): string => {
  const normalized = path.normalize(inputPath);
  if (normalized.includes('..')) {
    throw new Error('Path traversal detected');
  }
  return normalized.replace(/\\/g, '/');
};

const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return filename.slice(lastDot + 1).toLowerCase();
};

const removeFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return filename;
  return filename.slice(0, lastDot);
};

const joinPaths = (...paths: string[]): string => {
  return path.join(...paths).replace(/\\/g, '/');
};

describe('String and Path Manipulation Utilities', () => {
  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('world')).toBe('World');
      expect(capitalizeFirst('test string')).toBe('Test string');
    });

    it('should handle edge cases', () => {
      expect(capitalizeFirst('')).toBe('');
      expect(capitalizeFirst('A')).toBe('A');
      expect(capitalizeFirst('123abc')).toBe('123abc');
    });
  });

  describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('my-variable-name')).toBe('myVariableName');
      expect(kebabToCamel('test-case')).toBe('testCase');
      expect(kebabToCamel('a-b-c')).toBe('aBC');
    });

    it('should handle strings without hyphens', () => {
      expect(kebabToCamel('simple')).toBe('simple');
      expect(kebabToCamel('')).toBe('');
    });
  });

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('myVariableName')).toBe('my-variable-name');
      expect(camelToKebab('testCase')).toBe('test-case');
      expect(camelToKebab('ABC')).toBe('a-b-c');
    });

    it('should handle strings without capitals', () => {
      expect(camelToKebab('simple')).toBe('simple');
      expect(camelToKebab('')).toBe('');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('This is a very long string', 10)).toBe('This is...');
      expect(truncateString('Hello world', 8, '...')).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncateString('Short', 10)).toBe('Short');
      expect(truncateString('Test', 4)).toBe('Test');
    });

    it('should handle custom suffix', () => {
      expect(truncateString('Long string here', 10, '…')).toBe('Long stri…');
      expect(truncateString('Truncate me', 8, ' →')).toBe('Trunca →');
    });
  });

  describe('sanitizePath', () => {
    it('should normalize valid paths', () => {
      expect(sanitizePath('src/utils/test.js')).toBe('src/utils/test.js');
      expect(sanitizePath('./src//utils///test.js')).toBe('src/utils/test.js');
    });

    it('should throw error for path traversal', () => {
      expect(() => sanitizePath('../etc/passwd')).toThrow('Path traversal detected');
      expect(() => sanitizePath('src/../../etc')).toThrow('Path traversal detected');
    });

    it('should handle Windows paths', () => {
      expect(sanitizePath('src\\utils\\test.js')).toBe('src/utils/test.js');
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extensions', () => {
      expect(getFileExtension('file.txt')).toBe('txt');
      expect(getFileExtension('script.test.js')).toBe('js');
      expect(getFileExtension('IMAGE.PNG')).toBe('png');
    });

    it('should handle edge cases', () => {
      expect(getFileExtension('noextension')).toBe('');
      expect(getFileExtension('.hidden')).toBe('');
      expect(getFileExtension('')).toBe('');
    });
  });

  describe('removeFileExtension', () => {
    it('should remove file extensions', () => {
      expect(removeFileExtension('file.txt')).toBe('file');
      expect(removeFileExtension('script.test.js')).toBe('script.test');
      expect(removeFileExtension('archive.tar.gz')).toBe('archive.tar');
    });

    it('should handle files without extensions', () => {
      expect(removeFileExtension('README')).toBe('README');
      expect(removeFileExtension('.gitignore')).toBe('.gitignore');
    });
  });

  describe('joinPaths', () => {
    it('should join path segments', () => {
      expect(joinPaths('src', 'utils', 'test.js')).toBe('src/utils/test.js');
      expect(joinPaths('/root', 'folder', 'file.txt')).toBe('/root/folder/file.txt');
    });

    it('should handle empty segments', () => {
      expect(joinPaths('src', '', 'test.js')).toBe('src/test.js');
      expect(joinPaths('', 'folder')).toBe('folder');
    });

    it('should normalize separators', () => {
      expect(joinPaths('src/', '/utils/', '/test.js')).toBe('src/utils/test.js');
    });
  });
});