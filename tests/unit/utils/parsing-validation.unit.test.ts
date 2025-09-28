import { describe, it, expect } from 'vitest';

const parseJSON = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePort = (port: number): boolean => {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
};

const parseEnvironmentVariable = (value: string | undefined, defaultValue: string): string => {
  return value?.trim() || defaultValue;
};

const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

describe('Parsing and Validation Utilities', () => {
  describe('parseJSON', () => {
    it('should parse valid JSON string', () => {
      const jsonString = '{"name":"test","value":123}';
      const result = parseJSON(jsonString);
      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should handle JSON arrays', () => {
      const jsonString = '[1,2,3,"test"]';
      const result = parseJSON(jsonString);
      expect(result).toEqual([1, 2, 3, 'test']);
    });

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{invalid json}';
      expect(() => parseJSON(invalidJson)).toThrow('Invalid JSON');
    });

    it('should parse nested objects', () => {
      const jsonString = '{"user":{"name":"John","age":30},"active":true}';
      const result = parseJSON(jsonString);
      expect(result).toEqual({
        user: { name: 'John', age: 30 },
        active: true
      });
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@company.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePort', () => {
    it('should validate valid port numbers', () => {
      expect(validatePort(80)).toBe(true);
      expect(validatePort(443)).toBe(true);
      expect(validatePort(3000)).toBe(true);
      expect(validatePort(1)).toBe(true);
      expect(validatePort(65535)).toBe(true);
    });

    it('should reject invalid port numbers', () => {
      expect(validatePort(0)).toBe(false);
      expect(validatePort(-1)).toBe(false);
      expect(validatePort(65536)).toBe(false);
      expect(validatePort(3.14)).toBe(false);
      expect(validatePort(NaN)).toBe(false);
    });
  });

  describe('parseEnvironmentVariable', () => {
    it('should return environment value when present', () => {
      expect(parseEnvironmentVariable('production', 'development')).toBe('production');
      expect(parseEnvironmentVariable('  test  ', 'default')).toBe('test');
    });

    it('should return default value when undefined', () => {
      expect(parseEnvironmentVariable(undefined, 'default')).toBe('default');
    });

    it('should return default value for empty string', () => {
      expect(parseEnvironmentVariable('', 'default')).toBe('default');
      expect(parseEnvironmentVariable('   ', 'default')).toBe('default');
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUID v4 format', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUUID('6ba7b810-9dad-41d1-80b4-00c04fd430c8')).toBe(true);
      expect(validateUUID('6BA7B810-9DAD-41D1-80B4-00C04FD430C8')).toBe(true);
    });

    it('should reject invalid UUID formats', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
      expect(validateUUID('550e8400e29b41d4a716446655440000')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });
  });
});