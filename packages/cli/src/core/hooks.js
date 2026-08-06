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
    const mod = await import(pathToFileURL(hooksPath).href);
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
    const t0 = Date.now();
    try {
      const result = await this.hooks[name](ctx);
      return { ok: true, result, error: null, ms: Date.now() - t0 };
    } catch (err) {
      return { ok: false, skipped: false, error: err instanceof Error ? err.message : String(err), ms: Date.now() - t0 };
    }
  }
}
