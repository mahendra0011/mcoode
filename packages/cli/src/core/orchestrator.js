import { EventEmitter } from 'node:events';
import { io } from 'socket.io-client';
import { EVENTS, SOCKET, DEFAULT_CONFIG, CostLedger } from '@mcode/shared';
import { Planner } from './planner.js';
import { ModelRouter, MODES } from './router.js';
import { detectTechStack, smartDefaults } from './techstack.js';
import { SubagentManager } from './subagent-manager.js';
import { UndoStack } from './tools.js';
import { AuditLog } from './audit.js';
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
  [EVENTS.WAVE_START]: SOCKET.CLIENT_TO_SERVER.WAVE_START,
  [EVENTS.WAVE_COMPLETE]: SOCKET.CLIENT_TO_SERVER.WAVE_COMPLETE,
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
    this.auditLog = null;
    this.socket = null;
    this.sessionId = null;
    this.watchDaemon = null;
    this.connectedToBackend = false;
    this.options = options;
    this.modelOverride = options.modelOverride || config?.modelOverride || null;
    this.verbose = Boolean(options.verbose);
    this.mode = MODES.includes(options.mode) ? options.mode : (MODES.includes(config?.mode) ? config.mode : 'medium');
    this.chatAgentEnabled = config?.chatAgent !== false;
    this.chatHistory = [];
    this.chatAgent = null;
  }

  /** Agent-mode chat on/off. Persisted by the caller. */
  setChatAgent(on) {
    this.chatAgentEnabled = Boolean(on);
    return this.chatAgentEnabled;
  }

  /** Forget the running conversation (used by /clear). */
  clearChat() {
    this.chatHistory = [];
  }

  /**
   * Get or create a domain-specialized agent.
   * Instead of a single ChatAgent for god-mode, creates dedicated agents
   * per domain (frontend, backend, db, devops, test, bugfix, docs, planning)
   * so they can work in parallel with domain-optimized model selection.
   * Mirrors Z Code's specialized subagent pattern.
   */
  async getSpecializedAgent(domain) {
    if (!this._specializedAgents) this._specializedAgents = new Map();

    if (this._specializedAgents.has(domain)) {
      return this._specializedAgents.get(domain);
    }

    // Use cached assignment if available (warmed up at init)
    const assignment = this.router.getCachedAssignment(domain) || await this.router.pick(domain);
    if (!assignment) return null;

    const { ChatAgent } = await import('./chat-agent.js');
    const agent = new ChatAgent({
      assignment,
      projectPath: this.projectPath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: { ...this.config, forceDomain: domain },
      reasoning: this.router?.reasoning || null,
      history: [], // each domain gets its own context window
      maxTurns: this.config?.maxTurnsPerAgent || 15,
      allowShellAll: this.config?.allowShellAll || false,
      domain: domain
    });

    this._specializedAgents.set(domain, agent);
    return agent;
  }

  /** Clear specialized agents to free context windows between builds */
  clearSpecializedAgents() {
    if (this._specializedAgents) {
      for (const agent of this._specializedAgents.values()) {
        agent.clearHistory?.();
      }
      this._specializedAgents.clear();
    }
  }

  /** Switch the quality/speed dial. Persisted by the caller. */
  setMode(mode) {
    this.mode = this.router ? this.router.setMode(mode) : mode;
    return this.mode;
  }

  async reloadConfig() {
    this.config = await loadConfig({ force: true });
    this.secrets = await loadVault();
    this.providers = await getProviders({ secrets: this.secrets, config: this.config });
    this.router = new ModelRouter({
      secrets: this.secrets,
      config: this.config,
      ledger: this.ledger,
      providers: this.providers
    });
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
    this.auditLog = new AuditLog({ projectId: this.sessionId });
    this.on(EVENTS.SUBAGENT_TOOL_CALL, (p) => {
      if (this.verbose) process.stderr.write(`[tool] ${p.tool} ${p.args}\n`);
    });
    this.on(EVENTS.SUBAGENT_FILE, (p) => {
      if (p.file && p.content) {
        this.emit(EVENTS.MESSAGE, { kind: 'code', id: `${Date.now()}-${p.todoId || ''}`, title: p.file, code: p.content });
      }
    });
    this._tryConnectBackend();

    // Warm up model assignments for all domains (non-blocking)
    this.router.warmUp().catch(() => { /* models will be resolved on-demand */ });

    return this;
  }

  async _initUndo() {
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    this.undoStack = new UndoStack({
      filePath: join(homedir(), '.mcode', 'projects', this.sessionId, 'undo.json'),
      projectPath: this.projectPath
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
    },
    on: (event, fn) => {
      this.on(event, fn);
      return this;
    },
    off: (event, fn) => {
      this.off(event, fn);
      return this;
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

    // Detect tech stack for smart context injection
    const stack = await detectTechStack(this.projectPath);
    const defaults = smartDefaults(stack);

    out.push(`--- tech stack ---\nfrontend: ${stack.frontend.join(', ') || 'none'}\nbackend: ${stack.backend.join(', ') || 'none'}\ndatabases: ${stack.databases.join(', ') || 'none'}\ntest frameworks: ${stack.testFrameworks.join(', ') || 'none'}\nbuild tools: ${stack.buildTools.join(', ') || 'none'}\nlanguages: ${stack.languages.join(', ')}\npackage manager: ${stack.packageManager}\nsmart defaults: test=${defaults.testCommand}, build=${defaults.buildCommand}, port=${defaults.devPort}`);

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
      config: { ...DEFAULT_CONFIG, ...this.config, auditLog: this.auditLog },
      bus: this.bus,
      options: {
        ledger: this.ledger,
        undoStack: this.undoStack,
        skipIntegrationTests: Boolean(noTests),
        forceRef: this.modelOverride,
        maxAgents: this.options.maxAgents
      }
    });
    return this.manager.runAll();
  }

  async chat(prompt) {
    const assignment = (this.modelOverride && await this.router.find(this.modelOverride))
      || await this.router.pick('build');
    if (!assignment) throw new Error('no model available for chat');

    if (this.chatAgentEnabled) {
      const { ChatAgent } = await import('./chat-agent.js');
      const agent = new ChatAgent({
        assignment,
        projectPath: this.projectPath,
        bus: this.bus,
        undoStack: this.undoStack,
        config: this.config,
        reasoning: this.router?.reasoning || null,
        history: this.chatHistory
      });
      this.chatAgent = agent;
      try {
        const out = await agent.run(prompt);
        this.chatHistory = out.history;
        return { text: out.text, interrupted: Boolean(out.interrupted) };
      } finally {
        this.chatAgent = null;
      }
    }

    const stream = assignment.provider.stream(assignment.model.id, {
      messages: [
        {
          role: 'system',
          content: 'You are mcode, a terminal-first AI coding assistant. Be concise and technical.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      reasoning: this.router?.reasoning || null
    });
    let full = '';
    for await (const chunk of stream) {
      full += chunk;
      this.emit(EVENTS.MESSAGE, { kind: 'stream', text: full });
    }
    return { text: full, interrupted: false };
  }

  /** Cancel an in-flight chat run or specialized agents (Esc / Ctrl+C mid-turn). */
  interrupt() {
    this.chatAgent?.abort();
    // Interrupt any running specialized agents in god-mode
    if (this._specializedAgents) {
      for (const agent of this._specializedAgents.values()) {
        agent?.abort?.();
      }
    }
  }

  /** Resolve a pending permission prompt (y/n/always). */
  answerPermission(requestId, answer) {
    this.bus.emit(EVENTS.PERMISSION_ANSWER, { requestId, answer });
  }

  async undo(id = null) {
    const file = await this.undoStack.undo(id);
    this.emit(EVENTS.UNDO, { file, undoId: id });
    return file;
  }

  /** Revert the last watch-daemon auto-fix from the watch undo stack. */
  async undoWatch() {
    const stack = this.watchDaemon?.undoStack;
    if (!stack) return null;
    const file = await stack.undo();
    if (file) this.emit(EVENTS.UNDO, { file, watch: true });
    return file;
  }

  /**
   * God Mode — full one-prompt-to-delivery pipeline.
   * Integrates planning → wave-based parallel subagents → integration tests →
   * watch mode daemon (continuous monitoring).
   *
   * Flow:
   *   1. Clear specialized agents (free context windows)
   *   2. Plan generation
   *   3. Run plan (parallel subagent waves)
   *   4. Integration tests + bugfix rounds
   *   5. Start watch mode daemon for continuous monitoring
   */
  async runGod(prompt, { confirmFn = null, addMessage = null, fresh = false, deployTarget = null, noTests = false } = {}) {
    const t0 = Date.now();
    // Clear any existing specialized agents to free context windows
    this.clearSpecializedAgents();
    this.emit(EVENTS.MESSAGE, { kind: 'system', text: `\u25b8 god mode: "${String(prompt).slice(0, 100)}"` });
    const plan = await this.plan(prompt, { fresh });
    if (addMessage) addMessage({ kind: 'ok', text: `\u2713 plan generated — ${plan.todos.length} todos across ${new Set(plan.todos.map((t) => t.domain)).size} domains` });

    let metrics = null;
    const onBuild = (p) => { metrics = p; };
    this.on(EVENTS.BUILD_COMPLETE, onBuild);
    const results = await this.runPlan(plan, { confirmFn, noTests });
    this.off(EVENTS.BUILD_COMPLETE, onBuild);
    if (!results) return null;

    if (addMessage) {
      addMessage({ kind: 'ok', text: `\u2713 integration build passed · todos ${results.done}/${results.total} (failed: ${results.failed}, review: ${results.needsReview})` });
    }

    const elapsedSecs = (Date.now() - t0) / 1000;
    const summary = {
      ...results,
      ...(metrics || {}),
      elapsedSecs,
      provider: plan.model,
      deployTarget,
      projectName: this.projectPath.split(/[\\/]/).pop() || 'mcode build'
    };
    this.bus.emit(EVENTS.BUILD_COMPLETE, summary);

    // handoff to watch mode — continuous monitoring after build
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
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    this.watchDaemon = new WatchDaemon({
      projectPath: this.projectPath,
      config: { ...DEFAULT_CONFIG.watch, ...(this.config?.watch || {}), ...opts },
      bus: this.bus,
      router: this.router,
      undoStack: new UndoStack({
        filePath: join(homedir(), '.mcode', 'projects', this.sessionId, 'undo-watch.json'),
        projectPath: this.projectPath
      }),
      projectId: this.sessionId,
      confirmHandler: this.watchConfirmHandler || null
    });
    await this.watchDaemon.start();
    return this.watchDaemon;
  }

  /** Register a y/n confirm callback used when watch is in confirm mode. */
  setWatchConfirmHandler(fn) {
    this.watchConfirmHandler = fn;
  }

  async stopWatch() {
    await this.watchDaemon?.stop();
    this.watchDaemon = null;
  }

  get watchStatus() {
    return this.watchDaemon?.status || 'off';
  }

  get watchMaxPerHour() {
    return this.watchDaemon?.config?.maxFixesPerHour || 60;
  }

  /**
   * God Mode watch integration — start the watch daemon with
   * continuous monitoring enabled. Called after a god-mode build
   * completes to keep the project under surveillance.
   *
   * The watch daemon runs as an in-process loop (chokidar + interval scan),
   * emitting WATCH_SCAN, WATCH_CHANGE, and WATCH_FIX events that the UI
   * picks up for the ProcessingScreen dashboard.
   */
  async startGodWatch(opts = {}) {
    const daemon = await this.startWatch({
      ...opts,
      autoCommit: this.config?.watch?.autoCommit || false,
      confirm: this.config?.watch?.confirm || false
    });

    // Emit initial watch status for dashboard
    this.bus?.emit(EVENTS.WATCH_STATUS, 'active');
    this.bus?.emit(EVENTS.MESSAGE, {
      kind: 'system',
      text: 'god watch: continuous monitoring active — file changes auto-analyzed'
    });

    return daemon;
  }

  /** Get the watch daemon summary for dashboard display. */
  getWatchSummary() {
    return this.watchDaemon?.summary() || null;
  }

  /** Check if watch daemon is running and monitoring. */
  get godWatchActive() {
    return this.watchDaemon?.running || false;
  }
}
