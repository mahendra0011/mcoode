#!/usr/bin/env node
// Published entry — runs the prebuilt esbuild bundle (dist/mcode.mjs).
// FFI/node resolution lives in ./node-resolve.mjs (shared with bin/mcode.js).
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { respanForFfiIfNeeded, binDir } from './node-resolve.mjs';

respanForFfiIfNeeded(import.meta.url);

const here = binDir(import.meta.url);
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle)) {
  console.error('mcode: dist/mcode.mjs not found — run `npm run build:cli` first.');
  process.exit(1);
}

await import(pathToFileURL(bundle).href);
