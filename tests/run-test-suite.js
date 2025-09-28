#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('📊 Starting comprehensive test execution...\n');

// Function to run a command and capture output
function runCommand(command, description) {
  console.log(`\n🔧 ${description}`);
  console.log(`   Command: ${command}`);
  console.log('─'.repeat(60));

  try {
    const output = execSync(command, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return { success: false, error: error.message, output: error.stdout?.toString() || '' };
  }
}

// Main test execution
async function runTests() {
  const results = {
    timestamp: new Date().toISOString(),
    sessionId: '15a78992-cd1e-4d33-a816-ad3b3e6509c3',
    tests: {},
    coverage: null,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    }
  };

  // 1. Run all tests including the factorial test
  console.log('\n' + '═'.repeat(60));
  console.log('🧪 RUNNING ALL TESTS');
  console.log('═'.repeat(60));

  const allTestsResult = runCommand('npm test', 'Running all tests');
  results.tests.all = allTestsResult;

  // 2. Run factorial test specifically to ensure it exists and passes
  console.log('\n' + '═'.repeat(60));
  console.log('🔬 RUNNING FACTORIAL TEST SPECIFICALLY');
  console.log('═'.repeat(60));

  const factorialTestResult = runCommand(
    'npx vitest run tests/unit/utils/factorial.test.ts',
    'Running factorial test file'
  );
  results.tests.factorial = factorialTestResult;

  // 3. Run tests with coverage
  console.log('\n' + '═'.repeat(60));
  console.log('📈 RUNNING TESTS WITH COVERAGE');
  console.log('═'.repeat(60));

  const coverageResult = runCommand('npm run test:coverage', 'Generating test coverage report');
  results.tests.coverage = coverageResult;

  // 4. Parse test results from output
  if (allTestsResult.output) {
    // Parse test counts from vitest output
    const testMatch = allTestsResult.output.match(/(\d+) passed/);
    const failMatch = allTestsResult.output.match(/(\d+) failed/);
    const skipMatch = allTestsResult.output.match(/(\d+) skipped/);

    if (testMatch) results.summary.passed = parseInt(testMatch[1]);
    if (failMatch) results.summary.failed = parseInt(failMatch[1]);
    if (skipMatch) results.summary.skipped = parseInt(skipMatch[1]);

    results.summary.total = results.summary.passed + results.summary.failed + results.summary.skipped;
  }

  // 5. Check for coverage percentages
  if (coverageResult.output) {
    const coverageMatch = coverageResult.output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      results.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }
  }

  // 6. Create detailed report
  console.log('\n' + '═'.repeat(60));
  console.log('📝 TEST EXECUTION SUMMARY');
  console.log('═'.repeat(60));

  console.log('\n✅ Test Results:');
  console.log(`   Total Tests: ${results.summary.total}`);
  console.log(`   Passed: ${results.summary.passed}`);
  console.log(`   Failed: ${results.summary.failed}`);
  console.log(`   Skipped: ${results.summary.skipped}`);

  if (results.coverage) {
    console.log('\n📊 Coverage Report:');
    console.log(`   Statements: ${results.coverage.statements}%`);
    console.log(`   Branches: ${results.coverage.branches}%`);
    console.log(`   Functions: ${results.coverage.functions}%`);
    console.log(`   Lines: ${results.coverage.lines}%`);
  }

  // 7. Check factorial test specifically
  console.log('\n🎯 Factorial Test Status:');
  if (factorialTestResult.success) {
    console.log('   ✅ Factorial test file executed successfully');

    // Parse factorial test results
    if (factorialTestResult.output) {
      const factorialTests = factorialTestResult.output.match(/(\d+) test/);
      if (factorialTests) {
        console.log(`   📊 Factorial tests run: ${factorialTests[1]}`);
      }
    }
  } else {
    console.log('   ❌ Factorial test execution failed');
  }

  // 8. Save results to file
  const reportPath = path.join(projectRoot, 'tests', 'test-execution-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved to: ${reportPath}`);

  // Return overall success status
  const overallSuccess = results.summary.failed === 0 && factorialTestResult.success;

  console.log('\n' + '═'.repeat(60));
  console.log(overallSuccess ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED!');
  console.log('═'.repeat(60));

  return results;
}

// Execute tests
runTests().catch(console.error);