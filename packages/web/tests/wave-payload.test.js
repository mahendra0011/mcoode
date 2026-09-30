/**
 * God-mode wave payload contract (audit WEB-033).
 *
 * The wire payload produced by `SubagentManager` (packages/cli/src/core/
 * subagent-manager.js) is:
 *
 *   wave:start    → { wave, totalWaves, todos: [{ id, domain, title }] }
 *   wave:complete → { wave, totalWaves, todos: [{ id, domain, title, status }] }
 *
 * There is **no** `total`, no `subagentIds` and no `completed` field. The store
 * used to read exactly those, so every wave row rendered “Wave N · 0/0” at 0%
 * for the entire build. These tests pin the reducer to the real payload so the
 * regression cannot come back undetected.
 */
import { describe, it, expect } from 'vitest';
import chatReducer, { initialState } from '../src/store/chatSlice';
import { setWaveStart, setWaveComplete } from '../src/store/chatSlice';

const fresh = () => structuredClone(initialState);

/** Exactly what the CLI puts on the wire at WAVE_START. */
const wireWaveStart = (wave = 1, todos = [
  { id: 't1', domain: 'backend', title: 'Set up server' },
  { id: 't2', domain: 'frontend', title: 'Build UI' },
  { id: 't3', domain: 'test', title: 'Write tests' },
]) => ({ wave, totalWaves: 4, todos });

/** Exactly what the CLI puts on the wire at WAVE_COMPLETE. */
const wireWaveComplete = (wave = 1, todos = [
  { id: 't1', domain: 'backend', title: 'Set up server', status: 'done' },
  { id: 't2', domain: 'frontend', title: 'Build UI', status: 'done' },
  { id: 't3', domain: 'test', title: 'Write tests', status: 'needs_review' },
]) => ({ wave, totalWaves: 4, todos });

describe('wave reducers vs the real CLI payload (WEB-033)', () => {
  it('derives `total` and `subagentIds` from the wire todo list', () => {
    const state = chatReducer(fresh(), setWaveStart(wireWaveStart()));
    expect(state.waves).toHaveLength(1);
    const w = state.waves[0];
    expect(w.wave).toBe(1);
    expect(w.total).toBe(3); // was 0 before the fix
    expect(w.completed).toBe(0);
    expect(w.status).toBe('running');
    expect(w.subagentIds).toEqual(['t1', 't2', 't3']); // was undefined before the fix
  });

  it('counts completed todos at wave:complete instead of freezing at 0', () => {
    let state = chatReducer(fresh(), setWaveStart(wireWaveStart()));
    state = chatReducer(state, setWaveComplete(wireWaveComplete()));
    const w = state.waves[0];
    expect(w.status).toBe('complete');
    expect(w.total).toBe(3);
    expect(w.completed).toBe(2); // 2 done + 1 needs_review
    // The progress bar reads completed/total — must be 67%, not 0%.
    expect(Math.round((w.completed / w.total) * 100)).toBe(67);
  });

  it('still honours an explicit total/subagentIds if a producer adds them', () => {
    const state = chatReducer(
      fresh(),
      setWaveStart({ wave: 2, totalWaves: 2, total: 9, subagentIds: ['x'], todos: [{ id: 'x' }] })
    );
    expect(state.waves[0].total).toBe(9);
    expect(state.waves[0].subagentIds).toEqual(['x']);
  });

  it('replaces a duplicate wave row instead of stacking a second one', () => {
    let state = chatReducer(fresh(), setWaveStart(wireWaveStart(1)));
    state = chatReducer(state, setWaveComplete(wireWaveComplete(1)));
    state = chatReducer(fresh(), setWaveStart(wireWaveStart(1))); // same wave again
    expect(state.waves).toHaveLength(1);
    expect(state.waves[0].status).toBe('running');
  });

  it('keeps waves sorted by arrival order for the dashboard', () => {
    let state = chatReducer(fresh(), setWaveStart(wireWaveStart(1)));
    state = chatReducer(state, setWaveComplete(wireWaveComplete(1)));
    state = chatReducer(state, setWaveStart(wireWaveStart(2, [{ id: 't4', domain: 'docs', title: 'README' }])));
    expect(state.waves.map((w) => w.wave)).toEqual([1, 2]);
    expect(state.waves[1].total).toBe(1);
  });

  it('reads projectTier/concurrency when a producer supplies them (still optional)', () => {
    const state = chatReducer(
      fresh(),
      setWaveStart({ ...wireWaveStart(), projectTier: 'large', concurrency: 5 })
    );
    expect(state.projectTier).toBe('large');
    expect(state.concurrency).toBe(5);
  });

  it('tolerates a malformed payload without crashing', () => {
    const state = chatReducer(fresh(), setWaveStart({}));
    expect(state.waves).toHaveLength(1);
    expect(state.waves[0].total).toBe(0);
    expect(state.waves[0].subagentIds).toEqual([]);
  });
});
