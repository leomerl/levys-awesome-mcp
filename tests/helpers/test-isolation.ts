/**
 * Test Isolation Utilities
 * Ensures tests run in isolated environments without interference
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class TestIsolation {
  private static tempDirs: Set<string> = new Set();
  private static readonly BASE_TEMP = path.join(process.cwd(), '.test-temp');

  /**
   * Create an isolated test directory
   */
  static createIsolatedDir(prefix: string = 'test'): string {
    // Ensure base temp directory exists
    if (!fs.existsSync(this.BASE_TEMP)) {
      fs.mkdirSync(this.BASE_TEMP, { recursive: true });
    }

    // Create unique test directory
    const testDir = path.join(this.BASE_TEMP, `${prefix}-${uuidv4()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    this.tempDirs.add(testDir);
    return testDir;
  }

  /**
   * Clean up a specific test directory
   */
  static cleanupDir(dir: string): void {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
      this.tempDirs.delete(dir);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Clean up all test directories
   */
  static cleanupAll(): void {
    for (const dir of this.tempDirs) {
      this.cleanupDir(dir);
    }

    // Clean up base temp if empty
    try {
      if (fs.existsSync(this.BASE_TEMP)) {
        const contents = fs.readdirSync(this.BASE_TEMP);
        if (contents.length === 0) {
          fs.rmdirSync(this.BASE_TEMP);
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Run a test in isolation
   */
  static async runInIsolation<T>(
    testName: string,
    fn: (testDir: string) => Promise<T>
  ): Promise<T> {
    const testDir = this.createIsolatedDir(testName);
    const originalCwd = process.cwd();
    
    try {
      // Change to test directory
      process.chdir(testDir);
      
      // Run the test
      return await fn(testDir);
    } finally {
      // Restore working directory
      process.chdir(originalCwd);
      
      // Clean up with delay to ensure files are released
      setTimeout(() => this.cleanupDir(testDir), 100);
    }
  }

  /**
   * Create a test-specific file path
   */
  static getTestFilePath(testName: string, fileName: string): string {
    const safeTestName = testName.replace(/[^a-zA-Z0-9]/g, '-');
    return path.join(this.BASE_TEMP, safeTestName, fileName);
  }

  /**
   * Wait for file system to stabilize
   */
  static async waitForFsStable(delay: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Test fixture for deterministic file operations
 */
export class DeterministicTestFixture {
  private testDir: string;
  private cleanupFns: Array<() => void | Promise<void>> = [];

  constructor(testName: string) {
    this.testDir = TestIsolation.createIsolatedDir(testName);
  }

  /**
   * Get the test directory
   */
  getDir(): string {
    return this.testDir;
  }

  /**
   * Get a file path within the test directory
   */
  getPath(relativePath: string): string {
    return path.join(this.testDir, relativePath);
  }

  /**
   * Add a cleanup function
   */
  addCleanup(fn: () => void | Promise<void>): void {
    this.cleanupFns.push(fn);
  }

  /**
   * Create a file with content
   */
  async createFile(relativePath: string, content: string): Promise<string> {
    const fullPath = this.getPath(relativePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
    await TestIsolation.waitForFsStable();
    
    return fullPath;
  }

  /**
   * Clean up the test fixture
   */
  async cleanup(): Promise<void> {
    // Run custom cleanup functions
    for (const fn of this.cleanupFns) {
      try {
        await fn();
      } catch {
        // Ignore cleanup errors
      }
    }
    
    // Clean up test directory
    TestIsolation.cleanupDir(this.testDir);
  }
}

/**
 * Global test hooks for vitest
 */
export function setupTestIsolation() {
  // Clean up after all tests
  if (typeof afterAll !== 'undefined') {
    afterAll(() => {
      TestIsolation.cleanupAll();
    });
  }
  
  // Also handle process exit
  process.on('exit', () => {
    TestIsolation.cleanupAll();
  });
}