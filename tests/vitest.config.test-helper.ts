/// <reference types="vitest" />
import { defineConfig } from 'vite';
import path from 'path';

/**
 * Vitest configuration specifically for test-helper tests
 * This configuration ensures tests run against real implementations without mocks
 */
export default defineConfig({
  test: {
    // Global test settings
    globals: true,
    environment: 'node', // Using node environment for pure unit tests

    // Test file patterns
    include: ['tests/test-helper.test.ts'],

    // Coverage configuration
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['backend/src/utils/test-helper.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.{js,ts}',
        '**/*.d.ts',
      ],
      all: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },

    // Reporter configuration
    reporters: ['verbose', 'json'],
    outputFile: {
      json: 'tests/test-results/test-helper-results.json',
    },

    // Performance settings
    testTimeout: 10000,
    hookTimeout: 10000,

    // Ensure no mocking
    mockReset: false,
    clearMocks: false,
    restoreMocks: false,

    // Watch settings (disabled for CI)
    watch: false,

    // Thread settings
    threads: true,
    maxThreads: 4,
    minThreads: 1,
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../backend/src'),
    },
  },

  // Build configuration
  build: {
    target: 'node18',
    sourcemap: true,
  },
});