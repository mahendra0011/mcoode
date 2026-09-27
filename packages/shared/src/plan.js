import { SUBAGENT_STATUS } from './events.js';
import { TASK_DOMAINS, resolveDomain } from './domains.js';

/**
 * Plan & todo helpers — normalize a raw plan produced by the planning model
 * into a canonical shape, validate it, and topologically sort todos into
 * dependency "waves" for parallel dispatch.
 */

export function normalizeTodo(raw, index) {
  const id = String(raw.id || `t${index + 1}`).trim();
  const rawDomain = resolveDomain(raw.domain);
  // SHR-004: warn instead of silently remapping unknown domains.
  const domain = TASK_DOMAINS.includes(rawDomain) ? rawDomain : 'backend';
  if (rawDomain && rawDomain !== domain && typeof console !== 'undefined' && console.warn) {
    console.warn(`[plan] Todo ${id} has unknown domain "${raw.domain}" — defaulting to "backend".`);
  }
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
    wave: null,
    startedAt: null,
    finishedAt: null,
    error: null,
    completedFiles: [],
  };
}

export const MAX_TODOS = typeof process !== 'undefined' && process.env?.MCODE_MAX_TODOS
  ? Math.max(1, Number(process.env.MCODE_MAX_TODOS) || 14)
  : 14;

export function normalizePlan(raw, { maxTodos = MAX_TODOS } = {}) {
  let todos = (Array.isArray(raw.todos) ? raw.todos : [])
    .map(normalizeTodo);
  const limit = maxTodos || MAX_TODOS;
  if (todos.length > limit) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[plan] Plan contains ${todos.length} todos, truncating to maximum allowed limit of ${limit}.`);
    }
    todos = todos.slice(0, limit);
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

/** GOD-002: strict schema validation after parsing. Rejects plans with missing
 *  required fields, duplicate ids, or invalid domains/dependencies. */
export function validatePlan(plan) {
  if (!plan || !Array.isArray(plan.todos) || plan.todos.length === 0) {
    return { ok: false, error: 'Plan has no todos' };
  }
  // Note: summary defaults to '' via normalizePlan for minimal/legacy plans —
  // keep it optional here (strictness applies to the todo graph below).
  if (plan.summary !== undefined && typeof plan.summary !== 'string') {
    return { ok: false, error: 'Plan has invalid field: summary (expected string)' };
  }
  const seen = new Set();
  const ids = new Set(plan.todos.map((t) => t?.id));
  for (const [i, todo] of plan.todos.entries()) {
    if (!todo || typeof todo !== 'object') {
      return { ok: false, error: `Todo at index ${i} is not an object` };
    }
    if (typeof todo.id !== 'string' || !todo.id.trim()) {
      return { ok: false, error: `Todo at index ${i} is missing required field: id` };
    }
    if (seen.has(todo.id)) {
      return { ok: false, error: `Duplicate todo id: ${todo.id}` };
    }
    seen.add(todo.id);
    if (typeof todo.title !== 'string' || !todo.title.trim()) {
      return { ok: false, error: `Todo ${todo.id} is missing required field: title` };
    }
    if (!TASK_DOMAINS.includes(todo.domain)) {
      return { ok: false, error: `Todo ${todo.id} has invalid domain "${todo.domain}" (expected one of: ${TASK_DOMAINS.join(', ')})` };
    }
    if (todo.dependsOn !== undefined && !Array.isArray(todo.dependsOn)) {
      return { ok: false, error: `Todo ${todo.id} has invalid dependsOn (expected array)` };
    }
    for (const dep of todo.dependsOn || []) {
      if (dep === todo.id) {
        return { ok: false, error: `Todo ${todo.id} depends on itself` };
      }
      if (!ids.has(dep)) {
        return { ok: false, error: `Todo ${todo.id} depends on unknown id "${dep}"` };
      }
    }
    if (todo.files !== undefined && !Array.isArray(todo.files)) {
      return { ok: false, error: `Todo ${todo.id} has invalid files (expected array)` };
    }
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

/** GOD-008: domain priority for shared-file chains (schema → implementation →
 *  UI → tests). Lower number runs first when two todos touch the same file. */
export const DOMAIN_PRIORITY = Object.freeze({
  db: 0, backend: 1, devops: 2, frontend: 3, test: 4, docs: 5,
  bugfix: 6, planning: 7, reviewer: 8, migration: 9,
});

function domainRank(domain) {
  return DOMAIN_PRIORITY[domain] ?? 99;
}

/** File-conflict safety: if two todos plan to touch the same file, chain them
 *  so subagents never write concurrently to the same path. Ordering respects
 *  DOMAIN_PRIORITY (e.g. db before backend before frontend) instead of raw
 *  array position. Returns the (possibly mutated) plan. */
export function resolveFileConflicts(plan) {
  const byId = new Map(plan.todos.map((t) => [t.id, t]));
  const seen = new Map(); // normalized file -> todo id
  for (const todo of plan.todos) {
    for (const file of todo.files || []) {
      const norm = file.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+/g, '/').toLowerCase();
      const priorId = seen.get(norm);
      if (priorId && priorId !== todo.id) {
        const prior = byId.get(priorId);
        // Higher-priority domain (lower rank) should run first.
        if (prior && domainRank(todo.domain) < domainRank(prior.domain)) {
          // Current todo should go first: prior depends on current.
          if (!prior.dependsOn.includes(todo.id)) {
            const prevDeps = prior.dependsOn;
            prior.dependsOn = [...prior.dependsOn, todo.id];
            if (findCycle(plan)) {
              prior.dependsOn = prevDeps;
            }
          }
        } else if (!todo.dependsOn.includes(priorId)) {
          const prevDeps = todo.dependsOn;
          todo.dependsOn = [...todo.dependsOn, priorId];
          // If chaining creates a cycle, revert it
          if (findCycle(plan)) {
            todo.dependsOn = prevDeps;
          }
        }
      }
      // Track the latest writer, except when we just reversed the edge — keep
      // the lower-priority todo as "last" so a third writer chains after it.
      const holder = byId.get(seen.get(norm));
      if (holder && domainRank(todo.domain) < domainRank(holder.domain)) {
        // current runs before holder; holder stays the tail of the chain
      } else {
        seen.set(norm, todo.id);
      }
    }
  }
  for (const todo of plan.todos) {
    todo.dependsOn = todo.dependsOn.filter((d) => byId.has(d) && d !== todo.id);
  }
  return plan;
}

/** Sort todos into waves: wave[0] = no deps, wave[n] = deps in earlier waves.
 *  SHR-002: a dependency cycle is a hard error (with the offending id),
 *  not a forced parallel wave — the planner rejects cycles up front and
 *  anything reaching here with one is a bug worth surfacing. */
export function planWaves(plan) {
  const done = new Set();
  const waves = [];
  let remaining = plan.todos.slice();
  while (remaining.length > 0) {
    const wave = remaining.filter((t) => t.dependsOn.every((d) => done.has(d)));
    if (wave.length === 0) {
      const offender = findCycle(plan) || remaining[0]?.id || 'unknown';
      throw new Error(`todo dependency cycle detected at ${offender} — fix dependsOn and retry`);
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

/** A todo is blocked if any dependency failed or needs manual review. */
export function isBlocked(todo, statusById) {
  return todo.dependsOn.some((d) => {
    const s = statusById.get(d);
    return s === SUBAGENT_STATUS.FAILED || s === SUBAGENT_STATUS.NEEDS_REVIEW;
  });
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
