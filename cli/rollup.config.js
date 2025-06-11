import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';

export default {
  input: 'src/cli.ts',
  output: {
    file: 'dist-rollup/cli.js',
    format: 'cjs',
    banner: '#!/usr/bin/env node'
  },
  external: [
    // Node.js built-ins
    'fs', 'fs/promises', 'path', 'process', 'url', 'util', 'stream', 'events', 'buffer', 'os',
    // Keep these as external to reduce bundle size
    'fsevents'
  ],
  plugins: [
    resolve({
      preferBuiltins: true
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      outDir: 'dist-rollup'
    }),
    json()
  ]
}; 