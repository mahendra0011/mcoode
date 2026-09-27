import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Hook types executed at key lifecycle points during a build. */
export const HOOK_POINTS = Object.freeze([
  'preBuild',      // before planning
  'preWave',       // before each wave of todos
  'postWave',      // after each wave completes
  'preAgent',      // before a subagent is dispatched for a todo
  'postAgent',     // after a subagent finishes (any status)
  'postTest',      // after integration tests
  'postBuild'      // after the full build + bugfix loop
]);

/** Load hooks from a user-defined `.mcode/hooks.js` file.
 *  The file should export functions named after HOOK_POINTS, e.g.:
 *
 *    export async function preBuild({ plan, projectPath }) { ... }
 *    export async function postBuild({ results, elapsedSecs, cost }) { ... }
 *
 *  Returns a HooksManager instance (which may have zero hooks loaded). */
export async function loadHooks(projectPath) {
  const hooksPath = join(projectPath, '.mcode', 'hooks.js');
  try {
    // 719: cache-bust by mtime — ESM imports are cached permanently, so
    // without this, hook edits never take effect until process restart.
    const { stat } = await import('node:fs/promises');
    const mtime = (await stat(hooksPath).catch(() => null))?.mtimeMs || 0;
    const mod = await import(`${pathToFileURL(hooksPath).href}?t=${mtime}`);
    const hooks = {};
    for (const name of HOOK_POINTS) {
      if (typeof mod[name] === 'function') hooks[name] = mod[name];
    }
    return new HooksManager({ hooks, projectPath, hooksPath });
  } catch {
    return new HooksManager({ hooks: {}, projectPath, hooksPath });
  }
}

export class HooksManager {
  /** @param {{ hooks?: Record<string, Function>, projectPath?: string, hooksPath?: string }} [opts] */
  constructor({ hooks = {}, projectPath, hooksPath } = {}) {
    this.hooks = hooks;
    this.projectPath = projectPath;
    this.hooksPath = hooksPath;
  }

  has(name) {
    return typeof this.hooks[name] === 'function';
  }

  /** Execute a hook by name. Returns { ok, result, error, ms }. */
  async run(name, ctx = {}) {
    if (!this.has(name)) {
      return { ok: false, skipped: true, error: null, ms: 0 };
    }
    // 720: hooks get 30s — a hanging user hook must fail loudly instead of
    // freezing the whole build forever.
    const HOOK_TIMEOUT_MS = 30_000;
    const t0 = Date.now();
    try {
      const result = await Promise.race([
        this.hooks[name](ctx),
        new Promise((_, reject) => setTimeout(() => reject(new Error(`hook '${name}' timed out after ${HOOK_TIMEOUT_MS / 1000}s`)), HOOK_TIMEOUT_MS)),
      ]);
      return { ok: true, result, error: null, ms: Date.now() - t0 };
    } catch (err) {
      return { ok: false, skipped: false, error: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 };
    }
  }
}
