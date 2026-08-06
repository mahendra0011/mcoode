#!/usr/bin/env node
// Dev entry: builds the esbuild bundle on demand, then runs it.
// The published npm package ships prebuilt dist/mcode.mjs.
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// OpenTUI's native renderer requires --experimental-ffi. Shebangs can't pass
// flags reliably (esp. on Windows), so re-spawn once with the flag if missing.
if (!process.execArgv.includes('--experimental-ffi') && !process.env.MCCODE_FFI_RESPAWNED) {
  const { execa } = await import('execa');
  await execa(process.execPath, ['--experimental-ffi', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
  }).catch((err) => { process.exitCode = err.exitCode ?? 1; });
  process.exit(process.exitCode ?? 0);
}

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle) || process.env.MCCODE_REBUILD === '1') {
  const { execa } = await import('execa');
  await execa(process.execPath, ['--experimental-ffi', join(here, '..', 'scripts', 'build.js')], {
    stdio: 'inherit',
    env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
  });
}

await import(pathToFileURL(bundle).href);
