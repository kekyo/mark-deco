import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
