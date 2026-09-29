import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // DEBT-004: no @vitejs/plugin-react — vite's built-in esbuild handles
  // TS/TSX transforms; the stale plugin broke config load outright.
  plugins: [],
  test: {
    root: rootDir,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    css: false,
  },
});
