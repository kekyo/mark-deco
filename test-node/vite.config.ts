import { resolve } from 'path';
import { defineConfig } from 'vite';
// @ts-expect-error - vite-plugin-eslint has type definition issues
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  plugins: [
    eslint({
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['node_modules', 'dist'],
      failOnWarning: true,
      failOnError: true,
      overrideConfigFile: resolve(__dirname, '../eslint.config.js')
    })
  ],
  root: '.',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'MarkDecoNode',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        'commander',
        'mark-deco',
        'fs/promises',
        'path'
      ],
      output: {
        globals: {
          'commander': 'commander',
          'mark-deco': 'markDeco'
        }
      }
    },
    target: 'node18'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // Directly reference library source files during development
      'mark-deco': resolve(__dirname, '../src/index.ts')
    }
  }
});
