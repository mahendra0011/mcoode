/** @mcode/shared — typed contracts for CLI, backend and web (SHR-005).
 *  Canonical imports: EVENTS/SOCKET/EVENT_TO_SOCKET (events.js), TASK_DOMAINS/
 *  DEFAULT_ROUTING (domains.js), plan DAG (plan.js), provider base + JSDoc
 *  typedefs (provider.js), CostLedger/estimateTokens (below), plugins
 *  (plugins.js). Prefer these over raw string literals (SHR-001). */
export * from './events.js';
export * from './domains.js';
export * from './plan.js';
export * from './provider.js';
export * from './plugins.js';
export { DEFAULT_CONFIG, DEFAULT_ROUTING } from './domains.js';

/** In-memory + file-backed usage ledger: tracks RPM/TPM per provider,
 *  used by the router to avoid rate-limit failures. */
export class CostLedger {
  constructor({ filePath = null, windowMs = 60_000 } = {}) {
    this.filePath = filePath;
    this.windowMs = windowMs;
    this.providers = new Map(); // providerId -> { rpm: number[], tpm: number[] }
    this.modes = new Map(); // 880: mode -> { tokens, cost, runs } (accounting only)
  }

  record(providerId, { inputTokens = 0, outputTokens = 0, mode = null, cost = 0 } = {}) {
    const now = Date.now();
    let entry = this.providers.get(providerId);
    if (!entry) {
      entry = { rpm: [], tpm: [] };
      this.providers.set(providerId, entry);
    }
    entry.rpm.push(now);
    entry.tpm.push({ t: now, n: inputTokens + outputTokens });
    // 880: per-mode budget attribution — separate from (never affecting)
    // the provider-keyed rate-limit windows above.
    if (mode) {
      const m = this.modes.get(mode) || { tokens: 0, cost: 0, runs: 0 };
      m.tokens += inputTokens + outputTokens;
      m.cost += cost;
      m.runs += 1;
      this.modes.set(mode, m);
    }
  }

  /** Spend report grouped by mode: { [mode]: { tokens, cost, runs } }. */
  spendByMode() {
    return Object.fromEntries(this.modes);
  }

  _trim(key, providerId) {
    const entry = this.providers.get(providerId);
    if (!entry) return 0;
    const cutoff = Date.now() - this.windowMs;
    const arr = entry[key];
    if (key === 'tpm') {
      let idx = 0;
      while (idx < arr.length && arr[idx].t < cutoff) idx++;
      if (idx > 0) arr.splice(0, idx);
      return arr.reduce((sum, e) => sum + e.n, 0);
    }
    let idx = 0;
    while (idx < arr.length && arr[idx] < cutoff) idx++;
    if (idx > 0) arr.splice(0, idx);
    return arr.length;
  }

  rpm(providerId) {
    return this._trim('rpm', providerId);
  }

  tpm(providerId) {
    return this._trim('tpm', providerId);
  }

  isRateLimited(providerId, { maxRpm = 60, maxTpm = 120_000 } = {}) {
    return this.rpm(providerId) >= maxRpm || this.tpm(providerId) >= maxTpm;
  }

  async save() {
    if (!this.filePath) return;
    // PERF-19-22: atomic tmp+rename — a mid-write crash must never leave a
    // torn ledger behind.
    const { mkdir, writeFile, rename } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(this.filePath), { recursive: true });
    const data = {
      providers: Object.fromEntries(
        [...this.providers.entries()].map(([id, e]) => [
          id,
          { rpm: e.rpm, tpm: e.tpm }
        ])
      ),
      modes: Object.fromEntries(this.modes),
    };
    const tmp = `${this.filePath}.tmp.${process.pid}`;
    await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await rename(tmp, this.filePath);
  }

  async load() {
    if (!this.filePath) return;
    try {
      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      // Back-compat: old files saved {calls:n} — treat as timestamps now
      for (const [id, e] of Object.entries(data.providers || {})) {
        const now = Date.now();
        const rpm = Array.isArray(e.rpm) ? e.rpm.filter((t) => typeof t === 'number') : [];
        const tpm = Array.isArray(e.tpm)
          ? e.tpm.filter((x) => x && typeof x.t === 'number' && typeof x.n === 'number')
          : [];
        if (!rpm.length && typeof e.calls === 'number' && e.calls > 0) {
          for (let i = 0; i < e.calls; i++) rpm.push(now);
        }
        this.providers.set(id, { rpm, tpm });
        this._trim('rpm', id);
        this._trim('tpm', id);
      }
      for (const [mode, m] of Object.entries(data.modes || {})) {
        if (m && typeof m.tokens === 'number') this.modes.set(mode, m);
      }
    } catch {
      /* missing/corrupt file — start empty */
    }
  }
}

/** Rough USD-per-1M-token fallback rates (MF-002). Only used when a model has
 *  no catalog pricing (`costPer1kIn/Out`); provider catalogs are preferred. */
export const COST_RATES = {
  openai: { in: 0.15, out: 0.6 },
  anthropic: { in: 3, out: 15 },
  google: { in: 0.5, out: 1.5 },
  github: { in: 0.1, out: 0.4 },
  deepseek: { in: 0.27, out: 1.1 },
  default: { in: 1, out: 3 }
};

/**
 * MF-002: estimate the USD cost of one provider call.
 *
 * Catalog pricing wins (providers ship `costPer1kIn`/`costPer1kOut` per 1K
 * tokens); otherwise the provider's fallback rate (per 1M tokens) applies.
 * Kept in @mcode/shared so the CLI summary, the ledger attribution and the
 * `history`/`doctor` reports all compute money the same way.
 *
 * @param {{ costPer1kIn?: number, costPer1kOut?: number, provider?: string, id?: string }|string|null} model
 * @param {{ inputTokens?: number, outputTokens?: number }|null} usage
 * @param {{ rates?: Record<string, { in: number, out: number }> }} [opts]
 * @returns {number} USD (0 when there is no usage)
 */
export function estimateCallCost(model = null, usage = null, { rates = COST_RATES } = {}) {
  const input = Number(usage?.inputTokens) || 0;
  const output = Number(usage?.outputTokens) || 0;
  if (input <= 0 && output <= 0) return 0;
  const inPer1k = Number(model?.costPer1kIn);
  const outPer1k = Number(model?.costPer1kOut);
  if (Number.isFinite(inPer1k) && Number.isFinite(outPer1k)) {
    return (input / 1000) * inPer1k + (output / 1000) * outPer1k;
  }
  const ref = typeof model === 'string' ? model : String(model?.ref || model?.id || '');
  const provider = String(model?.provider?.id || model?.provider || ref.split(':')[0] || 'default');
  const rate = rates[provider] || rates.default;
  return (input / 1e6) * rate.in + (output / 1e6) * rate.out;
}

/** Rough token estimation — fallback only (subagents prefer provider-reported
 *  `usage` when the API returns it). ~4 chars/token holds for English prose
 *  and code, but CJK/emoji run ~1-3 tokens per char, so non-ASCII is counted
 *  at ~1 token/char instead of being underestimated 2-4x (RTR-004). */
export function estimateTokens(text) {
  if (!text) return 0;
  const str = String(text);
  let ascii = 0;
  let nonAscii = 0;
  for (const ch of str) {
    if (ch.codePointAt(0) < 128) ascii++;
    else nonAscii++;
  }
  return Math.ceil(ascii / 4) + nonAscii;
}
