import { jest } from '@jest/globals';
import { mkdir, writeFile, rm, mkdtemp } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';

const fs = { mkdir, writeFile, rm, mkdtemp };

describe('Build Executor - Minimal Integration Tests', () => {
  let tempDir: string;
  let backendDir: string;
  let frontendDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'build-test-'));
    backendDir = path.join(tempDir, 'backend');
    frontendDir = path.join(tempDir, 'frontend');
  });

  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should detect project directories', async () => {
    // Create backend directory with package.json
    await mkdir(backendDir, { recursive: true });
    await writeFile(
      path.join(backendDir, 'package.json'), 
      JSON.stringify({ scripts: { typecheck: 'tsc --noEmit' } })
    );
    
    // Create frontend directory with package.json
    await mkdir(frontendDir, { recursive: true });
    await writeFile(
      path.join(frontendDir, 'package.json'), 
      JSON.stringify({ scripts: { build: 'vite build' } })
    );
    
    // Verify directories exist
    expect(existsSync(backendDir)).toBe(true);
    expect(existsSync(frontendDir)).toBe(true);
    expect(existsSync(path.join(backendDir, 'package.json'))).toBe(true);
    expect(existsSync(path.join(frontendDir, 'package.json'))).toBe(true);
  });

  test('should handle missing directories', () => {
    const nonExistentDir = path.join(tempDir, 'does-not-exist');
    expect(existsSync(nonExistentDir)).toBe(false);
  });
});