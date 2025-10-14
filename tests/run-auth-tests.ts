#!/usr/bin/env node
/**
 * Simple script to run only the auth tests
 */

import { execSync } from 'child_process';

console.log('Running auth tests...\n');

try {
  // Run unit tests
  console.log('Running unit tests...');
  execSync('npx vitest run tests/unit/auth.test.ts', {
    stdio: 'inherit',
    encoding: 'utf8'
  });

  // Run integration tests
  console.log('\nRunning integration tests...');
  execSync('npx vitest run tests/integration/auth.integration.test.ts', {
    stdio: 'inherit',
    encoding: 'utf8'
  });

  console.log('\n✅ All auth tests passed!');
} catch (error) {
  console.error('\n❌ Auth tests failed');
  process.exit(1);
}