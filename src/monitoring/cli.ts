#!/usr/bin/env node

/**
 * Agent Monitoring CLI
 * Provides command-line interface for querying agent execution metrics
 */

import { getMonitor } from './monitor.js';

interface CliOptions {
  command: string;
  args: string[];
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    return { command: 'help', args: [] };
  }

  return {
    command: args[0],
    args: args.slice(1)
  };
}

function printHelp(): void {
  console.log(`
Agent Monitoring CLI

Usage: npm run monitor <command> [options]

Commands:
  list                          List all orchestrations
  show <session-id>             Show detailed metrics for an orchestration
  agent <agent-name>            Show statistics for a specific agent
  executions <session-id>       Show all agent executions for an orchestration

  Production Commands:
  health [hours]                Show system health (default: last 24 hours)
  performance                   Show performance report for all agents
  failures [limit]              Show failed orchestrations (default: 50)
  export [session-id]           Export data as JSON (all data or specific session)
  cleanup <days>                Delete orchestrations older than N days

  help                          Show this help message

Examples:
  npm run monitor list
  npm run monitor show abc-123-def
  npm run monitor agent backend-agent
  npm run monitor health 48
  npm run monitor performance
  npm run monitor failures 10
  npm run monitor export > data.json
  npm run monitor export abc-123 > session.json
  npm run monitor cleanup 30
  `);
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) {
    return 'N/A';
  }

  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

async function listOrchestrations(): Promise<void> {
  const monitor = getMonitor();
  const orchestrations = monitor.getAllOrchestrations(50);

  if (orchestrations.length === 0) {
    console.log('No orchestrations found.');
    return;
  }

  console.log(`\nFound ${orchestrations.length} orchestration(s):\n`);
  console.log('Session ID'.padEnd(40) + 'Status'.padEnd(12) + 'Tasks'.padEnd(12) + 'Duration'.padEnd(12) + 'Started');
  console.log('─'.repeat(100));

  for (const orch of orchestrations) {
    const duration = formatDuration(orch.duration_ms);
    const taskInfo = `${orch.completed_tasks}/${orch.total_tasks}`;
    const startTime = new Date(orch.started_at).toLocaleString();

    console.log(
      orch.session_id.padEnd(40) +
      orch.status.padEnd(12) +
      taskInfo.padEnd(12) +
      duration.padEnd(12) +
      startTime
    );
  }

  console.log('');
}

async function showOrchestration(sessionId: string): Promise<void> {
  const monitor = getMonitor();

  try {
    const summary = monitor.getOrchestrationSummary(sessionId);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Orchestration Summary: ${sessionId}`);
    console.log(`${'='.repeat(80)}\n`);

    console.log(`Task: ${summary.orchestration.task_description || 'N/A'}`);
    console.log(`Status: ${summary.orchestration.status}`);
    console.log(`Duration: ${formatDuration(summary.orchestration.duration_ms)}`);
    console.log(`Tasks: ${summary.orchestration.completed_tasks}/${summary.orchestration.total_tasks} completed`);
    console.log(`Failed: ${summary.orchestration.failed_tasks}`);
    console.log(`Started: ${new Date(summary.orchestration.started_at).toLocaleString()}`);
    if (summary.orchestration.completed_at) {
      console.log(`Completed: ${new Date(summary.orchestration.completed_at).toLocaleString()}`);
    }

    if (summary.executions.length > 0) {
      console.log(`\n--- Agent Executions ---\n`);
      console.log('Agent'.padEnd(25) + 'Status'.padEnd(12) + 'Duration'.padEnd(12) + 'Files'.padEnd(10) + 'Self-Healed');
      console.log('─'.repeat(80));

      for (const exec of summary.executions) {
        const duration = formatDuration(exec.duration_ms);
        const fileCount = `${exec.files_created + exec.files_modified}`;
        const selfHealed = exec.self_healed ? 'Yes' : 'No';

        console.log(
          exec.agent_name.padEnd(25) +
          exec.status.padEnd(12) +
          duration.padEnd(12) +
          fileCount.padEnd(10) +
          selfHealed
        );
      }
    }

    console.log('');
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function showAgentStats(agentName: string): Promise<void> {
  const monitor = getMonitor();
  const stats = monitor.getAgentStats(agentName);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Agent Statistics: ${agentName}`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Total Executions: ${stats.total_executions}`);
  console.log(`Completed: ${stats.completed}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Success Rate: ${stats.total_executions > 0 ? ((stats.completed / stats.total_executions) * 100).toFixed(1) : 0}%`);
  console.log(`Average Duration: ${formatDuration(stats.avg_duration_ms)}`);
  console.log(`Total Files Created: ${stats.total_files_created}`);
  console.log(`Total Files Modified: ${stats.total_files_modified}`);
  console.log(`Self-Healed Executions: ${stats.self_heal_count}`);

  console.log('');
}

async function showExecutions(sessionId: string): Promise<void> {
  const monitor = getMonitor();
  const orchestration = monitor.getOrchestration(sessionId);

  if (!orchestration) {
    console.error(`Orchestration not found: ${sessionId}`);
    return;
  }

  const executions = monitor.getExecutionsByOrchestration(orchestration.id);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Agent Executions for: ${sessionId}`);
  console.log(`${'='.repeat(80)}\n`);

  if (executions.length === 0) {
    console.log('No executions found.');
    return;
  }

  console.log('Agent'.padEnd(25) + 'Task'.padEnd(12) + 'Status'.padEnd(12) + 'Duration'.padEnd(12) + 'Retries');
  console.log('─'.repeat(80));

  for (const exec of executions) {
    const duration = formatDuration(exec.duration_ms);
    const taskId = exec.task_id || 'N/A';

    console.log(
      exec.agent_name.padEnd(25) +
      taskId.padEnd(12) +
      exec.status.padEnd(12) +
      duration.padEnd(12) +
      exec.retry_count.toString()
    );
  }

  console.log('');
}

async function showSystemHealth(hours?: number): Promise<void> {
  const monitor = getMonitor();
  const hoursNum = hours ? parseInt(String(hours)) : 24;
  const health = monitor.getSystemHealth(hoursNum);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`System Health (Last ${hoursNum} hours)`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Orchestrations:`);
  console.log(`  Total: ${health.total_orchestrations}`);
  console.log(`  Completed: ${health.completed_orchestrations}`);
  console.log(`  Failed: ${health.failed_orchestrations}`);
  console.log(`  Running: ${health.running_orchestrations}`);

  console.log(`\nAgent Executions:`);
  console.log(`  Total: ${health.total_executions}`);
  console.log(`  Success Rate: ${health.success_rate.toFixed(1)}%`);
  console.log(`  Average Duration: ${formatDuration(health.avg_duration_ms)}`);

  console.log('');
}

async function showPerformanceReport(): Promise<void> {
  const monitor = getMonitor();
  const stats = monitor.getPerformanceReport();

  if (stats.length === 0) {
    console.log('No agent performance data available.');
    return;
  }

  console.log(`\n${'='.repeat(100)}`);
  console.log(`Agent Performance Report`);
  console.log(`${'='.repeat(100)}\n`);

  console.log('Agent'.padEnd(25) + 'Executions'.padEnd(12) + 'Success'.padEnd(10) + 'Avg Duration'.padEnd(15) + 'Min'.padEnd(10) + 'Max');
  console.log('─'.repeat(100));

  for (const stat of stats) {
    const successRate = `${stat.success_rate.toFixed(1)}%`;
    console.log(
      stat.agent_name.padEnd(25) +
      stat.total_executions.toString().padEnd(12) +
      successRate.padEnd(10) +
      formatDuration(stat.avg_duration_ms).padEnd(15) +
      formatDuration(stat.min_duration_ms).padEnd(10) +
      formatDuration(stat.max_duration_ms)
    );
  }

  console.log('');
}

async function showFailures(limit?: number): Promise<void> {
  const monitor = getMonitor();
  const limitNum = limit ? parseInt(String(limit)) : 50;
  const failures = monitor.getFailedOrchestrations(limitNum);

  if (failures.length === 0) {
    console.log('No failed orchestrations found.');
    return;
  }

  console.log(`\n${'='.repeat(100)}`);
  console.log(`Failed Orchestrations (${failures.length})`);
  console.log(`${'='.repeat(100)}\n`);

  console.log('Session ID'.padEnd(40) + 'Tasks'.padEnd(12) + 'Started'.padEnd(25) + 'Duration');
  console.log('─'.repeat(100));

  for (const orch of failures) {
    const taskInfo = `${orch.completed_tasks}/${orch.total_tasks}`;
    const startTime = new Date(orch.started_at).toLocaleString();
    const duration = formatDuration(orch.duration_ms);

    console.log(
      orch.session_id.padEnd(40) +
      taskInfo.padEnd(12) +
      startTime.padEnd(25) +
      duration
    );
  }

  console.log('');
}

async function exportData(sessionId?: string): Promise<void> {
  const monitor = getMonitor();
  const data = monitor.exportToJSON(sessionId);
  console.log(JSON.stringify(data, null, 2));
}

async function cleanupData(days?: number): Promise<void> {
  if (!days) {
    console.error('Error: days parameter required');
    console.log('Usage: npm run monitor cleanup <days>');
    process.exit(1);
  }

  const daysNum = parseInt(String(days));
  const monitor = getMonitor();
  const deletedCount = monitor.cleanupOldData(daysNum);

  console.log(`\nDeleted ${deletedCount} orchestration(s) older than ${daysNum} days.\n`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs();

  try {
    switch (command) {
      case 'list':
      case 'orchestrations':
        await listOrchestrations();
        break;

      case 'show':
        if (args.length === 0) {
          console.error('Error: session-id required');
          console.log('Usage: npm run monitor show <session-id>');
          process.exit(1);
        }
        await showOrchestration(args[0]);
        break;

      case 'agent':
        if (args.length === 0) {
          console.error('Error: agent-name required');
          console.log('Usage: npm run monitor agent <agent-name>');
          process.exit(1);
        }
        await showAgentStats(args[0]);
        break;

      case 'executions':
        if (args.length === 0) {
          console.error('Error: session-id required');
          console.log('Usage: npm run monitor executions <session-id>');
          process.exit(1);
        }
        await showExecutions(args[0]);
        break;

      // Production commands
      case 'health':
        await showSystemHealth(args[0] ? parseInt(args[0]) : undefined);
        break;

      case 'performance':
        await showPerformanceReport();
        break;

      case 'failures':
        await showFailures(args[0] ? parseInt(args[0]) : undefined);
        break;

      case 'export':
        await exportData(args[0]);
        break;

      case 'cleanup':
        await cleanupData(args[0] ? parseInt(args[0]) : undefined);
        break;

      case 'help':
      default:
        printHelp();
        break;
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
