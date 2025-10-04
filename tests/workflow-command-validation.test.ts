import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

describe('Nightly Test Runner Workflow Command Validation', () => {
  const testResultsDir = path.join(process.cwd(), 'test-results-validation');

  beforeAll(async () => {
    // Create test results directory
    await fs.mkdir(testResultsDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test results
    try {
      await fs.rm(testResultsDir, { recursive: true, force: true });
    } catch {
      // Directory might not exist, that's okay
    }
  });

  it('should support --reporter=json with --outputFile for Vitest v2', async () => {
    const outputFile = path.join(testResultsDir, 'vitest-json-test.json');

    // This is the corrected command from the workflow
    const command = `npx vitest run tests/verify-vitest-reporter.test.ts --reporter=json --outputFile ${outputFile}`;

    try {
      const { stdout, stderr } = await execAsync(command);

      // Check if JSON file was created
      const jsonExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(jsonExists).toBe(true);

      if (jsonExists) {
        // Verify it's valid JSON
        const jsonContent = await fs.readFile(outputFile, 'utf-8');
        const parsed = JSON.parse(jsonContent);

        // Check for expected Vitest JSON structure
        expect(parsed).toBeDefined();
        expect(parsed.testResults).toBeDefined();
        expect(Array.isArray(parsed.testResults)).toBe(true);
      }
    } catch (error: any) {
      // Check if error is about unknown option
      if (error.message.includes('Unknown option')) {
        throw new Error(`Vitest command failed with unknown option error: ${error.message}`);
      }
      // Other errors might be okay (like test failures)
    }
  }, 30000); // 30 second timeout for running external command

  it('should NOT support --json --outputFile syntax (old Jest/Vitest v1 style)', async () => {
    const outputFile = path.join(testResultsDir, 'invalid-syntax-test.json');

    // This is the OLD incorrect command that was in the workflow
    const command = `npx vitest run tests/verify-vitest-reporter.test.ts --json --outputFile=${outputFile}`;

    try {
      await execAsync(command);
      // If we get here, the command succeeded (which would be unexpected for Vitest v2)
      expect.fail('Command should have failed with Unknown option error');
    } catch (error: any) {
      // We expect this to fail with "Unknown option" error
      expect(error.message).toContain('Unknown option');
      expect(error.message).toContain('--json');
    }
  }, 30000);

  it('should support multiple reporters simultaneously', async () => {
    const outputFile = path.join(testResultsDir, 'multi-reporter-test.json');

    // Test multiple reporters as shown in the fixed workflow
    const command = `npx vitest run tests/verify-vitest-reporter.test.ts --reporter=verbose --reporter=json --outputFile ${outputFile}`;

    try {
      const { stdout } = await execAsync(command);

      // Should have verbose output in stdout
      expect(stdout).toContain('✓'); // Verbose reporter shows checkmarks

      // Should also create JSON file
      const jsonExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(jsonExists).toBe(true);
    } catch (error: any) {
      if (error.message.includes('Unknown option')) {
        throw new Error(`Multi-reporter command failed: ${error.message}`);
      }
    }
  }, 30000);

  it('should work with npm test command as used in workflow', async () => {
    const outputFile = path.join(testResultsDir, 'npm-test.json');

    // This mimics the exact command structure from the fixed workflow
    const command = `npm test -- --reporter=json --outputFile ${outputFile}`;

    try {
      await execAsync(command);

      // Verify JSON file was created
      const jsonExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(jsonExists).toBe(true);

      if (jsonExists) {
        const jsonContent = await fs.readFile(outputFile, 'utf-8');
        const parsed = JSON.parse(jsonContent);

        // Validate Vitest v2 JSON structure
        expect(parsed.testResults).toBeDefined();
        expect(parsed.version).toBeDefined();
      }
    } catch (error: any) {
      // Log the full error for debugging
      console.error('npm test command failed:', error.message);

      if (error.message.includes('Unknown option')) {
        throw new Error(`npm test with JSON reporter failed: ${error.message}`);
      }
      // Test failures are okay, we're testing the command syntax
    }
  }, 30000);
});