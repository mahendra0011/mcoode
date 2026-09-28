import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, access, chmod, rename, stat } from 'node:fs/promises';
import { validateConfig } from './config-schema.js';

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

// MF-007: warn-once-per-process for config problems (silent misbehavior is the
// worst failure class — the old catch-all swallowed everything into `{}`).
let warnedParse = false;
let warnedSchema = false;
/** Last load problem, for `doctor` / `config validate` surfaces. */
let lastConfigError = null;

export function getLastConfigError() {
  return lastConfigError;
}

function warnOnce(kind, msg) {
  if (kind === 'parse' && warnedParse) return;
  if (kind === 'schema' && warnedSchema) return;
  if (kind === 'parse') warnedParse = true;
  if (kind === 'schema') warnedSchema = true;
  console.warn(`[config] ⚠️  ${msg}`);
}

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
  let raw;
  try {
    raw = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  } catch (err) {
    if (err?.code === 'ENOENT') {
      // No config file yet — not an error (first run).
      lastConfigError = null;
      cache = cache || {};
    } else {
      // MF-007: parse errors also keep last-good (never silently empty).
      lastConfigError = { kind: 'parse', message: err.message };
      warnOnce('parse', `config.json is not valid JSON (${err.message}) — keeping last-known-good config. Run \`mcode config validate\` for details.`);
      if (!cache) cache = {};
    }
    cacheLoadedAt = Date.now();
    return cache;
  }
  try {
    cache = validateConfig(raw);
    lastConfigError = null;
    cacheMtimeMs = (await stat(CONFIG_PATH).catch(() => null))?.mtimeMs || 0;
  } catch (err) {
    // MF-007: schema errors keep the last-known-good config instead of
    // silently emptying everything (model pins, budgets, watch settings…).
    lastConfigError = { kind: 'schema', message: err.message };
    warnOnce('schema', `config.json failed schema validation — keeping last-known-good config. Issues: ${err.message}. Run \`mcode config validate\` for details.`);
    if (!cache) cache = {};
  }
  cacheLoadedAt = Date.now();
  return cache;
}

export async function saveConfig(patch = null) {
  // 709: reload-then-merge (no stale-cache clobber) + atomic tmp+rename
  // so concurrent writers can't tear the file or lose each other's keys.
  const base = await loadConfig({ force: true }).catch(() => cache || {});
  const config = patch ? { ...base, ...patch } : cache || {};
  // MF-007: validate-before-write — never persist a schema-invalid config.
  const validated = validateConfig(config);
  cache = validated;
  lastConfigError = null;
  await ensureDirs();
  const tmp = `${CONFIG_PATH}.tmp.${process.pid}`;
  await writeFile(tmp, JSON.stringify(validated, null, 2), 'utf8');
  await rename(tmp, CONFIG_PATH);
  await chmod(CONFIG_PATH, 0o600).catch(() => {});
  try {
    cacheMtimeMs = (await stat(CONFIG_PATH).catch(() => null))?.mtimeMs || 0;
  } catch {
    /* mtime refresh is best-effort */
  }
  cacheLoadedAt = Date.now();
  return validated;
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
