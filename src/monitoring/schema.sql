-- Agent Monitoring Database Schema
-- Tracks orchestrations and agent executions

-- Orchestrations table (high-level workflows)
CREATE TABLE IF NOT EXISTS orchestrations (
  id TEXT PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  task_description TEXT,
  status TEXT CHECK(status IN ('running', 'completed', 'failed', 'partial')) NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  failed_tasks INTEGER DEFAULT 0,
  git_commit_hash TEXT,
  plan_file_path TEXT,
  progress_file_path TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Agent executions (individual agent runs)
CREATE TABLE IF NOT EXISTS agent_executions (
  id TEXT PRIMARY KEY,
  orchestration_id TEXT,
  agent_session_id TEXT UNIQUE NOT NULL,
  agent_name TEXT NOT NULL,
  task_id TEXT,
  task_number INTEGER,
  status TEXT CHECK(status IN ('in_progress', 'completed', 'failed')) NOT NULL DEFAULT 'in_progress',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  self_healed BOOLEAN DEFAULT 0,
  files_created INTEGER DEFAULT 0,
  files_modified INTEGER DEFAULT 0,
  error_message TEXT,
  summary_report_path TEXT,
  session_log_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (orchestration_id) REFERENCES orchestrations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orchestrations_session ON orchestrations(session_id);
CREATE INDEX IF NOT EXISTS idx_orchestrations_status ON orchestrations(status);
CREATE INDEX IF NOT EXISTS idx_orchestrations_started ON orchestrations(started_at);
CREATE INDEX IF NOT EXISTS idx_orchestrations_created ON orchestrations(created_at);

CREATE INDEX IF NOT EXISTS idx_executions_orchestration ON agent_executions(orchestration_id);
CREATE INDEX IF NOT EXISTS idx_executions_agent_session ON agent_executions(agent_session_id);
CREATE INDEX IF NOT EXISTS idx_executions_agent_name ON agent_executions(agent_name);
CREATE INDEX IF NOT EXISTS idx_executions_status ON agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started ON agent_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_executions_created ON agent_executions(created_at);
