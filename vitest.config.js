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
    // The 5s default is too tight for the filesystem-heavy suites
    // (init templates, session checkpoints, key-encryption migration) once the
    // whole monorepo runs in parallel — they timed out at 5.1–5.4s under load
    // while passing in 0.3–0.4s in isolation. 30s keeps real hangs visible.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['packages/shared/src/**', 'packages/backend/src/**', 'packages/cli/src/**/*.js'],
    }
  }
});
