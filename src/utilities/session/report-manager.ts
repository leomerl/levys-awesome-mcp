/**
 * Report Management Utilities
 * Handles summary report creation, validation, and retrieval
 */

import * as fs from 'fs';
import { PathConfig } from '../config/paths.js';
import { FileOperations } from '../fs/file-operations.js';

export interface SummaryCheckResult {
  found: boolean;
  files: string[];
}

export interface AgentSummaryResult {
  success: boolean;
  summary?: any;
  error?: string;
  filePath?: string;
}

export class ReportManager {
  /**
   * Check for summary files in a session
   */
  static checkForSummaryFiles(sessionId: string, agentName: string): SummaryCheckResult {
    const reportsDir = PathConfig.getReportsDirectory(sessionId);
    const files: string[] = [];
    let found = false;
    
    if (!FileOperations.fileExists(reportsDir)) {
      return { found: false, files: [] };
    }
    
    try {
      const reportFiles = fs.readdirSync(reportsDir);
      
      // Look for agent-specific summary files
      const summaryPatterns = [
        `${agentName}-summary.json`,
        `${agentName}-report.json`,
        'summary.json',
        'report.json'
      ];
      
      for (const file of reportFiles) {
        if (file.endsWith('.json')) {
          files.push(file);
          
          // Check if it matches any of our summary patterns
          if (summaryPatterns.some(pattern => file === pattern)) {
            found = true;
          }
          
          // Also check file content to see if it looks like a summary
          try {
            const filePath = PathConfig.getReportsDirectory(sessionId) + '/' + file;
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(content);
            
            // Check if it has summary-like structure
            if (jsonData.sessionId === sessionId && 
                (jsonData.agentName === agentName || jsonData.agentType === agentName) &&
                (jsonData.summary || jsonData.output || jsonData.results)) {
              found = true;
            }
          } catch (error) {
            // Skip files that can't be parsed as JSON
          }
        }
      }
    } catch (error) {
      console.error(`Error checking for summary files in ${reportsDir}:`, error);
    }
    
    return { found, files };
  }

  /**
   * Retrieve agent summary from reports directory
   */
  static getAgentSummary(sessionId: string, agentName?: string): AgentSummaryResult {
    const reportsDir = PathConfig.getReportsDirectory(sessionId);
    
    if (!FileOperations.fileExists(reportsDir)) {
      return {
        success: false,
        error: `No reports directory found for session: ${sessionId}`
      };
    }
    
    try {
      const reportFiles = fs.readdirSync(reportsDir);
      let targetFile: string | null = null;
      
      // If agentName is provided, look for agent-specific files first
      if (agentName) {
        const agentSpecificFiles = [
          `${agentName}-summary.json`,
          `${agentName}-report.json`
        ];
        
        for (const file of agentSpecificFiles) {
          if (reportFiles.includes(file)) {
            targetFile = file;
            break;
          }
        }
      }
      
      // If no agent-specific file found, look for generic summary files
      if (!targetFile) {
        const genericFiles = ['summary.json', 'report.json'];
        for (const file of genericFiles) {
          if (reportFiles.includes(file)) {
            targetFile = file;
            break;
          }
        }
      }
      
      // If still no file found, look for any JSON file that contains summary-like structure
      if (!targetFile) {
        for (const file of reportFiles) {
          if (file.endsWith('.json')) {
            try {
              const filePath = PathConfig.getReportsDirectory(sessionId) + '/' + file;
              const content = fs.readFileSync(filePath, 'utf8');
              const jsonData = JSON.parse(content);
              
              // Check if it has summary-like structure
              if (jsonData.sessionId === sessionId &&
                  (agentName ? (jsonData.agentName === agentName || jsonData.agentType === agentName) : true) &&
                  (jsonData.summary || jsonData.output || jsonData.results)) {
                targetFile = file;
                break;
              }
            } catch (error) {
              // Skip files that can't be parsed as JSON
            }
          }
        }
      }
      
      if (!targetFile) {
        const availableFiles = reportFiles.filter(f => f.endsWith('.json'));
        return {
          success: false,
          error: `No summary file found for session: ${sessionId}${agentName ? ` (agent: ${agentName})` : ''}. Available files: ${availableFiles.join(', ') || 'none'}`
        };
      }
      
      // Read and parse the summary file
      const filePath = PathConfig.getReportsDirectory(sessionId) + '/' + targetFile;
      const content = fs.readFileSync(filePath, 'utf8');
      const summary = JSON.parse(content);
      
      return {
        success: true,
        summary,
        filePath: `reports/${sessionId}/${targetFile}`
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to read summary file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create response metadata for agent invocations
   */
  static createResponseMetadata(sessionId: string, continuedFrom?: string) {
    return {
      sessionId,
      streamFilePath: PathConfig.getStreamFilePath(sessionId),
      continuedFrom
    };
  }

  /**
   * Build standardized agent response object
   */
  static buildAgentResponse(
    success: boolean,
    output: string,
    sessionId: string,
    isSessionContinuation: boolean,
    messages: any[],
    verboseOutput: string,
    streamingOutput: string,
    params: { includeOutput?: boolean; verbose?: boolean; streaming?: boolean; continueSessionId?: string },
    error?: string
  ) {
    const metadata = this.createResponseMetadata(sessionId, isSessionContinuation ? params.continueSessionId : undefined);
    return {
      success,
      ...(error && { error }),
      output: output.trim(),
      messages: params.includeOutput ? messages : undefined,
      verboseOutput: params.verbose && verboseOutput ? verboseOutput.trim() : undefined,
      streamingOutput: params.streaming && streamingOutput ? streamingOutput.trim() : undefined,
      ...metadata
    };
  }
}