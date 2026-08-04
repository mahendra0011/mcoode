export * from './events.js';
export * from './domains.js';
export * from './plan.js';
export * from './provider.js';
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
    entry.tpm.push(inputTokens + outputTokens);
  }

  _trim(key, providerId) {
    const entry = this.providers.get(providerId);
    if (!entry) return 0;
    const cutoff = Date.now() - this.windowMs;
    const arr = entry[key];
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
          { calls: e.rpm.length }
        ])
      )
    };
    await writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

/** Rough token estimation (used for rate-limit tracking when providers don't
 *  report usage). ~4 chars per token is a fine approximation for code. */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
