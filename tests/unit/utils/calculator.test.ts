import { describe, it, expect } from 'vitest';
import { add, subtract } from '../../../src/utils/calculator';

describe('Calculator Utility Functions', () => {
  describe('add()', () => {
    describe('Positive Numbers', () => {
      it('should add two positive integers correctly', () => {
        expect(add(5, 3)).toBe(8);
      });

      it('should add two large positive integers', () => {
        expect(add(999999, 1)).toBe(1000000);
      });

      it('should add two positive decimal numbers', () => {
        expect(add(1.5, 2.7)).toBe(4.2);
      });

      it('should handle positive number precision correctly', () => {
        expect(add(0.1, 0.2)).toBeCloseTo(0.3);
      });
    });

    describe('Negative Numbers', () => {
      it('should add two negative integers correctly', () => {
        expect(add(-5, -3)).toBe(-8);
      });

      it('should add a positive and negative number', () => {
        expect(add(10, -6)).toBe(4);
      });

      it('should add a negative and positive number', () => {
        expect(add(-10, 6)).toBe(-4);
      });

      it('should add two negative decimal numbers', () => {
        expect(add(-1.5, -2.5)).toBe(-4);
      });

      it('should handle large negative numbers', () => {
        expect(add(-999999, -1)).toBe(-1000000);
      });
    });

    describe('Zero Values', () => {
      it('should return the same number when adding zero', () => {
        expect(add(5, 0)).toBe(5);
      });

      it('should return the same number when zero is first parameter', () => {
        expect(add(0, 5)).toBe(5);
      });

      it('should return zero when adding two zeros', () => {
        expect(add(0, 0)).toBe(0);
      });

      it('should handle negative number plus its opposite to get zero', () => {
        expect(add(10, -10)).toBe(0);
      });
    });

    describe('Decimal Numbers', () => {
      it('should add decimal numbers with different precision', () => {
        expect(add(1.23, 4.567)).toBeCloseTo(5.797);
      });

      it('should add very small decimal numbers', () => {
        expect(add(0.0001, 0.0002)).toBeCloseTo(0.0003);
      });

      it('should add integer with decimal', () => {
        expect(add(5, 2.5)).toBe(7.5);
      });

      it('should handle repeating decimals', () => {
        expect(add(1/3, 2/3)).toBeCloseTo(1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle Number.MAX_SAFE_INTEGER', () => {
        expect(add(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should handle Number.MIN_SAFE_INTEGER', () => {
        expect(add(Number.MIN_SAFE_INTEGER, 0)).toBe(Number.MIN_SAFE_INTEGER);
      });

      it('should handle very large numbers (potential overflow)', () => {
        const result = add(Number.MAX_SAFE_INTEGER, 1);
        expect(result).toBe(Number.MAX_SAFE_INTEGER + 1);
      });

      it('should handle very small negative numbers', () => {
        const result = add(Number.MIN_SAFE_INTEGER, -1);
        expect(result).toBe(Number.MIN_SAFE_INTEGER - 1);
      });

      it('should handle Infinity', () => {
        expect(add(Infinity, 1)).toBe(Infinity);
        expect(add(1, Infinity)).toBe(Infinity);
        expect(add(Infinity, Infinity)).toBe(Infinity);
      });

      it('should handle negative Infinity', () => {
        expect(add(-Infinity, 1)).toBe(-Infinity);
        expect(add(1, -Infinity)).toBe(-Infinity);
        expect(add(-Infinity, -Infinity)).toBe(-Infinity);
      });

      it('should handle NaN', () => {
        expect(add(NaN, 1)).toBeNaN();
        expect(add(1, NaN)).toBeNaN();
        expect(add(NaN, NaN)).toBeNaN();
      });

      it('should handle adding opposite infinities', () => {
        expect(add(Infinity, -Infinity)).toBeNaN();
      });
    });

    describe('Commutative Property', () => {
      it('should be commutative for positive numbers', () => {
        expect(add(3, 7)).toBe(add(7, 3));
      });

      it('should be commutative for negative numbers', () => {
        expect(add(-3, -7)).toBe(add(-7, -3));
      });

      it('should be commutative for mixed sign numbers', () => {
        expect(add(3, -7)).toBe(add(-7, 3));
      });

      it('should be commutative for decimals', () => {
        expect(add(1.5, 2.3)).toBe(add(2.3, 1.5));
      });
    });
  });

  describe('subtract()', () => {
    describe('Positive Numbers', () => {
      it('should subtract two positive integers correctly', () => {
        expect(subtract(10, 3)).toBe(7);
      });

      it('should handle subtracting a larger number from smaller (negative result)', () => {
        expect(subtract(3, 10)).toBe(-7);
      });

      it('should subtract two positive decimal numbers', () => {
        expect(subtract(5.7, 2.3)).toBeCloseTo(3.4);
      });

      it('should handle decimal precision in subtraction', () => {
        expect(subtract(0.3, 0.1)).toBeCloseTo(0.2);
      });
    });

    describe('Negative Numbers', () => {
      it('should subtract two negative numbers', () => {
        expect(subtract(-10, -3)).toBe(-7);
      });

      it('should subtract negative from positive', () => {
        expect(subtract(10, -5)).toBe(15);
      });

      it('should subtract positive from negative', () => {
        expect(subtract(-10, 5)).toBe(-15);
      });

      it('should handle negative decimal subtraction', () => {
        expect(subtract(-5.5, -2.5)).toBe(-3);
      });
    });

    describe('Zero Values', () => {
      it('should return the same number when subtracting zero', () => {
        expect(subtract(5, 0)).toBe(5);
      });

      it('should return negative number when subtracting from zero', () => {
        expect(subtract(0, 5)).toBe(-5);
      });

      it('should return zero when subtracting equal numbers', () => {
        expect(subtract(10, 10)).toBe(0);
      });

      it('should return zero when subtracting two zeros', () => {
        expect(subtract(0, 0)).toBe(0);
      });
    });

    describe('Decimal Numbers', () => {
      it('should subtract decimals with different precision', () => {
        expect(subtract(10.567, 3.234)).toBeCloseTo(7.333);
      });

      it('should subtract very small decimal numbers', () => {
        expect(subtract(0.0005, 0.0003)).toBeCloseTo(0.0002);
      });

      it('should subtract decimal from integer', () => {
        expect(subtract(10, 2.5)).toBe(7.5);
      });

      it('should subtract integer from decimal', () => {
        expect(subtract(10.5, 3)).toBe(7.5);
      });

      it('should handle repeating decimal subtraction', () => {
        expect(subtract(1, 1/3)).toBeCloseTo(2/3);
      });
    });

    describe('Edge Cases', () => {
      it('should handle Number.MAX_SAFE_INTEGER', () => {
        expect(subtract(Number.MAX_SAFE_INTEGER, 0)).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should handle Number.MIN_SAFE_INTEGER', () => {
        expect(subtract(Number.MIN_SAFE_INTEGER, 0)).toBe(Number.MIN_SAFE_INTEGER);
      });

      it('should handle subtracting from very large numbers', () => {
        const result = subtract(Number.MAX_SAFE_INTEGER, 1);
        expect(result).toBe(Number.MAX_SAFE_INTEGER - 1);
      });

      it('should handle subtracting from very small negative numbers', () => {
        const result = subtract(Number.MIN_SAFE_INTEGER, 1);
        expect(result).toBe(Number.MIN_SAFE_INTEGER - 1);
      });

      it('should handle Infinity in subtraction', () => {
        expect(subtract(Infinity, 1)).toBe(Infinity);
        expect(subtract(1, Infinity)).toBe(-Infinity);
        expect(subtract(Infinity, Infinity)).toBeNaN();
      });

      it('should handle negative Infinity in subtraction', () => {
        expect(subtract(-Infinity, 1)).toBe(-Infinity);
        expect(subtract(1, -Infinity)).toBe(Infinity);
        expect(subtract(-Infinity, -Infinity)).toBeNaN();
      });

      it('should handle NaN in subtraction', () => {
        expect(subtract(NaN, 1)).toBeNaN();
        expect(subtract(1, NaN)).toBeNaN();
        expect(subtract(NaN, NaN)).toBeNaN();
      });

      it('should handle subtracting opposite signed infinities', () => {
        expect(subtract(Infinity, -Infinity)).toBe(Infinity);
        expect(subtract(-Infinity, Infinity)).toBe(-Infinity);
      });
    });

    describe('Non-Commutative Property', () => {
      it('should not be commutative for positive numbers', () => {
        expect(subtract(10, 3)).not.toBe(subtract(3, 10));
      });

      it('should produce opposite results when operands are swapped', () => {
        const result1 = subtract(10, 3);
        const result2 = subtract(3, 10);
        expect(result1).toBe(-result2);
      });

      it('should only be commutative when both operands are the same', () => {
        expect(subtract(5, 5)).toBe(subtract(5, 5));
        expect(subtract(5, 5)).toBe(0);
      });
    });

    describe('Relationship with Addition', () => {
      it('should be the inverse of addition', () => {
        const a = 10;
        const b = 3;
        expect(subtract(add(a, b), b)).toBe(a);
      });

      it('should work as negative addition', () => {
        expect(subtract(10, 3)).toBe(add(10, -3));
      });

      it('should maintain inverse relationship with decimals', () => {
        const a = 10.5;
        const b = 3.2;
        expect(subtract(add(a, b), b)).toBeCloseTo(a);
      });
    });
  });

  describe('Combined Operations', () => {
    it('should handle chained additions and subtractions', () => {
      const result = subtract(add(10, 5), 3);
      expect(result).toBe(12);
    });

    it('should maintain precision through multiple operations', () => {
      const result = add(subtract(10.5, 3.2), 1.7);
      expect(result).toBeCloseTo(9);
    });

    it('should handle complex expressions', () => {
      const a = 100;
      const b = 50;
      const c = 25;
      const result = add(subtract(a, b), subtract(c, 10));
      expect(result).toBe(65);
    });

    it('should maintain associative property for addition', () => {
      const a = 5;
      const b = 10;
      const c = 15;
      expect(add(add(a, b), c)).toBe(add(a, add(b, c)));
    });
  });
});