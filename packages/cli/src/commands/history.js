import { listHistory, clearHistory } from '../core/history.js';
import { table, ok, json } from '../core/logger.js';

export async function historyCommand({ asJson = false, clear = false, limit = 50 } = {}) {
  if (clear) {
    await clearHistory();
    ok('history cleared');
    return;
  }
  // CMD-009: cap output — thousands of entries used to flood the terminal.
  const all = await listHistory();
  const entries = all.slice(-Math.max(1, Number(limit) || 50));
  if (asJson) return json(entries);
  if (entries.length === 0) {
    ok('no sessions yet');
    return;
  }
  table(entries.map((e) => {
    let dateStr = '-';
    try {
      const d = new Date(e.startedAt || Date.now());
      if (!isNaN(d.getTime())) {
        dateStr = d.toISOString().slice(0, 19).replace('T', ' ');
      }
    } catch {}
    return [
      e._file,
      e.mode || 'manual',
      e.projectName || '-',
      e.status || 'completed',
      dateStr
    ];
  }), {
    columns: ['FILE', 'MODE', 'PROJECT', 'STATUS', 'STARTED']
  });
}
