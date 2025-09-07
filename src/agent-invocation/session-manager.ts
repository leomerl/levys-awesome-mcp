import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import * as path from 'path';

export interface Session {
  sessionId: string;
  agentName: string;
  [key: string]: any;
}

/**
 * Simple filesystem-based session manager used for testing.
 */
export class SessionManager {
  constructor(private readonly baseDir: string) {}

  private getSessionFile(sessionId: string): string {
    return path.join(this.baseDir, `${sessionId}.json`);
  }

  async createSession(agentName: string, data: Record<string, any> = {}): Promise<Session> {
    await mkdir(this.baseDir, { recursive: true });
    const session: Session = {
      sessionId: SessionManager.generateSessionId(),
      agentName,
      ...data
    };
    await writeFile(this.getSessionFile(session.sessionId), JSON.stringify(session, null, 2));
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    try {
      const content = await readFile(this.getSessionFile(sessionId), 'utf8');
      return JSON.parse(content) as Session;
    } catch {
      return undefined;
    }
  }

  async updateSession(sessionId: string, updates: Record<string, any>): Promise<Session | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;
    const updated = { ...session, ...updates } as Session;
    await writeFile(this.getSessionFile(sessionId), JSON.stringify(updated, null, 2));
    return updated;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await rm(this.getSessionFile(sessionId));
      return true;
    } catch {
      return false;
    }
  }

  static generateSessionId(): string {
    return randomUUID();
  }
}

