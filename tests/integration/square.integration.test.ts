import { describe, it, expect } from 'vitest';
import { square } from '../utils/square';

describe('square function integration tests', () => {
  describe('mathematical calculations', () => {
    it('should work correctly in calculating area of squares', () => {
      // Area = side^2
      const side1 = 5;
      const side2 = 10.5;
      const side3 = 0.5;

      expect(square(side1)).toBe(25);
      expect(square(side2)).toBe(110.25);
      expect(square(side3)).toBe(0.25);
    });

    it('should work correctly in distance calculations (Pythagorean theorem)', () => {
      // distance = sqrt(x^2 + y^2)
      const x1 = 3, y1 = 4;
      const x2 = 5, y2 = 12;

      const distanceSquared1 = square(x1) + square(y1);
      const distanceSquared2 = square(x2) + square(y2);

      expect(distanceSquared1).toBe(25); // sqrt(25) = 5
      expect(distanceSquared2).toBe(169); // sqrt(169) = 13
    });

    it('should work correctly in variance calculations', () => {
      // Sample variance calculation: sum of squared deviations
      const data = [1, 2, 3, 4, 5];
      const mean = data.reduce((sum, val) => sum + val, 0) / data.length; // 3

      const squaredDeviations = data.map(x => square(x - mean));
      const variance = squaredDeviations.reduce((sum, val) => sum + val, 0) / (data.length - 1);

      expect(squaredDeviations).toEqual([4, 1, 0, 1, 4]);
      expect(variance).toBe(2.5);
    });
  });

  describe('array operations', () => {
    it('should work correctly when mapping over arrays', () => {
      const numbers = [1, 2, 3, 4, 5];
      const squares = numbers.map(square);

      expect(squares).toEqual([1, 4, 9, 16, 25]);
    });

    it('should work correctly with negative numbers in arrays', () => {
      const numbers = [-3, -2, -1, 0, 1, 2, 3];
      const squares = numbers.map(square);

      expect(squares).toEqual([9, 4, 1, 0, 1, 4, 9]);
    });

    it('should work correctly with decimal numbers in arrays', () => {
      const numbers = [0.1, 0.5, 1.5, 2.5];
      const squares = numbers.map(square);

      expect(squares[0]).toBeCloseTo(0.01, 10);
      expect(squares[1]).toBe(0.25);
      expect(squares[2]).toBe(2.25);
      expect(squares[3]).toBe(6.25);
    });
  });

  describe('function composition', () => {
    it('should work correctly when composed with other functions', () => {
      const addThenSquare = (x: number, y: number) => square(x + y);
      const squareThenAdd = (x: number, y: number) => square(x) + square(y);

      expect(addThenSquare(2, 3)).toBe(25); // (2+3)^2 = 25
      expect(squareThenAdd(2, 3)).toBe(13); // 2^2 + 3^2 = 4 + 9 = 13
    });

    it('should work correctly in reduce operations', () => {
      const numbers = [1, 2, 3, 4];

      // Sum of squares
      const sumOfSquares = numbers.reduce((sum, num) => sum + square(num), 0);
      expect(sumOfSquares).toBe(30); // 1 + 4 + 9 + 16 = 30

      // Product of squares (starting with 1)
      const productOfSquares = numbers.reduce((product, num) => product * square(num), 1);
      expect(productOfSquares).toBe(576); // 1 * 4 * 9 * 16 = 576
    });
  });

  describe('real-world scenarios', () => {
    it('should calculate kinetic energy correctly', () => {
      // KE = 0.5 * m * v^2
      const mass = 10; // kg
      const velocity = 5; // m/s

      const kineticEnergy = 0.5 * mass * square(velocity);
      expect(kineticEnergy).toBe(125); // Joules
    });

    it('should calculate compound interest with squared terms', () => {
      // For demonstration: interest calculation involving squares
      const principal = 1000;
      const rate = 0.05; // 5%

      // Simplified calculation involving square of rate
      const result = principal * (1 + square(rate));
      expect(result).toBe(1002.5);
    });

    it('should work in statistical calculations', () => {
      const dataset = [10, 20, 30, 40, 50];
      const mean = dataset.reduce((sum, val) => sum + val, 0) / dataset.length;

      // Calculate standard deviation
      const squaredDifferences = dataset.map(x => square(x - mean));
      const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / dataset.length;
      const standardDeviation = Math.sqrt(variance);

      expect(squaredDifferences).toEqual([400, 100, 0, 100, 400]);
      expect(variance).toBe(200);
      expect(standardDeviation).toBeCloseTo(14.142, 3);
    });
  });

  describe('error propagation in integration scenarios', () => {
    it('should handle errors gracefully in array operations', () => {
      const mixedArray = [1, 2, null, 4, 5] as any[];

      expect(() => {
        mixedArray.map(x => square(x));
      }).toThrow(TypeError);
    });

    it('should handle errors in function composition', () => {
      const invalidComposition = (x: any) => square(x) + square(x);

      expect(() => invalidComposition('string')).toThrow(TypeError);
      expect(() => invalidComposition(null)).toThrow(TypeError);
    });
  });

  describe('performance in integration scenarios', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => i - 5000);

      const start = performance.now();
      const results = largeDataset.map(square);
      const end = performance.now();

      expect(results.length).toBe(10000);
      expect(results[5000]).toBe(0); // square(0) = 0
      expect(results[5001]).toBe(1); // square(1) = 1
      expect(results[4999]).toBe(1); // square(-1) = 1

      // Should complete within reasonable time
      expect(end - start).toBeLessThan(50);
    });
  });
});