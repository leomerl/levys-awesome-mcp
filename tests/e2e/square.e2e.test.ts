import { describe, it, expect } from 'vitest';
import { square } from '../utils/square';

describe('square function end-to-end tests', () => {
  describe('complete mathematical workflows', () => {
    it('should support a complete geometric calculation workflow', () => {
      // Scenario: Calculate areas of various squares and find the total area
      const sideLengths = [2.5, 3.0, 4.5, 5.0, 10.0];

      // Step 1: Calculate individual areas
      const areas = sideLengths.map(side => ({
        side,
        area: square(side),
        perimeter: 4 * side
      }));

      // Step 2: Verify each calculation
      expect(areas[0]).toEqual({ side: 2.5, area: 6.25, perimeter: 10 });
      expect(areas[1]).toEqual({ side: 3.0, area: 9, perimeter: 12 });
      expect(areas[2]).toEqual({ side: 4.5, area: 20.25, perimeter: 18 });
      expect(areas[3]).toEqual({ side: 5.0, area: 25, perimeter: 20 });
      expect(areas[4]).toEqual({ side: 10.0, area: 100, perimeter: 40 });

      // Step 3: Calculate total area
      const totalArea = areas.reduce((sum, shape) => sum + shape.area, 0);
      expect(totalArea).toBe(160.5);

      // Step 4: Find the largest square
      const largestSquare = areas.reduce((max, current) =>
        current.area > max.area ? current : max
      );
      expect(largestSquare.side).toBe(10.0);
      expect(largestSquare.area).toBe(100);
    });

    it('should support a complete statistical analysis workflow', () => {
      // Scenario: Analyze a dataset using squares for variance calculation
      const rawData = [12, 15, 18, 20, 22, 25, 28, 30, 32, 35];

      // Step 1: Calculate basic statistics
      const n = rawData.length;
      const sum = rawData.reduce((acc, val) => acc + val, 0);
      const mean = sum / n;

      expect(n).toBe(10);
      expect(sum).toBe(237);
      expect(mean).toBe(23.7);

      // Step 2: Calculate deviations and squared deviations
      const deviations = rawData.map(x => x - mean);
      const squaredDeviations = deviations.map(deviation => square(deviation));

      // Step 3: Calculate variance and standard deviation
      const variance = squaredDeviations.reduce((sum, sq) => sum + sq, 0) / (n - 1);
      const standardDeviation = Math.sqrt(variance);

      expect(variance).toBeCloseTo(67.79, 2);
      expect(standardDeviation).toBeCloseTo(8.23, 2);

      // Step 4: Identify outliers (values more than 2 standard deviations from mean)
      const outliers = rawData.filter(x =>
        Math.abs(x - mean) > 2 * standardDeviation
      );

      expect(outliers).toEqual([]); // No outliers in this dataset

      // Step 5: Calculate coefficient of variation
      const coefficientOfVariation = (standardDeviation / mean) * 100;
      expect(coefficientOfVariation).toBeCloseTo(34.73, 2);
    });

    it('should support a complete physics calculation workflow', () => {
      // Scenario: Projectile motion calculations involving squares
      const initialVelocity = 20; // m/s
      const angle = 45; // degrees
      const gravity = 9.81; // m/s^2

      // Convert angle to radians
      const angleRad = (angle * Math.PI) / 180;

      // Step 1: Calculate velocity components
      const vx = initialVelocity * Math.cos(angleRad);
      const vy = initialVelocity * Math.sin(angleRad);

      expect(vx).toBeCloseTo(14.14, 2);
      expect(vy).toBeCloseTo(14.14, 2);

      // Step 2: Calculate maximum height (using v^2 formula)
      const maxHeight = square(vy) / (2 * gravity);
      expect(maxHeight).toBeCloseTo(10.19, 2);

      // Step 3: Calculate range (horizontal distance)
      const timeOfFlight = (2 * vy) / gravity;
      const range = vx * timeOfFlight;

      expect(timeOfFlight).toBeCloseTo(2.88, 2);
      expect(range).toBeCloseTo(40.78, 2);

      // Step 4: Calculate total kinetic energy at launch
      const mass = 0.5; // kg
      const kineticEnergy = 0.5 * mass * square(initialVelocity);

      expect(kineticEnergy).toBe(100); // Joules

      // Step 5: Verify energy conservation at maximum height
      const potentialEnergyAtMax = mass * gravity * maxHeight;
      const kineticEnergyAtMax = 0.5 * mass * square(vx); // Only horizontal velocity remains

      const totalEnergyAtMax = potentialEnergyAtMax + kineticEnergyAtMax;
      expect(totalEnergyAtMax).toBeCloseTo(kineticEnergy, 1);
    });
  });

  describe('data processing pipelines', () => {
    it('should work in a complete data transformation pipeline', () => {
      // Scenario: Process sensor data through multiple transformations
      const sensorReadings = [
        { id: 1, voltage: 2.5, timestamp: Date.now() },
        { id: 2, voltage: 3.2, timestamp: Date.now() + 1000 },
        { id: 3, voltage: 1.8, timestamp: Date.now() + 2000 },
        { id: 4, voltage: 4.1, timestamp: Date.now() + 3000 },
        { id: 5, voltage: 2.9, timestamp: Date.now() + 4000 }
      ];

      // Step 1: Calculate power (assuming P = V^2/R, where R = 1 ohm)
      const processedData = sensorReadings.map(reading => ({
        ...reading,
        power: square(reading.voltage),
        voltageSquared: square(reading.voltage)
      }));

      // Step 2: Verify power calculations
      expect(processedData[0].power).toBe(6.25);
      expect(processedData[1].power).toBeCloseTo(10.24, 2);
      expect(processedData[2].power).toBeCloseTo(3.24, 2);
      expect(processedData[3].power).toBeCloseTo(16.81, 2);
      expect(processedData[4].power).toBeCloseTo(8.41, 2);

      // Step 3: Calculate average power
      const averagePower = processedData.reduce((sum, reading) => sum + reading.power, 0) / processedData.length;
      expect(averagePower).toBeCloseTo(8.99, 2);

      // Step 4: Identify high-power readings (above average)
      const highPowerReadings = processedData.filter(reading => reading.power > averagePower);
      expect(highPowerReadings).toHaveLength(2);
      expect(highPowerReadings.map(r => r.id)).toEqual([2, 4]);

      // Step 5: Calculate total energy (assuming each reading represents 1 second)
      const totalEnergy = processedData.reduce((sum, reading) => sum + reading.power, 0);
      expect(totalEnergy).toBeCloseTo(44.95, 2);
    });

    it('should handle error recovery in data pipelines', () => {
      // Scenario: Process data with some invalid entries
      const mixedData = [
        { value: 5, valid: true },
        { value: 'invalid', valid: false },
        { value: 3.5, valid: true },
        { value: null, valid: false },
        { value: 7.2, valid: true }
      ];

      // Step 1: Filter valid data
      const validData = mixedData.filter(item => item.valid);

      // Step 2: Process valid data
      const results = validData.map(item => {
        try {
          return {
            ...item,
            squared: square(item.value as number),
            processed: true
          };
        } catch (error) {
          return {
            ...item,
            squared: null,
            processed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      // Step 3: Verify results
      expect(results).toHaveLength(3);
      expect(results[0].squared).toBe(25);
      expect(results[1].squared).toBe(12.25);
      expect(results[2].squared).toBeCloseTo(51.84, 2);

      // Step 4: All valid data should be processed successfully
      const successfullyProcessed = results.filter(r => r.processed);
      expect(successfullyProcessed).toHaveLength(3);
    });
  });

  describe('performance in real-world scenarios', () => {
    it('should handle large-scale data processing efficiently', () => {
      // Scenario: Process a large dataset like might be encountered in real applications
      const largeDataset = Array.from({ length: 50000 }, (_, i) => ({
        id: i,
        measurement: (i % 1000) / 100, // Creates values from 0 to 9.99
        category: i % 10
      }));

      const start = performance.now();

      // Step 1: Process all measurements
      const processed = largeDataset.map(item => ({
        ...item,
        measurementSquared: square(item.measurement),
        category: item.category
      }));

      // Step 2: Group by category and calculate statistics
      const categoryStats = Array.from({ length: 10 }, (_, category) => {
        const categoryData = processed.filter(item => item.category === category);
        const squares = categoryData.map(item => item.measurementSquared);
        const sum = squares.reduce((acc, val) => acc + val, 0);
        const avg = sum / squares.length;

        return {
          category,
          count: categoryData.length,
          averageSquare: avg,
          totalSquares: sum
        };
      });

      const end = performance.now();

      // Step 3: Verify results
      expect(processed).toHaveLength(50000);
      expect(categoryStats).toHaveLength(10);
      expect(categoryStats[0].count).toBe(5000);

      // Step 4: Performance should be reasonable
      expect(end - start).toBeLessThan(500); // Should complete in under 500ms

      // Step 5: Verify statistical accuracy for one category
      const category0Stats = categoryStats[0];
      expect(category0Stats.averageSquare).toBeGreaterThan(0);
      expect(category0Stats.totalSquares).toBeGreaterThan(0);
    });
  });
});