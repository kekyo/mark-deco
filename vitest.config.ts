import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // Exclude the subdirectory tests because they try to run at the same time and fail,
      // even though the build is not complete.
      // Each test should be run explicitly in its own subdirectory.
      'test-shared/**',
      'test-node/**',
      'test-e2e/**',
      'demo-pages/**',
      'cli/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        // Exclude the subdirectory tests because they try to run at the same time and fail,
        // even though the build is not complete.
        // Each test should be run explicitly in its own subdirectory.
        'test-shared/**',
        'test-node/**',
        'test-e2e/**',
        'demo-pages/**',
        'cli/**',
      ]
    }
  },
  esbuild: {
    target: 'node18'
  }
});
