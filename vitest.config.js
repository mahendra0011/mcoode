import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/tests/**/*.test.js'],
    globals: true,
    pool: 'forks',
    coverage: { provider: 'v8', include: ['packages/shared/src/**'] }
  }
});
