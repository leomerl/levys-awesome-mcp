import { describe, it, expect } from 'vitest';
import { add } from '../backend/src/utils/test-helper';

describe('add function', () => {
  describe('Basic Functionality', () => {
    it('should add two positive numbers correctly', () => {
      expect(add(2, 3)).toBe(5);
      expect(add(10, 20)).toBe(30);
      expect(add(1, 1)).toBe(2);
    });

    it('should add two negative numbers correctly', () => {
      expect(add(-5, -3)).toBe(-8);
      expect(add(-10, -20)).toBe(-30);
      expect(add(-1, -1)).toBe(-2);
    });

    it('should add positive and negative numbers correctly', () => {
      expect(add(10, -5)).toBe(5);
      expect(add(-10, 5)).toBe(-5);
      expect(add(100, -100)).toBe(0);
      expect(add(-50, 75)).toBe(25);
    });

    it('should handle zero correctly', () => {
      expect(add(0, 0)).toBe(0);
      expect(add(5, 0)).toBe(5);
      expect(add(0, 5)).toBe(5);
      expect(add(-5, 0)).toBe(-5);
      expect(add(0, -5)).toBe(-5);
    });
  });

  describe('Decimal Numbers', () => {
    it('should add decimal numbers correctly', () => {
      expect(add(0.1, 0.2)).toBeCloseTo(0.3, 10);
      expect(add(1.5, 2.5)).toBe(4);
      expect(add(3.14159, 2.71828)).toBeCloseTo(5.85987, 5);
    });

    it('should add mixed integers and decimals', () => {
      expect(add(1, 0.5)).toBe(1.5);
      expect(add(10, 0.1)).toBeCloseTo(10.1, 10);
      expect(add(0.75, 5)).toBe(5.75);
    });

    it('should handle negative decimals', () => {
      expect(add(-0.5, -0.5)).toBe(-1);
      expect(add(-1.25, 0.25)).toBe(-1);
      expect(add(2.5, -3.5)).toBe(-1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large positive numbers', () => {
      expect(add(Number.MAX_SAFE_INTEGER - 1, 1)).toBe(Number.MAX_SAFE_INTEGER);
      expect(add(1e10, 2e10)).toBe(3e10);
      expect(add(999999999, 1)).toBe(1000000000);
    });

    it('should handle very large negative numbers', () => {
      expect(add(Number.MIN_SAFE_INTEGER + 1, -1)).toBe(Number.MIN_SAFE_INTEGER);
      expect(add(-1e10, -2e10)).toBe(-3e10);
      expect(add(-999999999, -1)).toBe(-1000000000);
    });

    it('should handle very small decimal numbers', () => {
      expect(add(0.0000001, 0.0000002)).toBeCloseTo(0.0000003, 10);
      expect(add(1e-10, 2e-10)).toBeCloseTo(3e-10, 15);
      expect(add(Number.EPSILON, Number.EPSILON)).toBeCloseTo(2 * Number.EPSILON, 15);
    });

    it('should handle numbers at JavaScript precision limits', () => {
      // Testing floating point precision
      expect(add(0.1 + 0.2, 0.3)).toBeCloseTo(0.6, 10);

      // Testing with numbers that have precision issues
      const result = add(0.1, 0.2);
      expect(Math.abs(result - 0.3)).toBeLessThan(1e-10);
    });

    it('should handle special number values', () => {
      expect(add(Infinity, 1)).toBe(Infinity);
      expect(add(-Infinity, -1)).toBe(-Infinity);
      expect(add(Infinity, -Infinity)).toBeNaN();
      expect(add(NaN, 1)).toBeNaN();
      expect(add(1, NaN)).toBeNaN();
      expect(add(NaN, NaN)).toBeNaN();
    });
  });

  describe('Commutative Property', () => {
    it('should return the same result regardless of parameter order', () => {
      expect(add(5, 3)).toBe(add(3, 5));
      expect(add(-10, 20)).toBe(add(20, -10));
      expect(add(0.5, 1.5)).toBe(add(1.5, 0.5));
      expect(add(0, 100)).toBe(add(100, 0));
    });
  });

  describe('Identity Property', () => {
    it('should return the same number when adding zero', () => {
      const testNumbers = [1, -1, 0, 100, -100, 0.5, -0.5, Math.PI, -Math.E];
      testNumbers.forEach(num => {
        expect(add(num, 0)).toBe(num);
        expect(add(0, num)).toBe(num);
      });
    });
  });

  describe('Associative Property', () => {
    it('should maintain associative property for multiple additions', () => {
      // (a + b) + c === a + (b + c)
      const a = 10, b = 20, c = 30;
      expect(add(add(a, b), c)).toBe(add(a, add(b, c)));

      const x = -5, y = 15, z = -10;
      expect(add(add(x, y), z)).toBe(add(x, add(y, z)));

      const p = 0.1, q = 0.2, r = 0.3;
      expect(add(add(p, q), r)).toBeCloseTo(add(p, add(q, r)), 10);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should calculate monetary values correctly', () => {
      // Adding dollars and cents
      expect(add(19.99, 5.01)).toBe(25.00);
      expect(add(100.50, 50.50)).toBe(151.00);
      expect(add(0.01, 0.01)).toBe(0.02);
    });

    it('should handle temperature calculations', () => {
      // Temperature changes
      expect(add(-10, 15)).toBe(5); // -10°C + 15° change = 5°C
      expect(add(32, -40)).toBe(-8); // 32°F - 40° = -8°F
    });

    it('should handle score calculations', () => {
      // Game scores, points, etc.
      expect(add(1500, 250)).toBe(1750);
      expect(add(-100, 50)).toBe(-50); // Negative score + bonus
    });
  });

  describe('Boundary Testing', () => {
    it('should handle numbers at safe integer boundaries', () => {
      expect(add(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
      expect(add(Number.MIN_SAFE_INTEGER, 0)).toBe(Number.MIN_SAFE_INTEGER);
      expect(add(Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER)).toBe(0);
    });

    it('should handle overflow scenarios', () => {
      // Numbers beyond MAX_SAFE_INTEGER lose precision
      const beyondSafe = Number.MAX_SAFE_INTEGER + 2;
      const result = add(beyondSafe, 1);
      // This tests that the function still works, even if precision is lost
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle rapid successive calls', () => {
      const results: number[] = [];
      for (let i = 0; i < 1000; i++) {
        results.push(add(i, 1));
      }
      expect(results[0]).toBe(1);
      expect(results[999]).toBe(1000);
    });

    it('should maintain consistency across multiple calls', () => {
      const a = 42;
      const b = 58;
      const expected = 100;

      // Call multiple times to ensure consistency
      for (let i = 0; i < 100; i++) {
        expect(add(a, b)).toBe(expected);
      }
    });
  });

  describe('Type System Validation', () => {
    it('should work with different numeric representations', () => {
      // Binary
      expect(add(0b1010, 0b0101)).toBe(15); // 10 + 5 = 15

      // Octal
      expect(add(0o10, 0o7)).toBe(15); // 8 + 7 = 15

      // Hexadecimal
      expect(add(0xA, 0x5)).toBe(15); // 10 + 5 = 15

      // Scientific notation
      expect(add(1e2, 2e2)).toBe(300); // 100 + 200 = 300
      expect(add(5e-2, 5e-2)).toBeCloseTo(0.1, 10); // 0.05 + 0.05 = 0.1
    });

    it('should handle JavaScript number coercion edge cases', () => {
      // While the function expects numbers, these tests document behavior
      // with JavaScript's numeric values
      expect(add(+0, -0)).toBe(0);
      expect(add(-0, -0)).toBe(-0);

      // Underflow to zero
      expect(add(Number.MIN_VALUE / 2, Number.MIN_VALUE / 2)).toBeGreaterThan(0);
    });
  });

  describe('Mathematical Properties', () => {
    it('should satisfy the closure property', () => {
      // The sum of two numbers is always a number
      const testCases = [
        [1, 2],
        [-1, -2],
        [0.1, 0.2],
        [Number.MAX_VALUE / 2, Number.MAX_VALUE / 2],
        [Number.MIN_VALUE, Number.MIN_VALUE]
      ];

      testCases.forEach(([a, b]) => {
        const result = add(a, b);
        expect(typeof result).toBe('number');
      });
    });

    it('should handle additive inverse', () => {
      // a + (-a) = 0
      const numbers = [1, -1, 100, -100, 0.5, -0.5, Math.PI, -Math.E];
      numbers.forEach(num => {
        expect(add(num, -num)).toBe(0);
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle consecutive operations', () => {
      // Chain multiple additions
      let result = 0;
      for (let i = 1; i <= 100; i++) {
        result = add(result, i);
      }
      // Sum of 1 to 100 = 5050
      expect(result).toBe(5050);
    });

    it('should maintain precision for currency calculations', () => {
      // Common currency calculation patterns
      const prices = [19.99, 29.99, 39.99, 49.99];
      let total = 0;

      prices.forEach(price => {
        total = add(total, price);
      });

      expect(total).toBeCloseTo(139.96, 2);
    });
  });

  describe('Stress Testing', () => {
    it('should handle a large number of random additions', () => {
      const iterations = 10000;
      let sum = 0;
      const numbers: number[] = [];

      // Generate random numbers and calculate expected sum
      for (let i = 0; i < iterations; i++) {
        const num = Math.random() * 100 - 50; // Random between -50 and 50
        numbers.push(num);
        sum = add(sum, num);
      }

      // Verify the sum using native JavaScript
      const expectedSum = numbers.reduce((acc, curr) => acc + curr, 0);
      expect(sum).toBeCloseTo(expectedSum, 5);
    });

    it('should handle alternating positive and negative additions', () => {
      let result = 0;
      const iterations = 1000;

      for (let i = 1; i <= iterations; i++) {
        if (i % 2 === 0) {
          result = add(result, -i);
        } else {
          result = add(result, i);
        }
      }

      // Expected: 1 - 2 + 3 - 4 + ... + 999 - 1000 = -500
      expect(result).toBe(-500);
    });
  });
});