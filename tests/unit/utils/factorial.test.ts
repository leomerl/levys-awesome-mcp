import { describe, it, expect } from 'vitest';
import { factorial } from '../../utils/factorial-impl';

describe('factorial', () => {
  describe('valid inputs', () => {
    it('should return 1 for factorial of 0', () => {
      expect(factorial(0)).toBe(1);
    });

    it('should return 1 for factorial of 1', () => {
      expect(factorial(1)).toBe(1);
    });

    it('should return 2 for factorial of 2', () => {
      expect(factorial(2)).toBe(2);
    });

    it('should return 6 for factorial of 3', () => {
      expect(factorial(3)).toBe(6);
    });

    it('should return 24 for factorial of 4', () => {
      expect(factorial(4)).toBe(24);
    });

    it('should return 120 for factorial of 5', () => {
      expect(factorial(5)).toBe(120);
    });

    it('should return 3628800 for factorial of 10', () => {
      expect(factorial(10)).toBe(3628800);
    });

    it('should return 2432902008176640000 for factorial of 20', () => {
      expect(factorial(20)).toBe(2432902008176640000);
    });

    it('should handle the maximum safe factorial (20)', () => {
      const result = factorial(20);
      expect(result).toBe(2432902008176640000);
      expect(result).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('edge cases and error handling', () => {
    describe('negative numbers', () => {
      it('should throw error for negative integers', () => {
        expect(() => factorial(-1)).toThrow('Factorial is not defined for negative numbers');
        expect(() => factorial(-5)).toThrow('Factorial is not defined for negative numbers');
        expect(() => factorial(-100)).toThrow('Factorial is not defined for negative numbers');
      });

      it('should throw error for negative decimals', () => {
        expect(() => factorial(-1.5)).toThrow('Factorial is only defined for non-negative integers');
        expect(() => factorial(-0.1)).toThrow('Factorial is only defined for non-negative integers');
        expect(() => factorial(-3.14159)).toThrow('Factorial is only defined for non-negative integers');
      });
    });

    describe('non-integer inputs', () => {
      it('should throw error for positive decimal numbers', () => {
        expect(() => factorial(1.5)).toThrow('Factorial is only defined for non-negative integers');
        expect(() => factorial(2.7)).toThrow('Factorial is only defined for non-negative integers');
        expect(() => factorial(3.14159)).toThrow('Factorial is only defined for non-negative integers');
        expect(() => factorial(0.5)).toThrow('Factorial is only defined for non-negative integers');
      });
    });

    describe('invalid inputs', () => {
      it('should throw error for NaN', () => {
        expect(() => factorial(NaN)).toThrow('Input must be a valid number');
      });

      it('should throw error for non-number types', () => {
        // @ts-expect-error Testing invalid input
        expect(() => factorial('5')).toThrow('Input must be a valid number');
        // @ts-expect-error Testing invalid input
        expect(() => factorial(null)).toThrow('Input must be a valid number');
        // @ts-expect-error Testing invalid input
        expect(() => factorial(undefined)).toThrow('Input must be a valid number');
        // @ts-expect-error Testing invalid input
        expect(() => factorial({})).toThrow('Input must be a valid number');
        // @ts-expect-error Testing invalid input
        expect(() => factorial([])).toThrow('Input must be a valid number');
        // @ts-expect-error Testing invalid input
        expect(() => factorial(true)).toThrow('Input must be a valid number');
      });

      it('should throw error for Infinity', () => {
        expect(() => factorial(Infinity)).toThrow('Factorial is only defined for non-negative integers');
        expect(() => factorial(-Infinity)).toThrow('Factorial is only defined for non-negative integers');
      });
    });

    describe('overflow prevention', () => {
      it('should throw error for numbers that would exceed MAX_SAFE_INTEGER', () => {
        expect(() => factorial(21)).toThrow("Factorial of 21 exceeds JavaScript's MAX_SAFE_INTEGER");
        expect(() => factorial(22)).toThrow("Factorial of 22 exceeds JavaScript's MAX_SAFE_INTEGER");
        expect(() => factorial(100)).toThrow("Factorial of 100 exceeds JavaScript's MAX_SAFE_INTEGER");
        expect(() => factorial(1000)).toThrow("Factorial of 1000 exceeds JavaScript's MAX_SAFE_INTEGER");
      });
    });
  });

  describe('mathematical properties', () => {
    it('should satisfy the recurrence relation: n! = n * (n-1)!', () => {
      for (let n = 1; n <= 10; n++) {
        expect(factorial(n)).toBe(n * factorial(n - 1));
      }
    });

    it('should produce strictly increasing results for increasing inputs', () => {
      let previousResult = factorial(0);
      for (let n = 1; n <= 15; n++) {
        const currentResult = factorial(n);
        expect(currentResult).toBeGreaterThan(previousResult);
        previousResult = currentResult;
      }
    });

    it('should satisfy the property: n! / (n-1)! = n', () => {
      for (let n = 1; n <= 10; n++) {
        expect(factorial(n) / factorial(n - 1)).toBe(n);
      }
    });
  });

  describe('performance and consistency', () => {
    it('should return consistent results for the same input', () => {
      const testCases = [0, 1, 5, 10, 15, 20];
      testCases.forEach(n => {
        const result1 = factorial(n);
        const result2 = factorial(n);
        const result3 = factorial(n);
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });
    });

    it('should handle rapid consecutive calls', () => {
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(factorial(5));
      }
      // All results should be identical
      const expectedValue = 120;
      results.forEach(result => {
        expect(result).toBe(expectedValue);
      });
    });
  });

  describe('boundary values', () => {
    it('should correctly handle the smallest valid input (0)', () => {
      expect(factorial(0)).toBe(1);
    });

    it('should correctly handle the largest valid input (20)', () => {
      expect(factorial(20)).toBe(2432902008176640000);
    });

    it('should handle values near the overflow boundary', () => {
      expect(factorial(19)).toBe(121645100408832000);
      expect(factorial(20)).toBe(2432902008176640000);
      expect(() => factorial(21)).toThrow("Factorial of 21 exceeds JavaScript's MAX_SAFE_INTEGER");
    });
  });
});