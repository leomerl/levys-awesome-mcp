import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

describe('Summary Enforcement Simple Test', () => {
  it('should include summary enforcement in agent prompt', () => {
    // Read the agent-invoker.ts file
    const invokerPath = path.join(projectRoot, 'src/handlers/agent-invoker.ts');
    const invokerContent = fs.readFileSync(invokerPath, 'utf8');
    
    // Check if the summary enforcement message is present in the code
    const hasSummaryEnforcement = invokerContent.includes('IMPORTANT: When you complete your task, create a summary report');
    const hasSessionIdPlaceholder = invokerContent.includes('SESSION_ID: ${sessionId}');
    const hasOutputDirPlaceholder = invokerContent.includes('OUTPUT_DIR: output_streams/${sessionId}/');
    
    // These should fail when the code is broken
    expect(hasSummaryEnforcement).toBe(true);
    expect(hasSessionIdPlaceholder).toBe(true);
    expect(hasOutputDirPlaceholder).toBe(true);
    
    // Also check that it's not commented out
    const lines = invokerContent.split('\n');
    let foundEnhancedPrompt = false;
    let isCommented = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for the enhancedPrompt assignment
      if (line.includes('const enhancedPrompt =')) {
        foundEnhancedPrompt = true;
        
        // Check if it's just assigning the prompt without additions
        if (line.includes('`${prompt}`') && !line.includes('IMPORTANT:')) {
          // This means summary enforcement is broken
          isCommented = true;
        }
        
        // Check the next few lines for the summary enforcement
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].includes('IMPORTANT: When you complete your task')) {
            // Check if it's in a comment
            const beforeImportant = lines[j].substring(0, lines[j].indexOf('IMPORTANT:'));
            if (beforeImportant.includes('//')) {
              isCommented = true;
            } else {
              isCommented = false;
            }
            break;
          }
        }
        break;
      }
    }
    
    expect(foundEnhancedPrompt).toBe(true);
    expect(isCommented).toBe(false);
    
    console.log('Summary enforcement check:', {
      hasSummaryEnforcement,
      hasSessionIdPlaceholder,
      hasOutputDirPlaceholder,
      foundEnhancedPrompt,
      isCommented
    });
  });
});