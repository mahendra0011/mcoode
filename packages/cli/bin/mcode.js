#!/usr/bin/env node
// Dev entry: builds the esbuild bundle on demand, then runs it.
// The published npm package ships prebuilt dist/mcode.mjs.
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { respanForFfiIfNeeded, binDir, findCompatibleNodeSync } from './node-resolve.mjs';

// CLI-008: FFI/node resolution is shared with bin/mcode.mjs via
// ./node-resolve.mjs (single source of truth — the copies had diverged).
respanForFfiIfNeeded(import.meta.url);

const here = binDir(import.meta.url);
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle) || process.env.MCCODE_REBUILD === '1') {
  const nodeBin = findCompatibleNodeSync();
  const { execa } = await import('execa');
  const args = [join(here, '..', 'scripts', 'build.js')];
  if (nodeBin) args.unshift('--experimental-ffi');
  await execa(nodeBin || process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
  });
}

await import(pathToFileURL(bundle).href);
