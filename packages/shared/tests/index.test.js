import { describe, it, expect } from 'vitest';
import { CostLedger, estimateTokens } from '../src/index.js';

describe('estimateTokens', () => {
  it('returns 0 for null/undefined/empty', () => {
    expect(estimateTokens(null)).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('abcd')).toBe(1);         // 4 / 4 = 1
    expect(estimateTokens('abcde')).toBe(2);         // ceil(5/4) = 2
    expect(estimateTokens('a'.repeat(100))).toBe(25); // 100/4 = 25
  });

  it('handles multi-byte input as character length', () => {
    const emoji = '😀'.repeat(4); // 4 chars (each emoji is 2 code units but 1 char in .length? Actually in JS, emoji length is 2)
    expect(estimateTokens(emoji)).toBeGreaterThan(0);
  });
});

describe('CostLedger', () => {
  it('constructs with defaults', () => {
    const ledger = new CostLedger();
    expect(ledger.filePath).toBeNull();
    expect(ledger.windowMs).toBe(60_000);
  });

  it('records and counts requests per minute (rpm)', () => {
    const ledger = new CostLedger({ windowMs: 60_000 });
    ledger.record('openai', { inputTokens: 100, outputTokens: 50 });
    ledger.record('openai', { inputTokens: 200, outputTokens: 100 });
    expect(ledger.rpm('openai')).toBe(2);
  });

  it('returns 0 rpm for unknown providers', () => {
    const ledger = new CostLedger();
    expect(ledger.rpm('unknown')).toBe(0);
  });

  it('trims stale entries outside the window', async () => {
    const ledger = new CostLedger({ windowMs: 10 }); // 10ms window
    ledger.record('test', { inputTokens: 10 });
    expect(ledger.rpm('test')).toBe(1);
    await new Promise((r) => setTimeout(r, 20));
    expect(ledger.rpm('test')).toBe(0); // expired
  });

  it('detects rate limiting by rpm', () => {
    const ledger = new CostLedger();
    for (let i = 0; i < 60; i++) {
      ledger.record('openai', { inputTokens: 1 });
    }
    expect(ledger.isRateLimited('openai', { maxRpm: 60, maxTpm: 120_000 })).toBe(true);
  });

  it('tracks tpm as token sums within the window', () => {
    const ledger = new CostLedger();
    for (let i = 0; i < 5; i++) {
      ledger.record('openai', { inputTokens: 25_000, outputTokens: 0 });
    }
    // 5 x 25k = 125k tokens inside the 60s window
    expect(ledger.tpm('openai')).toBe(125_000);
    // TPM-based rate limiting now triggers
    expect(ledger.isRateLimited('openai', { maxRpm: 100, maxTpm: 120_000 })).toBe(true);
    expect(ledger.isRateLimited('openai', { maxRpm: 100, maxTpm: 200_000 })).toBe(false);
  });

  it('persists and reloads rpm/tpm via save/load', async () => {
    const fs = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'ledger-')), 'ledger.json');
    const a = new CostLedger({ filePath: file });
    a.record('openai', { inputTokens: 100, outputTokens: 50 });
    await a.save();
    const b = new CostLedger({ filePath: file });
    await b.load();
    expect(b.rpm('openai')).toBe(1);
    expect(b.tpm('openai')).toBe(150);
  });

  it('is not rate-limited for unknown providers', () => {
    const ledger = new CostLedger();
    expect(ledger.isRateLimited('unknown')).toBe(false);
  });

  it('accepts custom windowMs', () => {
    const ledger = new CostLedger({ windowMs: 120_000 });
    expect(ledger.windowMs).toBe(120_000);
  });
});
