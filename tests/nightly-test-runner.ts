#!/usr/bin/env npx tsx

/**
 * Nightly test runner script for GitHub Actions (TypeScript version)
 *
 * This script runs the test suite with JSON reporter output for the nightly test workflow.
 * It correctly uses --reporter=json flag for Vitest instead of the invalid --json flag.
 *
 * Usage: npx tsx tests/nightly-test-runner.ts [outputFile]
 *
 * @param {string} outputFile - Optional path to output JSON results (default: test-results/results.json)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface VitestResults {
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  success?: boolean;
  testResults?: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    assertionResults?: Array<{
      title: string;
      status: 'passed' | 'failed' | 'skipped';
      failureMessages?: string[];
    }>;
  }>;
}

async function runNightlyTests(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const outputFile = args[0] || 'test-results/results.json';

  // Ensure the output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Construct the correct Vitest command with JSON reporter
  // IMPORTANT: Vitest uses --reporter=json, not --json
  const vitestCommand = `npx vitest run --reporter=json --outputFile=${outputFile}`;

  console.log('🧪 Running Vitest with JSON reporter...');
  console.log(`Command: ${vitestCommand}`);
  console.log(`Output will be saved to: ${outputFile}`);

  try {
    // Execute the test command
    const { stdout, stderr } = await execAsync(vitestCommand);

    // Log the output for debugging
    if (stdout) {
      console.log('\n📋 Test Output:');
      console.log(stdout);
    }

    if (stderr) {
      console.error('\n⚠️ Test Warnings:');
      console.error(stderr);
    }

    await processTestResults(outputFile);
  } catch (error: any) {
    // Even if the command fails (tests fail), the JSON should be generated
    console.error('\n⚠️ Test execution failed with exit code:', error.code);

    // Still try to process the results if the file was created
    if (fs.existsSync(outputFile)) {
      await processTestResults(outputFile);
    } else {
      console.error(`❌ Test results file not created at: ${outputFile}`);
      process.exit(error.code || 1);
    }
  }
}

async function processTestResults(outputFile: string): Promise<void> {
  try {
    const resultsContent = fs.readFileSync(outputFile, 'utf8');
    const results: VitestResults = JSON.parse(resultsContent);

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

    // List failed tests if any
    if (stats.numFailedTests > 0 && results.testResults) {
      console.log('\n❌ Failed Tests:');
      for (const testFile of results.testResults) {
        if (testFile.status === 'failed' && testFile.assertionResults) {
          console.log(`\n  📁 ${testFile.name}`);
          for (const assertion of testFile.assertionResults) {
            if (assertion.status === 'failed') {
              console.log(`    ❌ ${assertion.title}`);
              if (assertion.failureMessages?.length) {
                for (const message of assertion.failureMessages) {
                  console.log(`       ${message.split('\n')[0]}`); // First line only
                }
              }
            }
          }
        }
      }
    }

    // Create a more detailed summary file for GitHub Actions
    const summaryPath = path.join(path.dirname(outputFile), 'test-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      stats,
      exitCode: stats.success ? 0 : 1,
      outputFile
    };
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Detailed summary saved to: ${summaryPath}`);

    // Exit with appropriate code
    process.exit(stats.success ? 0 : 1);
  } catch (parseError: any) {
    console.error('\n❌ Error parsing test results JSON:', parseError.message);
    console.error('Raw content preview:');
    try {
      const content = fs.readFileSync(outputFile, 'utf8');
      console.error(content.substring(0, 500) + '...');
    } catch (readError) {
      console.error('Could not read file for debugging');
    }
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️ Test run interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Test run terminated');
  process.exit(143);
});

// Run the tests
runNightlyTests().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});