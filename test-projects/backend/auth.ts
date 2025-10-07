/**
 * Test Authentication Module
 * Provides authentication functionality for integration tests
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = 'test-secret-key-do-not-use-in-production';
const JWT_EXPIRY = '24h';
const MAX_ATTEMPTS = 5;

// Types
export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Rate limiting state
const rateLimitStore = new Map<string, number>();

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Check if email is rate limited
 */
function isRateLimited(email: string): boolean {
  const attempts = rateLimitStore.get(email) || 0;
  return attempts >= MAX_ATTEMPTS;
}

/**
 * Increment failed attempt counter
 */
function recordFailedAttempt(email: string): void {
  const attempts = rateLimitStore.get(email) || 0;
  rateLimitStore.set(email, attempts + 1);
}

/**
 * Reset rate limit on successful authentication
 */
function resetRateLimit(email: string): void {
  rateLimitStore.delete(email);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  // Handle null/undefined
  if (email === null || email === undefined) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Convert to string and trim
  const emailStr = String(email).trim();

  if (!emailStr) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  // Basic email regex - stricter than most to catch various invalid formats
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(emailStr)) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  // Check for consecutive dots
  if (emailStr.includes('..')) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  // Check email length (RFC 5321)
  if (emailStr.length > 254) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  return { isValid: true, errors: [] };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  // Handle null/undefined
  if (password === null || password === undefined) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Convert to string
  const passwordStr = String(password);

  if (!passwordStr) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (passwordStr.length < 8) {
    errors.push('Password must be at least 8 characters');
    return { isValid: false, errors };
  }

  // Check for common passwords
  const commonPasswords = ['password', 'password123', '12345678', 'qwerty'];
  if (commonPasswords.some(common => passwordStr.toLowerCase().includes(common))) {
    errors.push('Password is too common');
    return { isValid: false, errors };
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(passwordStr)) {
    errors.push('Password must contain uppercase letters');
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(passwordStr)) {
    errors.push('Password must contain lowercase letters');
  }

  // Check for numbers
  if (!/[0-9]/.test(passwordStr)) {
    errors.push('Password must contain numbers');
  }

  // Check for symbols
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordStr)) {
    errors.push('Password must contain symbols');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: { id: string; email: string }): string {
  const payload = {
    userId: user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET);
}

/**
 * Generate unique user ID
 */
function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `user-${timestamp}-${randomStr}`;
}

/**
 * Main authentication function
 */
export async function authenticateUser(request: AuthRequest): Promise<AuthResponse> {
  const { email, password } = request;

  // Handle null/undefined for both fields
  const emailStr = email === null || email === undefined ? '' : String(email).trim();
  const passwordStr = password === null || password === undefined ? '' : String(password);

  // Check if both fields are empty
  if (!emailStr && !passwordStr) {
    return {
      success: false,
      message: 'Email and password are required'
    };
  }

  // Check rate limiting first
  if (isRateLimited(emailStr)) {
    return {
      success: false,
      message: 'Too many failed attempts. Your account has been temporarily locked due to rate limit exceeded. Please try again later.'
    };
  }

  // Validate email
  const emailValidation = validateEmail(emailStr);
  if (!emailValidation.isValid) {
    recordFailedAttempt(emailStr);
    return {
      success: false,
      message: emailValidation.errors[0]
    };
  }

  // Validate password
  const passwordValidation = validatePassword(passwordStr);
  if (!passwordValidation.isValid) {
    recordFailedAttempt(emailStr);
    return {
      success: false,
      message: passwordValidation.errors[0]
    };
  }

  // If validations pass, authentication succeeds (mock implementation)
  // In a real implementation, this would check against a database

  // Reset rate limit on successful authentication
  resetRateLimit(emailStr);

  // Generate user
  const user = {
    id: generateUserId(),
    email: emailStr
  };

  // Generate token
  const token = generateToken(user);

  return {
    success: true,
    message: 'Authentication successful',
    token,
    user
  };
}
