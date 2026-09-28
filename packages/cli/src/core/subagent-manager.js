import { EventEmitter } from 'node:events';
import { SUBAGENT_STATUS, EVENTS, planWaves, isEligible, isBlocked, resolveFileConflicts, mergeResults, estimateTokens, estimateCallCost, COST_RATES } from '@mcode/shared';
import { Subagent } from './subagent.js';
import { UndoStack } from './tools.js';
import { join, basename } from 'node:path';
import { getProjectId } from './store.js';
import { writeSessionState } from './session-state.js';
import { saveHistory } from './history.js';
import { CostLedger } from '@mcode/shared';
import { loadHooks } from './hooks.js';

/** USD/M-token fallback rates live in @mcode/shared (MF-002) so the summary,
 *  the ledger attribution and the history/doctor reports agree. */
const RATES = COST_RATES;

/** Domains that normally write code — used to flag planner todos with no
 *  declared `files` (a lead cause of lost updates between parallel agents). */
const WRITING_DOMAINS = new Set(['frontend', 'backend', 'db', 'devops', 'test', 'bugfix', 'migration', 'docs']);

/**
 * FileLockManager — runtime lock queue for shared files (configs, types, indexes).
 * Exclusive files are resolved by resolveFileConflicts() at plan time (static).
 * Shared files need runtime locks to prevent write contention between parallel
 * subagents modifying the same file.
 */
class FileLockManager {
  constructor() {
    this.locks = new Map(); // filePath -> { ownerId, waiters: [{agentId, resolve, reject}] }
    this.holderFiles = new Map(); // agentId -> Set<filePaths>
  }

  /**
   * Acquire a lock on a file for an agent. Resolves immediately if available,
   * or queues the caller as a waiter until the lock is released.
   * @param {string} agentId - subagent identifier
   * @param {string} filePath - absolute path to the file
   * @param {number} [timeout=30000] - max wait time in ms
   * @returns {Promise<() => void>} - release function
   */
  async acquireLock(agentId, filePath, timeout = 30000) {
    const existing = this.locks.get(filePath);

    if (!existing || !existing.ownerId) {
      // No lock — grant immediately
      this.locks.set(filePath, { ownerId: agentId, waiters: [] });
      const holderFiles = this.holderFiles.get(agentId) || new Set();
      holderFiles.add(filePath);
      this.holderFiles.set(agentId, holderFiles);
      return () => this.releaseLock(agentId, filePath);
    }

    // Lock is held — queue as waiter
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const entry = this.locks.get(filePath);
        const lockedBy = entry?.ownerId || null;
        if (entry) {
          entry.waiters = entry.waiters.filter((w) => w.agentId !== agentId);
          if (!entry.ownerId && entry.waiters.length === 0) {
            this.locks.delete(filePath);
          }
        }
        // MF-004: classify lock timeouts as *conflicts* (not generic failures)
        // and name the competing writer so the report can explain the collision.
        const err = new Error(
          lockedBy
            ? `file lock timeout: ${filePath} is held by ${lockedBy} (waited ${timeout}ms for ${agentId}) — serialize the two todos (add the file to both todos' "files") or run with --concurrency 1`
            : `file lock timeout: could not acquire ${filePath} for ${agentId} after ${timeout}ms`
        );
        err.code = 'FILE_LOCK_TIMEOUT';
        err.filePath = filePath;
        err.lockedBy = lockedBy;
        err.waitedMs = timeout;
        reject(err);
      }, timeout);

      this.locks.get(filePath).waiters.push({
        agentId,
        resolve: () => {
          clearTimeout(timer);
          const holderFiles = this.holderFiles.get(agentId) || new Set();
          holderFiles.add(filePath);
          this.holderFiles.set(agentId, holderFiles);
          resolve(() => this.releaseLock(agentId, filePath));
        },
        reject
      });
    });
  }

  /** Release a file lock and wake up the next waiter (FIFO queue). */
  releaseLock(agentId, filePath) {
    const entry = this.locks.get(filePath);
    if (!entry || entry.ownerId !== agentId) return false;

    const holderFiles = this.holderFiles.get(agentId);
    if (holderFiles) holderFiles.delete(filePath);

    if (entry.waiters && entry.waiters.length > 0) {
      // Hand off to next waiter (FIFO)
      const next = entry.waiters.shift();
      entry.ownerId = next.agentId;
      next.resolve();
    } else {
      this.locks.delete(filePath);
    }
    return true;
  }

  /** Release all locks held by an agent (e.g., on failure/interrupt). */
  releaseAllFor(agentId) {
    const files = this.holderFiles.get(agentId);
    if (!files) return;
    for (const filePath of files) {
      this.releaseLock(agentId, filePath);
    }
    this.holderFiles.delete(agentId);
  }

  /** Check if a file is currently locked by any agent. */
  isLocked(filePath) {
    return this.locks.has(filePath) && this.locks.get(filePath).ownerId;
  }

  /** Get list of all currently locked files. */
  lockedFiles() {
    return [...this.locks.entries()]
      .filter(([, v]) => v.ownerId)
      .map(([path, v]) => ({ path, owner: v.ownerId }));
  }
}

/**
 * Subagent Manager — owns the todo DAG, dispatches one subagent per todo,
 * runs ready todos concurrently up to a cap, merges results, and pushes
 * every event onto the shared bus (terminal UI + Socket.IO bridge subscribe).
 */
export class SubagentManager {
  /**
   * @param {object} args
   * @param {object} args.plan
   * @param {any} args.router
   * @param {string} args.projectPath
   * @param {Record<string, any>} [args.config]
   * @param {{ on: Function, off: Function, emit: (event: string, payload?: any) => void }|null} [args.bus]
   * @param {Record<string, any>} [args.options]
   */
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
    this._drainWaiters = []; // GOD-007: promise-based wave wait (no polling)
    this.suppressBuildComplete = Boolean(options.suppressBuildComplete); // GOD-009
    this.skipIntegrationTests = Boolean(options.skipIntegrationTests);
    this._t0 = Date.now();
    this._tokens = { in: 0, out: 0 };
    this._models = new Map(); // domain -> Map(model -> { provider, count })
    this.hooks = null; // loaded lazily in runAll()
    this.fileLocks = new FileLockManager(); // runtime lock queue for shared files
    // MF-001: resumable checkpoint state. `options.session` carries the prompt/
    // stack hint of the run; `options.resumeState` is a previous state.json when
    // this manager was started by `mcode god --resume`.
    this.sessionMeta = options.session || {};
    this._resumeState = options.resumeState || null;
    this._projectId = null;
    this._stateStatus = null;
    this._waveIndex = 0;
    this._totalWaves = 0;
    this._checkpointPending = null;
    this._checkpointWarned = false;
    // MF-002: spend accrual + budget ceiling. Only *explicit* ceilings apply
    // (`--max-cost` / `cost.budgetPerRunUsd` in the user's config) — the
    // documented DEFAULT_CONFIG value is not force-injected here, so an
    // existing project never gets its run silently aborted by a default.
    this._spendUsd = 0;
    this._budgetLimitUsd = Math.max(0, Number(options.maxCost ?? 0) || 0);
    this.budgetAbort = null;
    // MF-004: per-file writer audit + conflict observability.
    this._writers = new Map(); // normalized file -> [{ todoId, at, undoId }]
    this._overlaps = []; // [{ file, writers: [todoId] }]
    this._lockConflicts = []; // [{ file, todoId, lockedBy, at }]
    this._emptyFileTodos = []; // [{ id, domain, title }]
  }

  /** MF-002: money spent by this run (sum of per-call estimates, USD). */
  get spendUsd() {
    return this._spendUsd;
  }

  /**
   * MF-002: ledger recorder for one subagent — attributes every call to its
   * mode (the todo domain) with an estimated cost, and accrues the run total so
   * the wave loop can enforce the budget ceiling. Before this, both call sites
   * passed only tokens, so `ledger.spendByMode()` was always empty and the
   * `cost.budgetPerRunUsd` setting had no reader at all.
   */
  _ledgerRecorder(assignment, mode) {
    const model = { ...(assignment?.model || {}), ref: assignment?.ref, provider: assignment?.provider?.id };
    return (res) => {
      const usage = {
        inputTokens: res?.usage?.inputTokens || 0,
        outputTokens: res?.usage?.outputTokens || 0
      };
      const cost = estimateCallCost(model, usage);
      this._spendUsd += cost;
      try {
        this.ledger.record(assignment?.provider?.id || 'default', { ...usage, mode, cost });
      } catch {
        /* accounting must never break a build */
      }
      this._checkBudget();
    };
  }

  /** MF-002: budget ceiling — abort *dispatching* once the limit is crossed. */
  _checkBudget() {
    if (this._budgetLimitUsd <= 0 || this.budgetAbort) return;
    if (this._spendUsd < this._budgetLimitUsd) return;
    this.budgetAbort = {
      limitUsd: this._budgetLimitUsd,
      spentUsd: Number(this._spendUsd.toFixed(4)),
      at: new Date().toISOString()
    };
    this.emit(EVENTS.TOAST, {
      kind: 'warn',
      text: `budget reached: spent ~$${this._spendUsd.toFixed(2)} of $${this._budgetLimitUsd.toFixed(2)} — no new todos dispatched (in-flight agents finish; remaining todos stay pending)`
    });
  }

  /** MF-004: record every file a subagent wrote (writer audit trail). */
  _recordWrite(todoId, file, undoId = null) {
    if (!file || !todoId) return;
    const key = String(file).replace(/\\/g, '/');
    const list = this._writers.get(key) || [];
    const last = list[list.length - 1];
    if (last && last.todoId === todoId) {
      last.at = new Date().toISOString();
      if (undoId) last.undoId = undoId;
    } else {
      list.push({ todoId, at: new Date().toISOString(), undoId });
    }
    this._writers.set(key, list);
  }

  /** MF-004: files written by 2+ distinct todos (last-writer-wins candidates). */
  overlappingWrites() {
    const out = [];
    for (const [file, writers] of this._writers) {
      const todoIds = [...new Set(writers.map((w) => w.todoId))];
      if (todoIds.length > 1) out.push({ file, writers: todoIds });
    }
    return out.sort((a, b) => a.file.localeCompare(b.file));
  }

  /** MF-004: emit a conflict report at every wave boundary. */
  _reportOverlaps(waveIndex = null) {
    const overlaps = this.overlappingWrites();
    if (overlaps.length === 0) return overlaps;
    this._overlaps = overlaps;
    const preview = overlaps
      .slice(0, 3)
      .map((o) => `${o.file} (${o.writers.join(', ')})`)
      .join(' · ');
    this.emit(EVENTS.TOAST, {
      kind: 'warn',
      text: `overlapping writes${waveIndex ? ` in wave ${waveIndex}` : ''}: ${preview}${overlaps.length > 3 ? ` (+${overlaps.length - 3} more)` : ''} — last write wins; add the shared file to both todos' "files" to force ordering`
    });
    return overlaps;
  }

  /**
   * MF-004 (phase 4): act on a reported overlap.
   * `decisions` maps a file to `'keep-first'` (roll the later writer's last edit
   * back through the undo stack) or `'keep-last'` (default: last write wins).
   * Sequential re-apply is the plan-level fix — list the shared file in both
   * todos' `files` so `resolveFileConflicts()` chains them next time.
   *
   * @returns {Promise<Array<{ file: string, action: string, todoId?: string }>>}
   */
  async resolveOverlaps({ undoStack = this.undoStack, decisions = {} } = {}) {
    const actions = [];
    for (const overlap of this.overlappingWrites()) {
      const laterTodo = overlap.writers[overlap.writers.length - 1];
      if (decisions[overlap.file] !== 'keep-first') {
        actions.push({ file: overlap.file, action: 'kept-later', todoId: laterTodo });
        continue;
      }
      const writes = this._writers.get(overlap.file) || [];
      const last = [...writes].reverse().find((w) => w.todoId === laterTodo && w.undoId);
      if (!last?.undoId || !undoStack) {
        actions.push({ file: overlap.file, action: 'no-snapshot', todoId: laterTodo });
        continue;
      }
      const restored = await undoStack.undo(last.undoId).catch(() => null);
      actions.push({
        file: overlap.file,
        action: restored ? 'rolled-back' : 'undo-failed',
        todoId: laterTodo
      });
    }
    return actions;
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

  /**
   * MF-001: persist a resumable checkpoint (`~/.mcode/sessions/<id>/state.json`)
   * at a wave boundary or on interrupt. Best-effort by design — a checkpoint
   * failure must never abort a build, so it degrades to a single warning.
   */
  async _checkpoint({ status = null, waveIndex = null, totalWaves = null } = {}) {
    const run = (async () => {
      try {
        this._projectId = this._projectId || (await getProjectId(this.projectPath));
        if (status) this._stateStatus = status;
        if (waveIndex !== null) this._waveIndex = waveIndex;
        if (totalWaves !== null) this._totalWaves = totalWaves;

        const todoStatus = {};
        for (const todo of this.plan?.todos || []) {
          todoStatus[todo.id] =
            this.results.get(todo.id)?.status
            || this.subagents.get(todo.id)?.status
            || todo.status
            || SUBAGENT_STATUS.PENDING;
        }

        // In-flight subagents already wrote files to disk — record which todos
        // were mid-write so `--resume` can offer keep/revert instead of
        // silently re-applying edits on top of them.
        const inflight = {};
        for (const [id, sub] of this.subagents) {
          if (sub?.status !== SUBAGENT_STATUS.RUNNING) continue;
          inflight[id] = {
            files: this._declaredFiles(id),
            startedAt: sub.startedAt ? new Date(sub.startedAt).toISOString() : null
          };
        }

        await writeSessionState(this._projectId, {
          sessionId: this._projectId,
          projectName: basename(this.projectPath),
          projectPath: this.projectPath,
          mode: this.sessionMeta.mode || 'god',
          prompt: this.sessionMeta.prompt || this.plan?.prompt || this.plan?.summary || '',
          stackHint: this.sessionMeta.stackHint || null,
          status: this._stateStatus || 'running',
          plan: this.plan,
          todoStatus,
          inflight,
          waveIndex: this._waveIndex,
          totalWaves: this._totalWaves,
          startedAt: this.sessionMeta.startedAt || new Date(this._t0).toISOString()
        });
      } catch (err) {
        if (!this._checkpointWarned) {
          this._checkpointWarned = true;
          this.emit(EVENTS.TOAST, { kind: 'warn', text: `session checkpoint failed: ${err.message}` });
        }
      }
      return null;
    })();
    this._checkpointPending = run;
    return run;
  }

  /** Declared output files of a todo — used to reconcile an interrupted write. */
  _declaredFiles(todoId) {
    const todo = (this.plan?.todos || []).find((t) => t.id === todoId);
    const files = todo?.files?.length ? todo.files : todo?.filePath ? [todo.filePath] : [];
    return files.map((f) => String(f).replace(/\\/g, '/'));
  }

  /** Awaitable handle for the last checkpoint write (SIGINT flush + tests). */
  get pendingCheckpoint() {
    return this._checkpointPending || Promise.resolve(null);
  }

  /** Force a checkpoint now (SIGINT flush, `--dry-run` handoff). */
  async flushCheckpoint(status = 'interrupted') {
    await this._checkpoint({ status });
    return this.pendingCheckpoint;
  }

  /**
   * MF-001: seed a run from a saved checkpoint. DONE todos are re-attached as
   * results — so they are never re-dispatched, never re-written and never
   * re-billed — while everything else (pending, failed, needs-review, or a todo
   * that was mid-flight when the process died) goes back to PENDING and is
   * retried in its wave.
   */
  _applyResumeState(state) {
    const saved = state?.todoStatus || {};
    let restored = 0;
    let retry = 0;
    for (const todo of this.plan?.todos || []) {
      const prev = saved[todo.id];
      if (prev === SUBAGENT_STATUS.DONE) {
        todo.status = SUBAGENT_STATUS.DONE;
        this.results.set(todo.id, {
          todoId: todo.id,
          status: SUBAGENT_STATUS.DONE,
          resumed: true,
          model: null,
          files: todo.completedFiles || [],
          error: null
        });
        restored += 1;
        continue;
      }
      todo.status = SUBAGENT_STATUS.PENDING;
      if (prev) retry += 1;
    }
    this._resumeInfo = { restored, retry, total: this.plan?.todos?.length || 0 };
    this.emit(EVENTS.TOAST, {
      kind: 'info',
      text: `resume: ${restored} todo(s) already done — retrying ${retry}`
    });
    return this._resumeInfo;
  }

  /**
   * Identify shared files this todo will write to.
   * Shared files are those declared in the plan's sharedFiles list
   * or files whose domain matches known shared-file patterns
   * (config files, type definitions, index/barrel files).
   */
  _getSharedFilesForTodo(todo) {
    const sharedFiles = new Set();

    // Check plan-level shared files declaration
    if (this.plan.sharedFiles && Array.isArray(this.plan.sharedFiles)) {
      for (const sf of this.plan.sharedFiles) {
        if (typeof sf === 'string') {
          sharedFiles.add(sf);
        } else if (sf?.path) {
          // Check if this todo modifies this shared file
          if (todo.files?.includes(sf.path) || todo.filePath === sf.path) {
            sharedFiles.add(sf.path);
          }
        }
      }
    }

    // Check todo's declared files for known shared patterns
    const todoFiles = todo.files || (todo.filePath ? [todo.filePath] : []);
    for (const filePath of todoFiles) {
      if (!filePath) continue;
      const normalized = filePath.toLowerCase();

      // Barrel/index files are shared by all modules
      if (normalized.endsWith('index.ts') || normalized.endsWith('index.js') ||
          normalized.endsWith('index.tsx') || normalized.endsWith('index.jsx') ||
          normalized.endsWith('index.d.ts')) {
        sharedFiles.add(filePath);
      }

      // Config files shared across todos
      const configPatterns = ['.config.', 'tsconfig.json', 'jest.config', 'webpack.config',
                              'vitest.config', 'tailwind.config', 'next.config'];
      if (configPatterns.some((p) => normalized.includes(p))) {
        sharedFiles.add(filePath);
      }

      // Type definition files
      if (normalized.endsWith('.d.ts') && !normalized.includes('/node_modules/')) {
        sharedFiles.add(filePath);
      }

      // Routes/types files (shared domain constants)
      const sharedPatterns = ['routes', 'types.ts', 'types.js', 'constants.ts',
                              'constants.js', 'api.ts', 'api.js'];
      if (sharedPatterns.some((p) => normalized.includes(`/${p}.`) || normalized.endsWith(`/${p}`))) {
        sharedFiles.add(filePath);
      }
    }

    return [...sharedFiles];
  }

  _schedule() {
    if (this._stopped) {
      this._notifyDrain();
      return;
    }
    // MF-002: budget ceiling — stop dispatching new todos (in-flight agents
    // finish; dropped todos stay without a result so they resume as pending).
    if (this.budgetAbort) {
      this.queue = [];
      this._notifyDrain();
      return;
    }
    while (this.running < this.concurrency && this.queue.length > 0) {
      const todo = this.queue.shift();
      this._spawn(todo);
    }
    this._notifyDrain();
  }

  /** GOD-007: promise-based wait for the current wave to drain (no polling). */
  _waitForWave() {
    if (this._stopped || (this.running === 0 && this.queue.length === 0)) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this._drainWaiters.push(resolve);
    });
  }

  _notifyDrain() {
    if (this._stopped || (this.running === 0 && this.queue.length === 0)) {
      const waiters = this._drainWaiters;
      this._drainWaiters = [];
      for (const r of waiters) {
        try { r(); } catch { /* ignore */ }
      }
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
      this._notifyDrain();
    });
  }

  /** GOD-013: iterative retry loop (max 3 attempts) — no recursion. */
  async _dispatch(todo) {
    let assignment = null;
    for (let attempt = 0; attempt < 3; attempt++) {
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
          // MF-002: attribute every call to the todo's mode with an estimated
          // cost (was tokens-only, leaving spendByMode() permanently empty).
          ledger: this._ledgerRecorder(assignment, todo.domain)
        },
        projectPath: this.projectPath,
        bus: this.bus,
        undoStack: this.undoStack,
        config: this.config,
        reasoning: this.router?.reasoning || null,
        // MF-004: writer-audit — attribute each successful write to this todo.
        onWrite: (info) => this._recordWrite(info?.todoId || todo.id, info?.file, info?.undoId),
        onEvent: () => {}
      });
      this.subagents.set(todo.id, sub);
      todo.assignedModel = assignment.ref;

      // Determine shared file locks needed for this todo
      const sharedFiles = this._getSharedFilesForTodo(todo);
      const releaseFuncs = [];
      for (const filePath of sharedFiles) {
        try {
          const release = await this.fileLocks.acquireLock(todo.id, filePath, 30000);
          releaseFuncs.push(release);
        } catch (lockErr) {
          // MF-004: lock timeouts are writer conflicts — classify + remember
          // who held the file so the wave-boundary report can explain it.
          const isConflict = lockErr?.code === 'FILE_LOCK_TIMEOUT';
          if (isConflict) {
            this._lockConflicts.push({
              file: filePath,
              todoId: todo.id,
              lockedBy: lockErr.lockedBy || null,
              at: new Date().toISOString()
            });
          }
          this.emit(EVENTS.TOAST, {
            kind: 'warn',
            text: isConflict
              ? `file conflict: ${filePath} held by ${lockErr.lockedBy || 'another todo'} while ${todo.id} waited ${lockErr.waitedMs || 30000}ms — continuing without the lock; verify both writes in the diff`
              : `lock timeout for ${filePath} on ${todo.id}`
          });
        }
      }

      let result;
      try {
        result = await sub.run();
      } finally {
        // Release all shared file locks
        for (const release of releaseFuncs) {
          try { release(); } catch { /* already released */ }
        }
      }

        this.results.set(todo.id, { todoId: todo.id, ...result });

        // Record result for scoring system — updates historical success/failure rates
        const success = result.status === SUBAGENT_STATUS.DONE;
        if (this.router?.recordAssignment) {
          try { await this.router.recordAssignment(assignment.ref, todo.domain, success); } catch { /* scoring is best-effort */ }
        }
        const tokensIn = sub.tokens?.in || 0;
        const tokensOut = sub.tokens?.out || 0;
        this._tokens.in += tokensIn;
        this._tokens.out += tokensOut;
        const providerId = String(assignment.provider.id || 'default');
        const byModel = this._models.get(todo.domain) || new Map();
        const entry = byModel.get(assignment.ref) || { provider: providerId, count: 0, tokensIn: 0, tokensOut: 0 };
        entry.count++;
        entry.tokensIn += tokensIn;
        entry.tokensOut += tokensOut;
        byModel.set(assignment.ref, entry);
        this._models.set(todo.domain, byModel);
        return result;
      } catch (err) {
        const retries = this._retries.get(todo.id) || [];
        if (retries.length < 2 && assignment?.ref && attempt < 2) {
          retries.push(assignment.ref);
          this._retries.set(todo.id, retries);
          this.emit(EVENTS.TOAST, { kind: 'warn', text: `retrying ${todo.id} with fallback model (${err.message})` });
          assignment = null;
          continue; // next attempt with excluded model
        }
        const result = { status: 'failed', error: err.message };
        this.results.set(todo.id, { todoId: todo.id, ...result });
        this.emit(EVENTS.SUBAGENT_FAILED, { todoId: todo.id, error: err.message, retryCount: retries.length });
        return result;
      }
    }
  }

  emit(event, payload) {
    this.bus?.emit(event, payload);
    // Live snapshot for `mcode agents` (other terminals): god-run subagents
    // live in memory, so mirror minimal status to ~/.mcode/agents/. Best
    // effort, throttled, never throws into the run loop.
    if (
      event === EVENTS.WAVE_START ||
      event === EVENTS.WAVE_COMPLETE ||
      event === EVENTS.SUBAGENT_DONE ||
      event === EVENTS.SUBAGENT_FAILED ||
      event === EVENTS.SUBAGENT_NEEDS_REVIEW
    ) {
      this._snapshotAgents().catch(() => {});
    }
  }

  async _snapshotAgents() {
    const now = Date.now();
    if (now - (this._lastSnapshotAt || 0) < 2000) return;
    this._lastSnapshotAt = now;
    try {
      const { homedir } = await import('node:os');
      const { join, basename } = await import('node:path');
      const { mkdir, writeFile } = await import('node:fs/promises');
      const projectId = await getProjectId(this.projectPath);
      const dir = join(homedir(), '.mcode', 'agents');
      await mkdir(dir, { recursive: true });
      const todos = (this.plan?.todos || []).map((t) => ({
        id: t.id,
        title: t.title,
        domain: t.domain,
        wave: t.wave || null,
        status: this.results.get(t.id)?.status || this.subagents.get(t.id)?.status || 'pending',
      }));
      const done = todos.filter((t) => t.status === SUBAGENT_STATUS.DONE).length;
      await writeFile(
        join(dir, `${projectId}.json`),
        JSON.stringify({
          kind: 'god',
          project: basename(this.projectPath),
          projectId,
          pid: process.pid,
          status: done === todos.length && todos.length > 0 ? 'completed' : 'running',
          done,
          total: todos.length,
          updatedAt: new Date().toISOString(),
          todos,
        }, null, 2),
        'utf8'
      );
    } catch {}
  }

  /**
   * Run a list of todos (or restart with new todos). Resolves with merged results.
   */
  async run(todos = null) {
    if (Array.isArray(todos)) {
      const planObj = { ...(this.plan || {}), todos };
      this.plan = resolveFileConflicts(planObj);
      this.results.clear();
      this.queue = [];
      this.running = 0;
      this._stopped = false;
    } else if (todos && Array.isArray(todos.todos)) {
      this.plan = resolveFileConflicts(todos);
      this.results.clear();
      this.queue = [];
      this.running = 0;
      this._stopped = false;
    }
    return this.runAll();
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
    // MF-004: flag planner todos that declare no files although their domain
    // normally writes — undeclared writes are invisible to both the file
    // locks and resolveFileConflicts, which is how parallel agents clobber
    // each other's work without ever appearing in the conflict report.
    this._emptyFileTodos = (this.plan?.todos || [])
      .filter((t) => (!t.files || t.files.length === 0) && WRITING_DOMAINS.has(t.domain))
      .map((t) => ({ id: t.id, domain: t.domain, title: t.title }));
    if (this._emptyFileTodos.length > 0) {
      const ids = this._emptyFileTodos.slice(0, 4).map((t) => `${t.id}[${t.domain}]`).join(', ');
      this.emit(EVENTS.TOAST, {
        kind: 'warn',
        text: `planner wrote no files for ${this._emptyFileTodos.length} writing todo(s): ${ids}${this._emptyFileTodos.length > 4 ? '…' : ''} — parallel writes to the same file can't be detected; add "files" to those todos`
      });
    }
    // MF-001: a resumed run re-attaches DONE todos (never re-dispatched) and
    // checkpoints immediately so a crash during the first wave is resumable too.
    if (this._resumeState) this._applyResumeState(this._resumeState);
    await this._checkpoint({ status: 'running', waveIndex: 0, totalWaves: waves.length });
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
      const currentStatus = statusById();
      for (const todo of wave) {
        if (!this.results.has(todo.id) && isBlocked(todo, currentStatus)) {
          this.results.set(todo.id, {
            todoId: todo.id,
            status: SUBAGENT_STATUS.FAILED,
            error: 'skipped because required dependency failed'
          });
          this.emit(EVENTS.TOAST, { kind: 'warn', text: `skipping ${todo.id} because dependency failed` });
        }
      }

      const ready = wave.filter((todo) => isEligible(todo, statusById()) && !this.results.has(todo.id));
      this.queue.push(...ready);
      this._schedule();
      // GOD-007: promise-based drain (resolves via _notifyDrain, incl. on stop)
      await this._waitForWave();
      // MF-004: conflict report at every wave boundary (writer audit).
      this._reportOverlaps(idx + 1);
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

      // MF-001: wave boundary — persist plan + per-todo status so a crash here
      // resumes from this wave instead of re-planning and re-billing the DAG.
      await this._checkpoint({ status: 'running', waveIndex: idx + 1, totalWaves: allWaves.length });

      // MF-002: budget reached mid-run — the remaining waves are left pending
      // (checkpoint flips to 'interrupted', so `god --resume` can continue
      // with a higher --max-cost).
      if (this.budgetAbort) {
        const left = allWaves.length - (idx + 1);
        if (left > 0) {
          this.emit(EVENTS.TOAST, {
            kind: 'warn',
            text: `stopping: ${left} remaining wave(s) skipped (budget $${this.budgetAbort.limitUsd.toFixed(2)} reached at ~$${this.budgetAbort.spentUsd.toFixed(2)})`
          });
        }
        this._stopped = true;
        break;
      }
    }

    let integration = { ran: false };
    const needsReviewCount = [...this.results.values()].filter(
      (r) => r.status === SUBAGENT_STATUS.NEEDS_REVIEW || r.status === SUBAGENT_STATUS.FAILED
    ).length;
    if (!this.skipIntegrationTests) {
      integration = await this._integrationPass();
    }
    // GOD-012: only auto-fix when integration tests actually ran. When there
    // is no test script (integration.ran === false) there is nothing to verify
    // a fix against — dispatching bugfix agents would burn model calls blind.
    const testsRan = integration?.ran === true;
    if (!this._stopped && needsReviewCount > 0 && testsRan) {
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

    // MF-001: final checkpoint — flips status to completed/interrupted so
    // `mcode god --list-sessions` shows what still needs a resume.
    await this._checkpoint({
      status: this._stopped ? 'interrupted' : merged.failed > 0 ? 'failed' : 'completed'
    });

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
        // MF-002: bugfix calls are attributed to the 'bugfix' mode too.
        ledger: this._ledgerRecorder(assignment, 'bugfix')
      },
      projectPath: this.projectPath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: this.config,
      reasoning: this.router?.reasoning || null,
      // MF-004: writer-audit for auto-fix writes (attributed to the fix todo).
      onWrite: (info) => this._recordWrite(info?.todoId || `${todo.id}-fix`, info?.file, info?.undoId),
      onEvent: () => {}
    });
    const result = await sub.run();
    this._fixers.add(sub);
    this._tokens.in += sub.tokens?.in || 0;
    this._tokens.out += sub.tokens?.out || 0;

    // Record bugfix result for scoring — uses 'bugfix' domain
    if (this.router?.recordAssignment) {
      try { await this.router.recordAssignment(assignment.ref, 'bugfix', result.status === SUBAGENT_STATUS.DONE); } catch { /* best-effort */ }
    }

    if (result.status === SUBAGENT_STATUS.DONE) {
      this.results.set(todo.id, { todoId: todo.id, status: 'done', summary: result.summary, model: assignment.ref });
    } else {
      this.emit(EVENTS.TOAST, { kind: 'warn', text: `could not auto-fix ${todo.id}: ${result.error || result.reason || 'still failing'}` });
    }
  }

  /** GOD-009: single BUILD_COMPLETE source. When the manager is driven by the
   *  Orchestrator (orchestratorManaged/suppressBuildComplete), it returns the
   *  payload WITHOUT emitting — the Orchestrator emits once with enriched data.
   *  Standalone runs emit directly (backward compat). */
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
        const mIn = m.tokensIn ?? 0;
        const mOut = m.tokensOut ?? 0;
        cost += (mIn / 1e6) * rate.in + (mOut / 1e6) * rate.out;
        if (!best || m.count > best.count) best = { model, count: m.count };
      }
      if (best) models.push({ domain, model: best.model, count: best.count });
    }
    const buildSummary = {
      done: merged.done,
      total: merged.total,
      failed: merged.failed,
      needsReview: merged.needsReview,
      elapsedSecs,
      files: this.undoStack.pending(),
      tokensIn,
      tokensOut,
      cost: Number(cost.toFixed(2)),
      // MF-002: actual ledger-attributed spend + the per-mode breakdown that
      // `history --cost` / `doctor` render (cost above stays the legacy
      // rate-table estimate so existing consumers keep working).
      spendUsd: Number(this._spendUsd.toFixed(4)),
      spendByMode: this.ledger?.spendByMode?.() || {},
      // MF-002: budget ceiling outcome (null when no ceiling or not reached).
      budget: this.budgetAbort ? { ...this.budgetAbort, spentUsd: this._spendUsd } : null,
      // MF-004: conflict observability for the god summary.
      overlaps: this.overlappingWrites(),
      lockConflicts: [...this._lockConflicts],
      emptyFileTodos: [...this._emptyFileTodos],
      models,
      integration
    };
    merged.cost = buildSummary.cost;
    merged.spendUsd = buildSummary.spendUsd;
    merged.tokensIn = tokensIn;
    merged.tokensOut = tokensOut;
    merged.elapsedSecs = elapsedSecs;
    merged.integration = integration;
    if (!this.options.orchestratorManaged && !this.suppressBuildComplete && !this.options.suppressBuildComplete) {
      this.emit(EVENTS.BUILD_COMPLETE, buildSummary);
    }
    return buildSummary;
  }

  stop() {
    this._stopped = true;
    this._notifyDrain();
    for (const sub of this.subagents.values()) {
      sub.interrupt?.();
      this.fileLocks.releaseAllFor(sub.id);
    }
    for (const sub of this._fixers) {
      sub.interrupt?.();
      this.fileLocks.releaseAllFor(sub.id);
    }
    this.queue = [];
    // MF-001: Ctrl+C / interrupt must leave a resumable checkpoint behind
    // (`pendingCheckpoint` lets the SIGINT handler await the flush).
    this._checkpointPending = this._checkpoint({ status: 'interrupted' });
  }
}

/**
 * Expose FileLockManager for external import/testing.
 */
export { FileLockManager };

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
