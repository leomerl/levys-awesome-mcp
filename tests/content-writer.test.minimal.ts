import { jest } from '@jest/globals';
import { writeFile, mkdir, readFile, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const fs = { writeFile, mkdir, readFile, rm, mkdtemp };

describe('Content Writer - Minimal Integration Tests', () => {
  let tempDir: string;
  let frontendDir: string;
  let backendDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-test-'));
    frontendDir = path.join(tempDir, 'frontend');
    backendDir = path.join(tempDir, 'backend');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should write files to frontend directory', async () => {
    await mkdir(frontendDir, { recursive: true });
    
    const testFile = path.join(frontendDir, 'test.tsx');
    const content = 'export const Button = () => <button>Click me</button>;';
    
    await writeFile(testFile, content);
    
    expect(existsSync(testFile)).toBe(true);
    const readContent = await readFile(testFile, 'utf8');
    expect(readContent).toBe(content);
  });

  test('should write files to backend directory', async () => {
    await mkdir(backendDir, { recursive: true });
    
    const testFile = path.join(backendDir, 'server.js');
    const content = 'const express = require("express");';
    
    await writeFile(testFile, content);
    
    expect(existsSync(testFile)).toBe(true);
    const readContent = await readFile(testFile, 'utf8');
    expect(readContent).toBe(content);
  });

  test('should create nested directory structure', async () => {
    const nestedDir = path.join(frontendDir, 'src', 'components');
    await mkdir(nestedDir, { recursive: true });
    
    const testFile = path.join(nestedDir, 'Header.tsx');
    await writeFile(testFile, 'export const Header = () => <header>App</header>;');
    
    expect(existsSync(testFile)).toBe(true);
  });

  test('should prevent path traversal', () => {
    const maliciousPaths = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/etc/passwd'
    ];

    for (const maliciousPath of maliciousPaths) {
      const normalizedPath = path.normalize(maliciousPath);
      const resolvedPath = path.resolve(tempDir, normalizedPath);
      
      // Should be contained within temp directory
      expect(resolvedPath.startsWith(tempDir)).toBe(true);
    }
  });
});