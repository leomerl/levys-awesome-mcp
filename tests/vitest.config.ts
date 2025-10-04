/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    testTimeout: 1800000, // 30 minutes for integration tests (SPARC workflow needs this)
    hookTimeout: 1800000, // 30 minutes for setup/teardown hooks
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        '../src/**/*.{js,ts,jsx,tsx}',
        'utils/**/*.{js,ts}',  // Include our factorial implementation for coverage
      ],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.{js,ts}',
        '**/*.d.ts',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/frontend/src'),
    },
  },
});