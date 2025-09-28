#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Factorial Test Execution Tool');
console.log('═'.repeat(60));

// Helper to run command with streaming output
function runCommandWithStream(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\nExecuting: ${command} ${args.join(' ')}`);
    console.log('─'.repeat(60));

    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    sessionId: '15a78992-cd1e-4d33-a816-ad3b3e6509c3',
    taskId: 'TASK-005',
    testsExecuted: [],
    factorialTestResults: {},
    coverage: {},
    summary: {
      totalExecuted: 0,
      passed: 0,
      failed: 0,
      errors: []
    }
  };

  try {
    // 1. Check if factorial test file exists
    const factorialTestPath = path.join(projectRoot, 'tests/unit/utils/factorial.test.ts');
    const factorialImplPath = path.join(projectRoot, 'tests/utils/factorial-impl.ts');

    console.log('\n📁 Checking test files:');
    console.log(`  Factorial test: ${fs.existsSync(factorialTestPath) ? '✅' : '❌'} ${factorialTestPath}`);
    console.log(`  Factorial impl: ${fs.existsSync(factorialImplPath) ? '✅' : '❌'} ${factorialImplPath}`);

    // 2. Run factorial test specifically
    console.log('\n' + '═'.repeat(60));
    console.log('🧪 RUNNING FACTORIAL TEST');
    console.log('═'.repeat(60));

    const factorialResult = await runCommandWithStream('npx', ['vitest', 'run', 'tests/unit/utils/factorial.test.ts', '--reporter=verbose']);

    report.factorialTestResults = {
      executed: true,
      success: factorialResult.success,
      exitCode: factorialResult.code
    };

    // Parse factorial test output
    if (factorialResult.stdout) {
      const passMatch = factorialResult.stdout.match(/(\d+) passed/);
      const failMatch = factorialResult.stdout.match(/(\d+) failed/);
      const testFileMatch = factorialResult.stdout.match(/✓ tests\/unit\/utils\/factorial\.test\.ts/);

      if (passMatch) {
        report.factorialTestResults.passedCount = parseInt(passMatch[1]);
        report.summary.passed += report.factorialTestResults.passedCount;
      }
      if (failMatch) {
        report.factorialTestResults.failedCount = parseInt(failMatch[1]);
        report.summary.failed += report.factorialTestResults.failedCount;
      }
      report.factorialTestResults.fileDetected = !!testFileMatch;
    }

    // 3. Run all tests to verify overall suite
    console.log('\n' + '═'.repeat(60));
    console.log('🔬 RUNNING COMPLETE TEST SUITE');
    console.log('═'.repeat(60));

    const allTestsResult = await runCommandWithStream('npm', ['test']);

    // Parse all tests output
    if (allTestsResult.stdout) {
      const totalMatch = allTestsResult.stdout.match(/Test Files\s+(\d+)/);
      const passMatch = allTestsResult.stdout.match(/Tests\s+(\d+) passed/);
      const failMatch = allTestsResult.stdout.match(/(\d+) failed/);

      if (totalMatch) report.summary.totalExecuted = parseInt(totalMatch[1]);
      if (passMatch) report.summary.passed = parseInt(passMatch[1]);
      if (failMatch) report.summary.failed = parseInt(failMatch[1]);
    }

    // 4. Run tests with coverage
    console.log('\n' + '═'.repeat(60));
    console.log('📊 GENERATING COVERAGE REPORT');
    console.log('═'.repeat(60));

    const coverageResult = await runCommandWithStream('npm', ['run', 'test:coverage']);

    // Parse coverage output
    if (coverageResult.stdout) {
      // Look for factorial-impl.ts coverage specifically
      const factorialCoverageMatch = coverageResult.stdout.match(/factorial-impl\.ts\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
      if (factorialCoverageMatch) {
        report.coverage.factorial = {
          statements: parseFloat(factorialCoverageMatch[1]),
          branches: parseFloat(factorialCoverageMatch[2]),
          functions: parseFloat(factorialCoverageMatch[3]),
          lines: parseFloat(factorialCoverageMatch[4])
        };
      }

      // Overall coverage
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

    // 5. Generate final report
    console.log('\n' + '═'.repeat(60));
    console.log('📝 TEST EXECUTION REPORT - TASK-005');
    console.log('═'.repeat(60));

    console.log('\n✅ Factorial Test Results:');
    console.log(`  Test file exists: ${fs.existsSync(factorialTestPath) ? 'YES' : 'NO'}`);
    console.log(`  Test executed: ${report.factorialTestResults.executed ? 'YES' : 'NO'}`);
    console.log(`  Test passed: ${report.factorialTestResults.success ? 'YES' : 'NO'}`);
    if (report.factorialTestResults.passedCount !== undefined) {
      console.log(`  Tests passed: ${report.factorialTestResults.passedCount}`);
    }
    if (report.factorialTestResults.failedCount !== undefined) {
      console.log(`  Tests failed: ${report.factorialTestResults.failedCount}`);
    }

    console.log('\n📊 Coverage - factorial-impl.ts:');
    if (report.coverage.factorial) {
      console.log(`  Statements: ${report.coverage.factorial.statements}%`);
      console.log(`  Branches: ${report.coverage.factorial.branches}%`);
      console.log(`  Functions: ${report.coverage.factorial.functions}%`);
      console.log(`  Lines: ${report.coverage.factorial.lines}%`);
    } else {
      console.log('  No specific coverage data found for factorial implementation');
    }

    console.log('\n📈 Overall Test Suite:');
    console.log(`  Total test files: ${report.summary.totalExecuted}`);
    console.log(`  Tests passed: ${report.summary.passed}`);
    console.log(`  Tests failed: ${report.summary.failed}`);

    if (report.coverage.overall) {
      console.log('\n📊 Overall Coverage:');
      console.log(`  Statements: ${report.coverage.overall.statements}%`);
      console.log(`  Branches: ${report.coverage.overall.branches}%`);
      console.log(`  Functions: ${report.coverage.overall.functions}%`);
      console.log(`  Lines: ${report.coverage.overall.lines}%`);
    }

    // Save report
    const reportPath = path.join(projectRoot, 'tests', 'TASK-005-execution-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);

    // Final status
    const success = report.factorialTestResults.success && report.summary.failed === 0;
    console.log('\n' + '═'.repeat(60));
    console.log(success ? '✅ TASK-005 COMPLETED SUCCESSFULLY!' : '⚠️ TASK-005 COMPLETED WITH ISSUES');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error during test execution:', error.message);
    report.summary.errors.push(error.message);
  }

  return report;
}

// Run the test executor
main().catch(console.error);