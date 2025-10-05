#!/usr/bin/env node

/**
 * Test runner specifically for Hello World feature tests
 * Executes all Hello World related tests and generates a report
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface TestReport {
  timestamp: string;
  sessionId: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  suites: TestResult[];
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  summary: string;
}

async function runTests(): Promise<TestReport> {
  console.log('🚀 Starting Hello World Test Suite...\n');

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    sessionId: '20251005-123023',
    totalTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalSkipped: 0,
    totalDuration: 0,
    suites: [],
    summary: ''
  };

  const testFiles = [
    'unit/HelloWorld.test.tsx',
    'unit/hello.test.ts',
    'integration/hello-world-integration.test.tsx',
    'e2e/hello-world-e2e.test.ts'
  ];

  for (const testFile of testFiles) {
    const testPath = path.join(__dirname, testFile);

    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      console.log(`⚠️  Test file not found: ${testFile}`);
      continue;
    }

    console.log(`\n📝 Running: ${testFile}`);

    try {
      // Run the test file with vitest
      const { stdout, stderr } = await execAsync(
        `cd ${__dirname} && npx vitest run ${testFile} --reporter=json`,
        { encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 }
      );

      // Parse test results
      let result: TestResult;
      try {
        const jsonOutput = stdout.match(/\{[\s\S]*\}/)?.[0];
        if (jsonOutput) {
          const parsed = JSON.parse(jsonOutput);
          result = {
            suite: testFile,
            passed: parsed.numPassedTests || 0,
            failed: parsed.numFailedTests || 0,
            skipped: parsed.numPendingTests || 0,
            duration: parsed.testResults?.[0]?.duration || 0,
            errors: []
          };
        } else {
          // Fallback parsing for non-JSON output
          result = parseTestOutput(stdout, testFile);
        }
      } catch (parseError) {
        // Fallback parsing
        result = parseTestOutput(stdout, testFile);
      }

      report.suites.push(result);
      report.totalTests += result.passed + result.failed + result.skipped;
      report.totalPassed += result.passed;
      report.totalFailed += result.failed;
      report.totalSkipped += result.skipped;
      report.totalDuration += result.duration;

      console.log(`  ✅ Passed: ${result.passed}`);
      console.log(`  ❌ Failed: ${result.failed}`);
      console.log(`  ⏭️  Skipped: ${result.skipped}`);
      console.log(`  ⏱️  Duration: ${result.duration}ms`);

    } catch (error) {
      console.error(`  ❌ Error running ${testFile}:`, error);
      report.suites.push({
        suite: testFile,
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : String(error)]
      });
      report.totalFailed += 1;
    }
  }

  // Generate summary
  const passRate = report.totalTests > 0
    ? ((report.totalPassed / report.totalTests) * 100).toFixed(2)
    : '0';

  report.summary = `
Hello World Feature Test Results:
================================
Total Tests: ${report.totalTests}
Passed: ${report.totalPassed}
Failed: ${report.totalFailed}
Skipped: ${report.totalSkipped}
Pass Rate: ${passRate}%
Duration: ${report.totalDuration}ms

Test Coverage:
- Unit Tests: HelloWorld React component and hello API endpoint
- Integration Tests: Component-API interaction
- E2E Tests: Complete workflow validation

${report.totalFailed === 0 ? '✅ All tests passed!' : '⚠️ Some tests failed. Please review the errors.'}
  `.trim();

  return report;
}

function parseTestOutput(output: string, testFile: string): TestResult {
  const result: TestResult = {
    suite: testFile,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    errors: []
  };

  // Parse common test output patterns
  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  const skippedMatch = output.match(/(\d+) skipped/);
  const durationMatch = output.match(/Duration[:\s]+(\d+(?:\.\d+)?)\s*ms/i);

  if (passedMatch) result.passed = parseInt(passedMatch[1], 10);
  if (failedMatch) result.failed = parseInt(failedMatch[1], 10);
  if (skippedMatch) result.skipped = parseInt(skippedMatch[1], 10);
  if (durationMatch) result.duration = parseFloat(durationMatch[1]);

  // Extract error messages
  const errorMatches = output.match(/Error:.*$/gm);
  if (errorMatches) {
    result.errors = errorMatches;
  }

  return result;
}

async function saveReport(report: TestReport): Promise<void> {
  const reportPath = path.join(__dirname, '..', 'reports', report.sessionId, 'hello-world-test-report.json');

  // Create directory if it doesn't exist
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save report
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📊 Report saved to: ${reportPath}`);
}

// Main execution
async function main() {
  try {
    const report = await runTests();

    console.log('\n' + '='.repeat(50));
    console.log(report.summary);
    console.log('='.repeat(50));

    await saveReport(report);

    // Exit with appropriate code
    process.exit(report.totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runTests, TestReport };