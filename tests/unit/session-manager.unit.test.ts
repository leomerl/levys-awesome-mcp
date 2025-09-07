import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SessionManager } from '../../src/agent-invocation/session-manager.ts';

interface Session {
  sessionId: string;
  agentName: string;
  [key: string]: any;
}

describe('SessionManager Unit Tests', () => {
  let tempDir: string;
  let manager: SessionManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'session-manager-test-'));
    manager = new SessionManager(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create and retrieve a session', async () => {
    const session: Session = await manager.createSession('test-agent');
    expect(session.sessionId).toBeDefined();

    const fetched: Session | undefined = await manager.getSession(session.sessionId);
    expect(fetched).toBeDefined();
    expect(fetched?.sessionId).toBe(session.sessionId);
    expect(fetched?.agentName).toBe('test-agent');
  });

  it('should update a session', async () => {
    const session: Session = await manager.createSession('update-agent');
    await manager.updateSession(session.sessionId, { status: 'completed' });

    const updated: Session | undefined = await manager.getSession(session.sessionId);
    expect(updated?.status).toBe('completed');
  });

  it('should delete a session', async () => {
    const session: Session = await manager.createSession('delete-agent');
    const deleted = await manager.deleteSession(session.sessionId);
    expect(deleted).toBe(true);

    const fetched: Session | undefined = await manager.getSession(session.sessionId);
    expect(fetched).toBeUndefined();
  });

  it('should generate unique session IDs', () => {
    const id1 = (SessionManager as any).generateSessionId();
    const id2 = (SessionManager as any).generateSessionId();
    expect(id1).not.toBe(id2);
  });
});

