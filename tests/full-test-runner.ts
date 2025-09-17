#!/usr/bin/env node
/**
 * Full Test Suite Runner
 * Executes all test suites and generates comprehensive reports
 */

import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  suite: string;
  command: string;
  passed: boolean;
  output: string;
  error: string;
  duration: number;
  testCount?: number;
  passedCount?: number;
  failedCount?: number;
}

interface TestReport {
  timestamp: string;
  sessionId: string;
  totalDuration: number;
  results: {
    unit: TestResult;
    integration: TestResult;
    contract: TestResult;
    all: TestResult;
    coverage: TestResult;
  };
  summary: {
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    coveragePercent?: number;
  };
  configurationTests: {
    loaderTestsPassed: boolean;
    backendWriteTestsPassed: boolean;
    frontendWriteTestsPassed: boolean;
  };
  recommendations: string[];
}

class TestRunner {
  private results: Partial<TestReport['results']> = {};
  private startTime: number = Date.now();

  async runCommand(
    command: string,
    args: string[],
    suiteName: string
  ): Promise<TestResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      console.log(`\n🧪 Running ${suiteName} tests...`);
      console.log(`Command: ${command} ${args.join(' ')}`);

      const proc = spawn(command, args, {
        cwd: process.cwd(),
        shell: true,
        env: { ...process.env, CI: 'true' }
      });

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
        const duration = Date.now() - startTime;
        const passed = code === 0;

        // Parse test counts from output
        const testCountMatch = stdout.match(/(\d+) test(?:s)? passed/);
        const failedMatch = stdout.match(/(\d+) test(?:s)? failed/);

        const result: TestResult = {
          suite: suiteName,
          command: `${command} ${args.join(' ')}`,
          passed,
          output: stdout,
          error: stderr,
          duration,
          testCount: testCountMatch ? parseInt(testCountMatch[1]) : undefined,
          passedCount: testCountMatch ? parseInt(testCountMatch[1]) : undefined,
          failedCount: failedMatch ? parseInt(failedMatch[1]) : 0
        };

        console.log(`\n✅ ${suiteName} completed in ${duration}ms - ${passed ? 'PASSED' : 'FAILED'}`);
        resolve(result);
      });

      proc.on('error', (error) => {
        const duration = Date.now() - startTime;
        resolve({
          suite: suiteName,
          command: `${command} ${args.join(' ')}`,
          passed: false,
          output: stdout,
          error: error.message,
          duration
        });
      });
    });
  }

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Full Test Suite Execution');
    console.log('=====================================\n');

    // Run unit tests
    this.results.unit = await this.runCommand('npm', ['run', 'test:unit'], 'Unit');

    // Run integration tests
    this.results.integration = await this.runCommand('npm', ['run', 'test:integration'], 'Integration');

    // Run contract tests
    this.results.contract = await this.runCommand('npm', ['run', 'test:contract'], 'Contract');

    // Run all tests to catch any additional tests
    this.results.all = await this.runCommand('npm', ['test'], 'All Tests');

    // Run coverage
    this.results.coverage = await this.runCommand('npm', ['run', 'test:coverage'], 'Coverage');

    return this.generateReport();
  }

  private parseConfigurationTestResults(): TestReport['configurationTests'] {
    const allOutput = Object.values(this.results)
      .map(r => r?.output || '')
      .join('\n');

    return {
      loaderTestsPassed: allOutput.includes('Content Writer Config Loader') &&
                        !allOutput.includes('Content Writer Config Loader.*✗'),
      backendWriteTestsPassed: allOutput.includes('backend_write with configuration') &&
                              !allOutput.includes('backend_write with configuration.*✗'),
      frontendWriteTestsPassed: allOutput.includes('frontend_write with configuration') &&
                               !allOutput.includes('frontend_write with configuration.*✗')
    };
  }

  private extractCoverage(): number | undefined {
    const coverageOutput = this.results.coverage?.output || '';
    const coverageMatch = coverageOutput.match(/All files[^\n]*\n[^\n]*\|[^\|]*\|[^\|]*\|[^\|]*\|[^\|]*\|\s*([\d.]+)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  private generateReport(): TestReport {
    const totalDuration = Date.now() - this.startTime;
    const timestamp = new Date().toISOString();
    const sessionId = `test-session-${Date.now()}`;

    // Calculate totals
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    Object.values(this.results).forEach(result => {
      if (result && result.suite !== 'Coverage' && result.suite !== 'All Tests') {
        totalTests += result.testCount || 0;
        totalPassed += result.passedCount || 0;
        totalFailed += result.failedCount || 0;
      }
    });

    const configTests = this.parseConfigurationTestResults();
    const recommendations: string[] = [];

    // Generate recommendations based on results
    if (!this.results.unit?.passed) {
      recommendations.push('Unit tests are failing - review individual function implementations');
    }
    if (!this.results.integration?.passed) {
      recommendations.push('Integration tests are failing - check component interactions');
    }
    if (!this.results.contract?.passed) {
      recommendations.push('Contract tests are failing - API contracts may have changed');
    }
    if (!configTests.loaderTestsPassed) {
      recommendations.push('Configuration loader tests failing - review config loading logic');
    }
    if (!configTests.backendWriteTestsPassed) {
      recommendations.push('Backend write tests failing - check file write permissions and path validation');
    }
    if (!configTests.frontendWriteTestsPassed) {
      recommendations.push('Frontend write tests failing - verify frontend folder configurations');
    }

    const coveragePercent = this.extractCoverage();
    if (coveragePercent && coveragePercent < 80) {
      recommendations.push(`Test coverage is ${coveragePercent}% - consider adding more tests to reach 80% threshold`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passing successfully! No issues detected.');
    }

    return {
      timestamp,
      sessionId,
      totalDuration,
      results: this.results as TestReport['results'],
      summary: {
        totalTests,
        totalPassed,
        totalFailed,
        coveragePercent
      },
      configurationTests: configTests,
      recommendations
    };
  }

  async saveReport(report: TestReport): Promise<string> {
    const reportsDir = path.join(process.cwd(), 'tests', 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Also save a summary in markdown
    const summaryPath = path.join(reportsDir, `test-summary-${Date.now()}.md`);
    const summaryMd = this.generateMarkdownSummary(report);
    fs.writeFileSync(summaryPath, summaryMd);

    return reportPath;
  }

  private generateMarkdownSummary(report: TestReport): string {
    const { summary, configurationTests, recommendations } = report;

    return `# Test Suite Execution Report

## Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.totalPassed}
- **Failed**: ${summary.totalFailed}
- **Coverage**: ${summary.coveragePercent ? summary.coveragePercent + '%' : 'N/A'}
- **Duration**: ${report.totalDuration}ms

## Test Suites
| Suite | Status | Duration |
|-------|--------|----------|
| Unit Tests | ${report.results.unit?.passed ? '✅ PASSED' : '❌ FAILED'} | ${report.results.unit?.duration}ms |
| Integration Tests | ${report.results.integration?.passed ? '✅ PASSED' : '❌ FAILED'} | ${report.results.integration?.duration}ms |
| Contract Tests | ${report.results.contract?.passed ? '✅ PASSED' : '❌ FAILED'} | ${report.results.contract?.duration}ms |

## Configuration Tests
- Configuration Loader: ${configurationTests.loaderTestsPassed ? '✅' : '❌'}
- Backend Write: ${configurationTests.backendWriteTestsPassed ? '✅' : '❌'}
- Frontend Write: ${configurationTests.frontendWriteTestsPassed ? '✅' : '❌'}

## Recommendations
${recommendations.map(r => `- ${r}`).join('\n')}

---
*Generated at ${report.timestamp}*
`;
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();

  try {
    console.log('🔍 Executing Comprehensive Test Suite for TASK-013');
    const report = await runner.runAllTests();

    const reportPath = await runner.saveReport(report);
    console.log(`\n📊 Test report saved to: ${reportPath}`);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST EXECUTION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.totalPassed}`);
    console.log(`Failed: ${report.summary.totalFailed}`);
    console.log(`Coverage: ${report.summary.coveragePercent}%`);
    console.log('\nConfiguration Tests:');
    console.log(`  - Loader Tests: ${report.configurationTests.loaderTestsPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`  - Backend Write: ${report.configurationTests.backendWriteTestsPassed ? 'PASSED' : 'FAILED'}`);
    console.log(`  - Frontend Write: ${report.configurationTests.frontendWriteTestsPassed ? 'PASSED' : 'FAILED'}`);

    if (report.recommendations.length > 0) {
      console.log('\n📝 Recommendations:');
      report.recommendations.forEach(r => console.log(`  • ${r}`));
    }

    // Exit with appropriate code
    const allPassed = report.summary.totalFailed === 0;
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { TestRunner, TestReport };