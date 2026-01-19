import { resolve } from 'path';
import { defineConfig } from 'vite';
import prettierMax from 'prettier-max';

export default defineConfig({
  plugins: [prettierMax()],
  root: '.',
  build: {
    outDir: './dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'test-page.html'),
        app: resolve(__dirname, 'test-page.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    target: 'es2020',
  },
  server: {
    host: 'localhost',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
