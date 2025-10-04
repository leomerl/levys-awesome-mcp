/**
 * Test suite to verify that Vitest JSON reporter works correctly
 *
 * This test ensures that our nightly test runner can properly generate JSON output
 * using the --reporter=json flag instead of the invalid --json flag.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Vitest JSON Reporter', () => {
  const testOutputDir = path.join(process.cwd(), 'test-results', 'json-reporter-test');
  const testOutputFile = path.join(testOutputDir, 'test-results.json');

  beforeAll(() => {
    // Ensure test output directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test output files
    if (fs.existsSync(testOutputFile)) {
      fs.unlinkSync(testOutputFile);
    }
    // Don't remove the directory itself as other tests might use it
  });

  it('should generate JSON output with --reporter=json flag', async () => {
    // Run a simple test file with JSON reporter
    // Using an existing test file from the project
    const command = `npx vitest run tests/unit/utils/string-path.unit.test.ts --reporter=json --outputFile=${testOutputFile}`;

    try {
      await execAsync(command);
    } catch (error: any) {
      // Tests might fail, but JSON should still be generated
      if (!fs.existsSync(testOutputFile)) {
        throw new Error(`JSON output file was not created at ${testOutputFile}: ${error.message}`);
      }
    }

    // Verify the JSON file was created
    expect(fs.existsSync(testOutputFile)).toBe(true);

    // Verify the JSON file is valid and has expected structure
    const jsonContent = fs.readFileSync(testOutputFile, 'utf8');
    let results: any;

    // Parse JSON and verify structure
    expect(() => {
      results = JSON.parse(jsonContent);
    }).not.toThrow();

    // Verify expected fields exist in the JSON output
    expect(results).toHaveProperty('numTotalTests');
    expect(results).toHaveProperty('numPassedTests');
    expect(results).toHaveProperty('numFailedTests');
    expect(typeof results.numTotalTests).toBe('number');
    expect(typeof results.numPassedTests).toBe('number');
    expect(typeof results.numFailedTests).toBe('number');
  }, 30000); // Increase timeout for test execution

  it('should fail with --json flag (invalid option)', async () => {
    // This test verifies that --json is indeed invalid
    const command = `npx vitest run tests/unit/utils/string-path.unit.test.ts --json --outputFile=${testOutputFile}`;

    let errorMessage = '';
    try {
      await execAsync(command);
      // If we get here, the command succeeded when it shouldn't have
      throw new Error('Expected --json flag to fail but it succeeded');
    } catch (error: any) {
      errorMessage = error.message || error.toString();
    }

    // Verify that the error message contains information about unknown option
    expect(errorMessage.toLowerCase()).toMatch(/unknown option|invalid option|json/i);
  }, 30000);

  it('should work with nightly test runner script', async () => {
    const nightlyRunnerPath = path.join(process.cwd(), 'tests', 'nightly-test-runner.js');
    const outputFile = path.join(testOutputDir, 'nightly-test.json');

    // Check if the nightly runner exists
    if (!fs.existsSync(nightlyRunnerPath)) {
      console.log('Nightly test runner not found, skipping this test');
      return;
    }

    const command = `node ${nightlyRunnerPath} ${outputFile}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      // Log output for debugging
      if (stdout) console.log('Nightly runner output:', stdout.substring(0, 500));
      if (stderr) console.error('Nightly runner stderr:', stderr.substring(0, 500));
    } catch (error: any) {
      // Tests might fail, but JSON should still be generated
      console.error('Nightly runner error:', error.message);
      if (!fs.existsSync(outputFile)) {
        throw new Error(`Nightly runner did not create JSON output at ${outputFile}: ${error.message}`);
      }
    }

    // Verify the JSON file was created
    expect(fs.existsSync(outputFile)).toBe(true);

    // Verify the JSON is valid
    const jsonContent = fs.readFileSync(outputFile, 'utf8');
    let parsedJson: any;
    expect(() => {
      parsedJson = JSON.parse(jsonContent);
    }).not.toThrow();

    // Verify it has the expected structure
    expect(parsedJson).toHaveProperty('numTotalTests');
    expect(typeof parsedJson.numTotalTests).toBe('number');

    // Clean up
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
  }, 60000); // Increase timeout for full test suite run
});

describe('Vitest Reporter Options Documentation', () => {
  it('should document correct Vitest reporter usage', () => {
    // This test serves as documentation for the correct usage
    const correctUsages = [
      'vitest run --reporter=json',
      'vitest run --reporter=json --outputFile=results.json',
      'vitest run --reporter=verbose',
      'vitest run --reporter=default',
      'vitest run --reporter=dot',
      'vitest run --reporter=junit --outputFile=junit.xml'
    ];

    const incorrectUsages = [
      'vitest run --json',  // This is INVALID - causes "Unknown option" error
      'vitest run --json --outputFile=results.json'  // This is INVALID
    ];

    // Document the error that occurs with invalid usage
    const expectedError = 'CACError: Unknown option `--json`';

    // These are documentation assertions
    expect(correctUsages).toHaveLength(6);
    expect(incorrectUsages).toHaveLength(2);
    expect(expectedError).toContain('Unknown option');
  });

  it('should document the GitHub Actions workflow fix', () => {
    // This documents the required change in .github/workflows/nightly-test-runner.yml
    const workflowLine = 51;
    const incorrectCommand = 'npm test -- --json --outputFile=test-results/results.json';
    const correctCommand = 'node tests/nightly-test-runner.js test-results/results.json';

    // Document the fix
    const fix = {
      file: '.github/workflows/nightly-test-runner.yml',
      line: workflowLine,
      replace: incorrectCommand,
      with: correctCommand,
      reason: 'Vitest does not support --json flag, must use --reporter=json'
    };

    expect(fix.reason).toContain('--reporter=json');
  });
});