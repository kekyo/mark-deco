// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { resolve } from 'path';
import swc from '@rollup/plugin-swc';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import screwUp from 'screw-up';
import prettierMax from 'prettier-max';

export default defineConfig({
  plugins: [
    screwUp(),
    prettierMax(),
    swc({
      swc: {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: false,
            dynamicImport: true,
          },
          target: 'es2022',
          loose: false,
          externalHelpers: false,
          keepClassNames: true,
          preserveAllComments: false,
          transform: {
            constModules: {
              globals: {},
            },
          },
        },
        module: {
          type: 'es6',
          strict: false,
          strictMode: true,
          lazy: false,
          noInterop: false,
        },
        minify: false,
        isModule: true,
        sourceMaps: true,
      },
      include: /\.(ts|tsx)$/,
      exclude: /node_modules/,
    }),
    dts({
      insertTypesEntry: true,
      copyDtsFiles: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        internal: resolve(__dirname, 'src/internal.ts'),
      },
      name: 'MarkdownEnhancedProcessor',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'js-yaml',
        'js-beautify',
        'jsdom',
        'rehype-stringify',
        'remark-gfm',
        'remark-parse',
        'remark-rehype',
        'unified',
        'unist-util-visit',
      ],
      output: {
        globals: {
          'js-yaml': 'jsYaml',
          'js-beautify': 'beautify',
          jsdom: 'jsdom',
          'rehype-stringify': 'rehypeStringify',
          'remark-gfm': 'remarkGfm',
          'remark-parse': 'remarkParse',
          'remark-rehype': 'remarkRehype',
          unified: 'unified',
          'unist-util-visit': 'visit',
        },
      },
    },
    sourcemap: true,
    emptyOutDir: true,
    target: 'es2022',
  },
});
