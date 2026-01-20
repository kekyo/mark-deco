// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 30000,
    setupFiles: ['./tests/setup.ts'],
    environmentMatchGlobs: [['**/tests/cache.test.ts', 'node']],
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
  },
  esbuild: {
    target: 'node18',
  },
});
