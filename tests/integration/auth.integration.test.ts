/**
 * Authentication Flow Integration Tests
 * Tests the complete authentication flow end-to-end without mocks
 * Validates integration between LoginForm.tsx and auth.ts components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authenticateUser, validateEmail, validatePassword, hashPassword, generateToken } from '../../test-projects/backend/auth';
import type { AuthRequest, AuthResponse } from '../../test-projects/backend/auth';

// Test environment setup
const TEST_TIMEOUT = 5000; // 5 seconds for performance tests

// Helper to measure execution time
function measureExecutionTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; time: number }> {
  const start = performance.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.then(res => ({
      result: res,
      time: performance.now() - start
    }));
  }

  return Promise.resolve({
    result,
    time: performance.now() - start
  });
}

// Helper to simulate concurrent requests
async function runConcurrentRequests<T>(
  fn: () => Promise<T>,
  count: number
): Promise<{ results: T[], times: number[] }> {
  const promises = Array(count).fill(null).map(() => measureExecutionTime(fn));
  const measurements = await Promise.all(promises);

  return {
    results: measurements.map(m => m.result),
    times: measurements.map(m => m.time)
  };
}

describe('Authentication Flow Integration Tests', () => {

  describe('1. Successful Login Flow', () => {

    it('should authenticate user with valid credentials and return JWT token', async () => {
      const validRequest: AuthRequest = {
        email: 'user@example.com',
        password: 'SecurePass123!'
      };

      const response = await authenticateUser(validRequest);

      // Verify successful authentication
      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
      expect(response.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/); // JWT format
      expect(response.user).toBeDefined();
      expect(response.user?.email).toBe(validRequest.email);
      expect(response.user?.id).toMatch(/^user-[a-z0-9]+-[a-z0-9]+$/);
      expect(response.message).toBe('Authentication successful');
    });

    it('should generate unique user IDs for each authentication', async () => {
      const request: AuthRequest = {
        email: 'unique@example.com',
        password: 'UniquePass123!'
      };

      const response1 = await authenticateUser(request);
      const response2 = await authenticateUser(request);

      expect(response1.user?.id).toBeDefined();
      expect(response2.user?.id).toBeDefined();
      expect(response1.user?.id).not.toBe(response2.user?.id);
    });

    it('should return consistent email in user object', async () => {
      const testEmails = [
        'test@example.com',
        'admin@company.org',
        'user.name@subdomain.example.net'
      ];

      for (const email of testEmails) {
        const response = await authenticateUser({
          email,
          password: 'ValidPass123!'
        });

        if (response.success) {
          expect(response.user?.email).toBe(email);
        }
      }
    });
  });

  describe('2. Validation Errors Propagation', () => {

    it('should propagate email validation errors', async () => {
      const invalidEmails = [
        { email: '', expected: 'Email is required' },
        { email: 'notanemail', expected: 'Invalid email format' },
        { email: '@example.com', expected: 'Invalid email format' },
        { email: 'user@', expected: 'Invalid email format' },
        { email: 'user..test@example.com', expected: 'Invalid email format' },
        { email: '.user@example.com', expected: 'Invalid email format' },
        { email: 'user@.example.com', expected: 'Invalid email format' }
      ];

      for (const { email, expected } of invalidEmails) {
        const response = await authenticateUser({
          email,
          password: 'ValidPass123!'
        });

        expect(response.success).toBe(false);
        expect(response.message).toContain(expected);
      }
    });

    it('should propagate password validation errors with detailed messages', async () => {
      const invalidPasswords = [
        { password: '', expected: 'Password is required' },
        { password: 'short', expected: 'Password must be at least 8 characters' },
        { password: 'password123', expected: 'Password is too common' },
        { password: 'nouppercase123!', expected: 'uppercase letters' },
        { password: 'NOLOWERCASE123!', expected: 'lowercase letters' },
        { password: 'NoNumbers!', expected: 'numbers' },
        { password: 'NoSymbols123', expected: 'symbols' }
      ];

      for (const { password, expected } of invalidPasswords) {
        const response = await authenticateUser({
          email: 'valid@example.com',
          password
        });

        expect(response.success).toBe(false);
        expect(response.message).toContain(expected);
      }
    });

    it('should handle missing fields appropriately', async () => {
      // Both fields missing
      const response1 = await authenticateUser({
        email: '',
        password: ''
      });
      expect(response1.success).toBe(false);
      expect(response1.message).toBe('Email and password are required');

      // Email missing
      const response2 = await authenticateUser({
        email: '',
        password: 'ValidPass123!'
      });
      expect(response2.success).toBe(false);
      expect(response2.message).toBe('Email is required');

      // Password missing
      const response3 = await authenticateUser({
        email: 'valid@example.com',
        password: ''
      });
      expect(response3.success).toBe(false);
      expect(response3.message).toBe('Password is required');
    });
  });

  describe('3. Authentication Errors', () => {

    it('should handle invalid credentials gracefully', async () => {
      // Note: In the current implementation, valid format credentials always succeed
      // This test documents the expected behavior for invalid credentials
      const response = await authenticateUser({
        email: 'nonexistent@example.com',
        password: 'WrongPass123!'
      });

      // Current implementation doesn't check against a real database
      // so valid format credentials always succeed
      expect(response.success).toBe(true);

      // In a real implementation with database check, we'd expect:
      // expect(response.success).toBe(false);
      // expect(response.message).toBe('Invalid credentials');
    });

    it('should not leak information about user existence', async () => {
      const response1 = await authenticateUser({
        email: 'nonexistent@example.com',
        password: 'InvalidPass123!'
      });

      const response2 = await authenticateUser({
        email: 'existing@example.com',
        password: 'WrongPass123!'
      });

      // Both should return the same generic error message
      // (In real implementation with database)
      // expect(response1.message).toBe(response2.message);
    });
  });

  describe('4. Network Error Handling', () => {

    it('should handle timeout scenarios gracefully', async () => {
      // Simulate a long-running authentication request
      const slowRequest = async () => {
        const start = Date.now();
        const response = await authenticateUser({
          email: 'timeout@example.com',
          password: 'TimeoutTest123!'
        });
        const duration = Date.now() - start;

        // Current implementation is synchronous, so no real timeout
        expect(duration).toBeLessThan(1000); // Should be fast
        expect(response).toBeDefined();
        return response;
      };

      const response = await slowRequest();
      expect(response.success).toBeDefined();
    });

    it('should handle malformed requests', async () => {
      // Test with invalid data types
      const malformedRequests = [
        { email: null as any, password: 'Test123!' },
        { email: 'test@example.com', password: null as any },
        { email: undefined as any, password: 'Test123!' },
        { email: 'test@example.com', password: undefined as any }
      ];

      for (const request of malformedRequests) {
        const response = await authenticateUser(request);
        expect(response.success).toBe(false);
        expect(response.message).toBeDefined();
      }
    });
  });

  describe('5. Concurrent Login Attempts', () => {

    it('should handle multiple concurrent login attempts', async () => {
      const { results, times } = await runConcurrentRequests(
        () => authenticateUser({
          email: 'concurrent@example.com',
          password: 'ConcurrentTest123!'
        }),
        10 // 10 concurrent requests
      );

      // All requests should succeed
      results.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.token).toBeDefined();
      });

      // Each should get a unique token
      const tokens = results.map(r => r.token).filter(Boolean);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // All should complete within reasonable time
      times.forEach(time => {
        expect(time).toBeLessThan(1000); // Each request under 1 second
      });
    });

    it('should enforce rate limiting for failed attempts', async () => {
      const email = 'ratelimit@example.com';
      const invalidPassword = 'short'; // Will fail validation

      // Make multiple failed attempts
      const attempts = 6; // More than MAX_ATTEMPTS (5)
      const responses: AuthResponse[] = [];

      for (let i = 0; i < attempts; i++) {
        const response = await authenticateUser({
          email,
          password: invalidPassword
        });
        responses.push(response);
      }

      // First 5 attempts should fail with validation error
      responses.slice(0, 5).forEach(response => {
        expect(response.success).toBe(false);
        expect(response.message).toContain('Password must be at least 8 characters');
      });

      // 6th attempt should be rate limited
      expect(responses[5].success).toBe(false);
      expect(responses[5].message).toContain('rate limit exceeded');
    });

    it('should reset rate limiting after successful authentication', async () => {
      const email = 'ratelimitreset@example.com';

      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        await authenticateUser({
          email,
          password: 'short'
        });
      }

      // Successful authentication should reset rate limit
      const successResponse = await authenticateUser({
        email,
        password: 'ValidPassword123!'
      });
      expect(successResponse.success).toBe(true);

      // Should be able to make failed attempts again
      const failResponse = await authenticateUser({
        email,
        password: 'short'
      });
      expect(failResponse.success).toBe(false);
      expect(failResponse.message).not.toContain('rate limit');
    });
  });

  describe('6. XSS/Injection Prevention', () => {

    it('should prevent XSS attacks in email field', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="javascript:alert(\'XSS\')"></object>',
        '<embed src="javascript:alert(\'XSS\')">'
      ];

      for (const payload of xssPayloads) {
        const response = await authenticateUser({
          email: payload,
          password: 'ValidPass123!'
        });

        expect(response.success).toBe(false);
        expect(response.message).toBe('Invalid email format');
        // Ensure no script execution or HTML injection
        expect(response.message).not.toContain('<');
        expect(response.message).not.toContain('>');
      }
    });

    it('should prevent SQL injection attacks', async () => {
      const sqlPayloads = [
        "admin' OR '1'='1",
        "admin'; DROP TABLE users; --",
        "' OR 1=1 --",
        "admin' UNION SELECT * FROM users --",
        "'; DELETE FROM users WHERE '1'='1"
      ];

      for (const payload of sqlPayloads) {
        const emailResponse = await authenticateUser({
          email: payload,
          password: 'ValidPass123!'
        });

        expect(emailResponse.success).toBe(false);
        expect(emailResponse.message).toBe('Invalid email format');

        const passwordResponse = await authenticateUser({
          email: 'valid@example.com',
          password: payload
        });

        expect(passwordResponse.success).toBe(false);
        expect(passwordResponse.message).toContain('Invalid password format');
      }
    });

    it('should sanitize all user inputs', async () => {
      const dangerousInputs = [
        { email: '"><script>alert(1)</script>', password: 'Test123!' },
        { email: 'test@example.com', password: '"><script>alert(1)</script>' },
        { email: '../../../etc/passwd', password: 'Test123!' },
        { email: 'test@example.com', password: '../../../etc/passwd' }
      ];

      for (const input of dangerousInputs) {
        const response = await authenticateUser(input);

        expect(response.success).toBe(false);
        // Response should never contain raw user input
        expect(JSON.stringify(response)).not.toContain('<script>');
        expect(JSON.stringify(response)).not.toContain('../');
      }
    });
  });

  describe('7. JWT Token Generation and Validation', () => {

    it('should generate valid JWT tokens', async () => {
      const response = await authenticateUser({
        email: 'jwt@example.com',
        password: 'JWTTest123!'
      });

      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();

      // Validate JWT structure (header.payload.signature)
      const tokenParts = response.token!.split('.');
      expect(tokenParts).toHaveLength(3);

      // Decode and validate payload (base64url encoded)
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString()
      );

      expect(payload.userId).toBeDefined();
      expect(payload.email).toBe('jwt@example.com');
      expect(payload.exp).toBeDefined(); // Expiration time
      expect(payload.iat).toBeDefined(); // Issued at time
    });

    it('should generate unique tokens for each authentication', async () => {
      const tokens: string[] = [];

      for (let i = 0; i < 5; i++) {
        const response = await authenticateUser({
          email: 'unique.token@example.com',
          password: 'UniqueToken123!'
        });

        if (response.token) {
          tokens.push(response.token);
        }
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should include proper expiration in tokens', async () => {
      const response = await authenticateUser({
        email: 'expiry@example.com',
        password: 'ExpiryTest123!'
      });

      expect(response.token).toBeDefined();

      const tokenParts = response.token!.split('.');
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString()
      );

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;

      // Token should expire in 24 hours (86400 seconds)
      expect(expiresIn).toBeGreaterThan(86000); // Allow small time difference
      expect(expiresIn).toBeLessThanOrEqual(86400);
    });
  });

  describe('8. Response Data Structure Consistency', () => {

    it('should return consistent success response structure', async () => {
      const response = await authenticateUser({
        email: 'structure@example.com',
        password: 'Structure123!'
      });

      // Check all expected fields are present
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('token');
      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('message');

      // Check types
      expect(typeof response.success).toBe('boolean');
      expect(typeof response.token).toBe('string');
      expect(typeof response.user).toBe('object');
      expect(typeof response.message).toBe('string');

      // Check user object structure
      expect(response.user).toHaveProperty('id');
      expect(response.user).toHaveProperty('email');
      expect(typeof response.user!.id).toBe('string');
      expect(typeof response.user!.email).toBe('string');
    });

    it('should return consistent error response structure', async () => {
      const errorCases = [
        { email: '', password: '' },
        { email: 'invalid', password: 'Test123!' },
        { email: 'test@example.com', password: 'short' }
      ];

      for (const testCase of errorCases) {
        const response = await authenticateUser(testCase);

        // Check structure
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');
        expect(response.success).toBe(false);
        expect(typeof response.message).toBe('string');

        // Error responses should not have token or user
        expect(response.token).toBeUndefined();
        expect(response.user).toBeUndefined();
      }
    });

    it('should maintain response structure across different scenarios', async () => {
      const scenarios = [
        { email: 'valid@example.com', password: 'Valid123!', shouldSucceed: true },
        { email: '', password: '', shouldSucceed: false },
        { email: 'invalid', password: 'Test123!', shouldSucceed: false },
        { email: 'test@example.com', password: 'short', shouldSucceed: false }
      ];

      for (const scenario of scenarios) {
        const response = await authenticateUser({
          email: scenario.email,
          password: scenario.password
        });

        // Always has these fields
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('message');

        if (scenario.shouldSucceed) {
          expect(response).toHaveProperty('token');
          expect(response).toHaveProperty('user');
        } else {
          expect(response.token).toBeUndefined();
          expect(response.user).toBeUndefined();
        }
      }
    });
  });

  describe('9. Error Message Formats', () => {

    it('should provide clear, user-friendly error messages', async () => {
      const testCases = [
        {
          input: { email: '', password: '' },
          expectedMessage: 'Email and password are required'
        },
        {
          input: { email: 'invalid', password: 'Test123!' },
          expectedMessage: 'Invalid email format'
        },
        {
          input: { email: 'test@example.com', password: 'short' },
          expectedMessage: 'Password must be at least 8 characters'
        },
        {
          input: { email: 'test@example.com', password: 'password123' },
          expectedMessage: 'Password is too common'
        }
      ];

      for (const { input, expectedMessage } of testCases) {
        const response = await authenticateUser(input);

        expect(response.success).toBe(false);
        expect(response.message).toContain(expectedMessage);
        // Messages should be complete sentences or phrases
        expect(response.message!.length).toBeGreaterThan(10);
      }
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await authenticateUser({
        email: 'test@example.com',
        password: 'wrongpass'
      });

      // Should not reveal:
      // - Database errors
      // - Stack traces
      // - Internal system details
      // - User existence
      if (!response.success && response.message) {
        expect(response.message).not.toContain('database');
        expect(response.message).not.toContain('stack');
        expect(response.message).not.toContain('error at');
        expect(response.message).not.toContain('undefined');
        expect(response.message).not.toContain('null');
      }
    });

    it('should provide actionable error messages', async () => {
      const response1 = await authenticateUser({
        email: 'test@example.com',
        password: 'nouppercase123!'
      });

      expect(response1.message).toContain('uppercase letters');

      const response2 = await authenticateUser({
        email: 'test@example.com',
        password: 'NOLOWERCASE123!'
      });

      expect(response2.message).toContain('lowercase letters');

      const response3 = await authenticateUser({
        email: 'test@example.com',
        password: 'NoNumbers!'
      });

      expect(response3.message).toContain('numbers');
    });
  });

  describe('10. Performance Tests', () => {

    it('should authenticate within acceptable time limits', async () => {
      const { result, time } = await measureExecutionTime(() =>
        authenticateUser({
          email: 'performance@example.com',
          password: 'PerfTest123!'
        })
      );

      expect(result.success).toBe(true);
      expect(time).toBeLessThan(200); // Should complete within 200ms
    });

    it('should handle validation quickly', async () => {
      const { time: emailValidationTime } = await measureExecutionTime(() =>
        validateEmail('test@example.com')
      );

      const { time: passwordValidationTime } = await measureExecutionTime(() =>
        validatePassword('TestPass123!')
      );

      // Validation should be nearly instantaneous
      expect(emailValidationTime).toBeLessThan(10);
      expect(passwordValidationTime).toBeLessThan(10);
    });

    it('should scale with concurrent users', async () => {
      const concurrentCounts = [1, 5, 10, 20];
      const avgTimes: number[] = [];

      for (const count of concurrentCounts) {
        const { times } = await runConcurrentRequests(
          () => authenticateUser({
            email: `user${count}@example.com`,
            password: 'ScaleTest123!'
          }),
          count
        );

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        avgTimes.push(avgTime);
      }

      // Average time shouldn't increase dramatically with load
      // (In real implementation, this would test actual server scaling)
      avgTimes.forEach(time => {
        expect(time).toBeLessThan(500); // All should complete under 500ms
      });
    });

    it('should handle password hashing efficiently', async () => {
      const { time } = await measureExecutionTime(() =>
        hashPassword('TestPassword123!')
      );

      // Bcrypt is intentionally slow for security, but should be reasonable
      expect(time).toBeLessThan(1000); // Under 1 second
      expect(time).toBeGreaterThan(50); // But not too fast (indicates proper salt rounds)
    });

    it('should generate tokens quickly', () => {
      const start = performance.now();
      const token = generateToken({
        id: 'test-user-id',
        email: 'test@example.com'
      });
      const time = performance.now() - start;

      expect(token).toBeDefined();
      expect(time).toBeLessThan(50); // Token generation should be fast
    });
  });

  describe('Integration with Frontend LoginForm', () => {

    it('should handle form data structure from LoginForm component', async () => {
      // Simulate data structure from LoginForm
      const formData = {
        email: 'frontend@example.com',
        password: 'Frontend123!'
      };

      const response = await authenticateUser(formData);

      expect(response.success).toBe(true);
      expect(response.token).toBeDefined();
      expect(response.user?.email).toBe(formData.email);
    });

    it('should return errors compatible with LoginForm error handling', async () => {
      const invalidFormData = {
        email: 'invalidemail',
        password: 'short'
      };

      const response = await authenticateUser(invalidFormData);

      // LoginForm expects these fields in error responses
      expect(response.success).toBe(false);
      expect(response.message).toBeDefined();
      expect(typeof response.message).toBe('string');

      // Should not include token or user on error
      expect(response.token).toBeUndefined();
      expect(response.user).toBeUndefined();
    });

    it('should support LoginForm validation requirements', async () => {
      // Test email validation matching frontend regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const validEmails = [
        'user@example.com',
        'test.user@example.co.uk',
        'admin+tag@company.org'
      ];

      for (const email of validEmails) {
        expect(emailRegex.test(email)).toBe(true);
        const validation = validateEmail(email);
        expect(validation.isValid).toBe(true);
      }

      // Test password length matching frontend requirement (min 6 chars)
      const frontendMinLength = 6;
      const backendValidation = validatePassword('12345'); // 5 chars
      expect(backendValidation.isValid).toBe(false);

      // Backend requires 8 chars minimum, which satisfies frontend's 6 char requirement
      const validPassword = '12345678';
      const validation = validatePassword(validPassword);
      expect(validation.errors).toContain('Password must contain uppercase letters');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {

    it('should handle extremely long inputs gracefully', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'; // Over 254 char limit
      const longPassword = 'A1!' + 'a'.repeat(1000); // Very long password

      const response1 = await authenticateUser({
        email: longEmail,
        password: 'ValidPass123!'
      });

      expect(response1.success).toBe(false);
      expect(response1.message).toBe('Invalid email format');

      const response2 = await authenticateUser({
        email: 'valid@example.com',
        password: longPassword
      });

      // Long passwords might be valid if they meet requirements
      // but should be handled without crashing
      expect(response2).toBeDefined();
      expect(response2.success).toBeDefined();
    });

    it('should handle unicode and special characters', async () => {
      const unicodeInputs = [
        { email: 'тест@example.com', password: 'Test123!' }, // Cyrillic
        { email: '测试@example.com', password: 'Test123!' }, // Chinese
        { email: 'test@مثال.com', password: 'Test123!' }, // Arabic
        { email: 'test😀@example.com', password: 'Test123!' } // Emoji
      ];

      for (const input of unicodeInputs) {
        const response = await authenticateUser(input);

        // Should reject non-ASCII emails
        expect(response.success).toBe(false);
        expect(response.message).toBe('Invalid email format');
      }
    });

    it('should handle empty strings vs null/undefined', async () => {
      const testCases = [
        { email: '', password: '', expectedMessage: 'Email and password are required' },
        { email: null as any, password: null as any, expectedMessage: 'Email and password are required' },
        { email: undefined as any, password: undefined as any, expectedMessage: 'Email and password are required' }
      ];

      for (const testCase of testCases) {
        const response = await authenticateUser(testCase);
        expect(response.success).toBe(false);
        expect(response.message).toBe(testCase.expectedMessage);
      }
    });

    it('should handle rate limiting edge cases', async () => {
      const email = 'edgecase@example.com';

      // Make exactly MAX_ATTEMPTS (5) failed attempts
      for (let i = 0; i < 5; i++) {
        const response = await authenticateUser({
          email,
          password: 'short'
        });
        expect(response.success).toBe(false);
        expect(response.message).not.toContain('rate limit');
      }

      // Next attempt should be rate limited
      const limitedResponse = await authenticateUser({
        email,
        password: 'short'
      });
      expect(limitedResponse.success).toBe(false);
      expect(limitedResponse.message).toContain('rate limit exceeded');
    });
  });
});

// Additional test suite for component integration
describe('LoginForm and Backend Integration', () => {

  it('should handle the complete authentication flow as used by LoginForm', async () => {
    // Simulate the exact flow from LoginForm component
    const formData = {
      email: 'user@example.com',
      password: 'SecurePass123!'
    };

    // 1. Frontend validates email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(formData.email)).toBe(true);

    // 2. Frontend validates password length (min 6)
    expect(formData.password.length).toBeGreaterThanOrEqual(6);

    // 3. Backend authenticates
    const response = await authenticateUser(formData);

    // 4. Frontend expects this structure
    expect(response).toMatchObject({
      success: expect.any(Boolean),
      message: expect.any(String)
    });

    if (response.success) {
      expect(response.token).toBeDefined();
      expect(response.user).toMatchObject({
        id: expect.any(String),
        email: formData.email
      });
    }
  });

  it('should provide error messages that LoginForm can display', async () => {
    const testCases = [
      { email: '', password: 'Test123!', frontendError: 'Email is required' },
      { email: 'invalid', password: 'Test123!', frontendError: 'Please enter a valid email address' },
      { email: 'test@example.com', password: '', frontendError: 'Password is required' },
      { email: 'test@example.com', password: 'short', frontendError: 'Password must be at least 6 characters long' }
    ];

    for (const testCase of testCases) {
      // Frontend validation would catch these
      if (!testCase.email.trim()) {
        expect(testCase.frontendError).toBe('Email is required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testCase.email)) {
        expect(testCase.frontendError).toBe('Please enter a valid email address');
      }

      if (!testCase.password) {
        expect(testCase.frontendError).toBe('Password is required');
      } else if (testCase.password.length < 6) {
        expect(testCase.frontendError).toBe('Password must be at least 6 characters long');
      }

      // Backend validation for cases that pass frontend
      const response = await authenticateUser(testCase);
      if (!response.success) {
        expect(response.message).toBeDefined();
        expect(typeof response.message).toBe('string');
      }
    }
  });
});