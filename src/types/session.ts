/**
 * Session Management Types
 * Shared types for session handling across agent invocation system
 */

export interface ConversationHistory {
  sessionId: string;
  agentName: string;
  messages: any[];
  createdAt: string;
  lastUpdated: string;
}

export interface CompactMessage {
  type: string;
  content?: string;
  timestamp?: string;
}

export interface CompactConversationHistory {
  sessionId: string;
  agentName: string;
  messageCount: number;
  lastMessages: CompactMessage[];
  createdAt: string;
  lastUpdated: string;
}

export interface SessionSummary {
  sessionId: string;
  agentName: string;
  createdAt: string;
  lastUpdated: string;
  messageCount: number;
}

export interface InvokeAgentParams {
  agentName: string;
  prompt: string;
  abortTimeout?: number;
  includeOutput?: boolean;
  verbose?: boolean;
  streaming?: boolean;
  saveStreamToFile?: boolean;
  continueSessionId?: string;
  ensureSummary?: boolean;
}

export interface AgentInvocationResult {
  success: boolean;
  output?: string;
  error?: string;
  messages?: any[];
  verboseOutput?: string;
  streamingOutput?: string;
  sessionId?: string;
  streamFilePath?: string;
  continuedFrom?: string;
}

export interface SessionInitResult {
  success: boolean;
  sessionId?: string;
  existingHistory?: ConversationHistory | null;
  isSessionContinuation?: boolean;
  error?: string;
}

export interface StreamingUtils {
  initStreamFile(): boolean;
  appendToStream(message: string): void;
  addStreamingOutput(message: string, level?: 'info' | 'debug' | 'tool'): void;
  addVerboseOutput(message: string): void;
  getStreamingOutput(): string;
  getVerboseOutput(): string;
  getStreamLogFile(): string | null;
}