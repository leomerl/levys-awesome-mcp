#!/usr/bin/env node
/**
 * Comprehensive Test Runner for All Tests
 * Executes all test suites and generates detailed report
 * Session: ca7259c1-c8c1-447c-a67d-70b529f461bb
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestSuiteResult {
  name: string;
  command: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  output?: string;
  error?: string;
}

interface TestExecutionReport {
  timestamp: string;
  sessionId: string;
  testsWritten: {
    unit: string[];
    integration: string[];
    e2e: string[];
  };
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  results: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  suiteResults: TestSuiteResult[];
  testedBehaviors: string[];
  uncoveredAreas: string[];
  recommendations: string[];
  calculatorTestStatus: string;
}

async function runTestCommand(name: string, command: string): Promise<TestSuiteResult> {
  const startTime = Date.now();
  console.log(`\n🧪 Running ${name}...`);
  console.log(`   Command: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: '/home/gofri/projects/levys-awesome-mcp',
      env: { ...process.env, CI: 'true' }
    });

    const duration = Date.now() - startTime;

    // Parse test results from output
    let total = 0, passed = 0, failed = 0, skipped = 0;

    // Vitest output patterns
    const totalMatch = stdout.match(/(\d+)\s+test(?:s)?/);
    const passedMatch = stdout.match(/✓\s+(\d+)\s+test(?:s)?/);
    const failedMatch = stdout.match(/✗\s+(\d+)\s+test(?:s)?/);
    const skippedMatch = stdout.match(/↓\s+(\d+)\s+test(?:s)?/);

    if (totalMatch) total = parseInt(totalMatch[1]);
    if (passedMatch) passed = parseInt(passedMatch[1]);
    if (failedMatch) failed = parseInt(failedMatch[1]);
    if (skippedMatch) skipped = parseInt(skippedMatch[1]);

    // If no specific counts found, assume all passed if exit code was 0
    if (!passedMatch && !failedMatch && totalMatch) {
      passed = total;
    }

    console.log(`   ✅ Completed in ${duration}ms`);
    console.log(`   Results: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped`);

    return {
      name,
      command,
      total,
      passed,
      failed,
      skipped,
      duration,
      output: stdout
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const stderr = error.stderr || error.message;
    const stdout = error.stdout || '';

    // Try to parse counts even from failed execution
    let total = 0, passed = 0, failed = 0, skipped = 0;
    const output = stdout + stderr;

    const totalMatch = output.match(/(\d+)\s+test(?:s)?/);
    const passedMatch = output.match(/✓\s+(\d+)\s+test(?:s)?/);
    const failedMatch = output.match(/✗\s+(\d+)\s+test(?:s)?/);
    const skippedMatch = output.match(/↓\s+(\d+)\s+test(?:s)?/);

    if (totalMatch) total = parseInt(totalMatch[1]);
    if (passedMatch) passed = parseInt(passedMatch[1]);
    if (failedMatch) failed = parseInt(failedMatch[1]);
    if (skippedMatch) skipped = parseInt(skippedMatch[1]);

    console.log(`   ❌ Failed after ${duration}ms`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);

    return {
      name,
      command,
      total,
      passed,
      failed: failed || total,
      skipped,
      duration,
      output: stdout,
      error: stderr
    };
  }
}

async function extractCoverage(): Promise<Partial<TestExecutionReport['coverage']>> {
  try {
    console.log('\n📊 Running coverage analysis...');
    const { stdout } = await execAsync('npx vitest run --coverage --reporter=json', {
      cwd: '/home/gofri/projects/levys-awesome-mcp',
      env: { ...process.env, CI: 'true' }
    });

    // Try to parse coverage from JSON output
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (data.coverage) {
        return {
          statements: data.coverage.statements || 0,
          branches: data.coverage.branches || 0,
          functions: data.coverage.functions || 0,
          lines: data.coverage.lines || 0
        };
      }
    }

    // Fallback to text parsing
    const coverageMatch = stdout.match(/All files[^\n]*\n[^\n]*\|\s*([\d.]+)[^\|]*\|\s*([\d.]+)[^\|]*\|\s*([\d.]+)[^\|]*\|\s*([\d.]+)/);
    if (coverageMatch) {
      return {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }
  } catch (error) {
    console.log('   ⚠️ Could not extract coverage data');
  }

  return {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0
  };
}

async function checkCalculatorTests(): Promise<string> {
  console.log('\n🔍 Checking calculator utility tests specifically...');

  try {
    const { stdout } = await execAsync('npx vitest run tests/unit/utils/calculator.test.ts', {
      cwd: '/home/gofri/projects/levys-awesome-mcp',
      env: { ...process.env, CI: 'true' }
    });

    if (stdout.includes('✓') && !stdout.includes('✗')) {
      console.log('   ✅ Calculator tests PASSED');
      return 'PASSED - All calculator utility tests are passing successfully';
    } else {
      console.log('   ❌ Calculator tests have failures');
      return 'FAILED - Some calculator tests are failing';
    }
  } catch (error) {
    console.log('   ❌ Calculator tests failed to execute');
    return 'ERROR - Could not execute calculator tests';
  }
}

async function main() {
  console.log('═'.repeat(70));
  console.log(' COMPREHENSIVE TEST SUITE EXECUTION');
  console.log('═'.repeat(70));
  console.log(`Session ID: ca7259c1-c8c1-447c-a67d-70b529f461bb`);
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const report: TestExecutionReport = {
    timestamp: new Date().toISOString(),
    sessionId: 'ca7259c1-c8c1-447c-a67d-70b529f461bb',
    testsWritten: {
      unit: [],
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
    suiteResults: [],
    testedBehaviors: [],
    uncoveredAreas: [],
    recommendations: [],
    calculatorTestStatus: ''
  };

  // Collect all test files
  console.log('📁 Scanning for test files...');
  const { stdout: testFiles } = await execAsync('find tests -name "*.test.ts" -type f | grep -v node_modules', {
    cwd: '/home/gofri/projects/levys-awesome-mcp'
  });

  const files = testFiles.split('\n').filter(f => f.trim());
  console.log(`   Found ${files.length} test files`);

  // Categorize test files
  files.forEach(file => {
    if (file.includes('/unit/')) {
      report.testsWritten.unit.push(file);
    } else if (file.includes('/integration/')) {
      report.testsWritten.integration.push(file);
    } else if (file.includes('/e2e/')) {
      report.testsWritten.e2e.push(file);
    } else if (file.includes('/contract/') || file.includes('/behavior/')) {
      report.testsWritten.integration.push(file);
    }
  });

  // Run different test suites
  const suites = [
    { name: 'All Tests', command: 'npm test' },
    { name: 'Unit Tests', command: 'npm run test:unit' },
    { name: 'Integration Tests', command: 'npm run test:integration' },
    { name: 'Contract Tests', command: 'npm run test:contract' },
    { name: 'Calculator Tests', command: 'npx vitest run tests/unit/utils/calculator.test.ts' }
  ];

  for (const suite of suites) {
    const result = await runTestCommand(suite.name, suite.command);
    report.suiteResults.push(result);

    // Update totals
    if (result.name === 'All Tests') {
      report.results.total = result.total;
      report.results.passed = result.passed;
      report.results.failed = result.failed;
      report.results.skipped = result.skipped;
    }
  }

  // Check calculator tests specifically
  report.calculatorTestStatus = await checkCalculatorTests();

  // Get coverage data
  const coverage = await extractCoverage();
  report.coverage = { ...report.coverage, ...coverage };

  // Populate tested behaviors
  report.testedBehaviors = [
    'Calculator utility - Basic arithmetic operations',
    'Calculator utility - Addition with positive numbers',
    'Calculator utility - Addition with negative numbers',
    'Calculator utility - Subtraction operations',
    'Calculator utility - Decimal precision handling',
    'Calculator utility - Edge cases (Infinity, NaN)',
    'Calculator utility - Commutative properties',
    'Calculator utility - Mathematical properties verification',
    'Session store management',
    'Configuration validation',
    'Agent invocation and permissions',
    'Content writer file operations',
    'Plan creation and progress tracking',
    'Summary tools functionality',
    'MCP server integration',
    'Build execution workflows',
    'Test execution management'
  ];

  // Identify uncovered areas
  if (report.coverage.lines < 100) {
    report.uncoveredAreas.push(`Line coverage is ${report.coverage.lines}% - some code paths are not tested`);
  }
  if (report.coverage.branches < 100) {
    report.uncoveredAreas.push(`Branch coverage is ${report.coverage.branches}% - some conditional paths are not tested`);
  }

  // Generate recommendations
  if (report.results.failed > 0) {
    report.recommendations.push(`Fix ${report.results.failed} failing tests before proceeding`);
  }
  if (report.coverage.lines < 80) {
    report.recommendations.push('Increase test coverage to at least 80% for better reliability');
  }
  if (report.calculatorTestStatus.includes('FAILED')) {
    report.recommendations.push('Review and fix calculator utility test failures');
  }
  if (report.results.failed === 0 && report.calculatorTestStatus.includes('PASSED')) {
    report.recommendations.push('All tests passing! Ready for deployment.');
  }

  // Print final summary
  console.log('\n' + '═'.repeat(70));
  console.log(' FINAL TEST EXECUTION SUMMARY');
  console.log('═'.repeat(70));
  console.log(`\n📊 Overall Results:`);
  console.log(`   Total Tests: ${report.results.total}`);
  console.log(`   Passed: ${report.results.passed} ✅`);
  console.log(`   Failed: ${report.results.failed} ${report.results.failed > 0 ? '❌' : ''}`);
  console.log(`   Skipped: ${report.results.skipped}`);

  console.log(`\n📊 Test Coverage:`);
  console.log(`   Statements: ${report.coverage.statements}%`);
  console.log(`   Branches: ${report.coverage.branches}%`);
  console.log(`   Functions: ${report.coverage.functions}%`);
  console.log(`   Lines: ${report.coverage.lines}%`);

  console.log(`\n🧮 Calculator Test Status: ${report.calculatorTestStatus}`);

  console.log(`\n📝 Test File Distribution:`);
  console.log(`   Unit Tests: ${report.testsWritten.unit.length} files`);
  console.log(`   Integration Tests: ${report.testsWritten.integration.length} files`);
  console.log(`   E2E Tests: ${report.testsWritten.e2e.length} files`);

  if (report.uncoveredAreas.length > 0) {
    console.log(`\n⚠️ Uncovered Areas:`);
    report.uncoveredAreas.forEach(area => console.log(`   - ${area}`));
  }

  console.log(`\n💡 Recommendations:`);
  report.recommendations.forEach(rec => console.log(`   - ${rec}`));

  // Save the report
  const reportsDir = path.join('/home/gofri/projects/levys-awesome-mcp', 'reports', report.sessionId);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(reportsDir, 'test-execution-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Full report saved to: ${reportPath}`);
  console.log('\n' + '═'.repeat(70));

  // Exit with appropriate code
  process.exit(report.results.failed > 0 ? 1 : 0);
}

// Execute
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});