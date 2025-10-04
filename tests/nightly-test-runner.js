#!/usr/bin/env node

/**
 * Nightly test runner script for GitHub Actions
 *
 * This script runs the test suite with JSON reporter output for the nightly test workflow.
 * It replaces the incorrect --json flag with the correct --reporter=json flag for Vitest.
 *
 * Usage: node tests/nightly-test-runner.js [outputFile]
 *
 * @param {string} outputFile - Optional path to output JSON results (default: test-results/results.json)
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const outputFile = args[0] || 'test-results/results.json';

// Ensure the output directory exists
const outputDir = path.dirname(outputFile);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Construct the correct Vitest command with JSON reporter
// Note: Vitest uses --reporter=json, not --json
const vitestCommand = `npx vitest run --reporter=json --outputFile=${outputFile}`;

console.log('🧪 Running Vitest with JSON reporter...');
console.log(`Command: ${vitestCommand}`);
console.log(`Output will be saved to: ${outputFile}`);

// Execute the test command
const testProcess = exec(vitestCommand, (error, stdout, stderr) => {
  // Log the output for debugging
  if (stdout) {
    console.log('\n📋 Test Output:');
    console.log(stdout);
  }

  if (stderr) {
    console.error('\n⚠️ Test Errors/Warnings:');
    console.error(stderr);
  }

  // Check if the JSON file was created
  if (fs.existsSync(outputFile)) {
    try {
      const results = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

      // Extract test statistics for summary
      const stats = {
        numTotalTests: results.numTotalTests || 0,
        numPassedTests: results.numPassedTests || 0,
        numFailedTests: results.numFailedTests || 0,
        numPendingTests: results.numPendingTests || 0,
        numTodoTests: results.numTodoTests || 0,
        success: results.success || false
      };

      console.log('\n📊 Test Summary:');
      console.log(`Total Tests: ${stats.numTotalTests}`);
      console.log(`✅ Passed: ${stats.numPassedTests}`);
      console.log(`❌ Failed: ${stats.numFailedTests}`);
      console.log(`⏭️ Pending: ${stats.numPendingTests}`);
      console.log(`📝 Todo: ${stats.numTodoTests}`);
      console.log(`\nStatus: ${stats.success ? '✅ All tests passed' : '❌ Tests failed'}`);

      // Exit with appropriate code
      process.exit(stats.success ? 0 : 1);
    } catch (parseError) {
      console.error('\n❌ Error parsing test results JSON:', parseError.message);
      // If we can't parse the results but the file exists, check the exit code
      process.exit(error ? error.code : 1);
    }
  } else {
    console.error(`\n❌ Test results file not created at: ${outputFile}`);
    // Exit with the test process exit code or 1 if there was an error
    process.exit(error ? error.code : 1);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Test run interrupted');
  testProcess.kill('SIGINT');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Test run terminated');
  testProcess.kill('SIGTERM');
  process.exit(143);
});