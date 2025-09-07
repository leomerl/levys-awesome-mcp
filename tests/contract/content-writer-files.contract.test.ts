import { describe, it, expect, afterAll } from 'vitest';
import { existsSync } from 'fs';
import { readFile, rm } from 'fs/promises';
import * as path from 'path';
import { handleContentWriterTool } from '../../src/handlers/content-writer.js';

describe('Content Writer File Operations', () => {
  const frontendTestDir = path.resolve('frontend', 'contract-tests');
  const backendTestDir = path.resolve('backend', 'contract-tests');

  afterAll(async () => {
    await rm(frontendTestDir, { recursive: true, force: true });
    await rm(backendTestDir, { recursive: true, force: true });
  });

  it('writes and reads files in frontend directory', async () => {
    const filePath = path.join('contract-tests', 'test.tsx');
    const content = 'export const Button = () => <button>Click me</button>;';

    await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
      file_path: filePath,
      content
    });

    const fullPath = path.resolve('frontend', filePath);
    expect(existsSync(fullPath)).toBe(true);
    const readContent = await readFile(fullPath, 'utf8');
    expect(readContent).toBe(content);
  });

  it('writes and reads files in backend directory', async () => {
    const filePath = path.join('contract-tests', 'server.js');
    const content = 'const express = require("express");';

    await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__backend_write', {
      file_path: filePath,
      content
    });

    const fullPath = path.resolve('backend', filePath);
    expect(existsSync(fullPath)).toBe(true);
    const readContent = await readFile(fullPath, 'utf8');
    expect(readContent).toBe(content);
  });

  it('creates nested directory structure', async () => {
    const nestedPath = path.join('contract-tests', 'src', 'components', 'Header.tsx');

    await handleContentWriterTool('mcp__levys-awesome-mcp__mcp__content-writer__frontend_write', {
      file_path: nestedPath,
      content: 'export const Header = () => <header>App</header>;'
    });

    const fullPath = path.resolve('frontend', nestedPath);
    expect(existsSync(fullPath)).toBe(true);
  });
});
