/**
 * Unit Tests for Authentication Module
 * Testing individual functions without mocks
 */

import { describe, it, expect } from 'vitest';
import {
  validateUser,
  createSession,
  validateSessionToken,
  hashPassword,
  verifyPassword
} from '../../lib/auth';

describe('Authentication Module Unit Tests', () => {

  describe('validateUser', () => {

    it('should validate correct test credentials', async () => {
      const result = await validateUser('test@example.com', 'TestPassword123');

      expect(result.isValid).toBe(true);
      expect(result.message).toBe('User validation successful');
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.id).toBeDefined();
      expect(result.user?.id).toHaveLength(16);
    });

    it('should reject empty email', async () => {
      const result = await validateUser('', 'TestPassword123');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid email format');
      expect(result.user).toBeUndefined();
    });

    it('should reject invalid email formats', async () => {
      // These emails actually fail the regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = [
        'notanemail',        // No @ symbol
        '@example.com',      // No local part before @
        'user@',             // No domain after @
        'user@example',      // No dot in domain
        'user @example.com', // Space in local part (fails [^\s@]+ pattern)
        'user@exam ple.com'  // Space in domain (fails [^\s@]+ pattern)
      ];

      // These emails actually PASS the regex because dots are allowed:
      // 'user@.' - fails because nothing after dot
      // 'user..test@example.com' - passes because [^\s@]+ allows dots
      // '.user@example.com' - passes because [^\s@]+ allows dots at start
      // 'user@.example.com' - passes because [^\s@]+ allows dots at start of domain

      for (const email of invalidEmails) {
        const result = await validateUser(email, 'ValidPassword123');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Invalid email format');
      }
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user_name@example.com',
        'user123@example.com',
        'user@subdomain.example.com',
        'user@example.co.uk',
        'user@example-domain.com',
        // These also pass the regex even though they might not be ideal
        'user..test@example.com',
        '.user@example.com',
        'user@.example.com'
      ];

      for (const email of validEmails) {
        const result = await validateUser(email, 'ValidPassword123');
        // These will fail with "Invalid email or password" since they're not the test account
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Invalid email or password');
      }
    });

    it('should reject empty password', async () => {
      const result = await validateUser('test@example.com', '');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Password must be at least 8 characters long');
    });

    it('should reject short passwords', async () => {
      const shortPasswords = ['', '1', '12', '123', '1234', '12345', '123456', '1234567'];

      for (const password of shortPasswords) {
        const result = await validateUser('test@example.com', password);
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Password must be at least 8 characters long');
      }
    });

    it('should reject passwords without uppercase letters', async () => {
      const result = await validateUser('test@example.com', 'nouppercase123');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('uppercase letter');
    });

    it('should reject passwords without lowercase letters', async () => {
      const result = await validateUser('test@example.com', 'NOLOWERCASE123');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('lowercase letter');
    });

    it('should reject passwords without numbers', async () => {
      const result = await validateUser('test@example.com', 'NoNumbers!');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('number');
    });

    it('should accept passwords meeting all requirements', async () => {
      const validPasswords = [
        'ValidPass123',
        'SecurePassword1',
        'MyP@ssw0rd',
        'Testing123ABC',
        'Complex1Password'
      ];

      for (const password of validPasswords) {
        const result = await validateUser('test@example.com', password);
        // These will fail authentication but pass validation
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Invalid email or password');
      }
    });

    it('should reject wrong credentials', async () => {
      const result = await validateUser('wrong@example.com', 'WrongPassword123');

      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Invalid email or password');
    });
  });

  describe('createSession', () => {

    it('should create a valid session', () => {
      const result = createSession('user123', 'test@example.com');

      expect(result.success).toBe(true);
      expect(result.sessionToken).toBeDefined();
      expect(result.sessionToken).toHaveLength(64);
      expect(result.sessionToken).toMatch(/^[a-f0-9]{64}$/);
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.message).toBe('Session created successfully');
    });

    it('should set correct expiration time', () => {
      const hoursToExpire = 48;
      const result = createSession('user123', 'test@example.com', hoursToExpire);

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();

      const now = new Date();
      const expectedExpiration = new Date();
      expectedExpiration.setHours(expectedExpiration.getHours() + hoursToExpire);

      const actualExpiration = result.expiresAt!;
      const timeDiff = Math.abs(actualExpiration.getTime() - expectedExpiration.getTime());

      // Allow 1 second tolerance
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should generate unique session tokens', () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const result = createSession('user123', 'test@example.com');
        if (result.sessionToken) {
          tokens.add(result.sessionToken);
        }
      }

      expect(tokens.size).toBe(10);
    });

    it('should reject empty user ID', () => {
      const result = createSession('', 'test@example.com');

      expect(result.success).toBe(false);
      expect(result.sessionToken).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
      expect(result.message).toBe('User ID and email are required for session creation');
    });

    it('should reject empty email', () => {
      const result = createSession('user123', '');

      expect(result.success).toBe(false);
      expect(result.sessionToken).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
      expect(result.message).toBe('User ID and email are required for session creation');
    });

    it('should reject invalid expiration hours', () => {
      const invalidHours = [0, -1, -100, 169, 200, 1000];

      for (const hours of invalidHours) {
        const result = createSession('user123', 'test@example.com', hours);
        expect(result.success).toBe(false);
        expect(result.message).toBe('Expiration hours must be between 1 and 168 hours (7 days)');
      }
    });

    it('should accept valid expiration hours', () => {
      const validHours = [1, 24, 48, 72, 96, 120, 144, 168];

      for (const hours of validHours) {
        const result = createSession('user123', 'test@example.com', hours);
        expect(result.success).toBe(true);
        expect(result.sessionToken).toBeDefined();
        expect(result.expiresAt).toBeDefined();
      }
    });

    it('should use default expiration of 24 hours', () => {
      const result = createSession('user123', 'test@example.com');

      expect(result.success).toBe(true);
      expect(result.expiresAt).toBeDefined();

      const now = new Date();
      const expectedExpiration = new Date();
      expectedExpiration.setHours(expectedExpiration.getHours() + 24);

      const actualExpiration = result.expiresAt!;
      const timeDiff = Math.abs(actualExpiration.getTime() - expectedExpiration.getTime());

      // Allow 1 second tolerance
      expect(timeDiff).toBeLessThan(1000);
    });
  });

  describe('validateSessionToken', () => {

    it('should validate a valid session token', () => {
      const result = createSession('user123', 'test@example.com');
      const isValid = validateSessionToken(result.sessionToken!);

      expect(isValid).toBe(true);
    });

    it('should validate correct hex format', () => {
      const validTokens = [
        'a'.repeat(64),
        'f'.repeat(64),
        '0'.repeat(64),
        '9'.repeat(64),
        'abcdef0123456789'.repeat(4),
        'ABCDEF0123456789'.repeat(4).toLowerCase()
      ];

      for (const token of validTokens) {
        const isValid = validateSessionToken(token);
        expect(isValid).toBe(true);
      }
    });

    it('should reject invalid token formats', () => {
      const invalidTokens = [
        '',
        'short',
        'a'.repeat(63), // Too short
        'a'.repeat(65), // Too long
        'g'.repeat(64), // Invalid hex char
        'z'.repeat(64), // Invalid hex char
        'test token',    // Space
        'test-token',    // Hyphen
        'test_token',    // Underscore
        '!@#$%^&*()'.repeat(6) + '1234', // Special chars
      ];

      for (const token of invalidTokens) {
        const isValid = validateSessionToken(token);
        expect(isValid).toBe(false);
      }
    });

    it('should reject null and undefined', () => {
      expect(validateSessionToken(null as any)).toBe(false);
      expect(validateSessionToken(undefined as any)).toBe(false);
    });

    it('should reject non-string types', () => {
      expect(validateSessionToken(123 as any)).toBe(false);
      expect(validateSessionToken({} as any)).toBe(false);
      expect(validateSessionToken([] as any)).toBe(false);
      expect(validateSessionToken(true as any)).toBe(false);
    });
  });

  describe('hashPassword', () => {

    it('should generate a hash and salt', () => {
      const { hash, salt } = hashPassword('TestPassword123');

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      expect(salt).toBeDefined();
      expect(salt).toHaveLength(32);
      expect(salt).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique salts when not provided', () => {
      const salts = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const { salt } = hashPassword('TestPassword123');
        salts.add(salt);
      }

      expect(salts.size).toBe(10);
    });

    it('should generate different hashes for same password with different salts', () => {
      const password = 'TestPassword123';
      const { hash: hash1, salt: salt1 } = hashPassword(password);
      const { hash: hash2, salt: salt2 } = hashPassword(password);

      expect(salt1).not.toBe(salt2);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash for same password and salt', () => {
      const password = 'TestPassword123';
      const { hash: hash1, salt } = hashPassword(password);
      const { hash: hash2 } = hashPassword(password, salt);

      expect(hash1).toBe(hash2);
    });

    it('should use provided salt', () => {
      const customSalt = 'a'.repeat(32);
      const { salt } = hashPassword('TestPassword123', customSalt);

      expect(salt).toBe(customSalt);
    });

    it('should handle special characters in passwords', () => {
      const specialPasswords = [
        '!@#$%^&*()',
        'Pass@word!123',
        'Test_Password-123',
        'User&Admin*2024',
        '😀🎉🚀', // Emoji
        'пароль', // Cyrillic
        '密码',   // Chinese
      ];

      for (const password of specialPasswords) {
        const { hash, salt } = hashPassword(password);
        expect(hash).toBeDefined();
        expect(hash).toHaveLength(64);
        expect(salt).toBeDefined();
      }
    });

    it('should handle empty password', () => {
      const { hash, salt } = hashPassword('');

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(salt).toBeDefined();
    });

    it('should handle very long passwords', () => {
      const longPassword = 'a'.repeat(10000);
      const { hash, salt } = hashPassword(longPassword);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
      expect(salt).toBeDefined();
    });
  });

  describe('verifyPassword', () => {

    it('should verify correct password', () => {
      const password = 'TestPassword123';
      const { hash, salt } = hashPassword(password);

      const isValid = verifyPassword(password, hash, salt);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', () => {
      const { hash, salt } = hashPassword('CorrectPassword123');

      const isValid = verifyPassword('WrongPassword123', hash, salt);
      expect(isValid).toBe(false);
    });

    it('should reject password with wrong salt', () => {
      const password = 'TestPassword123';
      const { hash } = hashPassword(password, 'a'.repeat(32));

      const isValid = verifyPassword(password, hash, 'b'.repeat(32));
      expect(isValid).toBe(false);
    });

    it('should reject password with tampered hash', () => {
      const password = 'TestPassword123';
      const { hash, salt } = hashPassword(password);
      const tamperedHash = 'f'.repeat(64);

      const isValid = verifyPassword(password, tamperedHash, salt);
      expect(isValid).toBe(false);
    });

    it('should handle case sensitivity', () => {
      const { hash, salt } = hashPassword('TestPassword123');

      const isValid1 = verifyPassword('testpassword123', hash, salt);
      const isValid2 = verifyPassword('TESTPASSWORD123', hash, salt);
      const isValid3 = verifyPassword('TestPassword123', hash, salt);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
      expect(isValid3).toBe(true);
    });

    it('should verify passwords with special characters', () => {
      const specialPasswords = [
        '!@#$%^&*()',
        'Pass@word!123',
        'Test_Password-123',
        'User&Admin*2024'
      ];

      for (const password of specialPasswords) {
        const { hash, salt } = hashPassword(password);
        const isValid = verifyPassword(password, hash, salt);
        expect(isValid).toBe(true);
      }
    });

    it('should handle empty password verification', () => {
      const { hash, salt } = hashPassword('');

      const isValid1 = verifyPassword('', hash, salt);
      const isValid2 = verifyPassword('NotEmpty', hash, salt);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });

    it('should verify very long passwords', () => {
      const longPassword = 'a'.repeat(10000);
      const { hash, salt } = hashPassword(longPassword);

      const isValid1 = verifyPassword(longPassword, hash, salt);
      const isValid2 = verifyPassword('a'.repeat(9999), hash, salt);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });
  });
});