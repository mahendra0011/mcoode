// Bootstrap — ensures shared runtime dirs and validates the monorepo layout.
// Runs on `npm install` (postinstall). Fails fast with actionable errors.
import { mkdir, access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 1. Runtime needs Node 26.4+ (OpenTUI FFI). Warn early, don't cryptically fail later.
const major = Number(process.versions.node.split('.')[0] || 0);
if (major < 26) {
  console.warn(`[bootstrap] Node ${process.versions.node} detected — mcode CLI needs >= 26.4.0 (see engines). Continuing anyway for backend/web work.`);
}

// 2. Monorepo layout check (workspace packages must exist for `mcode serve` etc.)
for (const p of ['packages/cli', 'packages/backend', 'packages/shared', 'packages/web']) {
  try {
    await access(join(root, p, 'package.json'));
  } catch {
    console.warn(`[bootstrap] missing workspace package: ${p}`);
  }
}

// 3. Install git hooks (.env guard — SEC-001/SEC-002). Best-effort.
try {
  await import('./install-hooks.mjs');
} catch {
  /* installer logs its own warning */
}

// 4. Shared runtime dirs.
await mkdir(join(homedir(), '.mcode'), { recursive: true });
await mkdir(join(homedir(), '.mcode', 'history'), { recursive: true });
await mkdir(join(homedir(), '.mcode', 'projects'), { recursive: true });
await mkdir(join(homedir(), '.mcode', 'watch'), { recursive: true });
console.log('mcode workspace ready');
