import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { HISTORY_DIR } from './store.js';

const MAX_HISTORY_FILES = 100;

export async function saveHistory(entry) {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(HISTORY_DIR, { recursive: true });
  const name = `${new Date(entry.startedAt || Date.now()).toISOString().replace(/[:.]/g, '-')}-${String(entry.id || 'session').replace(/[^a-z0-9-]/gi, '')}.json`;
  await writeFile(join(HISTORY_DIR, name), JSON.stringify(entry, null, 2), 'utf8');
  await pruneHistory();
  return name;
}

/** Keep history bounded — delete the oldest session files over the cap. */
export async function pruneHistory(maxFiles = MAX_HISTORY_FILES) {
  try {
    const files = (await readdir(HISTORY_DIR)).filter((f) => f.endsWith('.json')).sort();
    const overflow = files.length - maxFiles;
    for (const file of files.slice(0, Math.max(0, overflow))) {
      await unlink(join(HISTORY_DIR, file)).catch(() => {});
    }
  } catch {
    /* best-effort */
  }
}

export async function listHistory() {
  await mkdir(HISTORY_DIR, { recursive: true });
  const files = await readdir(HISTORY_DIR);
  const entries = [];
  for (const file of files.filter((f) => f.endsWith('.json')).sort().reverse()) {
    try {
      const entry = JSON.parse(await readFile(join(HISTORY_DIR, file), 'utf8'));
      entry._file = file;
      entries.push(entry);
    } catch {
      /* skip corrupt history files */
    }
  }
  return entries;
}

export async function clearHistory() {
  await mkdir(HISTORY_DIR, { recursive: true });
  for (const file of await readdir(HISTORY_DIR)) {
    if (file.endsWith('.json')) await unlink(join(HISTORY_DIR, file)).catch(() => {});
  }
}
