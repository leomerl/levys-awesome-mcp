import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MonitoringDatabase } from '../../src/monitoring/database.js';
import { AgentMonitor } from '../../src/monitoring/monitor.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Monitoring System', () => {
  const testDbPath = path.join(process.cwd(), 'test-monitoring.db');
  let db: MonitoringDatabase;

  beforeEach(() => {
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Remove WAL files
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    db = new MonitoringDatabase(testDbPath);
    // Clear all data to ensure clean state
    db.deleteAllData();
  });

  afterEach(() => {
    db.close();
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('MonitoringDatabase', () => {
    it('should create orchestration', () => {
      const orchestrationId = 'orch-123';
      const sessionId = 'session-abc';

      db.createOrchestration({
        id: orchestrationId,
        session_id: sessionId,
        task_description: 'Test task',
        status: 'running',
        started_at: new Date().toISOString(),
        total_tasks: 5,
        completed_tasks: 0,
        failed_tasks: 0
      });

      const orchestration = db.getOrchestration(sessionId);
      expect(orchestration).toBeDefined();
      expect(orchestration?.id).toBe(orchestrationId);
      expect(orchestration?.session_id).toBe(sessionId);
      expect(orchestration?.status).toBe('running');
    });

    it('should update orchestration', () => {
      const sessionId = 'session-abc';

      db.createOrchestration({
        id: 'orch-123',
        session_id: sessionId,
        task_description: 'Test task',
        status: 'running',
        started_at: new Date().toISOString(),
        total_tasks: 5,
        completed_tasks: 0,
        failed_tasks: 0
      });

      db.updateOrchestration(sessionId, {
        status: 'completed',
        completed_tasks: 5
      });

      const orchestration = db.getOrchestration(sessionId);
      expect(orchestration?.status).toBe('completed');
      expect(orchestration?.completed_tasks).toBe(5);
    });

    it('should create agent execution', () => {
      const executionId = 'exec-456';
      const agentSessionId = 'agent-session-def';

      db.createAgentExecution({
        id: executionId,
        agent_session_id: agentSessionId,
        agent_name: 'backend-agent',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        retry_count: 0,
        self_healed: false,
        files_created: 0,
        files_modified: 0
      });

      const execution = db.getAgentExecution(agentSessionId);
      expect(execution).toBeDefined();
      expect(execution?.id).toBe(executionId);
      expect(execution?.agent_name).toBe('backend-agent');
      expect(execution?.status).toBe('in_progress');
    });

    it('should update agent execution', () => {
      const agentSessionId = 'agent-session-def';

      db.createAgentExecution({
        id: 'exec-456',
        agent_session_id: agentSessionId,
        agent_name: 'backend-agent',
        status: 'in_progress',
        started_at: new Date().toISOString(),
        retry_count: 0,
        self_healed: false,
        files_created: 0,
        files_modified: 0
      });

      const completedAt = new Date().toISOString();
      db.updateAgentExecution(agentSessionId, {
        status: 'completed',
        completed_at: completedAt,
        files_created: 2,
        files_modified: 3
      });

      const execution = db.getAgentExecution(agentSessionId);
      expect(execution?.status).toBe('completed');
      expect(execution?.completed_at).toBe(completedAt);
      expect(execution?.files_created).toBe(2);
      expect(execution?.files_modified).toBe(3);
    });

    it('should get orchestration summary', () => {
      const sessionId = 'session-abc';
      const orchestrationId = 'orch-123';

      db.createOrchestration({
        id: orchestrationId,
        session_id: sessionId,
        task_description: 'Test task',
        status: 'running',
        started_at: new Date().toISOString(),
        total_tasks: 2,
        completed_tasks: 0,
        failed_tasks: 0
      });

      const executionId = 'exec-456';
      db.createAgentExecution({
        id: executionId,
        orchestration_id: orchestrationId,
        agent_session_id: 'agent-session-1',
        agent_name: 'backend-agent',
        status: 'completed',
        started_at: new Date().toISOString(),
        retry_count: 0,
        self_healed: false,
        files_created: 2,
        files_modified: 3
      });

      const summary = db.getOrchestrationSummary(sessionId);
      expect(summary.orchestration.session_id).toBe(sessionId);
      expect(summary.executions.length).toBe(1);
      expect(summary.executions[0].files_created).toBe(2);
      expect(summary.executions[0].files_modified).toBe(3);
    });
  });
});
