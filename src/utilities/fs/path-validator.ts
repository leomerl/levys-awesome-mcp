/**
 * Path Validation and Security Utilities
 * Centralizes path validation logic used across content-writer and other tools
 */

import * as path from 'path';

export interface PathValidationResult {
  isValid: boolean;
  normalizedPath: string;
  error?: string;
}

export class PathValidator {
  /**
   * Validate and normalize a file path against a specific allowed folder
   */
  static validateFilePath(filePath: string, allowedFolder: string): PathValidationResult {
    try {
      // Check for path traversal sequences
      if (filePath.includes('..') || filePath.includes('~')) {
        return {
          isValid: false,
          normalizedPath: filePath,
          error: 'Path contains invalid sequences'
        };
      }
      
      // Get absolute paths to prevent path traversal
      const absoluteFilePath = path.resolve(filePath);
      const absoluteAllowedFolder = path.resolve(allowedFolder);
      const workingDir = process.cwd();
      
      // Check if both paths are within working directory
      if (!absoluteFilePath.startsWith(workingDir) || !absoluteAllowedFolder.startsWith(workingDir)) {
        return {
          isValid: false,
          normalizedPath: absoluteFilePath,
          error: 'Paths must be within the current working directory'
        };
      }

      // Check if the file path is within the allowed folder
      if (!absoluteFilePath.startsWith(absoluteAllowedFolder)) {
        return {
          isValid: false,
          normalizedPath: absoluteFilePath,
          error: `Path '${path.relative(workingDir, absoluteFilePath)}' is not within allowed folder '${path.relative(workingDir, absoluteAllowedFolder)}'`
        };
      }

      return {
        isValid: true,
        normalizedPath: absoluteFilePath
      };
    } catch (error) {
      return {
        isValid: false,
        normalizedPath: filePath,
        error: `Path validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Normalize path and ensure it's within the specified folder
   */
  static normalizeFolderPath(filePath: string, folderName: string): string {
    // Check for path traversal sequences
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new Error('Path contains invalid sequences');
    }
    
    let normalizedPath = filePath;
    
    // Handle absolute paths
    if (normalizedPath.startsWith('/')) {
      throw new Error(`Absolute paths not allowed. Use relative paths within ${folderName}/ folder.`);
    }
    
    // If path doesn't start with folder name, prepend it
    if (!normalizedPath.startsWith(`${folderName}/`) && !normalizedPath.startsWith(`./${folderName}/`)) {
      normalizedPath = `${folderName}/${normalizedPath}`;
    }
    
    return normalizedPath;
  }

  /**
   * Validate if a file path is a valid test file
   */
  static isValidTestFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath).toLowerCase();
    
    // Check for test file patterns
    const testPatterns = [
      /[\\/]__tests__[\\/]/,           // __tests__ directory
      /[\\/]tests?[\\/]/,              // tests or test directory
      /\.test\./,                      // .test. in filename
      /\.spec\./,                      // .spec. in filename
      /-test\./,                       // -test. in filename
      /-spec\./,                       // -spec. in filename
      /test.*\.(js|ts|jsx|tsx|py|go|rs|java|cpp|c)$/,  // test files
      /spec.*\.(js|ts|jsx|tsx|py|go|rs|java|cpp|c)$/   // spec files
    ];
    
    return testPatterns.some(pattern => pattern.test(normalizedPath));
  }

  /**
   * Check if path is within working directory
   */
  static isWithinWorkingDirectory(filePath: string): boolean {
    const absoluteFilePath = path.resolve(filePath);
    const workingDir = process.cwd();
    return absoluteFilePath.startsWith(workingDir);
  }

  /**
   * Get relative path from working directory
   */
  static getRelativePath(filePath: string): string {
    const workingDir = process.cwd();
    return path.relative(workingDir, path.resolve(filePath));
  }
}

/**
 * Convenience wrapper functions for common validation scenarios
 */
export function validatePath(filePath: string): void {
  // Basic validation without a specific allowed folder
  if (!filePath || filePath.trim() === '') {
    throw new Error('Invalid file path: path cannot be empty');
  }

  // Check for dangerous patterns
  if (filePath.includes('..') || filePath.includes('~') || filePath.includes('\0')) {
    throw new Error('Invalid file path: contains dangerous sequences');
  }

  // Check for absolute paths (both Unix and Windows style)
  if (path.isAbsolute(filePath) || /^[A-Za-z]:[\\\/]/.test(filePath)) {
    throw new Error('Invalid file path: absolute paths not allowed');
  }
}

export function normalizePath(filePath: string): string {
  // Normalize slashes and remove redundant segments
  let normalized = filePath.replace(/\\/g, '/');
  normalized = normalized.replace(/\/+/g, '/');

  // Safely resolve relative segments without allowing traversal
  const segments = normalized.split('/');
  const resolvedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '.' || segment === '') {
      continue;
    }
    if (segment === '..') {
      // Don't allow going up beyond root
      if (resolvedSegments.length > 0) {
        resolvedSegments.pop();
      }
    } else {
      resolvedSegments.push(segment);
    }
  }

  return resolvedSegments.join('/');
}