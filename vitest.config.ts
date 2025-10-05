import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: './tests/setup.ts',
    environmentMatchGlobs: [
      // Only use jsdom for React component tests
      ['**/test-projects/**/*.test.{ts,tsx}', 'jsdom']
    ]
  }
});
