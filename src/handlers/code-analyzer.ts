import { executeCommand } from '../shared/utils.js';

export const codeAnalyzerTools = [
  {
    name: 'lint_javascript',
    description: 'Run ESLint on JavaScript/TypeScript files',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Path to file or directory to lint'
        },
        fix: {
          type: 'boolean',
          description: 'Auto-fix issues if possible',
          default: false
        }
      },
      required: ['path']
    }
  },
  {
    name: 'security_scan',
    description: 'Run security analysis using npm audit and bandit (for Python)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['npm', 'python', 'all'],
          description: 'Type of security scan to run',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'dependency_check',
    description: 'Check for outdated dependencies',
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['npm', 'all'],
          description: 'Package manager to check',
          default: 'npm'
        }
      }
    }
  },
  {
    name: 'code_quality_scan',
    description: 'Run comprehensive code quality analysis',
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'Path to scan',
          default: '.'
        }
      }
    }
  }
];

export async function handleCodeAnalyzerTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript': {
        const { path: targetPath, fix = false } = args;
        
        const lintArgs = ['run', 'lint', '--', targetPath];
        if (fix) {
          lintArgs.push('--fix');
        }

        const result = await executeCommand('npm', lintArgs);
        
        return {
          content: [{
            type: 'text',
            text: `ESLint Results:\n\nExit code: ${result.code}\n\nOutput:\n${result.stdout}\n\nErrors:\n${result.stderr}`
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__code-analyzer__security_scan': {
        const { type = 'all' } = args;
        const results = [];

        if (type === 'npm' || type === 'all') {
          try {
            const npmAudit = await executeCommand('npm', ['audit', '--json']);
            results.push(`NPM Security Audit:\n${npmAudit.stdout || npmAudit.stderr}`);
          } catch (error) {
            results.push(`NPM Audit Error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (type === 'python' || type === 'all') {
          try {
            const banditScan = await executeCommand('bandit', ['-r', '.', '-f', 'json']);
            results.push(`Bandit Python Security Scan:\n${banditScan.stdout}`);
          } catch (error) {
            results.push(`Bandit not available or error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        return {
          content: [{
            type: 'text',
            text: results.join('\n\n---\n\n')
          }]
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__code-analyzer__dependency_check': {
        const { type = 'npm' } = args;
        
        if (type === 'npm' || type === 'all') {
          const outdated = await executeCommand('npm', ['outdated', '--json']);
          
          return {
            content: [{
              type: 'text',
              text: `Dependency Check Results:\n\nExit code: ${outdated.code}\n\nOutdated packages:\n${outdated.stdout || 'All dependencies are up to date'}\n\nErrors:\n${outdated.stderr || 'None'}`
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: 'Unsupported dependency check type'
          }],
          isError: true
        };
      }

      case 'mcp__levys-awesome-mcp__mcp__code-analyzer__code_quality_scan': {
        const { path: scanPath = '.' } = args;
        const results = [];

        // Run multiple quality checks
        try {
          const lintResult = await executeCommand('npm', ['run', 'lint']);
          results.push(`Linting Results:\n${lintResult.stdout}\n${lintResult.stderr}`);
        } catch (error) {
          results.push(`Linting Error: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
          const auditResult = await executeCommand('npm', ['audit']);
          results.push(`Security Audit:\n${auditResult.stdout}`);
        } catch (error) {
          results.push(`Security Audit Error: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
          const outdatedResult = await executeCommand('npm', ['outdated']);
          results.push(`Outdated Dependencies:\n${outdatedResult.stdout || 'All dependencies are up to date'}`);
        } catch (error) {
          results.push(`Dependency Check Error: ${error instanceof Error ? error.message : String(error)}`);
        }

        return {
          content: [{
            type: 'text',
            text: `Code Quality Scan Results:\n\n${results.join('\n\n---\n\n')}`
          }]
        };
      }

      default:
        throw new Error(`Unknown code analyzer tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error in code analyzer tool: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}