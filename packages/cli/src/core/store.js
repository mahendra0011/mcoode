import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, access, chmod, rename, stat } from 'node:fs/promises';

const HOME = homedir();
export const MCCODE_DIR = join(HOME, '.mcode');
export const CONFIG_PATH = join(MCCODE_DIR, 'config.json');
export const VAULT_PATH = join(MCCODE_DIR, 'vault.json.enc');
export const HISTORY_DIR = join(MCCODE_DIR, 'history');
export const PROJECTS_DIR = join(MCCODE_DIR, 'projects');
export const WATCH_DIR = join(MCCODE_DIR, 'watch');

let cache = null;
let cacheLoadedAt = 0;
let cacheMtimeMs = 0;
const CONFIG_TTL_MS = 3_000;

export async function ensureDirs() {
  await Promise.all([
    mkdir(MCCODE_DIR, { recursive: true }),
    mkdir(HISTORY_DIR, { recursive: true }),
    mkdir(PROJECTS_DIR, { recursive: true }),
    mkdir(WATCH_DIR, { recursive: true })
  ]);
}

export async function loadConfig({ force = false } = {}) {
  // 708: mtime check defeats cross-process staleness — another terminal
  // writing config.json invalidates this process's cache immediately.
  if (cache && !force && Date.now() - cacheLoadedAt < CONFIG_TTL_MS) {
    try {
      const st = await stat(CONFIG_PATH).catch(() => null);
      if (st && st.mtimeMs === cacheMtimeMs) return cache;
    } catch {
      return cache;
    }
  }
  await ensureDirs();
  try {
    cache = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
    cacheMtimeMs = (await stat(CONFIG_PATH).catch(() => null))?.mtimeMs || 0;
  } catch {
    cache = {};
  }
  cacheLoadedAt = Date.now();
  return cache;
}

export async function saveConfig(patch = null) {
  // 709: reload-then-merge (no stale-cache clobber) + atomic tmp+rename
  // so concurrent writers can't tear the file or lose each other's keys.
  const base = await loadConfig({ force: true }).catch(() => cache || {});
  const config = patch ? { ...base, ...patch } : cache || {};
  cache = config;
  await ensureDirs();
  const tmp = `${CONFIG_PATH}.tmp.${process.pid}`;
  await writeFile(tmp, JSON.stringify(config, null, 2), 'utf8');
  await rename(tmp, CONFIG_PATH);
  await chmod(CONFIG_PATH, 0o600).catch(() => {});
  try {
    cacheMtimeMs = (await stat(CONFIG_PATH).catch(() => null))?.mtimeMs || 0;
  } catch {
    /* mtime refresh is best-effort */
  }
  cacheLoadedAt = Date.now();
  return config;
}

export async function getProjectId(projectPath) {
  const { createHash } = await import('node:crypto');
  // 710: on Windows (case-insensitive FS) normalize casing/separators so
  // D:\Projects\Mcode and d:\projects\mcode hash identically. POSIX keeps
  // the legacy hash (case-sensitive there — no re-keying of existing state).
  let norm = String(projectPath || '').replace(/\\/g, '/');
  if (process.platform === 'win32') norm = norm.toLowerCase();
  return createHash('sha1').update(norm).digest('hex').slice(0, 12);
}

export async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
