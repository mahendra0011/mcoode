#!/usr/bin/env node
// Dev entry: builds the esbuild bundle on demand, then runs it.
// The published npm package ships prebuilt dist/mcode.mjs.
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
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

async function findCompatibleNode() {
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
      await access(candidate);
      return isAbsolute(candidate) ? candidate : join(process.cwd(), candidate);
    } catch {}
  }

  return null;
}

if (needsRespan) {
  const nodeBin = await findCompatibleNode();
  if (nodeBin) {
    const { execa } = await import('execa');
    await execa(nodeBin, ['--experimental-ffi', ...process.argv.slice(1)], {
      stdio: 'inherit',
      env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
    }).catch((err) => { process.exitCode = err.exitCode ?? 1; });
    process.exit(process.exitCode ?? 0);
  } else {
    console.error('mcode: OpenTUI requires Node.js 26.4.0+ with --experimental-ffi.');
    console.error(`Current Node.js: v${process.versions.node} at ${process.execPath}`);
    console.error('Please install Node.js 26.4.0+ from https://nodejs.org/');
    process.exit(1);
  }
}

const here = dirname(fileURLToPath(import.meta.url));
const bundle = join(here, '..', 'dist', 'mcode.mjs');

if (!existsSync(bundle) || process.env.MCCODE_REBUILD === '1') {
  const nodeBin = await findCompatibleNode();
  const { execa } = await import('execa');
  await execa(nodeBin || process.execPath, ['--experimental-ffi', join(here, '..', 'scripts', 'build.js')], {
    stdio: 'inherit',
    env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' }
  });
}

await import(pathToFileURL(bundle).href);
