#!/usr/bin/env node
// Published entry — runs the prebuilt esbuild bundle (dist/mcode.mjs).
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// OpenTUI's native renderer requires --experimental-ffi. Shebangs can't pass
// flags reliably (esp. on Windows), so re-spawn once with the flag if missing.
if (!process.execArgv.includes('--experimental-ffi') && !process.env.MCCODE_FFI_RESPAWNED) {
  const res = spawnSync(process.execPath, ['--experimental-ffi', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
  });
  process.exit(res.status ?? 0);
}

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle)) {
  console.error('mcode: dist/mcode.mjs not found — run `npm run build:cli` first.');
  process.exit(1);
}

await import(pathToFileURL(bundle).href);
