import { randomBytes, createHash } from 'crypto';

/**
 * Interface for user validation result
 */
export interface UserValidationResult {
  isValid: boolean;
  message: string;
  user?: {
    email: string;
    id: string;
  };
}

/**
 * Interface for session creation result
 */
export interface SessionResult {
  success: boolean;
  sessionToken?: string;
  expiresAt?: Date;
  message: string;
}

/**
 * User credentials interface
 */
export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Session data interface
 */
export interface SessionData {
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Validates user credentials with basic email and password validation
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<UserValidationResult> - Validation result with user data if valid
 */
export async function validateUser(email: string, password: string): Promise<UserValidationResult> {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Invalid email format'
    };
  }

  // Basic password validation
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long'
    };
  }

  // Check password complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    };
  }

  // In a real application, you would check against a database
  // For this example, we'll simulate a successful validation
  if (email === 'test@example.com' && password === 'TestPassword123') {
    return {
      isValid: true,
      message: 'User validation successful',
      user: {
        email: email,
        id: createHash('sha256').update(email).digest('hex').substring(0, 16)
      }
    };
  }

  // Simulate checking against user database (always fail for demo)
  return {
    isValid: false,
    message: 'Invalid email or password'
  };
}

/**
 * Creates a secure session token for authenticated users
 * @param userId - Unique identifier for the user
 * @param email - User's email address
 * @param expirationHours - Number of hours until session expires (default: 24)
 * @returns SessionResult - Session creation result with token and expiration
 */
export function createSession(userId: string, email: string, expirationHours: number = 24): SessionResult {
  try {
    // Validate inputs
    if (!userId || !email) {
      return {
        success: false,
        message: 'User ID and email are required for session creation'
      };
    }

    if (expirationHours <= 0 || expirationHours > 168) { // Max 7 days
      return {
        success: false,
        message: 'Expiration hours must be between 1 and 168 hours (7 days)'
      };
    }

    // Generate secure random token
    const tokenBytes = randomBytes(32);
    const timestamp = Date.now().toString();
    const userInfo = `${userId}:${email}`;
    
    // Create token with timestamp and user info for uniqueness
    const tokenData = `${tokenBytes.toString('hex')}:${timestamp}:${createHash('sha256').update(userInfo).digest('hex').substring(0, 16)}`;
    
    // Create session token by hashing the token data
    const sessionToken = createHash('sha256').update(tokenData).digest('hex');

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    return {
      success: true,
      sessionToken: sessionToken,
      expiresAt: expiresAt,
      message: 'Session created successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates a session token and extracts session data
 * @param sessionToken - The session token to validate
 * @returns boolean - Whether the session token is valid format
 */
export function validateSessionToken(sessionToken: string): boolean {
  // Basic token format validation
  if (!sessionToken || typeof sessionToken !== 'string') {
    return false;
  }

  // Check if token is a valid hex string of expected length (64 characters for SHA-256)
  const hexRegex = /^[a-f0-9]{64}$/i;
  return hexRegex.test(sessionToken);
}

/**
 * Generates a secure password hash using SHA-256
 * @param password - Plain text password
 * @param salt - Optional salt (will generate if not provided)
 * @returns Object with hash and salt
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + actualSalt).digest('hex');
  
  return {
    hash: hash,
    salt: actualSalt
  };
}

/**
 * Verifies a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Stored password hash
 * @param salt - Salt used for the hash
 * @returns boolean - Whether password matches the hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}