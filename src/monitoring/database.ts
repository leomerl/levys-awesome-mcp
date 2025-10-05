import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database types
export interface Orchestration {
  id: string;
  session_id: string;
  task_description?: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  total_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  git_commit_hash?: string;
  plan_file_path?: string;
  progress_file_path?: string;
  created_at: string;
}

export interface AgentExecution {
  id: string;
  orchestration_id?: string;
  agent_session_id: string;
  agent_name: string;
  task_id?: string;
  task_number?: number;
  status: 'in_progress' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  retry_count: number;
  self_healed: boolean;
  files_created: number;
  files_modified: number;
  error_message?: string;
  summary_report_path?: string;
  session_log_path?: string;
  created_at: string;
}

export class MonitoringDatabase {
  private db: Database.Database;
  private readonly dbPath: string;

  constructor(dbPath: string = './monitoring.db') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema (SQLite supports multiple statements)
    this.db.exec(schema);
  }

  // Orchestration methods
  createOrchestration(orchestration: Omit<Orchestration, 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO orchestrations (
        id, session_id, task_description, status, started_at,
        completed_at, duration_ms, total_tasks, completed_tasks,
        failed_tasks, git_commit_hash, plan_file_path, progress_file_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      orchestration.id,
      orchestration.session_id,
      orchestration.task_description || null,
      orchestration.status,
      orchestration.started_at,
      orchestration.completed_at || null,
      orchestration.duration_ms || null,
      orchestration.total_tasks,
      orchestration.completed_tasks,
      orchestration.failed_tasks,
      orchestration.git_commit_hash || null,
      orchestration.plan_file_path || null,
      orchestration.progress_file_path || null
    );
  }

  updateOrchestration(sessionId: string, updates: Partial<Orchestration>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.duration_ms !== undefined) {
      fields.push('duration_ms = ?');
      values.push(updates.duration_ms);
    }
    if (updates.total_tasks !== undefined) {
      fields.push('total_tasks = ?');
      values.push(updates.total_tasks);
    }
    if (updates.completed_tasks !== undefined) {
      fields.push('completed_tasks = ?');
      values.push(updates.completed_tasks);
    }
    if (updates.failed_tasks !== undefined) {
      fields.push('failed_tasks = ?');
      values.push(updates.failed_tasks);
    }

    if (fields.length === 0) return;

    values.push(sessionId);
    const stmt = this.db.prepare(`
      UPDATE orchestrations
      SET ${fields.join(', ')}
      WHERE session_id = ?
    `);
    stmt.run(...values);
  }

  getOrchestration(sessionId: string): Orchestration | undefined {
    const stmt = this.db.prepare('SELECT * FROM orchestrations WHERE session_id = ?');
    return stmt.get(sessionId) as Orchestration | undefined;
  }

  getAllOrchestrations(limit: number = 100): Orchestration[] {
    const stmt = this.db.prepare('SELECT * FROM orchestrations ORDER BY created_at DESC LIMIT ?');
    return stmt.all(limit) as Orchestration[];
  }

  // Agent execution methods
  createAgentExecution(execution: Omit<AgentExecution, 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_executions (
        id, orchestration_id, agent_session_id, agent_name, task_id,
        task_number, status, started_at, completed_at, duration_ms,
        retry_count, self_healed, files_created, files_modified,
        error_message, summary_report_path, session_log_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.orchestration_id || null,
      execution.agent_session_id,
      execution.agent_name,
      execution.task_id || null,
      execution.task_number || null,
      execution.status,
      execution.started_at,
      execution.completed_at || null,
      execution.duration_ms || null,
      execution.retry_count,
      execution.self_healed ? 1 : 0,
      execution.files_created,
      execution.files_modified,
      execution.error_message || null,
      execution.summary_report_path || null,
      execution.session_log_path || null
    );
  }

  updateAgentExecution(agentSessionId: string, updates: Partial<AgentExecution>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.duration_ms !== undefined) {
      fields.push('duration_ms = ?');
      values.push(updates.duration_ms);
    }
    if (updates.retry_count !== undefined) {
      fields.push('retry_count = ?');
      values.push(updates.retry_count);
    }
    if (updates.self_healed !== undefined) {
      fields.push('self_healed = ?');
      values.push(updates.self_healed ? 1 : 0);
    }
    if (updates.files_created !== undefined) {
      fields.push('files_created = ?');
      values.push(updates.files_created);
    }
    if (updates.files_modified !== undefined) {
      fields.push('files_modified = ?');
      values.push(updates.files_modified);
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.summary_report_path !== undefined) {
      fields.push('summary_report_path = ?');
      values.push(updates.summary_report_path);
    }
    if (updates.session_log_path !== undefined) {
      fields.push('session_log_path = ?');
      values.push(updates.session_log_path);
    }

    if (fields.length === 0) return;

    values.push(agentSessionId);
    const stmt = this.db.prepare(`
      UPDATE agent_executions
      SET ${fields.join(', ')}
      WHERE agent_session_id = ?
    `);
    stmt.run(...values);
  }

  getAgentExecution(agentSessionId: string): AgentExecution | undefined {
    const stmt = this.db.prepare('SELECT * FROM agent_executions WHERE agent_session_id = ?');
    const result = stmt.get(agentSessionId) as any;
    if (!result) return undefined;

    // Convert SQLite boolean (0/1) to JavaScript boolean
    result.self_healed = result.self_healed === 1;
    return result as AgentExecution;
  }

  getExecutionsByOrchestration(orchestrationId: string): AgentExecution[] {
    const stmt = this.db.prepare('SELECT * FROM agent_executions WHERE orchestration_id = ? ORDER BY created_at');
    const results = stmt.all(orchestrationId) as any[];
    return results.map(r => ({ ...r, self_healed: r.self_healed === 1 })) as AgentExecution[];
  }

  getExecutionsByAgent(agentName: string, limit: number = 100): AgentExecution[] {
    const stmt = this.db.prepare('SELECT * FROM agent_executions WHERE agent_name = ? ORDER BY created_at DESC LIMIT ?');
    const results = stmt.all(agentName, limit) as any[];
    return results.map(r => ({ ...r, self_healed: r.self_healed === 1 })) as AgentExecution[];
  }

  // Aggregate queries
  getOrchestrationSummary(sessionId: string): {
    orchestration: Orchestration;
    executions: AgentExecution[];
  } {
    const orchestration = this.getOrchestration(sessionId);
    if (!orchestration) {
      throw new Error(`Orchestration with session_id ${sessionId} not found`);
    }

    const executions = this.getExecutionsByOrchestration(orchestration.id);

    return {
      orchestration,
      executions
    };
  }

  // Utility methods
  close(): void {
    this.db.close();
  }

  deleteAllData(): void {
    this.db.exec('DELETE FROM agent_executions');
    this.db.exec('DELETE FROM orchestrations');
  }

  // Production features
  deleteOldOrchestrations(daysToKeep: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISO = cutoffDate.toISOString();

    const stmt = this.db.prepare('DELETE FROM orchestrations WHERE created_at < ?');
    const result = stmt.run(cutoffISO);
    return result.changes;
  }

  getRecentOrchestrations(hours: number = 24): Orchestration[] {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);
    const cutoffISO = cutoffDate.toISOString();

    const stmt = this.db.prepare('SELECT * FROM orchestrations WHERE started_at >= ? ORDER BY started_at DESC');
    return stmt.all(cutoffISO) as Orchestration[];
  }

  getFailedOrchestrations(limit: number = 50): Orchestration[] {
    const stmt = this.db.prepare('SELECT * FROM orchestrations WHERE status = ? ORDER BY completed_at DESC LIMIT ?');
    return stmt.all('failed', limit) as Orchestration[];
  }

  getAgentPerformanceStats(): Array<{
    agent_name: string;
    total_executions: number;
    completed: number;
    failed: number;
    success_rate: number;
    avg_duration_ms: number;
    min_duration_ms: number;
    max_duration_ms: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        agent_name,
        COUNT(*) as total_executions,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) * 100 as success_rate,
        AVG(duration_ms) as avg_duration_ms,
        MIN(duration_ms) as min_duration_ms,
        MAX(duration_ms) as max_duration_ms
      FROM agent_executions
      WHERE duration_ms IS NOT NULL
      GROUP BY agent_name
      ORDER BY total_executions DESC
    `);
    return stmt.all() as any[];
  }

  getSystemHealthStats(hours: number = 24): {
    total_orchestrations: number;
    completed_orchestrations: number;
    failed_orchestrations: number;
    running_orchestrations: number;
    total_executions: number;
    success_rate: number;
    avg_duration_ms: number;
  } {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);
    const cutoffISO = cutoffDate.toISOString();

    const orchStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
      FROM orchestrations
      WHERE started_at >= ?
    `).get(cutoffISO) as any;

    const execStats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(duration_ms) as avg_duration
      FROM agent_executions
      WHERE started_at >= ? AND duration_ms IS NOT NULL
    `).get(cutoffISO) as any;

    return {
      total_orchestrations: orchStats.total || 0,
      completed_orchestrations: orchStats.completed || 0,
      failed_orchestrations: orchStats.failed || 0,
      running_orchestrations: orchStats.running || 0,
      total_executions: execStats.total || 0,
      success_rate: execStats.total > 0 ? (execStats.completed / execStats.total) * 100 : 0,
      avg_duration_ms: Math.round(execStats.avg_duration || 0)
    };
  }
}

// Singleton instance
let dbInstance: MonitoringDatabase | null = null;

export function getMonitoringDatabase(dbPath?: string): MonitoringDatabase {
  if (!dbInstance) {
    dbInstance = new MonitoringDatabase(dbPath);
  }
  return dbInstance;
}

export function closeMonitoringDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
