#!/usr/bin/env node

/**
 * Simple test runner for string-reverse utilities
 * This script executes the vitest runner specifically for our string-reverse tests
 */

const { spawn } = require('child_process');
const path = require('path');

// Define the test file path
const testFile = path.join(__dirname, 'unit/utils/string-reverse.test.ts');

console.log('🧪 Running String Reverse Utility Tests...\n');
console.log(`Test file: ${testFile}\n`);
console.log('=' .repeat(60));

// Run vitest with the specific test file
const vitestProcess = spawn('npx', ['vitest', 'run', testFile], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
});

vitestProcess.on('close', (code) => {
  console.log('=' .repeat(60));
  if (code === 0) {
    console.log('\n✅ All tests passed successfully!');
    console.log('The string reversal utility functions are working correctly.\n');
  } else {
    console.log(`\n❌ Tests failed with exit code: ${code}`);
    console.log('Please check the test output above for details.\n');
  }
  process.exit(code);
});

vitestProcess.on('error', (error) => {
  console.error('Failed to start test process:', error);
  process.exit(1);
});