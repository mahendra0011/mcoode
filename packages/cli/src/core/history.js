import { readdir, readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { HISTORY_DIR } from './store.js';

export async function saveHistory(entry) {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(HISTORY_DIR, { recursive: true });
  const name = `${new Date(entry.startedAt || Date.now()).toISOString().replace(/[:.]/g, '-')}-${String(entry.id || 'session').replace(/[^a-z0-9-]/gi, '')}.json`;
  await writeFile(join(HISTORY_DIR, name), JSON.stringify(entry, null, 2), 'utf8');
  return name;
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
