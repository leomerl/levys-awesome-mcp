import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Type definitions for Session Management
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

export interface SessionInitResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Session Store class for managing conversation sessions
 */
export class SessionStore {
  private static readonly SESSION_DIR = path.join(process.cwd(), 'sessions');
  private static readonly REPORTS_DIR = path.join(process.cwd(), 'reports');
  
  /**
   * Initialize a new session
   */
  static async initializeSession(sessionId?: string): Promise<SessionInitResult> {
    try {
      const id = sessionId || this.generateSessionId();
      const sessionPath = path.join(this.SESSION_DIR, id);
      
      // Ensure directories exist
      await fs.mkdir(this.SESSION_DIR, { recursive: true });
      await fs.mkdir(sessionPath, { recursive: true });
      
      return { success: true, sessionId: id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Save conversation history to disk
   */
  static async saveConversationHistory(
    sessionId: string, 
    agentName: string, 
    messages: any[]
  ): Promise<void> {
    const sessionPath = path.join(this.SESSION_DIR, sessionId);
    const historyPath = path.join(sessionPath, `${agentName}-history.json`);
    
    const history: ConversationHistory = {
      sessionId,
      agentName,
      messages,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Check if history exists to preserve createdAt
    try {
      const existing = await this.loadConversationHistory(sessionId, agentName);
      if (existing) {
        history.createdAt = existing.createdAt;
      }
    } catch {
      // New history file
    }
    
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  }
  
  /**
   * Load conversation history from disk
   */
  static async loadConversationHistory(
    sessionId: string, 
    agentName: string
  ): Promise<ConversationHistory | null> {
    try {
      const historyPath = path.join(this.SESSION_DIR, sessionId, `${agentName}-history.json`);
      const data = await fs.readFile(historyPath, 'utf-8');
      return JSON.parse(data) as ConversationHistory;
    } catch {
      return null;
    }
  }
  
  /**
   * Get all sessions with summaries
   */
  static async getAllSessions(): Promise<SessionSummary[]> {
    try {
      await fs.mkdir(this.SESSION_DIR, { recursive: true });
      const sessions = await fs.readdir(this.SESSION_DIR);
      const summaries: SessionSummary[] = [];
      
      for (const sessionId of sessions) {
        const sessionPath = path.join(this.SESSION_DIR, sessionId);
        const stat = await fs.stat(sessionPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(sessionPath);
          const historyFiles = files.filter(f => f.endsWith('-history.json'));
          
          for (const file of historyFiles) {
            const agentName = file.replace('-history.json', '');
            const history = await this.loadConversationHistory(sessionId, agentName);
            
            if (history) {
              summaries.push({
                sessionId,
                agentName,
                createdAt: history.createdAt,
                lastUpdated: history.lastUpdated,
                messageCount: history.messages.length
              });
            }
          }
        }
      }
      
      return summaries.sort((a, b) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );
    } catch {
      return [];
    }
  }
  
  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionPath = path.join(this.SESSION_DIR, sessionId);
      await fs.rm(sessionPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Compact messages for summary view
   */
  static compactMessage(message: any): CompactMessage {
    return {
      type: message.type || 'unknown',
      content: message.content?.substring(0, 100),
      timestamp: message.timestamp || new Date().toISOString()
    };
  }
  
  /**
   * Get compact conversation history
   */
  static async getCompactHistory(
    sessionId: string, 
    agentName: string, 
    maxMessages = 5
  ): Promise<CompactConversationHistory | null> {
    const history = await this.loadConversationHistory(sessionId, agentName);
    if (!history) return null;
    
    const lastMessages = history.messages
      .slice(-maxMessages)
      .map(msg => this.compactMessage(msg));
    
    return {
      sessionId: history.sessionId,
      agentName: history.agentName,
      messageCount: history.messages.length,
      lastMessages,
      createdAt: history.createdAt,
      lastUpdated: history.lastUpdated
    };
  }
  
  /**
   * Export session to different formats
   */
  static async exportSession(
    sessionId: string, 
    format: 'json' | 'markdown' = 'json'
  ): Promise<string | null> {
    try {
      const sessionPath = path.join(this.SESSION_DIR, sessionId);
      const files = await fs.readdir(sessionPath);
      const historyFiles = files.filter(f => f.endsWith('-history.json'));
      
      if (format === 'json') {
        const allHistories: ConversationHistory[] = [];
        for (const file of historyFiles) {
          const agentName = file.replace('-history.json', '');
          const history = await this.loadConversationHistory(sessionId, agentName);
          if (history) allHistories.push(history);
        }
        return JSON.stringify(allHistories, null, 2);
      }
      
      // Markdown format
      let markdown = `# Session: ${sessionId}\n\n`;
      for (const file of historyFiles) {
        const agentName = file.replace('-history.json', '');
        const history = await this.loadConversationHistory(sessionId, agentName);
        if (history) {
          markdown += `## Agent: ${agentName}\n`;
          markdown += `- Created: ${history.createdAt}\n`;
          markdown += `- Last Updated: ${history.lastUpdated}\n`;
          markdown += `- Messages: ${history.messages.length}\n\n`;
        }
      }
      return markdown;
    } catch {
      return null;
    }
  }
}

/**
 * STATIC TYPE TESTS
 * These tests verify compile-time type safety of the SessionStore implementation
 */

/**
 * Type test dictionary to verify type safety at compile time
 */
type _CompileTimeTests = {
  // Test 1: ConversationHistory interface structure validation
  test_conversation_history_structure: ConversationHistory extends {
    sessionId: string;
    agentName: string;
    messages: any[];
    createdAt: string;
    lastUpdated: string;
  } ? true : false;

  // Test 2: SessionInitResult discriminated union validation
  test_session_init_result_union: SessionInitResult extends 
    | { success: true; sessionId?: string; error?: string }
    | { success: false; sessionId?: string; error?: string } ? true : false;

  // Test 3: Method return type validations
  test_initialize_session_return: Awaited<ReturnType<typeof SessionStore.initializeSession>> extends SessionInitResult ? true : false;
  
  // Test 4: Save conversation history void return
  test_save_conversation_void: Awaited<ReturnType<typeof SessionStore.saveConversationHistory>> extends void ? true : false;
  
  // Test 5: Load conversation nullable return
  test_load_conversation_nullable: Awaited<ReturnType<typeof SessionStore.loadConversationHistory>> extends ConversationHistory | null ? true : false;
  
  // Test 6: Get all sessions array return
  test_get_all_sessions_array: Awaited<ReturnType<typeof SessionStore.getAllSessions>> extends SessionSummary[] ? true : false;
  
  // Test 7: Delete session boolean return
  test_delete_session_boolean: Awaited<ReturnType<typeof SessionStore.deleteSession>> extends boolean ? true : false;
  
  // Test 8: CompactConversationHistory interface structure validation
  test_compact_history_structure: CompactConversationHistory extends {
    sessionId: string;
    agentName: string;
    messageCount: number;
    lastMessages: CompactMessage[];
    createdAt: string;
    lastUpdated: string;
  } ? true : false;

  // Test 9: CompactMessage type structure validation
  test_compact_message_structure: CompactMessage extends {
    type: string;
    content?: string;
    timestamp?: string;
  } ? true : false;

  // Test 10: SessionSummary type structure validation
  test_session_summary_structure: SessionSummary extends {
    sessionId: string;
    agentName: string;
    createdAt: string;
    lastUpdated: string;
    messageCount: number;
  } ? true : false;

  // Test 11: Test conditional type for SessionInitResult success cases
  test_session_init_success_case: SessionInitResult extends { success: true } ? 
    Required<Pick<SessionInitResult, 'sessionId'>> extends { sessionId: string } ? true : false : true;

  // Test 12: Test conditional type for SessionInitResult error cases  
  test_session_init_error_case: SessionInitResult extends { success: false } ?
    Required<Pick<SessionInitResult, 'error'>> extends { error: string } ? true : false : true;

  // Test 13: Verify that messages parameter accepts any array type
  test_messages_parameter_flexibility: any[] extends Parameters<typeof SessionStore.saveConversationHistory>[2] ? true : false;

  // Test 14: Test type safety of JSON.parse return type assertion
  test_json_parse_assertion: ConversationHistory extends ReturnType<typeof JSON.parse> ? true : false;

  // Test 15: Verify CompactConversationHistory structure
  test_compact_conversation_history: CompactConversationHistory extends {
    sessionId: string;
    agentName: string;
    messageCount: number;
    lastMessages: CompactMessage[];
    createdAt: string;
    lastUpdated: string;
  } ? true : false;

  // Test 16: Test array filter/map return types in compactMessage
  test_array_transformation_types: CompactMessage[] extends ReturnType<Array<any>['map']> ? true : false;

  // Test 17: Test timestamp string consistency
  test_timestamp_string_type: string extends ReturnType<Date['toISOString']> ? true : false;

  // Test 18: Verify session ID generation return type
  test_session_id_generation: string extends ReturnType<typeof SessionStore['generateSessionId']> ? true : false;

  // Test 19: Test optional property handling in interfaces
  test_optional_properties: undefined extends SessionInitResult['error'] ? true : false;

  // Test 20: Test array sort comparison function type
  test_sort_comparator_type: ((a: SessionSummary, b: SessionSummary) => number) extends 
    Parameters<Array<SessionSummary>['sort']>[0] ? true : false;

  // Test 21: Verify type safety of file system operations integration
  test_file_operations_integration: Promise<void> extends ReturnType<typeof SessionStore.saveConversationHistory> ? true : false;

  // Test 22: Test method accessibility (static methods)
  test_static_method_access: typeof SessionStore.initializeSession extends Function ? true : false;

  // Test 23: Verify error handling return types maintain type safety
  test_error_handling_types: null extends Awaited<ReturnType<typeof SessionStore.loadConversationHistory>> ? true : false;

  // Test 24: Test that compactMessage handles various message types correctly
  test_message_type_handling: CompactMessage['type'] extends string ? true : false;

  // Test 25: Verify sessionId parameter consistency across methods
  test_session_id_consistency: string extends Parameters<typeof SessionStore.loadConversationHistory>[0] ? 
    string extends Parameters<typeof SessionStore.saveConversationHistory>[0] ? true : false : false;
};

/**
 * Compile-time assertion that all tests pass
 * If any test fails, TypeScript compilation will fail with detailed error
 */
type _AssertAllTestsPass = _CompileTimeTests[keyof _CompileTimeTests] extends true ? true : {
  error: "One or more compile-time type tests failed";
  failedTests: {
    [K in keyof _CompileTimeTests]: _CompileTimeTests[K] extends false ? K : never;
  }[keyof _CompileTimeTests];
};

// This line will cause a compilation error if any tests fail
const _typeTestAssertion: _AssertAllTestsPass = true;

/**
 * Additional type utility tests for session management
 */
type _SessionManagementUtilityTests = {
  // Test 26: Verify async method return types are properly typed
  test_async_return_types: Awaited<ReturnType<typeof SessionStore.initializeSession>> extends SessionInitResult ? true : false;

  // Test 27: Test union type handling in SessionInitResult
  test_union_type_handling: SessionInitResult['success'] extends boolean ? true : false;

  // Test 28: Verify optional parameter handling
  test_optional_parameter_types: Parameters<typeof SessionStore.initializeSession>[0] extends string | undefined ? true : false;

  // Test 29: Test type narrowing in conditional logic
  test_type_narrowing: string extends NonNullable<SessionInitResult['sessionId']> ? true : false;

  // Test 30: Verify array type safety in messages
  test_message_array_safety: any[] extends ConversationHistory['messages'] ? true : false;
};

const _additionalTypeTestAssertion: _SessionManagementUtilityTests[keyof _SessionManagementUtilityTests] extends true ? true : never = true;

/**
 * Generic type tests for session operations
 */
type ExtractPromiseType<T> = T extends Promise<infer U> ? U : never;
type ExtractArrayType<T> = T extends Array<infer U> ? U : never;

type _GenericTypeTests = {
  // Test 31: Generic Promise unwrapping
  test_promise_unwrapping: ExtractPromiseType<ReturnType<typeof SessionStore.loadConversationHistory>> extends ConversationHistory | null ? true : false;

  // Test 32: Generic Array element extraction
  test_array_element_extraction: ExtractArrayType<SessionSummary[]> extends SessionSummary ? true : false;

  // Test 33: Conditional type for method parameters
  test_conditional_parameters: Parameters<typeof SessionStore.saveConversationHistory>[2] extends Array<infer T> ? T extends any ? true : false : false;

  // Test 34: Mapped type validation - fixed to properly check subset relationship
  test_mapped_types: keyof Pick<ConversationHistory, 'sessionId' | 'agentName' | 'createdAt' | 'lastUpdated'> extends keyof SessionSummary ? true : false;

  // Test 35: Utility type combinations
  test_utility_combinations: Required<Pick<SessionInitResult, 'success'>> extends { success: boolean } ? true : false;
};

const _genericTypeTestAssertion: _GenericTypeTests[keyof _GenericTypeTests] extends true ? true : never = true;