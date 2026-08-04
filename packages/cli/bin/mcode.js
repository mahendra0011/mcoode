#!/usr/bin/env node
// Dev entry: builds the esbuild bundle on demand, then runs it.
// The published npm package ships prebuilt dist/mcode.mjs.
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle) || process.env.MCCODE_REBUILD === '1') {
  const { execa } = await import('execa');
  await execa(process.execPath, [join(here, '..', 'scripts', 'build.js')], { stdio: 'inherit' });
}

await import(pathToFileURL(bundle).href);
