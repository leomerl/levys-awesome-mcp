import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test matching pattern
    include: ['tests/**/*.test.ts', 'tests/**/*.test.js'],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'build'],

    // Test environment
    environment: 'node',

    // Global test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '*.config.*',
        'scripts/',
        'bin/',
      ],
    },

    // Reporter configuration
    // Note: reporters can be overridden via CLI flags
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],

    // Output file for JSON reporter (can be overridden via CLI)
    outputFile: process.env.CI ? 'test-results/results.json' : undefined,
  },
});