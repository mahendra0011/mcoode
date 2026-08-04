import { EventEmitter } from 'node:events';
import { io } from 'socket.io-client';
import { EVENTS, SOCKET, DEFAULT_CONFIG, CostLedger } from '@mcode/shared';
import { Planner } from './planner.js';
import { ModelRouter } from './router.js';
import { SubagentManager } from './subagent-manager.js';
import { UndoStack } from './tools.js';
import { getProviders } from '../providers/index.js';
import { loadVault } from './vault.js';
import { loadConfig, getProjectId } from './store.js';

const EVENT_TO_SOCKET = {
  [EVENTS.PLAN_GENERATED]: SOCKET.CLIENT_TO_SERVER.PLAN_GENERATED,
  [EVENTS.SUBAGENT_STARTED]: SOCKET.CLIENT_TO_SERVER.AGENT_STARTED,
  [EVENTS.SUBAGENT_STEP]: SOCKET.CLIENT_TO_SERVER.AGENT_STEP,
  [EVENTS.SUBAGENT_FILE]: SOCKET.CLIENT_TO_SERVER.AGENT_FILE,
  [EVENTS.SUBAGENT_DONE]: SOCKET.CLIENT_TO_SERVER.AGENT_DONE,
  [EVENTS.SUBAGENT_FAILED]: SOCKET.CLIENT_TO_SERVER.AGENT_FAILED,
  [EVENTS.SUBAGENT_NEEDS_REVIEW]: SOCKET.CLIENT_TO_SERVER.AGENT_NEEDS_REVIEW,
  [EVENTS.INTEGRATION_PASS]: SOCKET.CLIENT_TO_SERVER.INTEGRATION_PASS,
  [EVENTS.BUILD_COMPLETE]: SOCKET.CLIENT_TO_SERVER.BUILD_COMPLETE,
  [EVENTS.TOAST]: SOCKET.CLIENT_TO_SERVER.TOAST,
  [EVENTS.WATCH_SCAN]: SOCKET.CLIENT_TO_SERVER.WATCH_SCAN,
  [EVENTS.WATCH_FIX]: SOCKET.CLIENT_TO_SERVER.WATCH_FIX,
  [EVENTS.WATCH_STATUS]: SOCKET.CLIENT_TO_SERVER.WATCH_STATUS
};

export class Orchestrator extends EventEmitter {
  constructor({ projectPath = process.cwd(), config = null, options = {} } = {}) {
    super();
    this.projectPath = projectPath;
    this.config = config;
    this.ledger = new CostLedger();
    this.secrets = null;
    this.providers = null;
    this.router = null;
    this.manager = null;
    this.undoStack = null;
    this.socket = null;
    this.sessionId = null;
    this.watchDaemon = null;
    this.connectedToBackend = false;
    this.options = options;
    this.modelOverride = options.modelOverride || config?.modelOverride || null;
    this.verbose = Boolean(options.verbose);
  }

  async init() {
    this.config = this.config || (await loadConfig());
    this.secrets = await loadVault();
    this.providers = await getProviders({ secrets: this.secrets, config: this.config });
    this.router = new ModelRouter({
      secrets: this.secrets,
      config: this.config,
      ledger: this.ledger,
      providers: this.providers
    });
    this.sessionId = await getProjectId(this.projectPath);
    await this._initUndo();
    this.on(EVENTS.SUBAGENT_TOOL_CALL, (p) => {
      if (this.verbose) process.stderr.write(`[tool] ${p.tool} ${p.args}\n`);
    });
    this.on(EVENTS.SUBAGENT_FILE, (p) => {
      if (p.file && p.content) {
        this.emit(EVENTS.MESSAGE, { kind: 'code', id: `${Date.now()}-${p.todoId || ''}`, title: p.file, code: p.content });
      }
    });
    this._tryConnectBackend();
    return this;
  }

  async _initUndo() {
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    this.undoStack = new UndoStack({
      filePath: join(homedir(), '.mcode', 'projects', this.sessionId, 'undo.json')
    });
    await this.undoStack.load();
  }

  _tryConnectBackend() {
    const url = this.config?.backend?.url || DEFAULT_CONFIG.backend.url;
    try {
      this.socket = io(url, {
        path: '/live',
        timeout: 1500,
        reconnection: false,
        transports: ['websocket', 'polling']
      });
      this.socket.on('connect', () => {
        this.connectedToBackend = true;
        this.socket.emit(SOCKET.CLIENT_TO_SERVER.SESSION_START, {
          sessionId: this.sessionId,
          projectName: this.projectPath.split(/[\\/]/).pop() || 'project'
        });
      });
      this.socket.on('connect_error', () => {
        this.connectedToBackend = false;
      });
    } catch {
      /* backend optional */
    }
  }

  disconnect() {
    try {
      this.socket?.close();
      this.socket?.removeAllListeners();
      this.socket = null;
    } catch {
      /* already gone */
    }
    this.connectedToBackend = false;
  }

  forwardToBackend(event, payload) {
    const socketEvent = EVENT_TO_SOCKET[event];
    if (socketEvent && this.socket?.connected) {
      this.socket.emit(socketEvent, { sessionId: this.sessionId, ...payload });
    }
  }

  bus = {
    emit: (event, payload) => {
      this.emit(event, payload);
      this.forwardToBackend(event, payload);
    }
  };

  async plan(prompt, opts = {}) {
    const planner = new Planner({ router: this.router, bus: this.bus });
    let repoContext = '';
    if (!opts.fresh) {
      repoContext = await this._repoContext();
    }
    return planner.plan(prompt, { repoContext, projectPath: this.projectPath });
  }

  async _repoContext() {
    const { readFile, readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const out = [];
    const pkg = await readFile(join(this.projectPath, 'package.json'), 'utf8').catch(() => null);
    if (pkg) out.push('--- package.json ---\n' + pkg.slice(0, 1500));
    const readme = await readFile(join(this.projectPath, 'README.md'), 'utf8').catch(() => null);
    if (readme) out.push('--- README.md ---\n' + readme.slice(0, 1200));
    const tree = await readdir(this.projectPath).catch(() => []);
    out.push('--- top-level files ---\n' + tree.filter((f) => !f.startsWith('.')).join('\n'));
    return out.join('\n\n');
  }

  async runPlan(plan, { confirmFn = null, noTests = false } = {}) {
    if (confirmFn && !(await confirmFn(plan))) {
      this.emit(EVENTS.TOAST, { kind: 'warn', text: 'plan cancelled' });
      return null;
    }
    this.emit(EVENTS.PLAN_APPROVED, plan);
    this.manager = new SubagentManager({
      plan,
      router: this.router,
      projectPath: this.projectPath,
      config: { ...DEFAULT_CONFIG, ...this.config },
      bus: this.bus,
      options: {
        ledger: this.ledger,
        undoStack: this.undoStack,
        skipIntegrationTests: Boolean(noTests),
        forceRef: this.modelOverride
      }
    });
    return this.manager.runAll();
  }

  async chat(prompt) {
    const assignment = (this.modelOverride && await this.router.find(this.modelOverride))
      || await this.router.pick('docs');
    if (!assignment) throw new Error('no model available for chat');
    const stream = assignment.provider.stream(assignment.model.id, {
      messages: [
        {
          role: 'system',
          content: 'You are mcode, a terminal-first AI coding assistant. Be concise and technical.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });
    let full = '';
    for await (const chunk of stream) {
      full += chunk;
      this.emit(EVENTS.MESSAGE, { kind: 'stream', text: full });
    }
    return full;
  }

  async undo() {
    const file = await this.undoStack.undo();
    this.emit(EVENTS.UNDO, { file });
    return file;
  }

  /** God Mode — full one-prompt-to-delivery pipeline. */
  async runGod(prompt, { confirmFn = null, addMessage = null, fresh = false, deployTarget = null, noTests = false } = {}) {
    const t0 = Date.now();
    this.emit(EVENTS.MESSAGE, { kind: 'system', text: `\u25b8 god mode: "${String(prompt).slice(0, 100)}"` });
    const plan = await this.plan(prompt, { fresh });
    if (addMessage) addMessage({ kind: 'ok', text: `\u2713 plan generated — ${plan.todos.length} todos across ${new Set(plan.todos.map((t) => t.domain)).size} domains` });

    const results = await this.runPlan(plan, { confirmFn, noTests });
    if (!results) return null;

    if (addMessage) {
      addMessage({ kind: 'ok', text: `\u2713 integration build passed · todos ${results.done}/${results.total} (failed: ${results.failed}, review: ${results.needsReview})` });
    }

    const elapsedSecs = (Date.now() - t0) / 1000;
    const summary = {
      ...results,
      elapsedSecs,
      provider: plan.model,
      deployTarget,
      projectName: this.projectPath.split(/[\\/]/).pop() || 'mcode build'
    };
    this.bus.emit(EVENTS.BUILD_COMPLETE, summary);

    // handoff to watch mode
    if (this.options.watchAfter) {
      await this.startWatch();
    }

    if (addMessage && deployTarget) {
      addMessage({ kind: 'ok', text: `\u2192 deploy: ${deployTarget}` });
    }
    return summary;
  }

  async startWatch(opts = {}) {
    const { WatchDaemon } = await import('./watch-daemon.js');
    this.watchDaemon = new WatchDaemon({
      projectPath: this.projectPath,
      config: { ...DEFAULT_CONFIG.watch, ...(this.config?.watch || {}), ...opts },
      bus: this.bus,
      router: this.router,
      undoStack: this.undoStack,
      projectId: this.sessionId
    });
    await this.watchDaemon.start();
    return this.watchDaemon;
  }

  async stopWatch() {
    await this.watchDaemon?.stop();
    this.watchDaemon = null;
  }

  get watchStatus() {
    return this.watchDaemon?.status || 'off';
  }
}
