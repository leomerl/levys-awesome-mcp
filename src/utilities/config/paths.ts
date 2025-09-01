/**
 * Path Configuration Utilities
 * Centralizes path management and directory structure
 */

import * as path from 'path';

export class PathConfig {
  /**
   * Get session directory path
   */
  static getSessionDirectory(sessionId: string): string {
    return path.resolve(process.cwd(), 'output_streams', sessionId);
  }

  /**
   * Get conversation file path for a session
   */
  static getConversationFilePath(sessionId: string): string {
    return path.join(this.getSessionDirectory(sessionId), 'conversation.json');
  }

  /**
   * Get stream log file path for a session
   */
  static getStreamFilePath(sessionId: string): string {
    return path.join(this.getSessionDirectory(sessionId), 'stream.log');
  }

  /**
   * Get reports directory for a session
   */
  static getReportsDirectory(sessionId: string): string {
    return path.resolve(process.cwd(), 'reports', sessionId);
  }

  /**
   * Get report file path for a session
   */
  static getReportFilePath(sessionId: string, agentName?: string): string {
    const fileName = agentName ? `${agentName}-summary.json` : 'summary.json';
    return path.join(this.getReportsDirectory(sessionId), fileName);
  }

  /**
   * Get agents directory path
   */
  static getAgentsDirectory(): string {
    return path.resolve(process.cwd(), 'agents');
  }

  /**
   * Get output streams base directory
   */
  static getOutputStreamsDirectory(): string {
    return path.resolve(process.cwd(), 'output_streams');
  }

  /**
   * Get reports base directory
   */
  static getReportsBaseDirectory(): string {
    return path.resolve(process.cwd(), 'reports');
  }

  /**
   * Get Claude agents directory (.claude/agents)
   */
  static getClaudeAgentsDirectory(): string {
    return path.resolve(process.cwd(), '.claude', 'agents');
  }
}