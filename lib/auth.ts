/**
 * Authentication utilities for user validation and session management
 * Updated to match task requirements for the NextJS test project
 */

export interface User {
  email: string;
  password: string;
}

export interface Session {
  id: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

// Mock user database for demonstration
// In a real application, this would be replaced with database calls
const MOCK_USERS: User[] = [
  { email: 'user@example.com', password: 'password123' },
  { email: 'admin@example.com', password: 'admin123' },
  { email: 'test@test.com', password: 'test123' }
];

// Mock session storage
const sessions = new Map<string, Session>();

/**
 * Validates user credentials against the user database
 * @param email - User email
 * @param password - User password
 * @returns Promise<boolean> - True if credentials are valid
 */
export async function validateUser(email: string, password: string): Promise<boolean> {
  try {
    // Simulate async database call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    return !!user;
  } catch (error) {
    console.error('Error validating user:', error);
    return false;
  }
}

/**
 * Creates a new session for the authenticated user
 * @param email - User email
 * @returns Promise<Session> - Created session object
 */
export async function createSession(email: string): Promise<Session> {
  const sessionId = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  
  const session: Session = {
    id: sessionId,
    email,
    createdAt: now,
    expiresAt
  };
  
  sessions.set(sessionId, session);
  return session;
}

/**
 * Generates a unique session ID
 * @returns string - Unique session identifier
 */
function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Validates a session by ID
 * @param sessionId - Session identifier
 * @returns Session | null - Session object if valid, null otherwise
 */
export function validateSession(sessionId: string): Session | null {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  // Check if session has expired
  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session;
}

/**
 * Destroys a session
 * @param sessionId - Session identifier to destroy
 * @returns boolean - True if session was destroyed
 */
export function destroySession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}