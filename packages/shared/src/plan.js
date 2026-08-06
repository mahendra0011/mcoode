import { SUBAGENT_STATUS } from './events.js';

/**
 * Plan & todo helpers — normalize a raw plan produced by the planning model
 * into a canonical shape, validate it, and topologically sort todos into
 * dependency "waves" for parallel dispatch.
 */

export function normalizeTodo(raw, index) {
  const id = String(raw.id || `t${index + 1}`).trim();
  const domain = ['frontend', 'backend', 'db', 'devops', 'test', 'docs']
    .includes(raw.domain) ? raw.domain : 'backend';
  const dependsOn = Array.isArray(raw.dependsOn)
    ? raw.dependsOn.map(String)
    : [];
  const files = Array.isArray(raw.files)
    ? raw.files.map(String).filter(Boolean).map((f) => f.replace(/\\/g, '/'))
    : [];
  return {
    id,
    title: String(raw.title || `Todo ${id}`),
    description: String(raw.description || ''),
    domain,
    dependsOn,
    files,
    status: SUBAGENT_STATUS.PENDING,
    assignedModel: null,
    startedAt: null,
    finishedAt: null,
    error: null
  };
}

export const MAX_TODOS = 14;

export function normalizePlan(raw) {
  let todos = (Array.isArray(raw.todos) ? raw.todos : [])
    .map(normalizeTodo);
  if (todos.length > MAX_TODOS) {
    todos = todos.slice(0, MAX_TODOS);
  }
  const ids = new Set(todos.map((t) => t.id));
  for (const todo of todos) {
    todo.dependsOn = todo.dependsOn.filter((d) => ids.has(d) && d !== todo.id);
  }
  return {
    summary: String(raw.summary || raw.prompt || ''),
    prompt: String(raw.prompt || ''),
    todos
  };
}

export function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.todos) || plan.todos.length === 0) {
    return { ok: false, error: 'Plan has no todos' };
  }
  return { ok: true, error: null };
}

/** Detect cycles in the todo dependency graph. Returns offending id or null. */
export function findCycle(plan) {
  const state = new Map();
  const byId = new Map(plan.todos.map((t) => [t.id, t]));
  const visit = (id, path) => {
    const st = state.get(id) || 0;
    if (st === 2) return null;
    if (st === 1) return path[path.indexOf(id)];
    state.set(id, 1);
    for (const dep of byId.get(id)?.dependsOn || []) {
      const cycle = visit(dep, [...path, dep]);
      if (cycle) return cycle;
    }
    state.set(id, 2);
    return null;
  };
  for (const todo of plan.todos) {
    const cycle = visit(todo.id, [todo.id]);
    if (cycle) return cycle;
  }
  return null;
}

/** File-conflict safety: if two todos plan to touch the same file, chain them
 *  (later todo depends on earlier one) so subagents never write concurrently
 *  to the same path. Returns the (possibly mutated) plan. */
export function resolveFileConflicts(plan) {
  const byId = new Map(plan.todos.map((t) => [t.id, t]));
  const seen = new Map(); // normalized file -> todo id
  for (const todo of plan.todos) {
    for (const file of todo.files || []) {
      const norm = file.replace(/^\.?\//, '').replace(/\/+/g, '/');
      const prior = seen.get(norm);
      if (prior && prior !== todo.id && !todo.dependsOn.includes(prior)) {
        todo.dependsOn = [...todo.dependsOn, prior];
      }
      seen.set(norm, todo.id);
    }
  }
  for (const todo of plan.todos) {
    todo.dependsOn = todo.dependsOn.filter((d) => byId.has(d) && d !== todo.id);
  }
  return plan;
}

/** Sort todos into waves: wave[0] = no deps, wave[n] = deps in earlier waves. */
export function planWaves(plan) {
  const done = new Set();
  const waves = [];
  let remaining = plan.todos.slice();
  while (remaining.length > 0) {
    const wave = remaining.filter((t) => t.dependsOn.every((d) => done.has(d)));
    if (wave.length === 0) {
      // cycle guard — push remaining as final wave
      waves.push(remaining);
      break;
    }
    waves.push(wave);
    for (const t of wave) done.add(t.id);
    remaining = remaining.filter((t) => !done.has(t.id));
  }
  return waves;
}

/** A todo is eligible once all its dependencies are DONE. */
export function isEligible(todo, statusById) {
  return todo.dependsOn.every((d) => statusById.get(d) === SUBAGENT_STATUS.DONE);
}

/** Merge multiple per-todo results into a final summary object. */
export function mergeResults(plan, results) {
  const byId = new Map(results.map((r) => [r.todoId, r]));
  return {
    summary: plan.summary,
    total: plan.todos.length,
    done: plan.todos.filter((t) => byId.get(t.id)?.status === SUBAGENT_STATUS.DONE).length,
    failed: plan.todos.filter((t) => byId.get(t.id)?.status === SUBAGENT_STATUS.FAILED).length,
    needsReview: plan.todos.filter((t) => byId.get(t.id)?.status === SUBAGENT_STATUS.NEEDS_REVIEW).length,
    todos: plan.todos.map((t) => ({
      id: t.id,
      title: t.title,
      domain: t.domain,
      status: byId.get(t.id)?.status || t.status,
      model: byId.get(t.id)?.model || t.assignedModel
    }))
  };
}
