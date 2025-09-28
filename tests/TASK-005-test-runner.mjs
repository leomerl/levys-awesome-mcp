#!/usr/bin/env node

/**
 * TASK-005 Test Execution and Coverage Report Generator
 * This script runs all tests including the factorial tests and generates a comprehensive report
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Session ID from the task
const SESSION_ID = '15a78992-cd1e-4d33-a816-ad3b3e6509c3';
const TASK_ID = 'TASK-005';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           TASK-005: Test Suite Execution Report            ║
║                                                             ║
║  Session: ${SESSION_ID.substring(0, 8)}...  ║
╚═══════════════════════════════════════════════════════════╝
`);

// Helper function to run command and capture output
function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${description}`);
    console.log(`  Command: ${command} ${args.join(' ')}`);
    console.log('─'.repeat(60));

    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      console.log('─'.repeat(60));
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function executeTests() {
  const report = {
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
    taskId: TASK_ID,
    description: 'Execute test suite and verify factorial tests with coverage',
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cwd: projectRoot
    },
    files: {
      factorialTest: null,
      factorialImpl: null
    },
    testResults: {
      all: null,
      factorial: null,
      coverage: null
    },
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: null
    },
    coverage: {
      overall: null,
      factorial: null
    },
    status: 'pending'
  };

  const startTime = Date.now();

  try {
    // 1. Verify test files exist
    console.log('\n📁 STEP 1: Verifying Test Files');
    console.log('─'.repeat(60));

    const factorialTestPath = path.join(__dirname, 'unit/utils/factorial.test.ts');
    const factorialImplPath = path.join(__dirname, 'utils/factorial-impl.ts');

    report.files.factorialTest = {
      path: factorialTestPath,
      exists: fs.existsSync(factorialTestPath),
      size: fs.existsSync(factorialTestPath) ? fs.statSync(factorialTestPath).size : 0
    };

    report.files.factorialImpl = {
      path: factorialImplPath,
      exists: fs.existsSync(factorialImplPath),
      size: fs.existsSync(factorialImplPath) ? fs.statSync(factorialImplPath).size : 0
    };

    console.log(`✅ Factorial test: ${report.files.factorialTest.exists ? 'EXISTS' : 'MISSING'} (${report.files.factorialTest.size} bytes)`);
    console.log(`✅ Factorial impl: ${report.files.factorialImpl.exists ? 'EXISTS' : 'MISSING'} (${report.files.factorialImpl.size} bytes)`);

    // Count test cases in factorial test
    if (report.files.factorialTest.exists) {
      const testContent = fs.readFileSync(factorialTestPath, 'utf-8');
      const itCount = (testContent.match(/it\s*\(/g) || []).length;
      const describeCount = (testContent.match(/describe\s*\(/g) || []).length;
      console.log(`📊 Factorial test structure: ${describeCount} suites, ${itCount} test cases`);
    }

    // 2. Run factorial tests specifically
    console.log('\n🔬 STEP 2: Running Factorial Tests');
    const factorialResult = await runCommand('npx', ['vitest', 'run', 'tests/unit/utils/factorial.test.ts'], 'Factorial test execution');

    report.testResults.factorial = {
      executed: true,
      success: factorialResult.success,
      exitCode: factorialResult.code
    };

    // Parse factorial test output
    if (factorialResult.stdout) {
      const passMatch = factorialResult.stdout.match(/(\d+)\s+passed/);
      const failMatch = factorialResult.stdout.match(/(\d+)\s+failed/);
      const durationMatch = factorialResult.stdout.match(/Duration\s+([\d.]+)ms/);

      if (passMatch) report.testResults.factorial.passed = parseInt(passMatch[1]);
      if (failMatch) report.testResults.factorial.failed = parseInt(failMatch[1]);
      if (durationMatch) report.testResults.factorial.duration = parseFloat(durationMatch[1]);
    }

    // 3. Run all tests
    console.log('\n🧪 STEP 3: Running Complete Test Suite');
    const allTestsResult = await runCommand('npm', ['test'], 'Complete test suite execution');

    report.testResults.all = {
      executed: true,
      success: allTestsResult.success,
      exitCode: allTestsResult.code
    };

    // Parse all tests output
    if (allTestsResult.stdout) {
      // Look for test summary in vitest output
      const filesMatch = allTestsResult.stdout.match(/Test Files\s+(\d+)\s+passed/);
      const testsMatch = allTestsResult.stdout.match(/Tests\s+(\d+)\s+passed/);
      const failedMatch = allTestsResult.stdout.match(/(\d+)\s+failed/);
      const skippedMatch = allTestsResult.stdout.match(/(\d+)\s+skipped/);
      const durationMatch = allTestsResult.stdout.match(/Duration\s+([\d.]+)ms/);

      if (testsMatch) report.summary.passed = parseInt(testsMatch[1]);
      if (failedMatch) report.summary.failed = parseInt(failedMatch[1]);
      if (skippedMatch) report.summary.skipped = parseInt(skippedMatch[1]);
      if (durationMatch) report.summary.duration = parseFloat(durationMatch[1]);

      report.summary.totalTests = report.summary.passed + report.summary.failed + report.summary.skipped;
    }

    // 4. Run tests with coverage
    console.log('\n📊 STEP 4: Generating Coverage Report');
    const coverageResult = await runCommand('npm', ['run', 'test:coverage'], 'Coverage report generation');

    report.testResults.coverage = {
      executed: true,
      success: coverageResult.success,
      exitCode: coverageResult.code
    };

    // Parse coverage output
    if (coverageResult.stdout) {
      // Look for factorial-impl.ts coverage
      const factorialCovMatch = coverageResult.stdout.match(/factorial-impl\.ts\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      if (factorialCovMatch) {
        report.coverage.factorial = {
          statements: parseFloat(factorialCovMatch[1]),
          branches: parseFloat(factorialCovMatch[2]),
          functions: parseFloat(factorialCovMatch[3]),
          lines: parseFloat(factorialCovMatch[4])
        };
      }

      // Look for overall coverage
      const overallMatch = coverageResult.stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      if (overallMatch) {
        report.coverage.overall = {
          statements: parseFloat(overallMatch[1]),
          branches: parseFloat(overallMatch[2]),
          functions: parseFloat(overallMatch[3]),
          lines: parseFloat(overallMatch[4])
        };
      }
    }

    // 5. Determine overall status
    report.status = report.summary.failed === 0 && report.testResults.factorial?.success ? 'success' : 'failure';

    const endTime = Date.now();
    report.executionTime = endTime - startTime;

    // 6. Display summary
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    EXECUTION SUMMARY                       ║
╚═══════════════════════════════════════════════════════════╝

📊 Test Results:
  • Total Tests: ${report.summary.totalTests}
  • Passed: ${report.summary.passed}
  • Failed: ${report.summary.failed}
  • Skipped: ${report.summary.skipped}
  • Duration: ${report.summary.duration ? report.summary.duration + 'ms' : 'N/A'}

🎯 Factorial Test:
  • Status: ${report.testResults.factorial?.success ? '✅ PASSED' : '❌ FAILED'}
  • Tests Passed: ${report.testResults.factorial?.passed || 0}
  • Tests Failed: ${report.testResults.factorial?.failed || 0}

📈 Coverage - factorial-impl.ts:
  ${report.coverage.factorial ? `• Statements: ${report.coverage.factorial.statements}%
  • Branches: ${report.coverage.factorial.branches}%
  • Functions: ${report.coverage.factorial.functions}%
  • Lines: ${report.coverage.factorial.lines}%` : '• No coverage data available'}

📊 Overall Coverage:
  ${report.coverage.overall ? `• Statements: ${report.coverage.overall.statements}%
  • Branches: ${report.coverage.overall.branches}%
  • Functions: ${report.coverage.overall.functions}%
  • Lines: ${report.coverage.overall.lines}%` : '• No coverage data available'}

⏱️ Total Execution Time: ${report.executionTime}ms

📋 Overall Status: ${report.status === 'success' ? '✅ SUCCESS' : '❌ FAILURE'}
`);

    // 7. Save report
    const reportPath = path.join(__dirname, `TASK-005-final-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    return report;

  } catch (error) {
    console.error('\n❌ Error during test execution:', error);
    report.status = 'error';
    report.error = error.message;
    return report;
  }
}

// Execute the test suite
executeTests()
  .then((report) => {
    process.exit(report.status === 'success' ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });