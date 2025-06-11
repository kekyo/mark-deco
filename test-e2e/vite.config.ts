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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'test-page.html'),
        app: resolve(__dirname, 'test-page.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'es2020'
  },
  server: {
    host: 'localhost'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // Directly reference library source files during development
      'mark-deco': resolve(__dirname, '../src/index.ts')
    }
  },
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});
