import { defineConfig } from 'vite';
import prettierMax from 'prettier-max';

export default defineConfig({
  plugins: [prettierMax()],
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
      external: ['mark-deco'],
    },
  },
});
