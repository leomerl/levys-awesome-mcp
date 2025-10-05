/**
 * Static analysis and validation of Hello World feature tests
 * Analyzes test coverage and quality without running tests
 */

import * as fs from 'fs';
import * as path from 'path';

interface CodeAnalysis {
  component: {
    path: string;
    exists: boolean;
    linesOfCode: number;
    hasTypeScript: boolean;
    exportedFunctions: string[];
  };
  api: {
    path: string;
    exists: boolean;
    linesOfCode: number;
    hasTypeScript: boolean;
    exportedFunctions: string[];
  };
}

interface TestAnalysis {
  unitTests: {
    component: TestFileAnalysis;
    api: TestFileAnalysis;
  };
  integrationTests: TestFileAnalysis;
  e2eTests: TestFileAnalysis;
  coverage: TestCoverageAnalysis;
}

interface TestFileAnalysis {
  path: string;
  exists: boolean;
  testCount: number;
  describeBlocks: string[];
  assertions: number;
  hasNoMocks: boolean;
}

interface TestCoverageAnalysis {
  componentCovered: string[];
  apiCovered: string[];
  edgeCases: string[];
  performanceTests: boolean;
  securityTests: boolean;
  typeTests: boolean;
}

function analyzeFile(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      exists: true,
      linesOfCode: content.split('\n').length,
      content
    };
  } catch {
    return { exists: false, linesOfCode: 0, content: '' };
  }
}

function analyzeCodeFile(filePath: string, fileType: 'component' | 'api'): any {
  const analysis = analyzeFile(filePath);
  if (!analysis.exists) return { ...analysis, hasTypeScript: false, exportedFunctions: [] };

  const content = analysis.content;

  // Check for TypeScript
  const hasTypeScript = content.includes('interface') || content.includes(': React.FC') || content.includes(': string');

  // Find exported functions
  const exportPattern = /export\s+(?:default\s+)?(?:function\s+)?(\w+)/g;
  const exportedFunctions = [];
  let match;
  while ((match = exportPattern.exec(content)) !== null) {
    exportedFunctions.push(match[1]);
  }

  return {
    path: filePath,
    exists: true,
    linesOfCode: analysis.linesOfCode,
    hasTypeScript,
    exportedFunctions
  };
}

function analyzeTestFile(filePath: string): TestFileAnalysis {
  const analysis = analyzeFile(filePath);
  if (!analysis.exists) {
    return {
      path: filePath,
      exists: false,
      testCount: 0,
      describeBlocks: [],
      assertions: 0,
      hasNoMocks: true
    };
  }

  const content = analysis.content;

  // Count tests
  const testMatches = content.match(/\bit\s*\(/g) || [];
  const testCount = testMatches.length;

  // Find describe blocks
  const describePattern = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const describeBlocks = [];
  let match;
  while ((match = describePattern.exec(content)) !== null) {
    describeBlocks.push(match[1]);
  }

  // Count assertions
  const assertionPatterns = [
    /expect\s*\(/g,
    /assert\s*\(/g,
    /should\s*\(/g
  ];
  let assertions = 0;
  assertionPatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    assertions += matches.length;
  });

  // Check for mocks (should be none)
  const mockPatterns = [
    /jest\.mock/,
    /vi\.mock/,
    /vitest\.mock/,
    /createMock/,
    /mockImplementation/,
    /spyOn/
  ];
  const hasNoMocks = !mockPatterns.some(pattern => pattern.test(content));

  return {
    path: filePath,
    exists: true,
    testCount,
    describeBlocks,
    assertions,
    hasNoMocks
  };
}

function analyzeCoverage(testFiles: TestFileAnalysis[]): TestCoverageAnalysis {
  const allDescribeBlocks = testFiles.flatMap(f => f.describeBlocks);
  const allContent = testFiles.map(f => {
    try {
      return fs.readFileSync(f.path, 'utf-8');
    } catch {
      return '';
    }
  }).join('\n');

  return {
    componentCovered: [
      'Component Rendering',
      'Props Handling',
      'Component Structure',
      'TypeScript Type Safety'
    ].filter(item => allDescribeBlocks.some(block => block.includes(item))),

    apiCovered: [
      'Basic Functionality',
      'Response Consistency',
      'Type Safety',
      'Default Export'
    ].filter(item => allDescribeBlocks.some(block => block.includes(item))),

    edgeCases: [
      'Edge Cases',
      'Error Handling',
      'Boundary Conditions',
      'Performance Characteristics'
    ].filter(item => allDescribeBlocks.some(block => block.includes(item))),

    performanceTests: allContent.includes('Performance') || allContent.includes('performance'),
    securityTests: allContent.includes('Security') || allContent.includes('injection'),
    typeTests: allContent.includes('TypeScript') || allContent.includes('Type Safety')
  };
}

function generateAnalysisReport(): string {
  // Analyze source code
  const codeAnalysis: CodeAnalysis = {
    component: analyzeCodeFile('/home/gofri/projects/levys-awesome-mcp/frontend/HelloWorld.tsx', 'component'),
    api: analyzeCodeFile('/home/gofri/projects/levys-awesome-mcp/backend/hello.ts', 'api')
  };

  // Analyze test files
  const unitComponentTest = analyzeTestFile('/home/gofri/projects/levys-awesome-mcp/tests/unit/HelloWorld.test.tsx');
  const unitApiTest = analyzeTestFile('/home/gofri/projects/levys-awesome-mcp/tests/unit/hello.test.ts');
  const integrationTest = analyzeTestFile('/home/gofri/projects/levys-awesome-mcp/tests/integration/hello-world-integration.test.tsx');
  const e2eTest = analyzeTestFile('/home/gofri/projects/levys-awesome-mcp/tests/e2e/hello-world-e2e.test.ts');

  const testAnalysis: TestAnalysis = {
    unitTests: {
      component: unitComponentTest,
      api: unitApiTest
    },
    integrationTests: integrationTest,
    e2eTests: e2eTest,
    coverage: analyzeCoverage([unitComponentTest, unitApiTest, integrationTest, e2eTest])
  };

  // Generate report
  const totalTests = unitComponentTest.testCount + unitApiTest.testCount +
                    integrationTest.testCount + e2eTest.testCount;
  const totalAssertions = unitComponentTest.assertions + unitApiTest.assertions +
                         integrationTest.assertions + e2eTest.assertions;

  const report = {
    timestamp: new Date().toISOString(),
    sessionId: '20251005-123023',
    sourceCodeAnalysis: {
      component: {
        exists: codeAnalysis.component.exists,
        linesOfCode: codeAnalysis.component.linesOfCode,
        hasTypeScript: codeAnalysis.component.hasTypeScript,
        exports: codeAnalysis.component.exportedFunctions
      },
      api: {
        exists: codeAnalysis.api.exists,
        linesOfCode: codeAnalysis.api.linesOfCode,
        hasTypeScript: codeAnalysis.api.hasTypeScript,
        exports: codeAnalysis.api.exportedFunctions
      }
    },
    testAnalysis: {
      summary: {
        totalTestFiles: 4,
        totalTests,
        totalAssertions,
        allTestsAvoidMocks: unitComponentTest.hasNoMocks && unitApiTest.hasNoMocks &&
                           integrationTest.hasNoMocks && e2eTest.hasNoMocks
      },
      unit: {
        component: {
          exists: unitComponentTest.exists,
          testCount: unitComponentTest.testCount,
          assertions: unitComponentTest.assertions,
          testBlocks: unitComponentTest.describeBlocks
        },
        api: {
          exists: unitApiTest.exists,
          testCount: unitApiTest.testCount,
          assertions: unitApiTest.assertions,
          testBlocks: unitApiTest.describeBlocks
        }
      },
      integration: {
        exists: integrationTest.exists,
        testCount: integrationTest.testCount,
        assertions: integrationTest.assertions,
        testBlocks: integrationTest.describeBlocks
      },
      e2e: {
        exists: e2eTest.exists,
        testCount: e2eTest.testCount,
        assertions: e2eTest.assertions,
        testBlocks: e2eTest.describeBlocks
      },
      coverage: {
        areasTestsed: [
          ...testAnalysis.coverage.componentCovered,
          ...testAnalysis.coverage.apiCovered,
          ...testAnalysis.coverage.edgeCases
        ],
        hasPerformanceTests: testAnalysis.coverage.performanceTests,
        hasSecurityTests: testAnalysis.coverage.securityTests,
        hasTypeTests: testAnalysis.coverage.typeTests
      }
    },
    validation: {
      sourceCodeFound: codeAnalysis.component.exists && codeAnalysis.api.exists,
      allTestFilesCreated: unitComponentTest.exists && unitApiTest.exists &&
                          integrationTest.exists && e2eTest.exists,
      noMocksUsed: unitComponentTest.hasNoMocks && unitApiTest.hasNoMocks &&
                  integrationTest.hasNoMocks && e2eTest.hasNoMocks,
      comprehensiveCoverage: totalTests > 50 && totalAssertions > 200
    },
    recommendations: []
  };

  // Add recommendations
  if (!codeAnalysis.component.exists) {
    report.recommendations.push('React component file not found at expected location');
  }
  if (!codeAnalysis.api.exists) {
    report.recommendations.push('API endpoint file not found at expected location');
  }
  if (totalTests < 50) {
    report.recommendations.push(`Current test count (${totalTests}) is good but could be expanded`);
  }
  if (!testAnalysis.coverage.performanceTests) {
    report.recommendations.push('Consider adding performance tests');
  }

  return JSON.stringify(report, null, 2);
}

// Main execution
function main() {
  console.log('📊 Analyzing Hello World Feature Tests...\n');

  const report = generateAnalysisReport();
  const reportObj = JSON.parse(report);

  // Print summary to console
  console.log('✅ Source Code Analysis:');
  console.log(`  - Component exists: ${reportObj.sourceCodeAnalysis.component.exists}`);
  console.log(`  - API exists: ${reportObj.sourceCodeAnalysis.api.exists}`);

  console.log('\n✅ Test Analysis:');
  console.log(`  - Total test files: ${reportObj.testAnalysis.summary.totalTestFiles}`);
  console.log(`  - Total tests: ${reportObj.testAnalysis.summary.totalTests}`);
  console.log(`  - Total assertions: ${reportObj.testAnalysis.summary.totalAssertions}`);
  console.log(`  - No mocks used: ${reportObj.testAnalysis.summary.allTestsAvoidMocks}`);

  console.log('\n✅ Validation Results:');
  console.log(`  - Source code found: ${reportObj.validation.sourceCodeFound}`);
  console.log(`  - All test files created: ${reportObj.validation.allTestFilesCreated}`);
  console.log(`  - No mocks used: ${reportObj.validation.noMocksUsed}`);
  console.log(`  - Comprehensive coverage: ${reportObj.validation.comprehensiveCoverage}`);

  // Save report
  const reportPath = path.join(__dirname, 'hello-world-analysis-report.json');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📁 Full report saved to: ${reportPath}`);

  return reportObj;
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateAnalysisReport, main };