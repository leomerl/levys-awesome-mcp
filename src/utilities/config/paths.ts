/**
 * Path Configuration Utilities
 * Centralizes path management and directory structure
 */

import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    // Always use the source agents directory at the project root
    // From dist/src/utilities/config/paths.js, go up to project root then to agents
    const sourceAgentsPath = path.resolve(__dirname, '..', '..', '..', '..', 'agents');

    // Fallback: if we're in development (running from src/), adjust path
    if (!fs.existsSync(sourceAgentsPath)) {
      // Try from src/utilities/config/ to root
      const devAgentsPath = path.resolve(__dirname, '..', '..', '..', 'agents');
      if (fs.existsSync(devAgentsPath)) {
        return devAgentsPath;
      }
    }

    return sourceAgentsPath;
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