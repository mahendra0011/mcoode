import { listHistory, clearHistory } from '../core/history.js';
import { table, ok, json } from '../core/logger.js';

export async function historyCommand({ asJson = false, clear = false } = {}) {
  if (clear) {
    await clearHistory();
    ok('history cleared');
    return;
  }
  const entries = await listHistory();
  if (asJson) return json(entries);
  if (entries.length === 0) {
    ok('no sessions yet');
    return;
  }
  table(entries.map((e) => [
    e._file,
    e.mode || 'manual',
    e.projectName || '-',
    e.status || 'completed',
    new Date(e.startedAt || Date.now()).toISOString().slice(0, 19).replace('T', ' ')
  ]), {
    columns: ['FILE', 'MODE', 'PROJECT', 'STATUS', 'STARTED']
  });
}
