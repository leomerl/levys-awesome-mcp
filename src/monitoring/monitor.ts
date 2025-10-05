import { v4 as uuidv4 } from 'uuid';
import {
  getMonitoringDatabase,
  type Orchestration,
  type AgentExecution
} from './database.js';

export class AgentMonitor {
  private db = getMonitoringDatabase();

  /**
   * Start tracking an orchestration workflow
   */
  startOrchestration(params: {
    sessionId: string;
    taskDescription?: string;
    totalTasks?: number;
    gitCommitHash?: string;
    planFilePath?: string;
    progressFilePath?: string;
  }): string {
    const orchestrationId = uuidv4();
    const now = new Date().toISOString();

    this.db.createOrchestration({
      id: orchestrationId,
      session_id: params.sessionId,
      task_description: params.taskDescription,
      status: 'running',
      started_at: now,
      total_tasks: params.totalTasks || 0,
      completed_tasks: 0,
      failed_tasks: 0,
      git_commit_hash: params.gitCommitHash,
      plan_file_path: params.planFilePath,
      progress_file_path: params.progressFilePath
    });

    return orchestrationId;
  }

  /**
   * Complete an orchestration workflow
   */
  completeOrchestration(params: {
    sessionId: string;
    status: 'completed' | 'failed' | 'partial';
    completedTasks?: number;
    failedTasks?: number;
  }): void {
    const orchestration = this.db.getOrchestration(params.sessionId);
    if (!orchestration) {
      throw new Error(`Orchestration with session_id ${params.sessionId} not found`);
    }

    const now = new Date().toISOString();
    const startTime = new Date(orchestration.started_at).getTime();
    const endTime = new Date(now).getTime();
    const durationMs = endTime - startTime;

    this.db.updateOrchestration(params.sessionId, {
      status: params.status,
      completed_at: now,
      duration_ms: durationMs,
      completed_tasks: params.completedTasks,
      failed_tasks: params.failedTasks
    });
  }

  /**
   * Update orchestration task counts
   */
  updateOrchestrationTasks(params: {
    sessionId: string;
    totalTasks?: number;
    completedTasks?: number;
    failedTasks?: number;
  }): void {
    this.db.updateOrchestration(params.sessionId, {
      total_tasks: params.totalTasks,
      completed_tasks: params.completedTasks,
      failed_tasks: params.failedTasks
    });
  }

  /**
   * Start tracking an agent execution
   */
  startAgentExecution(params: {
    agentSessionId: string;
    agentName: string;
    orchestrationId?: string;
    taskId?: string;
    taskNumber?: number;
    sessionLogPath?: string;
  }): string {
    const executionId = uuidv4();
    const now = new Date().toISOString();

    this.db.createAgentExecution({
      id: executionId,
      orchestration_id: params.orchestrationId,
      agent_session_id: params.agentSessionId,
      agent_name: params.agentName,
      task_id: params.taskId,
      task_number: params.taskNumber,
      status: 'in_progress',
      started_at: now,
      retry_count: 0,
      self_healed: false,
      files_created: 0,
      files_modified: 0,
      session_log_path: params.sessionLogPath
    });

    return executionId;
  }

  /**
   * Complete an agent execution
   */
  completeAgentExecution(params: {
    agentSessionId: string;
    status: 'completed' | 'failed';
    filesCreated?: number;
    filesModified?: number;
    errorMessage?: string;
    summaryReportPath?: string;
    retryCount?: number;
    selfHealed?: boolean;
  }): void {
    const execution = this.db.getAgentExecution(params.agentSessionId);
    if (!execution) {
      throw new Error(`Agent execution with session_id ${params.agentSessionId} not found`);
    }

    const now = new Date().toISOString();
    const startTime = new Date(execution.started_at).getTime();
    const endTime = new Date(now).getTime();
    const durationMs = endTime - startTime;

    this.db.updateAgentExecution(params.agentSessionId, {
      status: params.status,
      completed_at: now,
      duration_ms: durationMs,
      files_created: params.filesCreated,
      files_modified: params.filesModified,
      error_message: params.errorMessage,
      summary_report_path: params.summaryReportPath,
      retry_count: params.retryCount,
      self_healed: params.selfHealed
    });
  }

  /**
   * Get execution statistics for an agent
   */
  getAgentStats(agentName: string): {
    total_executions: number;
    completed: number;
    failed: number;
    avg_duration_ms: number;
    total_files_created: number;
    total_files_modified: number;
    self_heal_count: number;
  } {
    const executions = this.db.getExecutionsByAgent(agentName, 1000);

    const completed = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const selfHealCount = executions.filter(e => e.self_healed).length;

    const durations = executions
      .filter(e => e.duration_ms !== undefined && e.duration_ms !== null)
      .map(e => e.duration_ms as number);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const totalFilesCreated = executions.reduce((sum, e) => sum + e.files_created, 0);
    const totalFilesModified = executions.reduce((sum, e) => sum + e.files_modified, 0);

    return {
      total_executions: executions.length,
      completed,
      failed,
      avg_duration_ms: Math.round(avgDuration),
      total_files_created: totalFilesCreated,
      total_files_modified: totalFilesModified,
      self_heal_count: selfHealCount
    };
  }

  /**
   * Get full orchestration summary with all metrics
   */
  getOrchestrationSummary(sessionId: string) {
    return this.db.getOrchestrationSummary(sessionId);
  }

  /**
   * Get all orchestrations
   */
  getAllOrchestrations(limit: number = 100): Orchestration[] {
    return this.db.getAllOrchestrations(limit);
  }

  /**
   * Get specific orchestration
   */
  getOrchestration(sessionId: string): Orchestration | undefined {
    return this.db.getOrchestration(sessionId);
  }

  /**
   * Get specific agent execution
   */
  getAgentExecution(agentSessionId: string): AgentExecution | undefined {
    return this.db.getAgentExecution(agentSessionId);
  }

  /**
   * Get all executions for an orchestration
   */
  getExecutionsByOrchestration(orchestrationId: string): AgentExecution[] {
    return this.db.getExecutionsByOrchestration(orchestrationId);
  }

  /**
   * Production features
   */

  /**
   * Clean up old orchestration data
   */
  cleanupOldData(daysToKeep: number): number {
    return this.db.deleteOldOrchestrations(daysToKeep);
  }

  /**
   * Get system health statistics
   */
  getSystemHealth(hours: number = 24) {
    return this.db.getSystemHealthStats(hours);
  }

  /**
   * Get performance statistics for all agents
   */
  getPerformanceReport() {
    return this.db.getAgentPerformanceStats();
  }

  /**
   * Get failed orchestrations for analysis
   */
  getFailedOrchestrations(limit: number = 50): Orchestration[] {
    return this.db.getFailedOrchestrations(limit);
  }

  /**
   * Export all data as JSON for external analysis
   */
  exportToJSON(sessionId?: string) {
    if (sessionId) {
      // Export specific orchestration
      return this.db.getOrchestrationSummary(sessionId);
    } else {
      // Export all orchestrations
      const orchestrations = this.db.getAllOrchestrations(1000);
      return orchestrations.map(orch => ({
        ...orch,
        executions: this.db.getExecutionsByOrchestration(orch.id)
      }));
    }
  }
}

// Singleton instance
let monitorInstance: AgentMonitor | null = null;

export function getMonitor(): AgentMonitor {
  if (!monitorInstance) {
    monitorInstance = new AgentMonitor();
  }
  return monitorInstance;
}
