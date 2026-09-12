import { describe, it, expect, vi } from 'vitest';
import { ModelProvider, HttpProvider, sleep } from '../src/provider.js';

describe('ModelProvider', () => {
  it('constructs with sensible defaults', () => {
    const p = new ModelProvider();
    expect(p.id).toBe('modelprovider');
    expect(p.kind).toBe('remote');
    expect(p.available).toBeNull();
  });

  it('accepts custom options', () => {
    const p = new ModelProvider({ id: 'test', displayName: 'Test', kind: 'local' });
    expect(p.id).toBe('test');
    expect(p.displayName).toBe('Test');
    expect(p.kind).toBe('local');
  });

  it('probe() returns true by default', async () => {
    const p = new ModelProvider();
    expect(await p.probe()).toBe(true);
  });

  it('isAvailable() caches the probe result', async () => {
    const p = new ModelProvider();
    const spy = vi.spyOn(p, 'probe');
    expect(await p.isAvailable()).toBe(true);
    expect(await p.isAvailable()).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1); // cached
  });

  it('isAvailable() re-probes after TTL', async () => {
    const p = new ModelProvider({ availableTtlMs: 1 });
    await p.isAvailable();
    await sleep(5);
    const spy = vi.spyOn(p, 'probe');
    await p.isAvailable();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('isAvailable() returns false when probe throws', async () => {
    const p = new ModelProvider();
    p.probe = async () => { throw new Error('fail'); };
    expect(await p.isAvailable()).toBe(false);
  });

  it('listModels() returns empty by default', () => {
    expect(new ModelProvider().listModels()).toEqual([]);
  });

  it('complete() throws by default', async () => {
    const p = new ModelProvider();
    await expect(p.complete('m', {})).rejects.toThrow('complete() not implemented');
  });

  it('stream() yields the complete result', async () => {
    const p = new ModelProvider();
    p.complete = async () => ({ text: 'hello' });
    const chunks = [];
    for await (const c of p.stream('m', {})) chunks.push(c);
    expect(chunks).toEqual(['hello']);
  });

  it('resolveModel() returns the same ref', () => {
    expect(new ModelProvider().resolveModel('gpt-4o')).toBe('gpt-4o');
  });
});

describe('HttpProvider', () => {
  it('constructs with required fields', () => {
    const p = new HttpProvider({
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-test',
      models: [{ id: 'test', name: 'Test' }]
    });
    expect(p.baseUrl).toBe('https://api.example.com');
    expect(p.apiKey).toBe('sk-test');
    expect(p.kind).toBe('remote');
    expect(p.timeoutMs).toBe(60_000);
    expect(p.retries).toBe(2);
  });

  it('listModels() returns configured models', () => {
    const models = [{ id: 'a' }, { id: 'b' }];
    const p = new HttpProvider({ models });
    expect(p.listModels()).toEqual(models);
  });

  it('headers() includes auth and content-type', () => {
    const p = new HttpProvider({ apiKey: 'sk-test' });
    const h = p.headers();
    expect(h['Content-Type']).toBe('application/json');
    expect(h['Authorization']).toBe('Bearer sk-test');
  });

  it('headers() omits auth when no key', () => {
    const p = new HttpProvider({});
    const h = p.headers();
    expect(h['Authorization']).toBeUndefined();
  });

  it('headers() rejects masked placeholder keys', () => {
    const p = new HttpProvider({ apiKey: '••••secret' });
    expect(() => p.headers()).toThrow(/masked placeholder/i);
  });

  it('headers() rejects "existing-key" placeholder', () => {
    const p = new HttpProvider({ apiKey: 'existing-key' });
    expect(() => p.headers()).toThrow(/masked placeholder/i);
  });
});

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    const t0 = Date.now();
    await sleep(20);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(15);
  });
});
