import { readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Read version from package.json at build time
const packageJsonPath = resolve(__dirname, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const version = packageJson.version;

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: 'src/cli.ts',
      name: 'MarkDecoCLI',
      formats: ['cjs'],
      fileName: (format) => `cli.${format === 'cjs' ? 'cjs' : 'js'}`
    },
    rollupOptions: {
      external: [
        'commander',
        'fs',
        'fs/promises',
        'path',
        'process',
        'node:path',
        'node:url',
        'node:process',
        'node:fs',
        'node:fs/promises',
        'util',
        'node:util',
        'stream',
        'node:stream',
        'events',
        'node:events'
      ],
      output: {
        banner: '#!/usr/bin/env node'
      }
    },
    minify: false,
    sourcemap: true
  },
  define: {
    global: 'globalThis',
    __VERSION__: JSON.stringify(version)
  },
  resolve: {
    alias: {
      // Prevent Vite from treating Node.js built-ins as browser modules
      fs: 'fs',
      path: 'path',
      process: 'process'
    },
    conditions: ['node']
  },
  esbuild: {
    platform: 'node'
  }
});
