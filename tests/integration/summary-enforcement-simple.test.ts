import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Summary Enforcement Mechanism Test', () => {
  it('should verify summary enforcement is properly integrated', () => {
    // Read the agent-invoker.ts file
    const invokerPath = path.join(projectRoot, 'src/handlers/agent-invoker.ts');
    const invokerContent = fs.readFileSync(invokerPath, 'utf8');

    // Verify the enforcement mechanism components exist
    const enforcementComponents = {
      summaryInstruction: 'IMPORTANT: When you complete your task, create a summary report',
      sessionIdInjection: 'SESSION_ID: ${sessionId}',
      outputDirInjection: 'OUTPUT_DIR: output_streams/${sessionId}/'
    };

    // Check each component exists
    for (const [name, text] of Object.entries(enforcementComponents)) {
      expect(invokerContent.includes(text), `Missing ${name}: ${text}`).toBe(true);
    }

    // Verify the enforcement mechanism is active (not commented out)
    const lines = invokerContent.split('\n');

    // Check that the session info with enforcement is defined
    const hasSessionInfo = invokerContent.includes('const sessionInfo =') || invokerContent.includes('let sessionInfo =');
    expect(hasSessionInfo).toBe(true);

    // Check that enforcement is not commented out
    const enforcementLines = lines.filter(line =>
      line.includes('IMPORTANT: When you complete your task') &&
      !line.trim().startsWith('//') &&
      !line.includes('//') || line.indexOf('IMPORTANT') < line.indexOf('//')
    );

    expect(enforcementLines.length).toBeGreaterThan(0);

    // Check that the enhanced prompt is used in the final prompt
    const hasFinalPrompt = invokerContent.includes('finalPrompt') && invokerContent.includes('enhancedPrompt');
    expect(hasFinalPrompt).toBe(true);

    // Test passes if all assertions above are met
  });
});