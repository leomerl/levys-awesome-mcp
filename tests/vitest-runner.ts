#!/usr/bin/env node
/**
 * Direct Vitest Test Runner
 * Session: ca7259c1-c8c1-447c-a67d-70b529f461bb
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface TestResult {
  suite: string;
  passed: boolean;
  output: string;
  error?: string;
}

function runCommand(command: string, args: string[]): Promise<TestResult> {
  return new Promise((resolve) => {
    console.log(`\n🔧 Executing: ${command} ${args.join(' ')}`);

    const proc = spawn(command, args, {
      cwd: '/home/gofri/projects/levys-awesome-mcp',
      shell: true,
      stdio: 'pipe'
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
    });

    proc.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });

    proc.on('close', (code) => {
      resolve({
        suite: args.join(' '),
        passed: code === 0,
        output: stdout,
        error: stderr || undefined
      });
    });

    proc.on('error', (error) => {
      resolve({
        suite: args.join(' '),
        passed: false,
        output: stdout,
        error: error.message
      });
    });
  });
}

async function main() {
  const sessionId = 'ca7259c1-c8c1-447c-a67d-70b529f461bb';
  const timestamp = new Date().toISOString();

  console.log('═'.repeat(70));
  console.log(' VITEST TEST EXECUTION');
  console.log('═'.repeat(70));
  console.log(`Session: ${sessionId}`);
  console.log(`Started: ${timestamp}\n`);

  const results: TestResult[] = [];

  // Run all tests
  console.log('📋 Step 1: Running all tests...');
  const allTests = await runCommand('npx', ['vitest', 'run']);
  results.push(allTests);

  // Run calculator tests specifically
  console.log('\n📋 Step 2: Running calculator tests specifically...');
  const calcTests = await runCommand('npx', ['vitest', 'run', 'tests/unit/utils/calculator.test.ts']);
  results.push(calcTests);

  // Try coverage (may fail if not configured)
  console.log('\n📋 Step 3: Attempting coverage report...');
  const coverage = await runCommand('npx', ['vitest', 'run', '--coverage']);
  results.push(coverage);

  // Generate report
  const report = {
    timestamp,
    sessionId,
    testsWritten: {
      unit: ['tests/unit/utils/calculator.test.ts'],
      integration: [],
      e2e: []
    },
    coverage: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    },
    results: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    },
    calculatorTestStatus: calcTests.passed ? 'PASSED' : 'FAILED',
    allTestsPassed: allTests.passed,
    testedBehaviors: [
      'Calculator utility - Addition operations',
      'Calculator utility - Subtraction operations',
      'Calculator utility - Decimal handling',
      'Calculator utility - Edge cases',
      'Calculator utility - Mathematical properties'
    ],
    uncoveredAreas: [],
    recommendations: []
  };

  // Parse test counts from output
  const parseResults = (output: string) => {
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const skipMatch = output.match(/(\d+) skipped/);

    return {
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      skipped: skipMatch ? parseInt(skipMatch[1]) : 0
    };
  };

  const counts = parseResults(allTests.output);
  report.results.passed = counts.passed;
  report.results.failed = counts.failed;
  report.results.skipped = counts.skipped;
  report.results.total = counts.passed + counts.failed + counts.skipped;

  // Generate recommendations
  if (report.results.failed > 0) {
    report.recommendations.push(`Fix ${report.results.failed} failing tests`);
  }
  if (report.calculatorTestStatus === 'FAILED') {
    report.recommendations.push('Review and fix calculator utility test failures');
  }
  if (report.allTestsPassed && report.calculatorTestStatus === 'PASSED') {
    report.recommendations.push('All tests passing successfully! Ready for deployment.');
  }

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log(' TEST EXECUTION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n✅ Overall Status: ${report.allTestsPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`📊 Test Results: ${report.results.passed} passed, ${report.results.failed} failed, ${report.results.skipped} skipped`);
  console.log(`🧮 Calculator Tests: ${report.calculatorTestStatus}`);

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(r => console.log(`   - ${r}`));
  }

  // Save report
  const reportsDir = path.join('/home/gofri/projects/levys-awesome-mcp', 'reports', sessionId);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, 'vitest-execution-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Report saved to: ${reportPath}`);
  console.log('═'.repeat(70));

  process.exit(report.allTestsPassed ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});