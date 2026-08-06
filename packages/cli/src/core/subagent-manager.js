import { EventEmitter } from 'node:events';
import { SUBAGENT_STATUS, EVENTS, planWaves, isEligible, resolveFileConflicts, mergeResults, estimateTokens } from '@mcode/shared';
import { Subagent } from './subagent.js';
import { UndoStack } from './tools.js';
import { join } from 'node:path';
import { getProjectId } from './store.js';
import { saveHistory } from './history.js';
import { CostLedger } from '@mcode/shared';
import { loadHooks } from './hooks.js';

/** Rough USD/M-token rates used only for the summary "est. cost" line. */
const RATES = {
  openai: { in: 0.15, out: 0.6 },
  anthropic: { in: 3, out: 15 },
  google: { in: 0.5, out: 1.5 },
  github: { in: 0.1, out: 0.4 },
  deepseek: { in: 0.27, out: 1.1 },
  default: { in: 1, out: 3 }
};

/**
 * Subagent Manager — owns the todo DAG, dispatches one subagent per todo,
 * runs ready todos concurrently up to a cap, merges results, and pushes
 * every event onto the shared bus (terminal UI + Socket.IO bridge subscribe).
 */
export class SubagentManager {
  constructor({ plan, router, projectPath, config = {}, bus = null, options = {} }) {
    this.plan = resolveFileConflicts(plan);
    this.router = router;
    this.projectPath = projectPath;
    this.config = config;
    this.bus = bus || new EventEmitter();
    this.options = options;
    this.concurrency = Math.max(1, Number(config.concurrency || options.maxAgents || 5));
    this.subagents = new Map();
    this.results = new Map();
    this.ledger = options.ledger || new CostLedger();
    this.undoStack = options.undoStack || new UndoStack();
    this.running = 0;
    this.queue = [];
    this._stopped = false;
    this._retries = new Map();
    this._fixers = new Set(); // in-flight bugfix subagents
    this.skipIntegrationTests = Boolean(options.skipIntegrationTests);
    this._t0 = Date.now();
    this._tokens = { in: 0, out: 0 };
    this._models = new Map(); // domain -> Map(model -> { provider, count })
    this.hooks = null; // loaded lazily in runAll()
  }

  get activeSubagents() {
    return [...this.subagents.values()].filter(
      (s) => s.status === SUBAGENT_STATUS.RUNNING || s.status === SUBAGENT_STATUS.PENDING
    );
  }

  async initUndo() {
    const projectId = await getProjectId(this.projectPath);
    this.undoStack.filePath = this.undoStack.filePath || join(
      (await import('node:os')).homedir(),
      '.mcode', 'projects', projectId, 'undo.json'
    );
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(this.undoStack.filePath, '..'), { recursive: true });
  }

  statusById() {
    const map = new Map();
    for (const [id, sub] of this.subagents) map.set(id, sub.status);
    return map;
  }

  _schedule() {
    if (this._stopped) return;
    while (this.running < this.concurrency && this.queue.length > 0) {
      const todo = this.queue.shift();
      this._spawn(todo);
    }
  }

  _spawn(todo) {
    this.running++;
    this.emit(EVENTS.SUBAGENT_CREATED, { todoId: todo.id, title: todo.title, domain: todo.domain });

    // preAgent hook: fires right before a subagent is dispatched
    const hookCtx = { todoId: todo.id, domain: todo.domain, title: todo.title };
    const preP = this.hooks?.has('preAgent')
      ? this.hooks.run('preAgent', hookCtx).then((res) =>
          this.emit(EVENTS.HOOK_EXECUTED, { hook: 'preAgent', todoId: todo.id, ok: !res.error, error: res.error || null, ms: res.ms })
        )
      : Promise.resolve();

    preP.then(() => this._dispatch(todo)).then(() => {
      // postAgent hook: fires after a subagent finishes
      if (this.hooks?.has('postAgent')) {
        return this.hooks.run('postAgent', hookCtx).then((res) =>
          this.emit(EVENTS.HOOK_EXECUTED, { hook: 'postAgent', todoId: todo.id, ok: !res.error, error: res.error || null, ms: res.ms })
        );
      }
    }).finally(() => {
      this.running--;
      this._schedule();
    });
  }

  async _dispatch(todo) {
    let assignment = null;
    const excluded = this._retries.get(todo.id) || [];
    try {
      if (this.options.forceRef) {
        assignment = await this.router.find(this.options.forceRef);
        if (!assignment) throw new Error(`forced model "${this.options.forceRef}" is not available`);
      } else {
        assignment = await this.router.pick(todo.domain, { exclude: excluded });
      }
      if (!assignment) {
        throw new Error(`no model available for domain "${todo.domain}" (all rate-limited or missing)`);
      }
      const sub = new Subagent({
        todo: { ...todo, maxTurns: this.config.maxTurnsPerSubagent },
        assignment: {
          ...assignment,
          ledger: (res) => this.ledger.record(assignment.provider.id, {
            inputTokens: res?.usage?.inputTokens || 0,
            outputTokens: res?.usage?.outputTokens || 0
          })
        },
        projectPath: this.projectPath,
        bus: this.bus,
        undoStack: this.undoStack,
        config: this.config,
        reasoning: this.router?.reasoning || null,
        onEvent: () => {}
      });
      this.subagents.set(todo.id, sub);
      todo.assignedModel = assignment.ref;
      const result = await sub.run();
      this.results.set(todo.id, { todoId: todo.id, ...result });
      this._tokens.in += sub.tokens?.in || 0;
      this._tokens.out += sub.tokens?.out || 0;
      const providerId = String(assignment.provider.id || 'default');
      const byModel = this._models.get(todo.domain) || new Map();
      const entry = byModel.get(assignment.ref) || { provider: providerId, count: 0 };
      entry.count++;
      byModel.set(assignment.ref, entry);
      this._models.set(todo.domain, byModel);
      return result;
    } catch (err) {
      const retries = this._retries.get(todo.id) || [];
      if (retries.length < 2 && assignment?.ref) {
        retries.push(assignment.ref);
        this._retries.set(todo.id, retries);
        this.emit(EVENTS.TOAST, { kind: 'warn', text: `retrying ${todo.id} with fallback model (${err.message})` });
        await this._dispatch(todo);
      } else {
        const result = { status: 'failed', error: err.message };
        this.results.set(todo.id, { todoId: todo.id, ...result });
        this.emit(EVENTS.SUBAGENT_FAILED, { todoId: todo.id, error: err.message, retryCount: retries.length });
      }
    }
  }

  emit(event, payload) {
    this.bus?.emit(event, payload);
  }

  /** Run the whole DAG to completion. Resolves with merged results. */
  async runAll() {
    await this.initUndo();
    this._t0 = Date.now();

    // Load user-defined hooks from .mcode/hooks.js
    this.hooks = await loadHooks(this.projectPath);

    // preBuild hook: fires before any planning/dispatch
    if (this.hooks.has('preBuild')) {
      const res = await this.hooks.run('preBuild', {
        projectPath: this.projectPath,
        plan: this.plan,
      });
      if (res.error) {
        this.emit(EVENTS.HOOK_EXECUTED, { hook: 'preBuild', ok: false, error: res.error, ms: res.ms });
      } else {
        this.emit(EVENTS.HOOK_EXECUTED, { hook: 'preBuild', ok: true, ms: res.ms });
      }
    }

    const waves = planWaves(this.plan);
    const statusById = () => {
      const map = new Map();
      for (const [id, result] of this.results) {
        map.set(id, result.status);
      }
      return map;
    };

      const allWaves = waves;
      for (const [idx, wave] of allWaves.entries()) {
      if (this._stopped) break;
      wave.forEach((todo) => {
        todo.wave = idx + 1;
      });
      // preWave hook
      if (this.hooks?.has('preWave')) {
        const res = await this.hooks.run('preWave', {
          wave: idx + 1,
          totalWaves: allWaves.length,
          todos: wave,
          projectPath: this.projectPath,
        });
        this.emit(EVENTS.HOOK_EXECUTED, {
          hook: 'preWave', wave: idx + 1, ok: !res.error, error: res.error || null, ms: res.ms,
        });
      }

      this.emit(EVENTS.WAVE_START, {
        wave: idx + 1,
        totalWaves: allWaves.length,
        todos: wave.map((t) => ({ id: t.id, domain: t.domain, title: t.title }))
      });
      const ready = wave.filter((todo) => isEligible(todo, statusById()));
      this.queue.push(...ready);
      this._schedule();
      while (this.running > 0 || this.queue.length > 0) {
        if (this._stopped) break;
        await sleep(100);
      }
      this.emit(EVENTS.WAVE_COMPLETE, {
        wave: idx + 1,
        totalWaves: allWaves.length,
        todos: wave.map((t) => ({
          id: t.id,
          domain: t.domain,
          title: t.title,
          status: this.results.get(t.id)?.status || 'pending'
        }))
      });

      // postWave hook
      if (this.hooks?.has('postWave')) {
        const res = await this.hooks.run('postWave', {
          wave: idx + 1,
          totalWaves: allWaves.length,
          results: wave.map((t) => ({ id: t.id, domain: t.domain, status: this.results.get(t.id)?.status || 'pending' })),
          projectPath: this.projectPath,
        });
        this.emit(EVENTS.HOOK_EXECUTED, {
          hook: 'postWave', wave: idx + 1, ok: !res.error, error: res.error || null, ms: res.ms,
        });
      }
    }

    let integration = { ran: false };
    const needsReviewCount = [...this.results.values()].filter(
      (r) => r.status === SUBAGENT_STATUS.NEEDS_REVIEW || r.status === SUBAGENT_STATUS.FAILED
    ).length;
    if (!this.skipIntegrationTests) {
      integration = await this._integrationPass();
    }
    // Bugfix rounds also run when todos ended up needs_review without breaking
    // tests (e.g. a model never wrote its files) — otherwise the work is lost.
    if (!this._stopped && needsReviewCount > 0) {
      integration = await this._bugfixRounds({
        initialExitCode: integration?.exitCode,
        initialTail: integration?.tail
      });
    } else if (integration?.status === 'failed' && !this._stopped) {
      integration = await this._bugfixRounds({
        initialExitCode: integration.exitCode,
        initialTail: integration.tail
      });
    }
    const merged = mergeResults(this.plan, [...this.results.values()]);
    this._emitBuildComplete(merged, integration);

    // postBuild hook: fires after everything is done
    if (this.hooks?.has('postBuild')) {
      const res = await this.hooks.run('postBuild', {
        results: merged,
        integration,
        projectPath: this.projectPath,
        cost: merged.cost || 0,
        elapsedSecs: Math.floor((Date.now() - this._t0) / 1000),
      });
      this.emit(EVENTS.HOOK_EXECUTED, {
        hook: 'postBuild', ok: !res.error, error: res.error || null, ms: res.ms,
      });
    }

    // Rollback on critical failure: if >50% of todos failed, offer rollback
    const failRate = merged.total > 0 ? merged.failed / merged.total : 0;
    if (failRate > 0.5 && !this._stopped && this.undoStack) {
      const pending = this.undoStack.pending();
      if (pending > 0) {
        this.emit(EVENTS.TOAST, {
          kind: 'err',
          text: `\u2717 ${Math.round(failRate * 100)}% of todos failed (${pending} files pending undo) — run /undo to rollback`,
        });
      }
    }

    return merged;
  }

  /** Run the project's test script (when defined) as the integration pass.
   *  Failures are reported but do not fail the build. Returns outcome. */
  async _integrationPass() {
    const { readFile } = await import('node:fs/promises');
    const pkg = await readFile(join(this.projectPath, 'package.json'), 'utf8').catch(() => null);
    let testScript = null;
    if (pkg) {
      try { testScript = JSON.parse(pkg).scripts?.test || null; } catch { testScript = null; }
    }
    if (!testScript) {
      this.emit(EVENTS.INTEGRATION_PASS, { ran: false, reason: 'no test script' });
      return { ran: false, reason: 'no test script' };
    }
    this.emit(EVENTS.INTEGRATION_PASS, { ran: true, status: 'running', script: testScript });
    const { execa } = await import('execa');
    try {
      const res = await execa('npm', ['test', '--silent'], {
        cwd: this.projectPath,
        timeout: 300_000,
        reject: false
      });
      const outcome = res.exitCode === 0 ? 'passed' : 'failed';
      const tail = (res.stdout || '').split('\n').slice(-6).join('\n');
      this.emit(EVENTS.INTEGRATION_PASS, {
        ran: true,
        status: outcome,
        exitCode: res.exitCode,
        tail
      });
      if (outcome === 'failed') {
        this.emit(EVENTS.TOAST, { kind: 'warn', text: `integration tests failed (exit ${res.exitCode}) — attempting auto-fix rounds` });
      }
      return { ran: true, status: outcome, exitCode: res.exitCode, tail };
    } catch (err) {
      this.emit(EVENTS.INTEGRATION_PASS, { ran: true, status: 'error', error: err.message });
      return { ran: true, status: 'error', error: err.message };
    }
  }

  /** Integrator/review step: when integration tests fail, dispatch one
   *  bugfix subagent per failed todo and re-run tests, up to 3 rounds.
   *  Round 1 consumes the failure already recorded by _integrationPass
   *  (no duplicate test run); verification runs happen from round 2. */
  async _bugfixRounds({ initialExitCode = null, initialTail = '' }) {
    const { execa } = await import('execa');
    const rounds = Math.max(1, Number(this.config.bugfixRounds || 3));
    let outcome = { ran: true, status: 'failed', rounds: 0 };
    let exitCode = initialExitCode;
    let tail = initialTail;

    for (let round = 1; round <= rounds; round++) {
      if (this._stopped) break;
      if (round > 1) {
        this.emit(EVENTS.INTEGRATION_PASS, { ran: true, status: 'running', script: 'npm test', round });
        const res = await execa('npm', ['test', '--silent'], {
          cwd: this.projectPath,
          timeout: 300_000,
          reject: false
        });
        exitCode = res.exitCode;
        tail = (res.stdout || '').split('\n').slice(-6).join('\n');
        this.emit(EVENTS.INTEGRATION_PASS, { ran: true, status: exitCode === 0 ? 'passed' : 'failed', exitCode, tail, round });
        if (exitCode === 0) {
          outcome = { ran: true, status: 'passed', rounds: round };
          break;
        }
      }

      const broken = this.plan.todos.filter((t) => {
        const r = this.results.get(t.id);
        return !r || r.status === SUBAGENT_STATUS.FAILED || r.status === SUBAGENT_STATUS.NEEDS_REVIEW;
      });
      if (broken.length === 0) {
        const why = exitCode === null || exitCode === undefined
          ? 'no failing todo to auto-fix'
          : `integration tests still failing (exit ${exitCode}) — no todo to auto-fix`;
        this.emit(EVENTS.TOAST, { kind: 'warn', text: why });
        outcome = { ran: true, status: 'failed', rounds: round };
        break;
      }

      this.emit(EVENTS.TOAST, {
        kind: 'warn',
        text: `bugfix round ${round}/${rounds} — ${broken.length} todo(s) need fixing`
      });
      const tasks = broken.map((todo) => this._dispatchBugfix(todo, tail));
      await Promise.all(tasks);
      outcome = { ran: true, status: 'failed', rounds: round };
    }
    return outcome;
  }

  /** Dispatch a short bugfix subagent for a broken todo using the last test
   *  failure tail as context. Successful fixes are recorded as done. */
  async _dispatchBugfix(todo, testTail) {
    const assignment = (await this.router?.pick('bugfix')) || (await this.router?.pick(todo.domain));
    if (!assignment) {
      this.emit(EVENTS.TOAST, { kind: 'warn', text: `no model available to fix ${todo.id}` });
      return;
    }
    const sub = new Subagent({
      todo: {
        ...todo,
        id: `${todo.id}-fix`,
        title: `Fix failing tests (${todo.id})`,
        description: `Integration tests are failing after todo ${todo.id}.\nLatest test output tail:\n${testTail || ''}`,
        maxTurns: 8
      },
      assignment: {
        ...assignment,
        ledger: (res) => this.ledger.record(assignment.provider.id, {
          inputTokens: res?.usage?.inputTokens || 0,
          outputTokens: res?.usage?.outputTokens || 0
        })
      },
      projectPath: this.projectPath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: this.config,
      reasoning: this.router?.reasoning || null,
      onEvent: () => {}
    });
    const result = await sub.run();
    this._fixers.add(sub);
    this._tokens.in += sub.tokens?.in || 0;
    this._tokens.out += sub.tokens?.out || 0;
    if (result.status === SUBAGENT_STATUS.DONE) {
      this.results.set(todo.id, { todoId: todo.id, status: 'done', summary: result.summary, model: assignment.ref });
    } else {
      this.emit(EVENTS.TOAST, { kind: 'warn', text: `could not auto-fix ${todo.id}: ${result.error || result.reason || 'still failing'}` });
    }
  }

  /** Push the final BUILD_COMPLETE summary (todos, files, time, tokens, cost, models). */
  _emitBuildComplete(merged, integration) {
    const elapsedSecs = Math.floor((Date.now() - this._t0) / 1000);
    const tokensIn = this._tokens.in;
    const tokensOut = this._tokens.out;
    let cost = 0;
    const models = [];
    for (const [domain, byModel] of this._models) {
      let best = null;
      for (const [model, m] of byModel) {
        const rate = RATES[m.provider] || RATES.default;
        cost += ((tokensIn / 1e6) * rate.in + (tokensOut / 1e6) * rate.out) * m.count;
        if (!best || m.count > best.count) best = { model, count: m.count };
      }
      if (best) models.push({ domain, model: best.model, count: best.count });
    }
    this.emit(EVENTS.BUILD_COMPLETE, {
      done: merged.done,
      total: merged.total,
      failed: merged.failed,
      needsReview: merged.needsReview,
      elapsedSecs,
      files: this.undoStack.pending(),
      tokensIn,
      tokensOut,
      cost: Number(cost.toFixed(2)),
      models,
      integration
    });
  }

  stop() {
    this._stopped = true;
    for (const sub of this.subagents.values()) {
      sub.interrupt?.();
    }
    for (const sub of this._fixers) {
      sub.interrupt?.();
    }
    this.queue = [];
  }
}

export async function persistSession({ mode, projectName, projectPath, plan, results }) {
  const projectId = await getProjectId(projectPath);
  const entry = {
    id: projectId,
    mode,
    projectName,
    projectPath,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    plan,
    results
  };
  await saveHistory(entry);
  return entry;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
