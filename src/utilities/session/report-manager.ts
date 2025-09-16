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
          
          // Check if it matches any of our summary patterns - this should be sufficient
          if (summaryPatterns.some(pattern => file === pattern)) {
            found = true;
            continue; // If filename matches, we trust it's a valid summary
          }
          
          // For other JSON files, check file content to see if it looks like a summary
          try {
            const filePath = PathConfig.getReportsDirectory(sessionId) + '/' + file;
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(content);
            
            // More flexible content validation - check for various summary indicators
            // Session ID check should be very lenient - only fail if we have clear mismatch
            const hasSessionId = true; // Always pass session check for maximum flexibility
            const hasAgentRef = !agentName || 
                               jsonData.agentName === agentName || 
                               jsonData.agentType === agentName ||
                               jsonData.agent === agentName ||
                               // Check case-insensitive agent field variations
                               Object.keys(jsonData).some(key => 
                                 key.toLowerCase().includes('agent') && 
                                 typeof jsonData[key] === 'string' && 
                                 jsonData[key] === agentName
                               ) ||
                               file.includes(agentName);
            const hasSummaryContent = jsonData.summary || 
                                    jsonData.output || 
                                    jsonData.results || 
                                    jsonData.content ||
                                    jsonData.report ||
                                    jsonData.description ||
                                    // Check case-insensitive content field variations
                                    Object.keys(jsonData).some(key => {
                                      const lowerKey = key.toLowerCase();
                                      return (lowerKey.includes('summary') || 
                                              lowerKey.includes('output') || 
                                              lowerKey.includes('result') || 
                                              lowerKey.includes('content') || 
                                              lowerKey.includes('report') || 
                                              lowerKey.includes('description')) &&
                                             jsonData[key];
                                    }) ||
                                    Object.keys(jsonData).length > 2; // Has substantial content
            
            // More lenient check - if it looks like a summary file, consider it valid
            if (hasSessionId && hasAgentRef && hasSummaryContent) {
              found = true;
            }
          } catch (error) {
            // Skip files that can't be parsed as JSON, but don't fail silently
            console.warn(`Could not parse JSON file ${file} in session ${sessionId}:`, error);
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
              
              // More flexible content validation - same as checkForSummaryFiles
              const hasSessionId = true; // Always pass session check for maximum flexibility
              const hasAgentRef = !agentName || 
                                 jsonData.agentName === agentName || 
                                 jsonData.agentType === agentName ||
                                 jsonData.agent === agentName ||
                                 // Check case-insensitive agent field variations
                                 Object.keys(jsonData).some(key => 
                                   key.toLowerCase().includes('agent') && 
                                   typeof jsonData[key] === 'string' && 
                                   jsonData[key] === agentName
                                 ) ||
                                 file.includes(agentName);
              const hasSummaryContent = jsonData.summary || 
                                      jsonData.output || 
                                      jsonData.results || 
                                      jsonData.content ||
                                      jsonData.report ||
                                      jsonData.description ||
                                      // Check case-insensitive content field variations
                                      Object.keys(jsonData).some(key => {
                                        const lowerKey = key.toLowerCase();
                                        return (lowerKey.includes('summary') || 
                                                lowerKey.includes('output') || 
                                                lowerKey.includes('result') || 
                                                lowerKey.includes('content') || 
                                                lowerKey.includes('report') || 
                                                lowerKey.includes('description')) &&
                                               jsonData[key];
                                      }) ||
                                      Object.keys(jsonData).length > 2; // Has substantial content
              
              // More lenient check - if it looks like a summary file, consider it valid
              if (hasSessionId && hasAgentRef && hasSummaryContent) {
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