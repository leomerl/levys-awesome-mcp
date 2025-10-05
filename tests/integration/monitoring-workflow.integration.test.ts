import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { handlePlanCreatorTool } from '../../src/handlers/plan-creator.js';
import { handleAgentInvokerTool } from '../../src/handlers/agent-invoker.js';
import { getMonitor } from '../../src/monitoring/monitor.js';
import { getMonitoringDatabase } from '../../src/monitoring/database.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Monitoring Workflow Integration', () => {
  const testSessionId = 'monitoring-workflow-test';
  let orchestrationId: string | undefined;

  beforeAll(async () => {
    // Clean up any existing test data
    const planDir = path.join(process.cwd(), 'plan_and_progress/sessions', testSessionId);
    const reportDir = path.join(process.cwd(), 'reports', testSessionId);

    if (fs.existsSync(planDir)) {
      fs.rmSync(planDir, { recursive: true, force: true });
    }
    if (fs.existsSync(reportDir)) {
      fs.rmSync(reportDir, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    // Clean up test data
    const planDir = path.join(process.cwd(), 'plan_and_progress/sessions', testSessionId);
    const reportDir = path.join(process.cwd(), 'reports', testSessionId);

    if (fs.existsSync(planDir)) {
      fs.rmSync(planDir, { recursive: true, force: true });
    }
    if (fs.existsSync(reportDir)) {
      fs.rmSync(reportDir, { recursive: true, force: true });
    }

    // Clean up backend test file
    const testFile = path.join(process.cwd(), 'backend/monitoring-test.txt');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }

    // Delete orchestration from monitoring database
    const db = getMonitoringDatabase();
    const orch = db.getOrchestration(testSessionId);
    if (orch) {
      // Delete via cleanup with 0 days to force deletion
      db.deleteOldOrchestrations(-1);
    }
  });

  it('should track complete orchestration workflow and support all monitoring commands', async () => {
    // Step 1: Create a plan
    console.log('\n🧪 Step 1: Creating test plan...');
    const createPlanResult = await handlePlanCreatorTool('create_plan', {
      task_description: 'Integration test for monitoring workflow',
      synopsis: 'Test monitoring system with real agent execution',
      tasks: [
        {
          id: 'TASK-001',
          designated_agent: 'backend-agent',
          description: 'Create a test file in backend/',
          files_to_modify: ['backend/monitoring-test.txt'],
          dependencies: []
        }
      ],
      session_id: testSessionId
    });

    expect(createPlanResult.isError).not.toBe(true);
    console.log('✅ Plan created');

    // Verify orchestration was tracked
    const monitor = getMonitor();
    const orchestration = monitor.getOrchestration(testSessionId);
    expect(orchestration).toBeDefined();
    expect(orchestration?.status).toBe('running');
    orchestrationId = orchestration?.id;

    // Step 2: Invoke backend-agent
    console.log('\n🤖 Step 2: Invoking backend-agent...');
    const invokeResult = await handleAgentInvokerTool('invoke_agent', {
      agentName: 'backend-agent',
      prompt: `Create a file backend/monitoring-test.txt with content "Monitoring integration test - ${new Date().toISOString()}"`,
      taskNumber: 1,
      sessionId: testSessionId,
      invokerAgent: 'orchestrator-agent'
    });

    expect(invokeResult.isError).not.toBe(true);
    console.log('✅ Agent completed');

    // Step 3: Mark task as completed
    console.log('\n✔️  Step 3: Marking task as completed...');
    const updateResult = await handlePlanCreatorTool('update_progress', {
      session_id: testSessionId,
      task_id: 'TASK-001',
      state: 'completed',
      agent_session_id: 'test-session-001',
      files_modified: ['backend/monitoring-test.txt'],
      summary: 'Created test file successfully'
    });

    expect(updateResult.isError).not.toBe(true);
    console.log('✅ Task marked as completed');

    // Step 4: Complete orchestration
    console.log('\n🏁 Step 4: Completing orchestration...');
    const compareResult = await handlePlanCreatorTool('compare_plan_progress', {
      session_id: testSessionId
    });

    expect(compareResult.isError).not.toBe(true);

    // Verify orchestration was completed
    const completedOrch = monitor.getOrchestration(testSessionId);
    expect(completedOrch?.status).toBe('completed');
    console.log('✅ Orchestration completed');

    // Step 5: Test all monitoring commands
    console.log('\n📊 Step 5: Testing all monitoring commands...');

    // Test 5.1: getOrchestration
    console.log('  Testing getOrchestration...');
    const orchData = monitor.getOrchestration(testSessionId);
    expect(orchData).toBeDefined();
    expect(orchData?.session_id).toBe(testSessionId);
    expect(orchData?.status).toBe('completed');
    console.log('  ✅ getOrchestration works');

    // Test 5.2: getOrchestrationSummary
    console.log('  Testing getOrchestrationSummary...');
    const summary = monitor.getOrchestrationSummary(testSessionId);
    expect(summary).toBeDefined();
    expect(summary.orchestration.session_id).toBe(testSessionId);
    expect(summary.executions.length).toBeGreaterThan(0);
    console.log('  ✅ getOrchestrationSummary works');

    // Test 5.3: getAllOrchestrations
    console.log('  Testing getAllOrchestrations...');
    const allOrch = monitor.getAllOrchestrations(50);
    expect(allOrch.length).toBeGreaterThan(0);
    const found = allOrch.find(o => o.session_id === testSessionId);
    expect(found).toBeDefined();
    console.log('  ✅ getAllOrchestrations works');

    // Test 5.4: getAgentStats
    console.log('  Testing getAgentStats...');
    const agentStats = monitor.getAgentStats('backend-agent');
    expect(agentStats.total_executions).toBeGreaterThan(0);
    console.log('  ✅ getAgentStats works');

    // Test 5.5: getSystemHealth
    console.log('  Testing getSystemHealth...');
    const health = monitor.getSystemHealth(24);
    expect(health).toBeDefined();
    expect(health.total_orchestrations).toBeGreaterThan(0);
    expect(health.total_executions).toBeGreaterThan(0);
    console.log('  ✅ getSystemHealth works');

    // Test 5.6: getPerformanceReport
    console.log('  Testing getPerformanceReport...');
    const perfReport = monitor.getPerformanceReport();
    expect(perfReport).toBeDefined();
    expect(Array.isArray(perfReport)).toBe(true);
    const backendPerf = perfReport.find(p => p.agent_name === 'backend-agent');
    expect(backendPerf).toBeDefined();
    console.log('  ✅ getPerformanceReport works');

    // Test 5.7: getFailedOrchestrations
    console.log('  Testing getFailedOrchestrations...');
    const failures = monitor.getFailedOrchestrations(50);
    expect(Array.isArray(failures)).toBe(true);
    // Our test orchestration should not be in failures
    const failedTest = failures.find(f => f.session_id === testSessionId);
    expect(failedTest).toBeUndefined();
    console.log('  ✅ getFailedOrchestrations works');

    // Test 5.8: exportToJSON (specific session)
    console.log('  Testing exportToJSON (specific session)...');
    const exportSession = monitor.exportToJSON(testSessionId);
    expect(exportSession).toBeDefined();
    expect(exportSession.orchestration.session_id).toBe(testSessionId);
    expect(exportSession.executions.length).toBeGreaterThan(0);
    console.log('  ✅ exportToJSON (session) works');

    // Test 5.9: exportToJSON (all data)
    console.log('  Testing exportToJSON (all data)...');
    const exportAll = monitor.exportToJSON();
    expect(Array.isArray(exportAll)).toBe(true);
    expect(exportAll.length).toBeGreaterThan(0);
    const exportedTest = exportAll.find((e: any) => e.session_id === testSessionId);
    expect(exportedTest).toBeDefined();
    console.log('  ✅ exportToJSON (all) works');

    // Test 5.10: getExecutionsByOrchestration
    console.log('  Testing getExecutionsByOrchestration...');
    if (orchestrationId) {
      const executions = monitor.getExecutionsByOrchestration(orchestrationId);
      expect(executions.length).toBeGreaterThan(0);
      expect(executions[0].agent_name).toBe('backend-agent');
    }
    console.log('  ✅ getExecutionsByOrchestration works');

    console.log('\n✅ All monitoring commands work correctly!\n');
  }, 120000); // 2 minute timeout for agent execution

  it('should handle cleanup command', async () => {
    const monitor = getMonitor();

    // Test cleanup with future date (should delete nothing)
    console.log('\n🧹 Testing cleanup command...');
    const deletedCount = monitor.cleanupOldData(30);
    expect(typeof deletedCount).toBe('number');
    expect(deletedCount).toBeGreaterThanOrEqual(0);
    console.log(`  Deleted ${deletedCount} old orchestrations`);
    console.log('  ✅ cleanup works');
  });
});
