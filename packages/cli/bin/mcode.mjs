#!/usr/bin/env node
// Published entry — runs the prebuilt esbuild bundle (dist/mcode.mjs).
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';

// OpenTUI's native renderer requires --experimental-ffi (Node.js 26.1+).
// Shebangs can't pass flags reliably (esp. on Windows), so re-spawn once with
// the flag if missing. If the current Node.js is too old, search for a
// compatible binary at common locations before giving up.
const needsRespan = !process.execArgv.includes('--experimental-ffi') && !process.env.MCCODE_FFI_RESPAWNED;

function majorVersion() {
  const [major] = process.versions.node.split('.').map(Number);
  return major;
}

function findCompatibleNodeSync() {
  // Current binary already supports --experimental-ffi (Node 26.1+)
  if (majorVersion() >= 26) return process.execPath;

  // Search common locations for a newer Node.js binary
  const candidates = [
    // nvm-windows-style
    join(process.env.LOCALAPPDATA || process.env.HOME || '', 'nvm', 'versions', 'node', `v26.4.0`, 'node.exe'),
    // Manual installs
    'D:/programs/node26/node.exe',
    'D:/programs/nodejs26/node.exe',
    'C:/Program Files/nodejs26/node.exe',
    // fnm/volta-style
    join(process.env.HOME || '', '.volta', 'bin', 'node.exe'),
    join(process.env.HOME || '', '.fnm', 'versions', '26.4.0', 'node.exe'),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (existsSync(candidate)) {
        return isAbsolute(candidate) ? candidate : join(process.cwd(), candidate);
      }
    } catch {}
  }

  return null;
}

if (needsRespan) {
  const nodeBin = findCompatibleNodeSync();
  if (nodeBin) {
    const res = spawnSync(nodeBin, ['--experimental-ffi', fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
    });
    process.exit(res.status ?? 0);
  } else {
    console.error('mcode: OpenTUI requires Node.js 26.4.0+ with --experimental-ffi.');
    console.error(`Current Node.js: v${process.versions.node} at ${process.execPath}`);
    console.error('Please install Node.js 26.4.0+ from https://nodejs.org/');
    process.exit(1);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle)) {
  console.error('mcode: dist/mcode.mjs not found — run `npm run build:cli` first.');
  process.exit(1);
}

await import(pathToFileURL(bundle).href);
