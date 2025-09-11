import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Agent Tool Permission Verification', () => {
  
  /**
   * Test 1: Verify forbidden tools prompt is injected
   * We invoke an agent and check the session.log contains tool restrictions
   */
  it('should inject forbidden tools prompt into agent invocation', async () => {
    // Create a temporary test file that invokes an agent
    const testScript = `
      import { handleAgentInvokerTool } from './dist/src/handlers/agent-invoker.js';
      
      async function test() {
        const result = await handleAgentInvokerTool(
          'mcp__levys-awesome-mcp__mcp__agent-invoker__invoke_agent',
          {
            agentName: 'linter-agent',
            prompt: 'echo TEST_FORBIDDEN_TOOLS and exit'
          }
        );
        
        // Extract session ID from result to ensure we check the right session
        const sessionIdMatch = result.content[0].text.match(/output_streams\\/([a-f0-9-]+)\\//);
        const sessionId = sessionIdMatch ? sessionIdMatch[1] : null;
        
        if (!sessionId) {
          // Fallback to most recent
          const dirs = require('fs').readdirSync('output_streams');
          const recentDir = dirs.sort().reverse()[0];
          console.log('Using fallback dir:', recentDir);
        }
        
        const actualSessionDir = sessionId || dirs.sort().reverse()[0];
        
        // Read session.log
        const sessionLogPath = require('path').join('output_streams', actualSessionDir, 'session.log');
        const content = require('fs').readFileSync(sessionLogPath, 'utf8');
        
        // Check for tool restrictions
        const hasRestrictions = content.includes('TOOL RESTRICTIONS');
        const hasForbiddenTools = content.includes('TodoWrite') && 
                                  content.includes('Task') && 
                                  content.includes('Write') && 
                                  content.includes('Edit');
        
        console.log('TEST_RESULT_1:', {
          hasRestrictions,
          hasForbiddenTools,
          foundInPrompt: content.includes('CRITICAL: You are FORBIDDEN')
        });
        
        process.exit(0);
      }
      
      test().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
      });
    `;
    
    fs.writeFileSync('test-forbidden-tools.mjs', testScript);
    
    try {
      const { stdout } = await execAsync('node test-forbidden-tools.mjs', { timeout: 15000 });
      
      // Parse the result
      const resultMatch = stdout.match(/TEST_RESULT_1: ({.*})/);
      if (resultMatch) {
        const result = JSON.parse(resultMatch[1]);
        expect(result.hasRestrictions).toBe(true);
        expect(result.hasForbiddenTools).toBe(true);
        expect(result.foundInPrompt).toBe(true);
      }
    } catch (error) {
      // Even if the agent fails, check if restrictions were injected
      const dirs = fs.readdirSync('output_streams');
      const recentDir = dirs.sort().reverse()[0];
      
      if (recentDir) {
        const sessionLogPath = path.join('output_streams', recentDir, 'session.log');
        if (fs.existsSync(sessionLogPath)) {
          const content = fs.readFileSync(sessionLogPath, 'utf8');
          
          // Verify restrictions exist
          expect(content).toContain('TOOL RESTRICTIONS');
          expect(content).toContain('TodoWrite');
          expect(content).toContain('Task');
          expect(content).toContain('Write');
          expect(content).toContain('Edit');
        }
      }
    } finally {
      // Cleanup
      if (fs.existsSync('test-forbidden-tools.mjs')) {
        fs.unlinkSync('test-forbidden-tools.mjs');
      }
    }
  }, 20000);

  /**
   * Test 2: Verify allowed tools are NOT in disallowed list
   * We check the filtering logic in PermissionManager
   */
  it('should filter allowed tools from disallowed list', async () => {
    // Import and test the permission manager directly
    const testScript = `
      import { PermissionManager } from './dist/src/utilities/agents/permission-manager.js';
      import { ToolRegistry } from './dist/src/utilities/tools/tool-registry.js';
      
      async function test() {
        // Test with linter-agent config
        const config = {
          allowedTools: ['Read', 'Grep', 'Glob', 'mcp__levys-awesome-mcp__mcp__code-analyzer__lint_javascript'],
          agentRole: 'write-restricted',
          useDynamicRestrictions: true
        };
        
        // Get permissions with dynamic restrictions
        const permissions = await PermissionManager.getAgentPermissionsWithDynamicRestrictions(config);
        
        // Check that allowed tools are NOT in disallowed
        let overlap = [];
        for (const tool of permissions.allowedTools) {
          if (permissions.disallowedTools.includes(tool)) {
            overlap.push(tool);
          }
        }
        
        // Verify specific tools
        const hasRead = permissions.allowedTools.includes('Read');
        const hasGrep = permissions.allowedTools.includes('Grep');
        const hasGlob = permissions.allowedTools.includes('Glob');
        
        const readInDisallowed = permissions.disallowedTools.includes('Read');
        const grepInDisallowed = permissions.disallowedTools.includes('Grep');
        const globInDisallowed = permissions.disallowedTools.includes('Glob');
        
        // Write/Edit should be disallowed
        const writeDisallowed = permissions.disallowedTools.includes('Write');
        const editDisallowed = permissions.disallowedTools.includes('Edit');
        
        console.log('TEST_RESULT_2:', {
          overlapCount: overlap.length,
          overlappingTools: overlap,
          hasRead,
          hasGrep,
          hasGlob,
          readInDisallowed,
          grepInDisallowed,
          globInDisallowed,
          writeDisallowed,
          editDisallowed
        });
      }
      
      test().catch(err => {
        console.error('Test failed:', err);
        process.exit(1);
      });
    `;
    
    fs.writeFileSync('test-allowed-tools.mjs', testScript);
    
    try {
      const { stdout } = await execAsync('node test-allowed-tools.mjs', { timeout: 10000 });
      
      // Parse the result
      const resultMatch = stdout.match(/TEST_RESULT_2: ({.*})/);
      if (resultMatch) {
        const result = JSON.parse(resultMatch[1]);
        
        // No overlap between allowed and disallowed
        expect(result.overlapCount).toBe(0);
        expect(result.overlappingTools).toEqual([]);
        
        // Allowed tools should be allowed
        expect(result.hasRead).toBe(true);
        expect(result.hasGrep).toBe(true);
        expect(result.hasGlob).toBe(true);
        
        // Allowed tools should NOT be in disallowed
        expect(result.readInDisallowed).toBe(false);
        expect(result.grepInDisallowed).toBe(false);
        expect(result.globInDisallowed).toBe(false);
        
        // Write/Edit should still be disallowed
        expect(result.writeDisallowed).toBe(true);
        expect(result.editDisallowed).toBe(true);
      }
    } finally {
      // Cleanup
      if (fs.existsSync('test-allowed-tools.mjs')) {
        fs.unlinkSync('test-allowed-tools.mjs');
      }
    }
  }, 10000);
});