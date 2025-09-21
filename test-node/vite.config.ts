import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
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
          commander: 'commander',
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
      'mark-deco': resolve(__dirname, '../mark-deco/src/index.ts')
    }
  }
});
