import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { json, table, warn } from '../core/logger.js';

export async function agentsCommand({ asJson = false } = {}) {
  const dir = join(homedir(), '.mcode', 'watch');
  const files = await readdir(dir).catch(() => []);
  const rows = [];
  for (const f of files.filter((x) => x.endsWith('.json'))) {
    try {
      const state = JSON.parse(await readFile(join(dir, f), 'utf8'));
      rows.push([state.project || f, state.status, String(state.fixesApplied ?? 0), String(state.pid ?? '-')]);
    } catch {
      /* skip */
    }
  }
  if (rows.length === 0) {
    warn('no daemons running — no live subagents outside an active session');
    return;
  }
  if (asJson) return json(rows);
  table(rows, { columns: ['PROJECT', 'STATUS', 'FIXES', 'PID'] });
}
