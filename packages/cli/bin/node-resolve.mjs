#!/usr/bin/env node
// CLI-008: single shared entry prelude for bin/mcode.js (dev, builds the
// bundle on demand) and bin/mcode.mjs (published, runs prebuilt dist).
// Both entries previously carried their own copy of this logic (async+execa
// vs sync+spawnSync) and had already diverged — one source of truth now.
//
// OpenTUI's native renderer requires --experimental-ffi (Node.js 26.1+).
// Shebangs can't pass flags reliably (esp. on Windows), so re-spawn once with
// the flag if missing. If the current Node.js is too old, search for a
// compatible binary at common locations before giving up.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

export function isCliSubcommand(argv = process.argv.slice(2)) {
  return argv.some((arg) => !arg.startsWith('-') || arg === '--help' || arg === '-h');
}

export function needsFfiRespan() {
  return (
    !isCliSubcommand() &&
    process.argv.length <= 2 &&
    !process.execArgv.includes('--experimental-ffi') &&
    !process.env.MCCODE_FFI_RESPAWNED
  );
}

export function majorVersion() {
  const [major] = process.versions.node.split('.').map(Number);
  return major;
}

export function findCompatibleNodeSync() {
  // Explicit override wins
  if (process.env.MCCODE_NODE) return process.env.MCCODE_NODE;

  // Current binary already supports --experimental-ffi (Node 26.1+)
  if (majorVersion() >= 26) return process.execPath;

  // A different node on PATH (nvm/fnm/volta shims, manual installs) may be newer
  try {
    const res = spawnSync('node', ['-e', 'process.stdout.write(process.execPath + " " + process.versions.node)'], {
      timeout: 5000,
      encoding: 'utf8',
    });
    const [p, v] = String(res.stdout || '').trim().split(/\s+/);
    if (p && p !== process.execPath && Number(String(v).split('.')[0]) >= 26) return p;
  } catch {
    /* no PATH node beyond the current one */
  }

  // Generic search locations — machine-specific install paths don't belong here.
  // Each candidate is probed and must actually support --experimental-ffi.
  // POSIX layouts first on non-Windows (never probe `.exe` there); the loop
  // below accepts any Node >= 26, so pinned versions can't rot.
  const isWin = process.platform === 'win32';
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = isWin
    ? [
        // nvm-windows-style
        join(process.env.LOCALAPPDATA || home, 'nvm', 'versions', 'node', 'v26.4.0', 'node.exe'),
        // fnm/volta-style
        join(home, '.volta', 'bin', 'node.exe'),
        // standard installer location
        'C:/Program Files/nodejs/node.exe',
      ]
    : [
        join(home, '.nvm', 'versions', 'node', 'v26.4.0', 'bin', 'node'),
        join(home, '.volta', 'bin', 'node'),
        join(home, '.fnm', 'versions', '26.4.0', 'bin', 'node'),
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node',
      ];

  try {
    const nvmDir = join(process.env.LOCALAPPDATA || home, 'nvm', 'versions', 'node');
    if (existsSync(nvmDir)) {
      for (const ent of readdirSync(nvmDir)) {
        if (/^v?2[6-9]/.test(ent)) candidates.unshift(join(nvmDir, ent, isWin ? 'node.exe' : 'bin/node'));
      }
    }
  } catch {
    /* no nvm dir — fall through to static candidates */
  }

  // Machine-specific hint stored outside the repo (~/.mcode/node-path)
  try {
    const hint = readFileSync(join(homedir(), '.mcode', 'node-path'), 'utf8').trim();
    if (hint) candidates.unshift(hint);
  } catch {
    /* no hint file — fine */
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    let abs;
    try {
      if (!existsSync(candidate)) continue;
      abs = isAbsolute(candidate) ? candidate : join(process.cwd(), candidate);
    } catch {
      continue;
    }
    try {
      const ver = spawnSync(abs, ['--version'], { timeout: 5000, encoding: 'utf8' });
      const [major] = String(ver.stdout || '').trim().replace('v', '').split('.');
      if (Number(major) >= 26) return abs;
    } catch {
      /* candidate unusable — try the next */
    }
  }

  return null;
}

/** Re-spawn the given entry under a compatible node with --experimental-ffi,
 *  then exit with the child's status. No-op return when no respawn is needed. */
export function respanForFfiIfNeeded(entryUrl) {
  if (!needsFfiRespan()) return false;
  const nodeBin = findCompatibleNodeSync();
  if (nodeBin) {
    const res = spawnSync(nodeBin, ['--experimental-ffi', fileURLToPath(entryUrl), ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, MCCODE_FFI_RESPAWNED: '1' },
    });
    process.exit(res.status ?? 0);
  } else {
    console.error('mcode: OpenTUI requires Node.js 26.4.0+ with --experimental-ffi.');
    console.error(`Current Node.js: v${process.versions.node} at ${process.execPath}`);
    console.error('Please install Node.js 26.4.0+ from https://nodejs.org/');
    process.exit(1);
  }
  return true;
}

export function binDir(entryUrl) {
  return dirname(fileURLToPath(entryUrl));
}
