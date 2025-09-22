import path from 'path';
import { defineConfig } from 'vite';
import prettierMax from 'prettier-max';

export default defineConfig({
  plugins: [prettierMax()],
  resolve: {
    alias: {
      // Directly reference library source files during development
      'mark-deco': path.resolve(__dirname, '../mark-deco/src/index.ts'),
      // Node.js modules polyfills (remove buffer as it will be handled by define)
      stream: 'stream-browserify',
      util: 'util',
      events: 'events',
      path: 'path-browserify',
      url: 'url',
      querystring: 'querystring-es3',
    },
  },
  optimizeDeps: {
    // Exclude library source files from pre-bundling
    exclude: ['mark-deco'],
    // Include Node.js-specific modules in dependencies for pre-bundling
    // Remove buffer from here as it will be provided via define
    include: [
      'js-yaml',
      'js-beautify',
      'rehype-stringify',
      'remark-gfm',
      'remark-parse',
      'remark-rehype',
      'unified',
      'unist-util-visit',
      'stream-browserify',
      'util',
      'events',
      'path-browserify',
      'url',
      'querystring-es3',
    ],
  },
  define: {
    global: 'globalThis',
    // Provide Buffer polyfill directly
    'globalThis.Buffer': 'globalThis.Buffer',
    // Node.js environment variables for browser compatibility
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
  server: {
    // Do not specify port number here as it will be specified with --port option when starting from package.json scripts.
    // npm run dev is for manual operation verification, npm run test:playwright is for e2e test server.
    open: true,
    host: true,
    watch: {
      // Include parent directory src in watch targets
      ignored: ['!**/src/**'],
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      external: (id: string) => {
        // Only exclude crypto modules, allow all other Node.js polyfills
        if (id === 'crypto' || id === 'node:crypto') {
          return true; // Mark as external to prevent bundling
        }
        return false;
      },
    },
  },
});
