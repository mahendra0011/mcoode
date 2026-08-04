import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';

const HOME = homedir();
export const MCCODE_DIR = join(HOME, '.mcode');
export const CONFIG_PATH = join(MCCODE_DIR, 'config.json');
export const VAULT_PATH = join(MCCODE_DIR, 'vault.json.enc');
export const HISTORY_DIR = join(MCCODE_DIR, 'history');
export const PROJECTS_DIR = join(MCCODE_DIR, 'projects');
export const WATCH_DIR = join(MCCODE_DIR, 'watch');

let cache = null;

export async function ensureDirs() {
  await Promise.all([
    mkdir(MCCODE_DIR, { recursive: true }),
    mkdir(HISTORY_DIR, { recursive: true }),
    mkdir(PROJECTS_DIR, { recursive: true }),
    mkdir(WATCH_DIR, { recursive: true })
  ]);
}

export async function loadConfig() {
  if (cache) return cache;
  await ensureDirs();
  try {
    cache = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  } catch {
    cache = {};
  }
  return cache;
}

export async function saveConfig(patch = null) {
  const config = patch ? { ...(await loadConfig()), ...patch } : cache || {};
  cache = config;
  await ensureDirs();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

export async function getProjectId(projectPath) {
  const { createHash } = await import('node:crypto');
  return createHash('sha1').update(projectPath).digest('hex').slice(0, 12);
}

export async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
