// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import screwUp from 'screw-up';
import prettierMax from 'prettier-max';

export default defineConfig({
  plugins: [
    screwUp(),
    prettierMax({
      typescript: 'tsconfig.tests.json',
    }),
    dts({
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        'card-oembed-fallback': resolve(
          __dirname,
          'src/card-oembed-fallback.ts'
        ),
        browser: resolve(__dirname, 'src/browser.ts'),
        index: resolve(__dirname, 'src/index.ts'),
        internal: resolve(__dirname, 'src/internal.ts'),
        node: resolve(__dirname, 'src/node.ts'),
        misc: resolve(__dirname, 'src/misc.ts'),
      },
      name: 'mark-deco',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'fs/promises',
        'path',
        'url',
        'os',
        'util',
        'zlib',
        'crypto',
        'async-primitives',
        'cheerio',
        'js-yaml',
        'js-beautify',
        'jsdom',
        'rehype-pretty-code',
        'rehype-stringify',
        'remark-gfm',
        'remark-parse',
        'remark-rehype',
        'shiki',
        'unified',
        'unist-util-visit',
      ],
    },
    target: 'es2018',
    sourcemap: true,
    minify: false,
  },
});
