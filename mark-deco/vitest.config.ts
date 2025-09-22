// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

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
      // Exclude sibling subprojects because they run their own test suites independently.
      '../test-shared/**',
      '../test-node/**',
      '../test-e2e/**',
      '../demo-pages/**',
      '../cli/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '../test-shared/**',
        '../test-node/**',
        '../test-e2e/**',
        '../demo-pages/**',
        '../cli/**',
      ],
    },
  },
  esbuild: {
    target: 'node18',
  },
});
