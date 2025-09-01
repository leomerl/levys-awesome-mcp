/**
 * Safe File Operations Utilities
 * Centralizes file read/write/edit operations with consistent error handling
 */

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

export interface FileOperationResult {
  success: boolean;
  message: string;
  error?: string;
}

export class FileOperations {
  /**
   * Ensure directory exists, creating it recursively if needed
   */
  static async ensureDirectoryExists(filePath: string): Promise<void> {
    // Validate path to prevent traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      throw new Error('Invalid path: contains traversal sequences');
    }
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fsp.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Write content to a file safely
   */
  static async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<FileOperationResult> {
    try {
      // Validate path to prevent traversal
      if (filePath.includes('..') || filePath.includes('~')) {
        return {
          success: false,
          message: 'Invalid path: contains traversal sequences',
          error: 'Path validation failed'
        };
      }
      
      await this.ensureDirectoryExists(filePath);
      await fsp.writeFile(filePath, content, encoding);
      
      const workingDir = process.cwd();
      const relativeFilePath = path.relative(workingDir, filePath);
      
      return {
        success: true,
        message: `Successfully wrote file: ${relativeFilePath}\nContent length: ${content.length} characters`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to write file: ${path.basename(filePath)}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Read file content safely
   */
  static async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const content = await fsp.readFile(filePath, encoding);
      return {
        success: true,
        content
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Edit file by replacing old string with new string
   */
  static async editFile(filePath: string, oldString: string, newString: string): Promise<FileOperationResult> {
    try {
      // Read existing file
      const readResult = await this.readFile(filePath);
      if (!readResult.success || !readResult.content) {
        return {
          success: false,
          message: `Failed to read file: ${filePath}`,
          error: readResult.error
        };
      }

      const existingContent = readResult.content;
      
      // Replace old_string with new_string
      const newContent = existingContent.replace(oldString, newString);
      
      if (existingContent === newContent) {
        return {
          success: false,
          message: `Warning: No changes made. String '${oldString}' not found in ${filePath}`
        };
      }

      // Write updated content
      const writeResult = await this.writeFile(filePath, newContent);
      if (!writeResult.success) {
        return writeResult;
      }

      const workingDir = process.cwd();
      const relativeFilePath = path.relative(workingDir, filePath);
      
      return {
        success: true,
        message: `Successfully edited file: ${relativeFilePath}\nReplaced '${oldString}' with '${newString}'`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to edit file: ${filePath}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Check if file exists
   */
  static fileExists(filePath: string): boolean {
    // Validate path to prevent traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return false;
    }
    return fs.existsSync(filePath);
  }

  /**
   * Append content to a file
   */
  static async appendToFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<FileOperationResult> {
    try {
      await this.ensureDirectoryExists(filePath);
      await fsp.appendFile(filePath, content, encoding);
      
      return {
        success: true,
        message: `Successfully appended to file: ${filePath}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to append to file: ${filePath}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate JSON content
   */
  static validateJsonContent(content: string): { isValid: boolean; error?: string } {
    try {
      JSON.parse(content);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}