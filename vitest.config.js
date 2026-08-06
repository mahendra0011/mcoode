import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    root: rootDir,
    environment: 'node',
    include: ['packages/**/tests/**/*.test.js'],
    globals: true,
    pool: 'forks',
    coverage: { provider: 'v8', include: ['packages/shared/src/**'] }
  }
});
