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
  }

  record(providerId, { inputTokens = 0, outputTokens = 0 } = {}) {
    const now = Date.now();
    let entry = this.providers.get(providerId);
    if (!entry) {
      entry = { rpm: [], tpm: [] };
      this.providers.set(providerId, entry);
    }
    entry.rpm.push(now);
    entry.tpm.push({ t: now, n: inputTokens + outputTokens });
  }

  _trim(key, providerId) {
    const entry = this.providers.get(providerId);
    if (!entry) return 0;
    const cutoff = Date.now() - this.windowMs;
    const arr = entry[key];
    if (key === 'tpm') {
      while (arr.length && arr[0].t < cutoff) arr.shift();
      return arr.reduce((sum, e) => sum + e.n, 0);
    }
    while (arr.length && arr[0] < cutoff) arr.shift();
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
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { dirname } = await import('node:path');
    await mkdir(dirname(this.filePath), { recursive: true });
    const data = {
      providers: Object.fromEntries(
        [...this.providers.entries()].map(([id, e]) => [
          id,
          { rpm: e.rpm, tpm: e.tpm }
        ])
      )
    };
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
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
    } catch {
      /* missing/corrupt file — start empty */
    }
  }
}

/** Rough token estimation (used for rate-limit tracking when providers don't
 *  report usage). ~4 chars per token is a fine approximation for code. */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
