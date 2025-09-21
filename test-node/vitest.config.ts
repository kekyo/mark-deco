import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Directly reference library source files during development
      'mark-deco': path.resolve(__dirname, '../mark-deco/src/index.ts')
    }
  }
});
