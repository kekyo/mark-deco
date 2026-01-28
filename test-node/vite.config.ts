import { resolve } from 'path';
import { defineConfig } from 'vite';
import prettierMax from 'prettier-max';

export default defineConfig({
  plugins: [prettierMax()],
  root: '.',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      name: 'mark-deco-node',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['commander', 'mark-deco', 'fs/promises', 'path'],
    },
    target: 'node18',
  },
});
