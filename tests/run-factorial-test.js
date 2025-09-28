#!/usr/bin/env node

import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFile = join(__dirname, 'unit/utils/factorial.test.ts');

console.log('Running factorial tests...\n');

exec(`npx vitest run ${testFile}`, (error, stdout, stderr) => {
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  if (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
});