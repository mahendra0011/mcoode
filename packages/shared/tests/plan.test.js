import { describe, it, expect } from 'vitest';
import { SUBAGENT_STATUS } from '../src/events.js';
import {
  normalizeTodo,
  normalizePlan,
  validatePlan,
  findCycle,
  planWaves,
  isEligible,
  mergeResults
} from '../src/plan.js';

describe('normalizeTodo', () => {
  it('fills defaults and assigns ids', () => {
    const t = normalizeTodo({ title: 'x' }, 2);
    expect(t).toMatchObject({
      id: 't3',
      title: 'x',
      domain: 'backend',
      dependsOn: [],
      status: 'pending',
      assignedModel: null
    });
  });

  it('keeps explicit fields and drops self/unknown deps in normalizePlan', () => {
    const plan = normalizePlan({
      todos: [{ id: 'custom', title: 'y', domain: 'backend', dependsOn: ['custom', 'ghost', 't2'] }, { title: 'z' }]
    });
    expect(plan.todos[0].id).toBe('custom');
    expect(plan.todos[0].domain).toBe('backend');
    expect(plan.todos[0].dependsOn).toEqual(['t2']);
  });
});

describe('validatePlan', () => {
  it('accepts a minimal valid plan', () => {
    expect(validatePlan(normalizePlan({ todos: [{ title: 'a' }] }))).toEqual({ ok: true, error: null });
  });

  it('rejects empty plans', () => {
    const res = validatePlan(normalizePlan({ todos: [] }));
    expect(res.ok).toBe(false);
  });
});

describe('findCycle', () => {
  it('detects a dependency loop and returns the offending id', () => {
    const plan = normalizePlan({ todos: [
      { id: 'a', title: '1', dependsOn: ['c'] },
      { id: 'b', title: '2', dependsOn: ['a'] },
      { id: 'c', title: '3', dependsOn: ['b'] }
    ] });
    expect(['a', 'b', 'c']).toContain(findCycle(plan));
  });

  it('returns null for a DAG', () => {
    const plan = normalizePlan({ todos: [
      { id: 'a', title: '1' },
      { id: 'b', title: '2', dependsOn: ['a'] }
    ] });
    expect(findCycle(plan)).toBeNull();
  });
});

describe('planWaves', () => {
  it('groups by dependency depth', () => {
    const plan = normalizePlan({ todos: [
      { id: 'a', title: '1' },
      { id: 'b', title: '2' },
      { id: 'c', title: '3', dependsOn: ['a'] },
      { id: 'd', title: '4', dependsOn: ['c', 'b'] }
    ] });
    const waves = planWaves(plan);
    expect(waves.map((w) => w.map((t) => t.id).sort())).toEqual([['a', 'b'], ['c'], ['d']]);
  });

  it('never deadlocks on cycles (cycle guard)', () => {
    const plan = normalizePlan({ todos: [
      { id: 'a', title: '1', dependsOn: ['b'] },
      { id: 'b', title: '2', dependsOn: ['a'] }
    ] });
    expect(planWaves(plan).length).toBe(1);
  });
});

describe('isEligible', () => {
  it('blocks until all deps are DONE', () => {
    const status = new Map([['a', 'done'], ['b', 'todo']]);
    expect(isEligible({ id: 'c', dependsOn: ['a', 'b'] }, status)).toBe(false);
    expect(isEligible({ id: 'c', dependsOn: ['a'] }, status)).toBe(true);
  });

  it('treats missing dep statuses as not satisfied', () => {
    expect(isEligible({ id: 'c', dependsOn: ['zz'] }, new Map())).toBe(false);
  });
});

describe('mergeResults', () => {
  it('applies statuses and keeps done/failed counts', () => {
    const plan = normalizePlan({ todos: [{ title: 'a' }, { title: 'b' }] });
    const out = mergeResults(plan, [
      { todoId: 't1', status: SUBAGENT_STATUS.DONE, model: 'mock:mock' },
      { todoId: 't2', status: SUBAGENT_STATUS.FAILED }
    ]);
    expect(out.total).toBe(2);
    expect(out.done).toBe(1);
    expect(out.failed).toBe(1);
    expect(out.todos.find((t) => t.id === 't1')).toMatchObject({ status: 'done', model: 'mock:mock' });
    expect(out.todos.find((t) => t.id === 't2').status).toBe('failed');
  });
});
