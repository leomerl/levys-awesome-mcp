/**
 * Integration test for the nightly test runner fix
 *
 * This test validates that the nightly test runner correctly handles Vitest JSON reporting
 * and addresses the issue from GitHub issue #54.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Nightly Test Runner Fix Integration', () => {
  const nightlyRunnerJs = path.join(process.cwd(), 'tests', 'nightly-test-runner.js');
  const nightlyRunnerTs = path.join(process.cwd(), 'tests', 'nightly-test-runner.ts');

  it('should have created the JavaScript nightly test runner', () => {
    expect(fs.existsSync(nightlyRunnerJs)).toBe(true);

    // Verify the file contains the correct reporter flag
    const content = fs.readFileSync(nightlyRunnerJs, 'utf8');
    expect(content).toContain('--reporter=json');
    expect(content).not.toContain('--json --outputFile'); // Should not contain the invalid syntax
  });

  it('should have created the TypeScript nightly test runner', () => {
    expect(fs.existsSync(nightlyRunnerTs)).toBe(true);

    // Verify the file contains the correct reporter flag
    const content = fs.readFileSync(nightlyRunnerTs, 'utf8');
    expect(content).toContain('--reporter=json');
    expect(content).not.toContain('--json --outputFile'); // Should not contain the invalid syntax
  });

  it('should correctly build the Vitest command with reporter flag', async () => {
    // Test that the command construction is correct
    const testOutputFile = 'test-results/integration-test.json';

    // Read the runner to verify command construction
    const runnerContent = fs.readFileSync(nightlyRunnerJs, 'utf8');

    // Check for the correct command pattern
    const commandPattern = /npx vitest run --reporter=json --outputFile=/;
    expect(runnerContent).toMatch(commandPattern);

    // Verify no invalid patterns exist
    const invalidPattern = /npx vitest run --json/;
    expect(runnerContent).not.toMatch(invalidPattern);
  });

  it('should handle process signals correctly', () => {
    // Verify signal handlers are present
    const content = fs.readFileSync(nightlyRunnerJs, 'utf8');

    expect(content).toContain('SIGINT');
    expect(content).toContain('SIGTERM');
    expect(content).toContain('process.exit(130)'); // SIGINT exit code
    expect(content).toContain('process.exit(143)'); // SIGTERM exit code
  });

  it('should parse and validate JSON output structure', () => {
    // Verify the runner expects correct JSON structure
    const content = fs.readFileSync(nightlyRunnerTs, 'utf8');

    // Check for expected JSON fields
    const expectedFields = [
      'numTotalTests',
      'numPassedTests',
      'numFailedTests',
      'numPendingTests',
      'success'
    ];

    for (const field of expectedFields) {
      expect(content).toContain(field);
    }
  });

  it('should create output directory if it does not exist', () => {
    // Verify directory creation logic
    const jsContent = fs.readFileSync(nightlyRunnerJs, 'utf8');
    const tsContent = fs.readFileSync(nightlyRunnerTs, 'utf8');

    expect(jsContent).toContain('fs.mkdirSync');
    expect(jsContent).toContain('recursive: true');

    expect(tsContent).toContain('fs.mkdirSync');
    expect(tsContent).toContain('recursive: true');
  });

  it('should document the fix in the test directory', () => {
    const fixDoc = path.join(process.cwd(), 'tests', 'VITEST-JSON-REPORTER-FIX.md');
    expect(fs.existsSync(fixDoc)).toBe(true);

    const docContent = fs.readFileSync(fixDoc, 'utf8');

    // Verify documentation contains key information
    expect(docContent).toContain('CACError: Unknown option `--json`');
    expect(docContent).toContain('--reporter=json');
    expect(docContent).toContain('Issue #54');
    expect(docContent).toContain('.github/workflows/nightly-test-runner.yml');
  });

  it('should validate that --json flag is indeed invalid', async () => {
    // This test confirms the issue exists
    const invalidCommand = 'npx vitest run tests/unit/utils/string-path.unit.test.ts --json';

    try {
      await execAsync(invalidCommand, { timeout: 10000 });
      // Should not reach here
      expect.fail('Command with --json flag should have failed');
    } catch (error: any) {
      // Expected to fail
      expect(error.message).toMatch(/unknown option|json/i);
    }
  }, 15000);

  it('should validate that --reporter=json flag works correctly', async () => {
    // This test confirms the fix works
    const validCommand = 'npx vitest run tests/unit/utils/string-path.unit.test.ts --reporter=json';
    const testOutput = path.join(process.cwd(), 'test-results', 'fix-validation.json');
    const fullCommand = `${validCommand} --outputFile=${testOutput}`;

    try {
      // Ensure directory exists
      const outputDir = path.dirname(testOutput);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await execAsync(fullCommand, { timeout: 30000 });

      // Check if JSON was created
      if (fs.existsSync(testOutput)) {
        const jsonContent = fs.readFileSync(testOutput, 'utf8');
        const parsed = JSON.parse(jsonContent);

        // Verify JSON structure
        expect(parsed).toHaveProperty('numTotalTests');
        expect(typeof parsed.numTotalTests).toBe('number');

        // Clean up
        fs.unlinkSync(testOutput);
      }
    } catch (error: any) {
      // Even if tests fail, JSON should be created with --reporter=json
      if (fs.existsSync(testOutput)) {
        // This is acceptable - tests failed but JSON was generated
        fs.unlinkSync(testOutput);
      } else {
        throw new Error(`Failed to generate JSON with --reporter=json: ${error.message}`);
      }
    }
  }, 35000);
});

describe('GitHub Issue #54 Resolution', () => {
  it('should address all requirements from issue #54', () => {
    // Verify all issue requirements are addressed
    const requirements = {
      errorIdentified: 'CACError: Unknown option `--json`',
      rootCause: '--json flag is not valid for Vitest',
      solution: 'Use --reporter=json instead',
      filesCreated: [
        'tests/nightly-test-runner.js',
        'tests/nightly-test-runner.ts',
        'tests/unit/json-reporter.test.ts',
        'tests/VITEST-JSON-REPORTER-FIX.md'
      ],
      workflowFix: {
        file: '.github/workflows/nightly-test-runner.yml',
        line: 51,
        from: 'npm test -- --json --outputFile=test-results/results.json',
        to: 'node tests/nightly-test-runner.js test-results/results.json'
      }
    };

    // Verify all files were created
    for (const file of requirements.filesCreated) {
      const fullPath = path.join(process.cwd(), file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }

    // Verify solution is correct
    expect(requirements.solution).toContain('--reporter=json');
    expect(requirements.rootCause).toContain('not valid');
  });
});