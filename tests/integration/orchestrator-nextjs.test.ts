/**
 * Orchestrator Test with Next.js Project and Fixed Content Writer
 * Tests the complete orchestrator workflow with file creation
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MCPClient } from '../helpers/mcp-client.js';
import { v4 as uuidv4 } from 'uuid';
import { ContentValidator } from '../helpers/content-validation.js';
import { authFeatureValidators } from '../helpers/validation-rules.js';

describe('Orchestrator Next.js File Creation Test', () => {
  it('should create actual files via agent delegation', async () => {
    const client = new MCPClient();
    await client.start('npx', ['tsx', 'src/index.ts']);
    client.setTimeout(600000); // 10 minutes

    try {
      // Create a unique test directory within the project
      const testDirName = `nextjs-orchestrator-${uuidv4()}`;
      const testDir = path.join(process.cwd(), 'test-projects', testDirName);
      console.log(`\n🚀 Creating Next.js project at: ${testDir}`);

      // Create Next.js project with TypeScript
      console.log('📦 Installing Next.js (this may take a minute)...');
      execSync(
        `npx create-next-app@latest ${testDir} --typescript --tailwind --app --no-git --yes`,
        { stdio: 'pipe' }
      );

      console.log(`✅ Next.js project created at ${testDir}`);
      console.log(`\n🤖 Starting Orchestrator Task`);
      const startTime = Date.now();

      // Task: Create an authentication system
      const response = await client.call('tools/call', {
        name: 'invoke_agent',
        arguments: {
          agentName: 'orchestrator-agent',
          prompt: `Project directory: ${testDirName} (relative path: test-projects/${testDirName})

Please orchestrate the creation of a user authentication feature:

1. First, plan the implementation with planner-agent
2. Create a login form component at test-projects/${testDirName}/app/components/LoginForm.tsx
3. Create an auth API route at test-projects/${testDirName}/app/api/auth/route.ts
4. Create auth utilities at test-projects/${testDirName}/lib/auth.ts

Requirements:
- LoginForm should have email and password fields
- API route should handle POST requests for login
- Auth utilities should have validateUser and createSession functions

IMPORTANT: This requires actual file creation. Please delegate to the appropriate agents to create these files using relative paths within the test-projects directory.`,
          streaming: false
        }
      });

      const duration = (Date.now() - startTime) / 1000;
      console.log(`\n⏱️  Orchestration completed in ${duration.toFixed(2)} seconds`);

      // Get session ID from response
      const sessionId = response.result?.sessionId || 'unknown';
      console.log(`\n📋 Session ID: ${sessionId}`);

      // Check for plan and progress files
      console.log('\n🔍 Checking for Plan and Progress Files:');
      const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const planProgressDir = `/home/gofri/projects/levys-awesome-mcp/plan_and_progress/${gitHash}`;
      const sessionPlanDir = `/home/gofri/projects/levys-awesome-mcp/plan_and_progress/sessions/${sessionId}`;

      const planFiles = fs.existsSync(planProgressDir)
        ? fs.readdirSync(planProgressDir).filter(f => f.startsWith('plan-'))
        : [];
      const sessionPlanFiles = fs.existsSync(sessionPlanDir)
        ? fs.readdirSync(sessionPlanDir).filter(f => f.includes('plan'))
        : [];

      console.log(`- Git Hash: ${gitHash}`);
      console.log(`- Plan files (git): ${planFiles.length > 0 ? '✅ ' + planFiles.join(', ') : '❌ None'}`);
      console.log(`- Plan files (session): ${sessionPlanFiles.length > 0 ? '✅ ' + sessionPlanFiles.join(', ') : '❌ None'}`);

      // Check if agents were actually invoked
      console.log('\n🤖 Checking Agent Invocations:');
      const streamLogPath = `/home/gofri/projects/levys-awesome-mcp/output_streams/${sessionId}/stream.log`;
      let agentsInvoked = [];

      if (fs.existsSync(streamLogPath)) {
        const logContent = fs.readFileSync(streamLogPath, 'utf-8');

        // Check for agent invocations
        const plannerInvoked = logContent.includes('"agentName": "planner-agent"');
        const frontendInvoked = logContent.includes('"agentName": "frontend-agent"');
        const backendInvoked = logContent.includes('"agentName": "backend-agent"');

        if (plannerInvoked) agentsInvoked.push('planner-agent');
        if (frontendInvoked) agentsInvoked.push('frontend-agent');
        if (backendInvoked) agentsInvoked.push('backend-agent');

        console.log(`- Planner invoked: ${plannerInvoked ? '✅' : '❌'}`);
        console.log(`- Frontend agent invoked: ${frontendInvoked ? '✅' : '❌'}`);
        console.log(`- Backend agent invoked: ${backendInvoked ? '✅' : '❌'}`);
        console.log(`- Total agents invoked: ${agentsInvoked.length}`);
      } else {
        console.log('❌ No stream log found');
      }

      // Comprehensive Content Validation with Quality Scoring
      console.log('\n🔍 Running Comprehensive Content Validation:');

      // Create validator instance
      const validator = new ContentValidator(testDir);

      // Run validation for all components
      const { results, summary } = await validator.validateAll(authFeatureValidators);

      // Display detailed results
      console.log('\n📋 Component Validation Results:');

      let filesCreated = 0;
      let qualityScore = 0;

      for (const result of results) {
        if (result.exists) {
          filesCreated++;

          // Display component result with color coding
          const scoreColor = result.overallScore >= 80 ? '🟢' :
                            result.overallScore >= 60 ? '🟡' : '🔴';

          console.log(`${scoreColor} ${result.component}:`);
          console.log(`   📁 File: ${result.filePath ? path.relative(testDir, result.filePath) : 'NOT FOUND'}`);
          console.log(`   📊 Overall Score: ${result.overallScore}%`);
          console.log(`   📈 Breakdown: Basic(${result.basicScore}%) Pattern(${result.patternScore}%) Quality(${result.qualityScore}%) Integration(${result.integrationScore}%)`);

          // Show critical issues
          const criticalIssues = result.issues.filter(i => i.severity === 'error');
          if (criticalIssues.length > 0) {
            console.log(`   ❌ Critical Issues: ${criticalIssues.length}`);
            criticalIssues.forEach(issue => {
              console.log(`      - ${issue.description}`);
            });
          }

          // Show warnings (max 3)
          const warnings = result.issues.filter(i => i.severity === 'warning').slice(0, 3);
          if (warnings.length > 0) {
            console.log(`   ⚠️  Warnings: ${warnings.length}${result.issues.filter(i => i.severity === 'warning').length > 3 ? '+' : ''}`);
            warnings.forEach(warning => {
              console.log(`      - ${warning.description}`);
            });
          }

          // Show top recommendations
          if (result.recommendations.length > 0) {
            console.log(`   💡 Top Recommendation: ${result.recommendations[0]}`);
          }

          qualityScore += result.overallScore;
        } else {
          console.log(`❌ ${result.component}: File not found in any expected location`);
        }
        console.log(''); // Empty line for readability
      }

      // Calculate average quality score
      const averageQuality = filesCreated > 0 ? Math.round(qualityScore / filesCreated) : 0;

      // Enhanced Summary with Quality Metrics
      console.log('\n📊 Comprehensive Test Summary:');
      console.log(`- Task Duration: ${duration.toFixed(2)} seconds`);
      console.log(`- Plan/Progress Files: ${planFiles.length > 0 || sessionPlanFiles.length > 0 ? '✅' : '❌'}`);
      console.log(`- Agents Invoked: ${agentsInvoked.length > 0 ? `✅ (${agentsInvoked.join(', ')})` : '❌ None'}`);
      console.log(`- Files Created: ${summary.existingComponents}/${summary.totalComponents}`);
      console.log(`- Average Quality Score: ${summary.averageScore}%`);
      console.log(`- Quality Threshold: ${summary.averageScore >= 70 ? '✅ PASSED' : '❌ FAILED'}`);

      // Issue breakdown
      if (Object.keys(summary.issuesBySeverity).length > 0) {
        console.log('\n🔍 Issue Analysis:');
        console.log(`- Errors: ${summary.issuesBySeverity.error || 0}`);
        console.log(`- Warnings: ${summary.issuesBySeverity.warning || 0}`);
        console.log(`- Info: ${summary.issuesBySeverity.info || 0}`);
      }

      // Overall recommendations
      if (summary.recommendations.length > 0) {
        console.log('\n💡 Key Recommendations:');
        summary.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }

      // Determine overall success
      const hasFiles = summary.existingComponents > 0;
      const hasQuality = summary.averageScore >= 60; // Minimum threshold
      const overallSuccess = hasFiles && hasQuality && summary.passed;

      console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);

      if (overallSuccess) {
        console.log('   ✨ Orchestrator created high-quality, functional code!');
      } else if (hasFiles && !hasQuality) {
        console.log('   ⚠️  Files created but quality standards not met');
      } else if (!hasFiles) {
        console.log('   ❌ No files were created - agent delegation failed');
      }

      // Clean up
      console.log('\n🧹 Cleaning up test directory...');
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });

      // Enhanced Test Assertions
      expect(response).toBeDefined();
      // Fix: Changed timing expectation from >10 seconds to >1 second
      // The test should verify the orchestrator ran (not instantly failed)
      // but not enforce an arbitrary long duration that can vary based on system performance
      expect(duration).toBeGreaterThan(1); // Ensure orchestrator actually ran (not instant failure)
      expect(summary.existingComponents).toBeGreaterThan(0); // Files must be created
      expect(summary.averageScore).toBeGreaterThanOrEqual(60); // Minimum quality threshold

      // Quality-based assertions
      if (summary.existingComponents === 0) {
        console.log('\n❗ CRITICAL: No files were created despite orchestrator completion');
        console.log('   This indicates agents cannot write files to the expected locations');
      } else if (summary.averageScore < 60) {
        console.log('\n⚠️  WARNING: Files created but quality is below acceptable threshold');
        console.log('   Consider improving agent prompts and validation');
      }

    } finally {
      await client.stop();
    }
  }, 600000);
});