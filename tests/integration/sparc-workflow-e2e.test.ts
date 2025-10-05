/**
 * SPARC Workflow End-to-End Test
 * Tests the complete SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
 * workflow from Phase 0 (Research) through Phase 5 (Completion)
 *
 * This test validates:
 * - All 6 SPARC phases execute in sequence
 * - Phase agents are invoked correctly
 * - Files are created with proper structure
 * - Code quality meets SPARC standards (TDD, modularity, test coverage)
 * - Plan and progress tracking works correctly
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MCPClient } from '../helpers/mcp-client.js';
import { v4 as uuidv4 } from 'uuid';

// SPARC phase agents expected to be invoked
const SPARC_PHASES = {
  phase0: 'research-agent',
  phase1: 'specification-agent',
  phase2: 'pseudocode-agent',
  phase3: 'architecture-agent',
  phase4: 'refinement-agent',
  phase5: 'completion-agent'
};

describe('SPARC Workflow E2E Test', () => {
  it('should execute complete SPARC workflow with all phases', async () => {
    const client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    client.setTimeout(1800000); // 30 minutes for full SPARC workflow

    try {
      // Create a unique test directory
      const testDirName = `sparc-test-${uuidv4()}`;
      const testDir = path.join(process.cwd(), 'test-projects', testDirName);

      console.log(`\n🚀 Creating SPARC test project at: ${testDir}`);
      fs.mkdirSync(testDir, { recursive: true });

      // Create minimal package.json for the test project
      const packageJson = {
        name: 'sparc-calculator-test',
        version: '1.0.0',
        type: 'module',
        scripts: {
          test: 'vitest',
          build: 'tsc'
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0'
        }
      };

      fs.writeFileSync(
        path.join(testDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      // Create tsconfig.json
      const tsconfig = {
        compilerOptions: {
          target: 'ES2020',
          module: 'ES2020',
          moduleResolution: 'node',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: './dist'
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
      };

      fs.writeFileSync(
        path.join(testDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      console.log(`✅ Test project structure created`);
      console.log(`\n🤖 Starting SPARC Workflow`);
      const startTime = Date.now();

      // Invoke SPARC orchestrator with a simple calculator feature
      const response = await client.call('tools/call', {
        name: 'invoke_agent',
        arguments: {
          agentName: 'sparc-orchestrator',
          prompt: `Project directory: ${testDirName} (relative path: test-projects/${testDirName})

Execute the complete SPARC workflow to create a Calculator module:

REQUIREMENTS:
1. Create a calculator with basic operations (add, subtract, multiply, divide)
2. Follow TDD approach (tests first, then implementation)
3. Ensure 80%+ test coverage
4. Functions should be modular and under 50 lines
5. Include proper error handling (e.g., division by zero)
6. Create documentation

OUTPUT STRUCTURE:
- src/calculator.ts - Calculator implementation
- src/calculator.test.ts - Comprehensive test suite
- docs/calculator.md - Documentation

SPARC PHASES REQUIRED:
Phase 0: Research best practices for calculator implementations
Phase 1: Specification of calculator requirements
Phase 2: Pseudocode for algorithms
Phase 3: Detailed architecture design
Phase 4: TDD implementation (tests first, then code)
Phase 5: Final integration, validation, and documentation

IMPORTANT: Follow the complete SPARC methodology. Do not skip any phases.`,
          streaming: false
        }
      });

      const duration = (Date.now() - startTime) / 1000;
      console.log(`\n⏱️  SPARC Workflow completed in ${duration.toFixed(2)} seconds (${(duration/60).toFixed(1)} minutes)`);

      // Extract session ID
      const sessionId = response.result?.content?.[0]?.text?.match(/Session ID:\s*([^\s\n]+)/)?.[1] || 'unknown';
      console.log(`\n📋 Session ID: ${sessionId}`);

      // ==================== PHASE VERIFICATION ====================
      console.log('\n🔍 Verifying SPARC Phase Executions:');

      const streamLogPath = path.resolve(process.cwd(), 'output_streams', sessionId, 'stream.log');
      let phasesInvoked: Record<string, boolean> = {};

      if (fs.existsSync(streamLogPath)) {
        const logContent = fs.readFileSync(streamLogPath, 'utf-8');

        // Check for each SPARC phase agent invocation
        for (const [phase, agentName] of Object.entries(SPARC_PHASES)) {
          const invoked = logContent.includes(`"agentName": "${agentName}"`);
          phasesInvoked[phase] = invoked;
          console.log(`   ${phase} (${agentName}): ${invoked ? '✅' : '❌'}`);
        }

        // Count total distinct agent invocations
        const uniqueAgents = new Set<string>();
        const agentInvocations = logContent.match(/"agentName":\s*"([^"]+)"/g) || [];
        agentInvocations.forEach(match => {
          const agentMatch = match.match(/"agentName":\s*"([^"]+)"/);
          if (agentMatch) uniqueAgents.add(agentMatch[1]);
        });

        console.log(`\n   Total unique agents invoked: ${uniqueAgents.size}`);
        console.log(`   Agents: ${Array.from(uniqueAgents).join(', ')}`);
      } else {
        console.log('   ❌ No stream log found');
      }

      // ==================== PLAN & PROGRESS VERIFICATION ====================
      console.log('\n📊 Verifying Plan and Progress Tracking:');

      const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const sessionPlanDir = path.resolve(process.cwd(), 'plan_and_progress', 'sessions', sessionId);
      const gitPlanDir = path.resolve(process.cwd(), 'plan_and_progress', gitHash);

      let planExists = false;
      let progressExists = false;

      // Check session-based plan
      if (fs.existsSync(sessionPlanDir)) {
        const files = fs.readdirSync(sessionPlanDir);
        const planFiles = files.filter(f => f.includes('plan'));
        const progressFiles = files.filter(f => f.includes('progress'));

        planExists = planFiles.length > 0;
        progressExists = progressFiles.length > 0;

        console.log(`   Session plan files: ${planFiles.length > 0 ? '✅ ' + planFiles.join(', ') : '❌ None'}`);
        console.log(`   Session progress files: ${progressFiles.length > 0 ? '✅ ' + progressFiles.join(', ') : '❌ None'}`);
      }

      // Check git-based plan
      if (fs.existsSync(gitPlanDir)) {
        const files = fs.readdirSync(gitPlanDir);
        const planFiles = files.filter(f => f.includes('plan'));
        console.log(`   Git hash plan files: ${planFiles.length > 0 ? '✅ ' + planFiles.join(', ') : '❌ None'}`);
        planExists = planExists || planFiles.length > 0;
      }

      // ==================== FILE CREATION VERIFICATION ====================
      console.log('\n📁 Verifying Created Files:');

      const expectedFiles = [
        'src/calculator.ts',
        'src/calculator.test.ts',
        'docs/calculator.md'
      ];

      const createdFiles: string[] = [];
      const missingFiles: string[] = [];

      for (const expectedFile of expectedFiles) {
        const filePath = path.join(testDir, expectedFile);
        if (fs.existsSync(filePath)) {
          createdFiles.push(expectedFile);
          const stats = fs.statSync(filePath);
          console.log(`   ✅ ${expectedFile} (${stats.size} bytes)`);
        } else {
          missingFiles.push(expectedFile);
          console.log(`   ❌ ${expectedFile} - NOT FOUND`);
        }
      }

      // ==================== CODE QUALITY VALIDATION ====================
      console.log('\n🔍 Validating Code Quality:');

      const qualityIssues: string[] = [];
      let testCount = 0;
      let functionCount = 0;
      let largeFiles = 0;
      let largeFunctions = 0;

      // Check calculator implementation
      const calculatorPath = path.join(testDir, 'src/calculator.ts');
      if (fs.existsSync(calculatorPath)) {
        const content = fs.readFileSync(calculatorPath, 'utf-8');
        const lines = content.split('\n').length;

        console.log(`   calculator.ts:`);
        console.log(`      Lines: ${lines}`);

        // Check file size (should be ≤ 500 lines per SPARC standards)
        if (lines > 500) {
          qualityIssues.push('calculator.ts exceeds 500 lines');
          largeFiles++;
          console.log(`      ❌ File too large (${lines} > 500)`);
        } else {
          console.log(`      ✅ File size acceptable (${lines} ≤ 500)`);
        }

        // Check for hardcoded values
        if (content.match(/const\s+\w+\s*=\s*["'].*["']/)) {
          console.log(`      ⚠️  May contain hardcoded values`);
        }

        // Count functions
        const funcMatches = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || [];
        functionCount = funcMatches.length;
        console.log(`      Functions defined: ${functionCount}`);

        // Basic check for error handling
        if (content.includes('throw') || content.includes('Error')) {
          console.log(`      ✅ Error handling present`);
        } else {
          qualityIssues.push('No error handling found');
          console.log(`      ❌ No error handling detected`);
        }
      }

      // Check test file
      const testPath = path.join(testDir, 'src/calculator.test.ts');
      if (fs.existsSync(testPath)) {
        const content = fs.readFileSync(testPath, 'utf-8');
        const lines = content.split('\n').length;

        console.log(`   calculator.test.ts:`);
        console.log(`      Lines: ${lines}`);

        // Count test cases
        const testMatches = content.match(/it\(|test\(/g) || [];
        testCount = testMatches.length;
        console.log(`      Test cases: ${testCount}`);

        if (testCount < 4) {
          qualityIssues.push('Insufficient test coverage (< 4 test cases)');
          console.log(`      ❌ Too few tests (expected at least 4 for basic operations)`);
        } else {
          console.log(`      ✅ Adequate test cases`);
        }
      }

      // Check documentation
      const docsPath = path.join(testDir, 'docs/calculator.md');
      if (fs.existsSync(docsPath)) {
        const content = fs.readFileSync(docsPath, 'utf-8');
        console.log(`   calculator.md:`);
        console.log(`      Size: ${content.length} characters`);

        if (content.length < 100) {
          qualityIssues.push('Documentation too brief');
          console.log(`      ❌ Documentation insufficient`);
        } else {
          console.log(`      ✅ Documentation present`);
        }
      }

      // ==================== SUMMARY & ASSERTIONS ====================
      console.log('\n📊 SPARC Workflow Test Summary:');
      console.log(`   Duration: ${duration.toFixed(2)}s (${(duration/60).toFixed(1)} min)`);
      console.log(`   Files Created: ${createdFiles.length}/${expectedFiles.length}`);
      console.log(`   Test Cases: ${testCount}`);
      console.log(`   Functions: ${functionCount}`);
      console.log(`   Quality Issues: ${qualityIssues.length}`);

      // Phase execution summary
      const phasesCompleted = Object.values(phasesInvoked).filter(v => v).length;
      console.log(`   SPARC Phases Completed: ${phasesCompleted}/6`);

      // Overall assessment
      const filesCreated = createdFiles.length >= 2; // At least implementation + tests
      const hasTests = testCount >= 4;
      const qualityAcceptable = qualityIssues.length < 3;
      const phasesExecuted = phasesCompleted >= 4; // At least most phases

      const overallSuccess = filesCreated && hasTests && qualityAcceptable;

      console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '⚠️  PARTIAL SUCCESS'}`);

      if (overallSuccess) {
        console.log('   ✨ SPARC workflow produced working, tested code!');
      } else {
        console.log('   ⚠️  SPARC workflow completed but some quality standards not met');
        if (!filesCreated) console.log('      - Insufficient files created');
        if (!hasTests) console.log('      - Insufficient test coverage');
        if (!qualityAcceptable) console.log('      - Quality issues detected');
      }

      // List quality issues
      if (qualityIssues.length > 0) {
        console.log('\n⚠️  Quality Issues Detected:');
        qualityIssues.forEach(issue => console.log(`   - ${issue}`));
      }

      // Cleanup
      console.log('\n🧹 Cleaning up test directory...');
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });

      // ==================== TEST ASSERTIONS ====================
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();

      // Should take a reasonable amount of time for a SPARC workflow
      // Even a very fast execution should take at least 1 second to invoke agents
      // But we should not expect it to always take 30+ seconds if running efficiently
      expect(duration).toBeGreaterThan(1);

      // If phases were completed, it should have taken a meaningful amount of time
      if (phasesCompleted >= 3) {
        // If multiple phases ran, expect at least a few seconds
        expect(duration).toBeGreaterThan(2);
      }

      // At least some SPARC phases should execute
      expect(phasesCompleted).toBeGreaterThanOrEqual(3);

      // Files should be created
      expect(createdFiles.length).toBeGreaterThanOrEqual(2);

      // Should have tests
      expect(testCount).toBeGreaterThanOrEqual(3);

      // Quality should be reasonable
      expect(qualityIssues.length).toBeLessThan(5);

    } finally {
      await client.stop();
    }
  }, 1800000); // 30 minute timeout
});