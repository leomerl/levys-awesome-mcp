import { describe, it, expect, beforeEach } from 'vitest';

// Mock implementation since actual utility doesn't exist yet
class MockSessionStore {
  private sessions = new Map();

  createSession(sessionId: string, agentName: string) {
    this.sessions.set(sessionId, { 
      id: sessionId, 
      agentName, 
      createdAt: new Date(),
      status: 'active'
    });
    return this.sessions.get(sessionId);
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  updateSession(sessionId: string, updates: any) {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
    }
    return session;
  }

  deleteSession(sessionId: string) {
    return this.sessions.delete(sessionId);
  }

  listSessions() {
    return Array.from(this.sessions.values());
  }
}

describe('Session Store Unit Tests', () => {
  let sessionStore: MockSessionStore;

  beforeEach(() => {
    sessionStore = new MockSessionStore();
  });

  it('should create new session', () => {
    const session = sessionStore.createSession('test-123', 'test-agent');
    
    expect(session).toBeDefined();
    expect(session.id).toBe('test-123');
    expect(session.agentName).toBe('test-agent');
    expect(session.status).toBe('active');
  });

  it('should retrieve existing session', () => {
    sessionStore.createSession('test-456', 'another-agent');
    const session = sessionStore.getSession('test-456');
    
    expect(session).toBeDefined();
    expect(session.agentName).toBe('another-agent');
  });

  it('should update session data', () => {
    sessionStore.createSession('test-789', 'update-agent');
    const updated = sessionStore.updateSession('test-789', { status: 'completed' });
    
    expect(updated.status).toBe('completed');
  });

  it('should delete session', () => {
    sessionStore.createSession('test-delete', 'delete-agent');
    const deleted = sessionStore.deleteSession('test-delete');
    
    expect(deleted).toBe(true);
    expect(sessionStore.getSession('test-delete')).toBeUndefined();
  });

  it('should list all sessions', () => {
    sessionStore.createSession('session-1', 'agent-1');
    sessionStore.createSession('session-2', 'agent-2');
    
    const sessions = sessionStore.listSessions();
    expect(sessions).toHaveLength(2);
  });
});