import { executeCommand, validateProjectDirectory } from '../shared/utils.js';
import { TestValidationResult } from '../shared/types.js';
import { existsSync } from 'fs';
import * as path from 'path';

export const testExecutorTools = [
  {
    name: 'mcp__levys-awesome-mcp__mcp__test-executor__run_tests',
    description: 'Execute test suite with support for multiple test frameworks',
    inputSchema: {
      type: 'object' as const,
      properties: {
        framework: {
          type: 'string',
          enum: ['jest', 'vitest', 'playwright', 'all'],
          description: 'Test framework to use',
          default: 'all'
        },
        coverage: {
          type: 'boolean',
          description: 'Generate coverage report',
          default: false
        },
        watch: {
          type: 'boolean',
          description: 'Run tests in watch mode',
          default: false
        }
      }
    }
  },
  {
    name: 'mcp__levys-awesome-mcp__mcp__test-executor__validate_and_run_tests',
    description: 'Validate test environment and run comprehensive test suite',
    inputSchema: {
      type: 'object' as const,
      properties: {
        validate_only: {
          type: 'boolean',
          description: 'Only validate environment without running tests',
          default: false
        }
      }
    }
  }
];

async function validateTestEnvironment(): Promise<TestValidationResult> {
  const errors: string[] = [];
  const coverage = {
    frontend: false,
    backend: false,
    e2e: false
  };

  // Check if package.json exists in root
  if (!existsSync('package.json')) {
    errors.push('Root package.json not found');
  }

  // Check backend directory with proper validation
  const backendDir = path.join(process.cwd(), 'backend');
  const backendValidation = validateProjectDirectory(backendDir);
  if (backendValidation.valid) {
    coverage.backend = true;
  } else if (existsSync(backendDir)) {
    // Directory exists but is invalid
    errors.push(`Backend: ${backendValidation.error}`);
  }

  // Check frontend directory with proper validation
  const frontendDir = path.join(process.cwd(), 'frontend');
  const frontendValidation = validateProjectDirectory(frontendDir);
  if (frontendValidation.valid) {
    coverage.frontend = true;
  } else if (existsSync(frontendDir)) {
    // Directory exists but is invalid
    errors.push(`Frontend: ${frontendValidation.error}`);
  }

  // Check for playwright config
  if (existsSync('playwright.config.ts') || existsSync('playwright.config.js')) {
    coverage.e2e = true;
  }

  return {
    valid: errors.length === 0,
    errors,
    coverage
  };
}

async function runTestFramework(framework: string, options: { coverage?: boolean; watch?: boolean } = {}): Promise<string[]> {
  const results: string[] = [];
  const { coverage = false, watch = false } = options;

  switch (framework) {
    case 'jest':
      try {
        const args = ['test'];
        if (coverage) args.push('--coverage');
        if (watch) args.push('--watch');
        
        const result = await executeCommand('npm', ['run', ...args]);
        results.push(`Jest Tests: ${result.success ? 'PASSED' : 'FAILED'}\n${result.stdout}\n${result.stderr}`);
      } catch (error) {
        results.push(`Jest Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      break;

    case 'vitest':
      try {
        const args = ['run', 'test:unit'];
        if (coverage) args.push('--coverage');
        if (watch) args.push('--watch');
        
        const result = await executeCommand('npm', args);
        results.push(`Vitest Tests: ${result.success ? 'PASSED' : 'FAILED'}\n${result.stdout}\n${result.stderr}`);
      } catch (error) {
        results.push(`Vitest Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      break;

    case 'playwright':
      try {
        const args = ['playwright', 'test'];
        if (!watch) args.push('--reporter=line');
        
        const result = await executeCommand('npx', args);
        results.push(`Playwright Tests: ${result.success ? 'PASSED' : 'FAILED'}\n${result.stdout}\n${result.stderr}`);
      } catch (error) {
        results.push(`Playwright Error: ${error instanceof Error ? error.message : String(error)}`);
      }
      break;

    case 'all':
      // Run all available test frameworks
      const frameworks = ['jest', 'vitest', 'playwright'];
      for (const fw of frameworks) {
        const frameworkResults = await runTestFramework(fw, options);
        results.push(...frameworkResults);
      }
      break;

    default:
      results.push(`Unknown framework: ${framework}`);
  }

  return results;
}

export async function handleTestExecutorTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__test-executor__run_tests': {
        const { framework = 'all', coverage = false, watch = false } = args;
        
        // Validate environment first
        const validation = await validateTestEnvironment();
        if (!validation.valid) {
          return {
            content: [{
              type: 'text',
              text: `Test environment validation failed:\n${validation.errors.join('\n')}`
            }],
            isError: true
          };
        }

        const results = await runTestFramework(framework, { coverage, watch });
        
        return {
          content: [{
            type: 'text',
            text: `Test Execution Results:\n\n${results.join('\n\n---\n\n')}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__test-executor__validate_and_run_tests': {
        const { validate_only = false } = args;
        
        // Validate environment
        const validation = await validateTestEnvironment();
        
        let output = `Test Environment Validation:\n`;
        output += `Status: ${validation.valid ? 'VALID' : 'INVALID'}\n`;
        output += `Coverage:\n`;
        output += `  Backend: ${validation.coverage?.backend ? 'Available' : 'Not Available'}\n`;
        output += `  Frontend: ${validation.coverage?.frontend ? 'Available' : 'Not Available'}\n`;
        output += `  E2E: ${validation.coverage?.e2e ? 'Available' : 'Not Available'}\n`;
        
        if (validation.errors.length > 0) {
          output += `\nErrors:\n${validation.errors.map(e => `- ${e}`).join('\n')}\n`;
        }

        if (validate_only) {
          return {
            content: [{
              type: 'text',
              text: output
            }],
            isError: !validation.valid
          };
        }

        if (!validation.valid) {
          return {
            content: [{
              type: 'text',
              text: output + '\nSkipping test execution due to validation errors.'
            }],
            isError: true
          };
        }

        // Run comprehensive tests
        const results = await runTestFramework('all', { coverage: true });
        output += `\n\nTest Execution Results:\n${results.join('\n\n---\n\n')}`;
        
        return {
          content: [{
            type: 'text',
            text: output
          }]
        };
      }

      default:
        throw new Error(`Unknown test executor tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in test executor tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}