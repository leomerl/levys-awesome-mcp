# Monitoring System Documentation

## Overview

The monitoring system tracks orchestration workflows and agent executions, providing performance metrics, health checks, and failure analysis.

## Features

### 1. Orchestration Tracking
- Start/complete lifecycle tracking
- Duration measurement
- Task completion status
- Success/failure tracking

### 2. Agent Execution Tracking
- Individual agent run tracking
- Files created/modified counts
- Self-healing flags
- Error messages and retry counts

### 3. Production Features

#### Health Check
```bash
npm run monitor health [hours]
```
Quick system status overview:
- Orchestrations (total, completed, failed, running)
- Agent execution success rate
- Average duration
- Configurable time window (default: 24 hours)

#### Performance Analysis
```bash
npm run monitor performance
```
Performance statistics for all agents:
- Success rates
- Execution counts
- Min/Max/Average durations
- Identify slow or problematic agents

#### Failure Analysis
```bash
npm run monitor failures [limit]
```
Lists failed orchestrations:
- Task completion rates
- Duration and timestamp info
- Helps identify patterns in failures

#### JSON Export
```bash
npm run monitor export > all-data.json
npm run monitor export <session-id> > session.json
```
Export for CI/CD integration:
- All data or specific session
- Feed into dashboards, analytics tools
- Backup monitoring data
- Audit trail for compliance

#### Data Cleanup
```bash
npm run monitor cleanup <days>
```
Delete old orchestrations:
- Prevent database bloat
- Configurable retention period
- CASCADE deletes related executions

### 4. CLI Commands

```bash
# List all orchestrations
npm run monitor list

# Show detailed metrics for a session
npm run monitor show <session-id>

# Show agent statistics
npm run monitor agent <agent-name>

# Show executions for an orchestration
npm run monitor executions <session-id>

# Show system health (default: last 24 hours)
npm run monitor health [hours]

# Show performance report
npm run monitor performance

# Show failed orchestrations
npm run monitor failures [limit]

# Export data as JSON
npm run monitor export [session-id]

# Delete old data
npm run monitor cleanup <days>
```

## Database Schema

### Orchestrations Table
- `id` - Unique orchestration ID
- `session_id` - Session identifier
- `task_description` - What the orchestration does
- `status` - running | completed | failed | partial
- `started_at` - Start timestamp
- `completed_at` - Completion timestamp
- `duration_ms` - Duration in milliseconds
- `total_tasks` - Total number of tasks
- `completed_tasks` - Successfully completed tasks
- `failed_tasks` - Failed tasks
- `git_commit_hash` - Git commit reference
- `plan_file_path` - Path to plan file
- `progress_file_path` - Path to progress file

### Agent Executions Table
- `id` - Unique execution ID
- `orchestration_id` - Parent orchestration
- `agent_session_id` - Agent session identifier
- `agent_name` - Name of the agent
- `task_id` - Associated task ID
- `task_number` - Task number in workflow
- `status` - in_progress | completed | failed
- `started_at` - Start timestamp
- `completed_at` - Completion timestamp
- `duration_ms` - Duration in milliseconds
- `retry_count` - Number of retries
- `self_healed` - Whether self-healing occurred
- `files_created` - Number of files created
- `files_modified` - Number of files modified
- `error_message` - Error details if failed
- `summary_report_path` - Path to summary report
- `session_log_path` - Path to session log

## Integration

### Programmatic Usage

```typescript
import { getMonitor } from './src/monitoring/monitor.js';

const monitor = getMonitor();

// Start tracking an orchestration
const orchestrationId = monitor.startOrchestration({
  sessionId: 'my-session-123',
  taskDescription: 'Build and deploy',
  totalTasks: 5
});

// Start tracking an agent execution
const executionId = monitor.startAgentExecution({
  agentSessionId: 'agent-session-456',
  agentName: 'backend-agent',
  orchestrationId: orchestrationId,
  taskNumber: 1
});

// Complete the execution
monitor.completeAgentExecution({
  agentSessionId: 'agent-session-456',
  status: 'completed',
  filesCreated: 3,
  filesModified: 5
});

// Complete the orchestration
monitor.completeOrchestration({
  sessionId: 'my-session-123',
  status: 'completed',
  completedTasks: 5,
  failedTasks: 0
});

// Get metrics
const health = monitor.getSystemHealth(24);
const performance = monitor.getPerformanceReport();
const summary = monitor.getOrchestrationSummary('my-session-123');
```

### CI/CD Integration

The monitoring system includes a GitHub Actions workflow that:
1. Runs the monitoring integration test
2. Executes all CLI commands
3. Verifies database integrity
4. Exports metrics as JSON artifacts

Workflow: `.github/workflows/test-monitoring.yml`

Triggers:
- Push to `main` or `monitoring` branches (when monitoring files change)
- Pull requests to `main`
- Manual workflow dispatch

Artifacts:
- Monitoring database (`monitoring.db`)
- JSON export of all data
- Retention: 7 days

## Testing

### Unit Tests
```bash
npm test -- tests/unit/monitoring.test.ts
```

Tests database operations:
- Orchestration CRUD
- Agent execution CRUD
- Aggregation queries

### Integration Tests
```bash
npm test -- tests/integration/monitoring-workflow.integration.test.ts
```

Tests complete workflow:
- Plan creation with monitoring
- Agent invocation and tracking
- Task completion
- Orchestration finalization
- All CLI commands

## Database Location

- Development: `./monitoring.db`
- Tests: `./test-monitoring.db` (auto-cleaned)

Add to `.gitignore`:
```
monitoring.db
monitoring.db-shm
monitoring.db-wal
```

## Performance Considerations

- SQLite with WAL mode for better concurrency
- Indexed queries for fast lookups
- Cleanup command to prevent unbounded growth
- Efficient aggregation queries using SQL

## Monitoring Best Practices

1. **Regular cleanup**: Run cleanup weekly to keep database size manageable
   ```bash
   npm run monitor cleanup 30  # Keep last 30 days
   ```

2. **Export for analysis**: Export data regularly for trend analysis
   ```bash
   npm run monitor export > metrics-$(date +%Y%m%d).json
   ```

3. **Monitor health**: Check system health daily
   ```bash
   npm run monitor health 24
   ```

4. **Review failures**: Investigate failures weekly
   ```bash
   npm run monitor failures 20
   ```

5. **Track performance**: Review agent performance monthly
   ```bash
   npm run monitor performance
   ```

## Troubleshooting

### Database locked error
If you encounter "database is locked" errors:
- Ensure no other processes are accessing the database
- Check for WAL files (`.db-wal`, `.db-shm`)
- Close any open connections

### Missing data
If orchestrations or executions are missing:
- Check that monitoring is started in plan-creator.ts
- Verify agent-invoker.ts calls monitoring methods
- Look for errors in logs

### Slow queries
If queries are slow:
- Run cleanup to reduce database size
- Check indexes are present (created automatically)
- Consider SQLite VACUUM operation

## Future Enhancements

Potential improvements:
- [ ] Real-time dashboard/UI
- [ ] Alerting on failures
- [ ] Trend analysis and charts
- [ ] Integration with external monitoring tools
- [ ] Performance regression detection
- [ ] Cost estimation based on execution time
