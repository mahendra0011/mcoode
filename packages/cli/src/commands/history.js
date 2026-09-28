import { listHistory, clearHistory, readSpendLedger } from '../core/history.js';
import { table, ok, json, info } from '../core/logger.js';

export async function historyCommand({ asJson = false, clear = false, limit = 50, cost = false } = {}) {
  if (clear) {
    await clearHistory();
    ok('history cleared');
    return;
  }
  // MF-002: `--cost` prints the lifetime per-mode spend rollup straight from
  // the ledger (~/.mcode/ledger.json) instead of the session table.
  if (cost) {
    const spend = await readSpendLedger();
    if (asJson) return json(spend);
    if (Object.keys(spend.byMode).length === 0) {
      ok('no recorded spend yet — run a god build first');
      return spend;
    }
    table(
      Object.entries(spend.byMode)
        .sort((a, b) => (b[1].cost || 0) - (a[1].cost || 0))
        .map(([mode, m]) => [
          mode,
          `$${(Number(m.cost) || 0).toFixed(4)}`,
          String(Number(m.tokens) || 0),
          String(Number(m.runs) || 0)
        ]),
      { columns: ['MODE', 'COST', 'TOKENS', 'CALLS'] }
    );
    info(`total: $${spend.totalUsd.toFixed(2)} · ${spend.tokens.toLocaleString()} tokens · ${spend.runs} calls`);
    return spend;
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
      const raw = e.startedAt;
      if (raw == null || raw === '') throw new Error('missing startedAt');
      const d = new Date(raw);
      if (isNaN(d.getTime())) throw new Error('invalid date');
      dateStr = d.toISOString().slice(0, 19).replace('T', ' ');
    } catch {}
    // MF-002: cost/tokens columns — the saved summary already carries them
    // (god/ship runs); manual/watch entries without usage show '-'.
    const r = (e.results && typeof e.results === 'object') ? e.results : null;
    const tIn = Number(r?.tokensIn ?? e.tokensIn) || 0;
    const tOut = Number(r?.tokensOut ?? e.tokensOut) || 0;
    const tokensStr = tIn || tOut ? `${tIn}/${tOut}` : '-';
    const spend = Number(r?.spendUsd ?? e.spendUsd);
    const cost = Number.isFinite(spend) && spend > 0
      ? spend
      : Number(r?.cost ?? e.cost);
    const costStr = Number.isFinite(cost) && cost > 0 ? `$${cost.toFixed(2)}` : '-';
    return [
      e._file,
      e.mode || 'manual',
      e.projectName || '-',
      e.status || 'completed',
      tokensStr,
      costStr,
      dateStr
    ];
  }), {
    columns: ['FILE', 'MODE', 'PROJECT', 'STATUS', 'TOKENS', 'COST', 'STARTED']
  });
}
