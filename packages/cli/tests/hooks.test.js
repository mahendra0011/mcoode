import { describe, it, expect } from 'vitest';
import { loadHooks, HooksManager, HOOK_POINTS } from '../src/core/hooks.js';

describe('HOOK_POINTS', () => {
  it('defines 7 hook points', () => {
    expect(HOOK_POINTS).toHaveLength(7);
    expect(HOOK_POINTS).toContain('preBuild');
    expect(HOOK_POINTS).toContain('preWave');
    expect(HOOK_POINTS).toContain('postWave');
    expect(HOOK_POINTS).toContain('preAgent');
    expect(HOOK_POINTS).toContain('postAgent');
    expect(HOOK_POINTS).toContain('postTest');
    expect(HOOK_POINTS).toContain('postBuild');
  });

  it('is frozen', () => {
    expect(Object.isFrozen(HOOK_POINTS)).toBe(true);
  });
});

describe('HooksManager', () => {
  it('constructs empty', () => {
    const mgr = new HooksManager({ hooks: {} });
    expect(mgr.has('preBuild')).toBe(false);
    expect(mgr.has('preWave')).toBe(false);
  });

  it('has() returns true for registered hooks', () => {
    const mgr = new HooksManager({
      hooks: { preBuild: async () => {}, postBuild: async () => {} },
    });
    expect(mgr.has('preBuild')).toBe(true);
    expect(mgr.has('postBuild')).toBe(true);
    expect(mgr.has('preWave')).toBe(false);
  });

  it('run() executes a hook and returns timing', async () => {
    const mgr = new HooksManager({
      hooks: { preBuild: async (ctx) => `ran with ${ctx.projectPath}` },
    });
    const res = await mgr.run('preBuild', { projectPath: '/test' });
    expect(res.ok).toBe(true);
    expect(res.result).toBe('ran with /test');
    expect(res.error).toBeNull();
    expect(res.ms).toBeGreaterThanOrEqual(0);
  });

  it('run() catches hook errors', async () => {
    const mgr = new HooksManager({
      hooks: { preBuild: async () => { throw new Error('hook failed'); } },
    });
    const res = await mgr.run('preBuild', {});
    expect(res.ok).toBe(false);
    expect(res.error).toBe('hook failed');
    expect(res.ms).toBeGreaterThanOrEqual(0);
  });

  it('run() returns skipped for unregistered hooks', async () => {
    const mgr = new HooksManager({ hooks: {} });
    const res = await mgr.run('preAgent', {});
    expect(res.ok).toBe(false);
    expect(res.skipped).toBe(true);
  });
});

describe('loadHooks', () => {
  it('returns empty manager when .mcode/hooks.js does not exist', async () => {
    const mgr = await loadHooks('/nonexistent/path');
    expect(mgr).toBeInstanceOf(HooksManager);
    expect(mgr.has('preBuild')).toBe(false);
    expect(mgr.has('postBuild')).toBe(false);
  });
});
