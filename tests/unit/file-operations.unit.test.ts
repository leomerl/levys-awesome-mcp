import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile, writeFile, appendFile, fileExists } from '../../utilities/fs/file-operations.js';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tests', 'temp');

describe('File Operations Unit Tests', () => {
  beforeEach(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('writeFile', () => {
    it('should create new files successfully', async () => {
      const filePath = join(TEST_DIR, 'test-write.txt');
      const content = 'Hello, World!';
      
      await writeFile(filePath, content);
      
      expect(existsSync(filePath)).toBe(true);
      const written = await readFile(filePath);
      expect(written).toBe(content);
    });

    it('should overwrite existing files', async () => {
      const filePath = join(TEST_DIR, 'test-overwrite.txt');
      
      await writeFile(filePath, 'Original content');
      await writeFile(filePath, 'New content');
      
      const content = await readFile(filePath);
      expect(content).toBe('New content');
    });

    it('should create parent directories', async () => {
      const filePath = join(TEST_DIR, 'nested', 'deep', 'file.txt');
      
      await writeFile(filePath, 'Nested file content');
      
      expect(existsSync(filePath)).toBe(true);
    });

    it('should handle empty content', async () => {
      const filePath = join(TEST_DIR, 'empty.txt');
      
      await writeFile(filePath, '');
      
      expect(existsSync(filePath)).toBe(true);
      const content = await readFile(filePath);
      expect(content).toBe('');
    });
  });

  describe('appendFile', () => {
    it('should append to existing files', async () => {
      const filePath = join(TEST_DIR, 'test-append.txt');
      
      await writeFile(filePath, 'Line 1\n');
      await appendFile(filePath, 'Line 2\n');
      
      const content = await readFile(filePath);
      expect(content).toBe('Line 1\nLine 2\n');
    });

    it('should create file if it does not exist', async () => {
      const filePath = join(TEST_DIR, 'test-append-new.txt');
      
      await appendFile(filePath, 'First line');
      
      expect(existsSync(filePath)).toBe(true);
      const content = await readFile(filePath);
      expect(content).toBe('First line');
    });
  });

  describe('readFile', () => {
    it('should read file contents correctly', async () => {
      const filePath = join(TEST_DIR, 'test-read.txt');
      const expectedContent = 'Test content for reading';
      
      await writeFile(filePath, expectedContent);
      const content = await readFile(filePath);
      
      expect(content).toBe(expectedContent);
    });

    it('should throw error for non-existent files', async () => {
      const filePath = join(TEST_DIR, 'non-existent.txt');
      
      await expect(readFile(filePath)).rejects.toThrow();
    });

    it('should handle UTF-8 encoding correctly', async () => {
      const filePath = join(TEST_DIR, 'utf8-test.txt');
      const content = 'Unicode: 🚀 ñáéíóú';
      
      await writeFile(filePath, content);
      const readContent = await readFile(filePath);
      
      expect(readContent).toBe(content);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      const filePath = join(TEST_DIR, 'exists-test.txt');
      
      await writeFile(filePath, 'Content');
      const exists = await fileExists(filePath);
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existent files', async () => {
      const filePath = join(TEST_DIR, 'does-not-exist.txt');
      
      const exists = await fileExists(filePath);
      
      expect(exists).toBe(false);
    });

    it('should return false for directories', async () => {
      const exists = await fileExists(TEST_DIR);
      
      expect(exists).toBe(false);
    });
  });
});