#!/usr/bin/env node

/**
 * CLI wrapper to invoke agents via MCP
 * Usage: node invoke-agent-cli.js <agentName> <prompt>
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const agentName = process.argv[2];
const prompt = process.argv[3];

if (!agentName || !prompt) {
  console.error('Usage: node invoke-agent-cli.js <agentName> <prompt>');
  process.exit(1);
}

// Use claude-code query to invoke the agent
const projectRoot = path.resolve(__dirname, '..');
const codeProcess = spawn(
  'npx',
  [
    '-y',
    'claude-code',
    'query',
    '--agent', agentName,
    '--prompt', prompt
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env
  }
);

codeProcess.on('error', (error) => {
  console.error('Failed to invoke agent:', error);
  process.exit(1);
});

codeProcess.on('exit', (code) => {
  process.exit(code || 0);
});
