#!/usr/bin/env node
// Published entry — runs the prebuilt esbuild bundle (dist/mcode.mjs).
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle)) {
  console.error('mcode: dist/mcode.mjs not found — run `npm run build:cli` first.');
  process.exit(1);
}

await import(pathToFileURL(bundle).href);
