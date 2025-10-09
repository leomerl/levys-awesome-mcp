import { describe, it, expect } from 'vitest';
import { square } from '../utils/square';

describe('square function', () => {
  describe('positive numbers', () => {
    it('should square positive integers', () => {
      expect(square(1)).toBe(1);
      expect(square(2)).toBe(4);
      expect(square(3)).toBe(9);
      expect(square(5)).toBe(25);
      expect(square(10)).toBe(100);
    });

    it('should square large positive numbers', () => {
      expect(square(100)).toBe(10000);
      expect(square(1000)).toBe(1000000);
    });

    it('should handle very large positive numbers', () => {
      expect(square(1000000)).toBe(1000000000000);
      expect(square(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER * Number.MAX_SAFE_INTEGER);
    });
  });

  describe('negative numbers', () => {
    it('should square negative integers', () => {
      expect(square(-1)).toBe(1);
      expect(square(-2)).toBe(4);
      expect(square(-3)).toBe(9);
      expect(square(-5)).toBe(25);
      expect(square(-10)).toBe(100);
    });

    it('should square large negative numbers', () => {
      expect(square(-100)).toBe(10000);
      expect(square(-1000)).toBe(1000000);
    });

    it('should handle very large negative numbers', () => {
      expect(square(-1000000)).toBe(1000000000000);
      expect(square(-Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER * Number.MAX_SAFE_INTEGER);
    });
  });

  describe('zero', () => {
    it('should return 0 when input is 0', () => {
      expect(square(0)).toBe(0);
    });

    it('should return 0 when input is -0', () => {
      expect(square(-0)).toBe(0);
    });
  });

  describe('decimal numbers', () => {
    it('should square positive decimal numbers', () => {
      expect(square(0.5)).toBe(0.25);
      expect(square(1.5)).toBe(2.25);
      expect(square(2.5)).toBe(6.25);
      expect(square(3.14)).toBeCloseTo(9.8596, 4);
    });

    it('should square negative decimal numbers', () => {
      expect(square(-0.5)).toBe(0.25);
      expect(square(-1.5)).toBe(2.25);
      expect(square(-2.5)).toBe(6.25);
      expect(square(-3.14)).toBeCloseTo(9.8596, 4);
    });

    it('should handle very small decimal numbers', () => {
      expect(square(0.1)).toBeCloseTo(0.01, 10);
      expect(square(0.01)).toBeCloseTo(0.0001, 10);
      expect(square(0.001)).toBeCloseTo(0.000001, 10);
    });

    it('should handle numbers with many decimal places', () => {
      // Fixed: Use more appropriate precision for floating-point calculations
      expect(square(1.23456789)).toBeCloseTo(1.5241578750190519, 6);
      expect(square(-1.23456789)).toBeCloseTo(1.5241578750190519, 6);
    });
  });

  describe('edge cases', () => {
    it('should handle Infinity', () => {
      expect(square(Infinity)).toBe(Infinity);
      // Fixed: -Infinity squared is actually Infinity (positive)
      expect(square(-Infinity)).toBe(Infinity);
    });

    it('should handle NaN', () => {
      expect(square(NaN)).toBeNaN();
    });

    it('should handle Number.MIN_VALUE', () => {
      expect(square(Number.MIN_VALUE)).toBe(Number.MIN_VALUE * Number.MIN_VALUE);
    });

    it('should handle Number.EPSILON', () => {
      expect(square(Number.EPSILON)).toBe(Number.EPSILON * Number.EPSILON);
    });
  });

  describe('error handling', () => {
    it('should throw TypeError for non-number inputs', () => {
      expect(() => square('5' as any)).toThrow(TypeError);
      expect(() => square('5' as any)).toThrow('Input must be a number');

      expect(() => square(null as any)).toThrow(TypeError);
      expect(() => square(undefined as any)).toThrow(TypeError);
      expect(() => square(true as any)).toThrow(TypeError);
      expect(() => square(false as any)).toThrow(TypeError);
      expect(() => square([] as any)).toThrow(TypeError);
      expect(() => square({} as any)).toThrow(TypeError);
    });
  });

  describe('mathematical properties', () => {
    it('should always return a non-negative result for finite inputs', () => {
      const testCases = [1, -1, 2, -2, 0.5, -0.5, 100, -100];
      testCases.forEach(num => {
        expect(square(num)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should be symmetric (square(x) === square(-x))', () => {
      const testCases = [1, 2, 3, 0.5, 1.5, 100, 0.001];
      testCases.forEach(num => {
        expect(square(num)).toBe(square(-num));
      });
    });

    it('should satisfy the property that square(x) = x * x', () => {
      const testCases = [1, -1, 2, -2, 0.5, -0.5, 3.14, -3.14];
      testCases.forEach(num => {
        expect(square(num)).toBe(num * num);
      });
    });
  });

  describe('boundary conditions', () => {
    it('should handle numbers close to zero', () => {
      // Fixed: Use toBeCloseTo for floating-point precision issues
      expect(square(1e-10)).toBeCloseTo(1e-20, 25);
      expect(square(-1e-10)).toBeCloseTo(1e-20, 25);
    });

    it('should handle large numbers that might cause overflow', () => {
      const largeNumber = 1e154; // Square would be 1e308, close to Number.MAX_VALUE
      expect(square(largeNumber)).toBe(largeNumber * largeNumber);
    });

    it('should handle numbers that cause overflow to Infinity', () => {
      const veryLargeNumber = 1e200;
      expect(square(veryLargeNumber)).toBe(Infinity);
      expect(square(-veryLargeNumber)).toBe(Infinity);
    });
  });

  describe('performance characteristics', () => {
    it('should handle array of numbers efficiently', () => {
      const numbers = Array.from({ length: 1000 }, (_, i) => i - 500);
      const start = performance.now();

      numbers.forEach(num => square(num));

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time (generous threshold for CI environments)
      expect(duration).toBeLessThan(100);
    });
  });
});