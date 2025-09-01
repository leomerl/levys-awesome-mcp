/**
 * Session Storage and Management
 * Centralizes session persistence and retrieval operations
 */

import * as fs from 'fs';
import { PathConfig } from '../config/paths.js';
import { ValidationUtils } from '../config/validation.js';
import { FileOperations } from '../fs/file-operations.js';
import { 
  ConversationHistory, 
  CompactConversationHistory, 
  SessionSummary,
  SessionInitResult,
  CompactMessage 
} from '../../types/session.js';

export class SessionStore {
  /**
   * Initialize a new session or continue an existing one
   */
  static async initializeSession(
    continueSessionId: string | undefined, 
    agentName: string
  ): Promise<SessionInitResult> {
    if (continueSessionId) {
      if (!ValidationUtils.validateSessionId(continueSessionId)) {
        return {
          success: false,
          error: `Invalid session ID format: ${continueSessionId}`
        };
      }

      const existingHistory = await this.loadConversationHistory(continueSessionId);
      if (!existingHistory) {
        return {
          success: false,
          error: `Session '${continueSessionId}' not found`
        };
      }

      if (existingHistory.agentName !== agentName) {
        return {
          success: false,
          error: `Session '${continueSessionId}' was created with agent '${existingHistory.agentName}', but trying to continue with '${agentName}'`
        };
      }

      return {
        success: true,
        sessionId: continueSessionId,
        existingHistory,
        isSessionContinuation: true
      };
    } else {
      // Generate new session ID
      const sessionId = this.generateSessionId();
      return {
        success: true,
        sessionId,
        existingHistory: null,
        isSessionContinuation: false
      };
    }
  }

  /**
   * Save conversation history to persistent storage
   */
  static async saveConversationHistory(
    sessionId: string, 
    agentName: string, 
    messages: any[]
  ): Promise<void> {
    try {
      const sessionDir = PathConfig.getSessionDirectory(sessionId);
      await FileOperations.ensureDirectoryExists(sessionDir + '/dummy');
      
      const conversationFilePath = PathConfig.getConversationFilePath(sessionId);
      const fullHistory: ConversationHistory = {
        sessionId,
        agentName,
        messages,
        createdAt: fs.existsSync(conversationFilePath) 
          ? (await this.loadConversationHistory(sessionId))?.createdAt || new Date().toISOString()
          : new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      const result = await FileOperations.writeFile(
        conversationFilePath, 
        JSON.stringify(fullHistory, null, 2)
      );

      if (!result.success) {
        console.error(`Failed to save conversation history for session ${sessionId}:`, result.error);
      }
    } catch (error) {
      console.error(`Failed to save conversation history for session ${sessionId}:`, error);
    }
  }

  /**
   * Load conversation history from persistent storage
   */
  static async loadConversationHistory(sessionId: string): Promise<ConversationHistory | null> {
    try {
      const conversationFilePath = PathConfig.getConversationFilePath(sessionId);
      if (!FileOperations.fileExists(conversationFilePath)) {
        return null;
      }
      
      const readResult = await FileOperations.readFile(conversationFilePath);
      if (!readResult.success || !readResult.content) {
        return null;
      }

      return JSON.parse(readResult.content) as ConversationHistory;
    } catch (error) {
      console.error(`Failed to load conversation history for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * List all available sessions
   */
  static listAvailableSessions(): SessionSummary[] {
    const sessions: SessionSummary[] = [];
    const outputStreamsDir = PathConfig.getOutputStreamsDirectory();
    
    if (!FileOperations.fileExists(outputStreamsDir)) {
      return sessions;
    }
    
    const sessionDirs = fs.readdirSync(outputStreamsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const sessionId of sessionDirs) {
      try {
        // Try to load compact summary first (more efficient)
        const summaryPath = PathConfig.getSessionDirectory(sessionId) + '/summary.json';
        if (FileOperations.fileExists(summaryPath)) {
          const summaryContent = fs.readFileSync(summaryPath, 'utf8');
          const summary: CompactConversationHistory = JSON.parse(summaryContent);
          
          sessions.push({
            sessionId: summary.sessionId,
            agentName: summary.agentName,
            createdAt: summary.createdAt,
            lastUpdated: summary.lastUpdated,
            messageCount: summary.messageCount
          });
        } else {
          // Fallback to full conversation file (less efficient)
          const conversationFilePath = PathConfig.getConversationFilePath(sessionId);
          if (FileOperations.fileExists(conversationFilePath)) {
            const historyContent = fs.readFileSync(conversationFilePath, 'utf8');
            const history: ConversationHistory = JSON.parse(historyContent);
            
            sessions.push({
              sessionId: history.sessionId,
              agentName: history.agentName,
              createdAt: history.createdAt,
              lastUpdated: history.lastUpdated,
              messageCount: history.messages.length
            });
          }
        }
      } catch (error) {
        // Skip sessions that can't be read
      }
    }
    
    // Sort by last updated, most recent first
    sessions.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    
    return sessions;
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    // Use crypto.randomUUID if available, fallback to timestamp-based
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback method
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Compact a message for efficient storage
   */
  static compactMessage(message: any): CompactMessage {
    const timestamp = new Date().toISOString();
    
    if (message.type === "assistant" && message.message?.content) {
      const textContent = message.message.content
        .filter((item: any) => item.type === "text")
        .map((item: any) => item.text)
        .join(" ");
      return {
        type: "assistant",
        content: textContent.length > 200 ? textContent.substring(0, 200) + "..." : textContent,
        timestamp
      };
    } else if (message.type === "user") {
      const toolResult = message.message?.content?.[0];
      if (toolResult?.type === "tool_result") {
        return {
          type: "tool_result", 
          content: `Tool: ${toolResult.name || 'unknown'}`,
          timestamp
        };
      } else if (toolResult?.type === "tool_use") {
        return {
          type: "tool_use",
          content: `Using tool: ${toolResult.name || 'unknown'}`,
          timestamp
        };
      }
      return {
        type: "user", 
        content: "Tool interaction",
        timestamp
      };
    } else if (message.type === "result") {
      return {
        type: "result",
        content: message.is_error ? `Error: ${message.error_message || 'Unknown'}` : "Success",
        timestamp
      };
    }
    
    return {
      type: message.type || "unknown",
      content: "System message",
      timestamp
    };
  }
}