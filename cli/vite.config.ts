// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { defineConfig } from 'vite';
import prettierMax from 'prettier-max';
import screwUp from 'screw-up';

export default defineConfig({
  plugins: [
    prettierMax({
      typescript: 'tsconfig.tests.json',
    }),
    screwUp({
      outputMetadataFile: true,
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'mark-deco-cli',
      formats: ['cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'commander',
        'mark-deco',
        'fs/promises',
        'path',
        'process',
        'util',
        'stream',
        'events',
      ],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    target: 'node18',
    minify: false,
    sourcemap: true,
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    platform: 'node',
  },
});
