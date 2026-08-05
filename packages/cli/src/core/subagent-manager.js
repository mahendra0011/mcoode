import { EventEmitter } from 'node:events';
import { SUBAGENT_STATUS, EVENTS, planWaves, isEligible } from '@mcode/shared';
import { Subagent } from './subagent.js';
import { UndoStack } from './tools.js';
import { join } from 'node:path';
import { getProjectId } from './store.js';
import { saveHistory } from './history.js';
import { CostLedger } from '@mcode/shared';

/**
 * Subagent Manager — owns the todo DAG, dispatches one subagent per todo,
 * runs ready todos concurrently up to a cap, merges results, and pushes
 * every event onto the shared bus (terminal UI + Socket.IO bridge subscribe).
 */
export class SubagentManager {
  constructor({ plan, router, projectPath, config = {}, bus = null, options = {} }) {
    this.plan = plan;
    this.router = router;
    this.projectPath = projectPath;
    this.config = config;
    this.bus = bus || new EventEmitter();
    this.options = options;
    this.concurrency = config.concurrency || 5;
    this.subagents = new Map();
    this.results = new Map();
    this.ledger = options.ledger || new CostLedger();
    this.undoStack = options.undoStack || new UndoStack();
    this.running = 0;
    this.queue = [];
    this._stopped = false;
    this._retries = new Map();
    this.skipIntegrationTests = Boolean(options.skipIntegrationTests);
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
    this._dispatch(todo).finally(() => {
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
        this.emit(EVENTS.SUBAGENT_FAILED, { todoId: todo.id, error: err.message });
      }
    }
  }

  emit(event, payload) {
    this.bus?.emit(event, payload);
  }

  /** Run the whole DAG to completion. Resolves with merged results. */
  async runAll() {
    await this.initUndo();
    const waves = planWaves(this.plan);
    const statusById = () => {
      const map = new Map();
      for (const [id, result] of this.results) {
        map.set(id, result.status);
      }
      return map;
    };

    for (const [idx, wave] of waves.entries()) {
      if (this._stopped) break;
      wave.forEach((todo) => {
        todo.wave = idx + 1;
      });
      this.emit(EVENTS.WAVE_COMPLETE, { wave: wave.map((t) => t.id) });
      const ready = wave.filter((todo) => isEligible(todo, statusById()));
      this.queue.push(...ready);
      this._schedule();
      while (this.running > 0 || this.queue.length > 0) {
        if (this._stopped) break;
        await sleep(100);
      }
    }

    const { mergeResults } = await import('@mcode/shared');
    if (!this.skipIntegrationTests) await this._integrationPass();
    return mergeResults(this.plan, [...this.results.values()]);
  }

  /** Run the project's test script (when defined) as the integration pass.
   *  Failures are reported but do not fail the build. */
  async _integrationPass() {
    const { readFile } = await import('node:fs/promises');
    const pkg = await readFile(join(this.projectPath, 'package.json'), 'utf8').catch(() => null);
    let testScript = null;
    if (pkg) {
      try { testScript = JSON.parse(pkg).scripts?.test || null; } catch { testScript = null; }
    }
    if (!testScript) {
      this.emit(EVENTS.INTEGRATION_PASS, { ran: false, reason: 'no test script' });
      return;
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
      this.emit(EVENTS.INTEGRATION_PASS, {
        ran: true,
        status: outcome,
        exitCode: res.exitCode,
        tail: (res.stdout || '').split('\n').slice(-6).join('\n')
      });
      if (outcome === 'failed') {
        this.emit(EVENTS.TOAST, { kind: 'warn', text: `integration tests failed (exit ${res.exitCode}) — see test output` });
      }
    } catch (err) {
      this.emit(EVENTS.INTEGRATION_PASS, { ran: true, status: 'error', error: err.message });
    }
  }

  stop() {
    this._stopped = true;
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
