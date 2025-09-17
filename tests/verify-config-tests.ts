#!/usr/bin/env node
/**
 * Configuration Test Verification Script
 * Analyzes and verifies that all configuration-related tests are in place
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestFile {
  path: string;
  name: string;
  tests: string[];
  hasConfigTests: boolean;
}

interface VerificationReport {
  timestamp: string;
  sessionId: string;
  testFiles: TestFile[];
  configurationTests: {
    unitTests: {
      found: boolean;
      tests: string[];
    };
    integrationTests: {
      found: boolean;
      tests: string[];
    };
    contractTests: {
      found: boolean;
      tests: string[];
    };
  };
  coverageAreas: {
    configLoader: boolean;
    backendWrite: boolean;
    frontendWrite: boolean;
    pathValidation: boolean;
    errorHandling: boolean;
  };
  summary: {
    totalTestFiles: number;
    configTestFiles: number;
    totalConfigTests: number;
    missingAreas: string[];
  };
}

class ConfigTestVerifier {
  private testDir = path.join(process.cwd(), 'tests');

  async verify(): Promise<VerificationReport> {
    console.log('🔍 Verifying Configuration Test Coverage');
    console.log('=========================================\n');

    const testFiles = this.findTestFiles();
    const configTests = this.analyzeConfigTests(testFiles);
    const coverage = this.analyzeCoverage(testFiles);

    return this.generateReport(testFiles, configTests, coverage);
  }

  private findTestFiles(): TestFile[] {
    const files: TestFile[] = [];

    const scanDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.includes('node_modules')) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const tests = this.extractTestNames(content);
          const hasConfigTests = this.hasConfigurationTests(content);

          files.push({
            path: fullPath,
            name: entry.name,
            tests,
            hasConfigTests
          });
        }
      }
    };

    scanDir(this.testDir);
    return files;
  }

  private extractTestNames(content: string): string[] {
    const tests: string[] = [];
    const testPattern = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const describePattern = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;

    let match;
    while ((match = testPattern.exec(content)) !== null) {
      tests.push(match[1]);
    }

    while ((match = describePattern.exec(content)) !== null) {
      tests.push(`[Suite] ${match[1]}`);
    }

    return tests;
  }

  private hasConfigurationTests(content: string): boolean {
    const configKeywords = [
      'content-writer',
      'ContentWriter',
      'configuration',
      'config',
      'folderMappings',
      'backend_write',
      'frontend_write',
      'loadContentWriterConfig'
    ];

    return configKeywords.some(keyword =>
      content.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private analyzeConfigTests(files: TestFile[]) {
    const unitTests = files.filter(f => f.path.includes('/unit/'));
    const integrationTests = files.filter(f => f.path.includes('/integration/'));
    const contractTests = files.filter(f => f.path.includes('/contract/'));

    return {
      unitTests: {
        found: unitTests.some(f => f.hasConfigTests),
        tests: unitTests
          .filter(f => f.hasConfigTests)
          .flatMap(f => f.tests)
      },
      integrationTests: {
        found: integrationTests.some(f => f.hasConfigTests),
        tests: integrationTests
          .filter(f => f.hasConfigTests)
          .flatMap(f => f.tests)
      },
      contractTests: {
        found: contractTests.some(f => f.hasConfigTests),
        tests: contractTests
          .filter(f => f.hasConfigTests)
          .flatMap(f => f.tests)
      }
    };
  }

  private analyzeCoverage(files: TestFile[]) {
    const allContent = files.map(f =>
      fs.readFileSync(f.path, 'utf-8')
    ).join('\n');

    return {
      configLoader: allContent.includes('loadContentWriterConfig'),
      backendWrite: allContent.includes('backend_write'),
      frontendWrite: allContent.includes('frontend_write'),
      pathValidation: allContent.includes('isPathAllowed') || allContent.includes('path validation'),
      errorHandling: allContent.includes('ConfigValidationError') || allContent.includes('error handling')
    };
  }

  private generateReport(
    testFiles: TestFile[],
    configTests: any,
    coverage: any
  ): VerificationReport {
    const configTestFiles = testFiles.filter(f => f.hasConfigTests);
    const totalConfigTests = configTestFiles.reduce((sum, f) => sum + f.tests.length, 0);

    const missingAreas: string[] = [];
    if (!coverage.configLoader) missingAreas.push('Configuration Loader');
    if (!coverage.backendWrite) missingAreas.push('Backend Write');
    if (!coverage.frontendWrite) missingAreas.push('Frontend Write');
    if (!coverage.pathValidation) missingAreas.push('Path Validation');
    if (!coverage.errorHandling) missingAreas.push('Error Handling');

    return {
      timestamp: new Date().toISOString(),
      sessionId: `verify-${Date.now()}`,
      testFiles,
      configurationTests: configTests,
      coverageAreas: coverage,
      summary: {
        totalTestFiles: testFiles.length,
        configTestFiles: configTestFiles.length,
        totalConfigTests,
        missingAreas
      }
    };
  }

  printReport(report: VerificationReport) {
    console.log('\n📊 CONFIGURATION TEST VERIFICATION REPORT');
    console.log('==========================================\n');

    console.log('📁 Test Files Summary:');
    console.log(`  Total test files: ${report.summary.totalTestFiles}`);
    console.log(`  Config test files: ${report.summary.configTestFiles}`);
    console.log(`  Total config tests: ${report.summary.totalConfigTests}`);

    console.log('\n✅ Test Coverage by Type:');
    console.log(`  Unit Tests: ${report.configurationTests.unitTests.found ? '✅' : '❌'} (${report.configurationTests.unitTests.tests.length} tests)`);
    console.log(`  Integration Tests: ${report.configurationTests.integrationTests.found ? '✅' : '❌'} (${report.configurationTests.integrationTests.tests.length} tests)`);
    console.log(`  Contract Tests: ${report.configurationTests.contractTests.found ? '✅' : '❌'} (${report.configurationTests.contractTests.tests.length} tests)`);

    console.log('\n🎯 Coverage Areas:');
    console.log(`  Config Loader: ${report.coverageAreas.configLoader ? '✅' : '❌'}`);
    console.log(`  Backend Write: ${report.coverageAreas.backendWrite ? '✅' : '❌'}`);
    console.log(`  Frontend Write: ${report.coverageAreas.frontendWrite ? '✅' : '❌'}`);
    console.log(`  Path Validation: ${report.coverageAreas.pathValidation ? '✅' : '❌'}`);
    console.log(`  Error Handling: ${report.coverageAreas.errorHandling ? '✅' : '❌'}`);

    if (report.summary.missingAreas.length > 0) {
      console.log('\n⚠️  Missing Coverage Areas:');
      report.summary.missingAreas.forEach(area => {
        console.log(`  - ${area}`);
      });
    } else {
      console.log('\n✅ All configuration areas have test coverage!');
    }

    console.log('\n📝 Configuration Test Files:');
    report.testFiles
      .filter(f => f.hasConfigTests)
      .forEach(f => {
        console.log(`  - ${path.relative(process.cwd(), f.path)}`);
        console.log(`    Tests: ${f.tests.length}`);
      });
  }

  async saveReport(report: VerificationReport): Promise<string> {
    const reportsDir = path.join(process.cwd(), 'tests', 'verification-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, `config-verification-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return reportPath;
  }
}

// Main execution
async function main() {
  const verifier = new ConfigTestVerifier();

  try {
    const report = await verifier.verify();
    verifier.printReport(report);

    const reportPath = await verifier.saveReport(report);
    console.log(`\n💾 Report saved to: ${reportPath}`);

    // Determine success
    const allCovered = report.summary.missingAreas.length === 0;
    if (allCovered) {
      console.log('\n✅ VERIFICATION SUCCESSFUL: All configuration functionality has test coverage!');
    } else {
      console.log('\n⚠️  VERIFICATION INCOMPLETE: Some areas lack test coverage.');
    }

    process.exit(allCovered ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { ConfigTestVerifier, VerificationReport };