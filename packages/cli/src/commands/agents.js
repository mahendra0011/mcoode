import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { json, table, warn } from '../core/logger.js';

export async function agentsCommand({ asJson = false } = {}) {
  const rows = [];
  // 1. Watch daemons (existing behavior).
  const watchDir = join(homedir(), '.mcode', 'watch');
  const watchFiles = await readdir(watchDir).catch(() => []);
  for (const f of watchFiles.filter((x) => x.endsWith('.json'))) {
    try {
      const state = JSON.parse(await readFile(join(watchDir, f), 'utf8'));
      rows.push([state.project || f, state.status, String(state.fixesApplied ?? 0), String(state.pid ?? '-')]);
    } catch {
      /* skip */
    }
  }
  // 2. God-run subagents (mirrored live by SubagentManager into ~/.mcode/agents/).
  const agentsDir = join(homedir(), '.mcode', 'agents');
  const agentFiles = await readdir(agentsDir).catch(() => []);
  for (const f of agentFiles.filter((x) => x.endsWith('.json'))) {
    try {
      const state = JSON.parse(await readFile(join(agentsDir, f), 'utf8'));
      if (state.kind !== 'god') continue;
      // Drop snapshots older than 2h (stale runs) — but a MISSING
      // timestamp means "unknown age", not "stale": keep it (688).
      if (state.updatedAt) {
        const age = Date.now() - new Date(state.updatedAt).getTime();
        if (Number.isFinite(age) && age > 2 * 3600 * 1000) continue;
      }
      rows.push([
        `${state.project || f} (god ${state.done ?? 0}/${state.total ?? 0})`,
        state.status,
        String(state.done ?? 0),
        String(state.pid ?? '-'),
      ]);
    } catch {
      /* skip */
    }
  }
  if (asJson) return json(rows);
  if (rows.length === 0) {
    warn('no daemons running — no live subagents outside an active session');
    return;
  }
  table(rows, { columns: ['PROJECT', 'STATUS', 'DONE/FIXES', 'PID'] });
}
