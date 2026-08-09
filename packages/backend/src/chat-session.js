import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { db } from './db.js';
import { deriveMasterKey, decryptKey } from './secret-enc.js';
import { EVENTS, SOCKET, CostLedger } from '@mcode/shared';
const S2C = SOCKET.SERVER_TO_CLIENT;

/**
 * Regex matching prompts that are simple/repetitive and don't warrant the
 * planning step (greetings, acknowledgments, trivial one-word commands).
 * Even when a prompt is > 50 chars, a match here means skip planning.
 */
const SIMPLE_PROMPT_RE = /^(hi\b|hello\b|hey\b|thanks?\b|ok(ay)?\b|yes\b|no\b|yep\b|nope\b|lol\b|undo\b|clear\b|help\b|new chat\b|stop\b|cancel\b|exit\b|restart\b|run tests?\b|build\b)/i;

/**
 * Determine whether a prompt warrants the planning step.
 * Skip planning for short prompts (< 50 chars) or prompts matching
 * trivial patterns (greetings, one-word commands, etc.).
 *
 * CLI's orchestrator.runGod() always plans unconditionally — this only
 * gates the web ChatSession.runAgent() planner invocation.
 */
function promptNeedsPlanning(prompt) {
  const p = String(prompt || '').trim();
  if (p.length < 50) return false;
  if (SIMPLE_PROMPT_RE.test(p)) return false;
  return true;
}

/**
 * ChatSession — bridges the CLI's ChatAgent/ToolExecutor to a web socket client.
 * One session per connected socket. Reuses the CLI's ChatAgent, ModelRouter,
 * and provider adapters directly — no logic is reimplemented.
 */
export class ChatSession {
  constructor({ userId, secret, workspacePath, modelRef = null, onEvent = () => {} } = {}) {
    this.userId = userId;
    this.secret = secret;
    this.workspacePath = workspacePath;
    this.modelRef = modelRef; // user-selected model ref (e.g. "poolside:poolside/laguna-s-2.1")
    this.onEvent = onEvent; // (event, payload) => forwards to socket client
    this.bus = null;       // EventEmitter — passed to ChatAgent as its `bus`
    this.providers = null;
    this.router = null;
    this.chatAgent = null;
    this.history = [];
    this.undoStack = null;
    this.initialized = false;
    this.running = false;
    this.config = { chatAgentTurns: 15, allowShellAll: false, requireEditApproval: false };
  }

  /** Load user's API keys, decrypt, initialize providers + router. */
  async init() {
    const keys = await db().apiKey.find({ userId: this.userId });
    const masterKey = deriveMasterKey(this.secret, this.userId);

    const secrets = {};
    for (const k of keys) {
      try {
        secrets[k.envVar] = decryptKey(k.encryptedKey, masterKey);
      } catch {
        /* skip undecryptable key */
      }
    }

    if (Object.keys(secrets).length === 0) {
      this.onEvent(S2C.CHAT_ERROR, {
        message: 'please select your api keys to use mcode',
        kind: 'keys'
      });
      this.initialized = false;
      return false;
    }

    // Dynamically import CLI's provider factory + router + tools
    const { getProviders } = await import('mcode-cli/providers');
    const { ModelRouter } = await import('mcode-cli/router');
    const { UndoStack } = await import('mcode-cli/tools');

    this.providers = await getProviders({ secrets });
    this.router = new ModelRouter({ secrets, config: this.config, ledger: new CostLedger(), providers: this.providers });

    // Apply the user-selected model ref from the frontend as a router override.
    // If modelRef is a provider id (e.g. "poolside"), router.find() falls back
    // to the first model from that provider. If it's a full ref
    // (e.g. "poolside:poolside/laguna-s-2.1"), it resolves exactly.
    if (this.modelRef) {
      this.router.modelOverride = this.modelRef;
    }

    // Load user settings from DB and apply
    const userSettings = await db().userSettings.findOne({ userId: this.userId });
    if (userSettings) {
      this.config.allowShellAll = Boolean(userSettings.allowShellAll);
      this.config.requireEditApproval = Boolean(userSettings.requireEditApproval);
      if (userSettings.modelOverrides) {
        this.router.userModelOverrides = userSettings.modelOverrides;
      }
      if (userSettings.networkWhitelist) {
        this.config.networkWhitelist = userSettings.networkWhitelist;
      }
      if (userSettings.watchDefaults) {
        this.config.watchDefaults = userSettings.watchDefaults;
      }
      if (userSettings.godModeDefaults) {
        this.config.godModeDefaults = userSettings.godModeDefaults;
      }
    }

    // Set up the undo stack for file operations in this workspace
    const userDir = join(homedir(), '.mcode', 'workspaces', String(this.userId).slice(-12));
    await mkdir(userDir, { recursive: true });
    this.undoStack = new UndoStack({
      filePath: join(userDir, 'undo.json'),
      projectPath: this.workspacePath
    });
    await this.undoStack.load();

    // Set up the audit log (mirrors the CLI orchestrator's pattern)
    const { AuditLog } = await import('mcode-cli/audit');
    this.auditLog = new AuditLog({ projectId: String(this.userId).slice(-12) });

    this.initialized = true;
    return true;
  }

  /** Start a chat or agent session. Sets up the bus and forwards events to client. */
  async start() {
    if (!this.initialized) {
      const ok = await this.init();
      if (!ok) return false;
    }

    // Create a fresh EventEmitter for this chat session
    this.bus = new EventEmitter();
    this.bus.on(EVENTS.MESSAGE, (msg) => {
      // Stream chunks must go through CHAT_STREAM so the client appends
      // text to the last message instead of creating a new one per chunk.
      // All other message types (tool results, system, summary, etc.)
      // are forwarded as CHAT_MESSAGE.
      if (msg.kind === 'stream') {
        this.onEvent(S2C.CHAT_STREAM, msg);
        return;
      }
      this.onEvent(S2C.CHAT_MESSAGE, msg);
      // Special: permission requests need a dedicated client event
      if (msg.block === 'permission' && msg.status === 'running') {
        this.onEvent(S2C.CHAT_PERMISSION, msg);
      }
    });

    this.bus.on('SUBAGENT_SHELL_OUTPUT', (payload) => {
      this.onEvent(S2C.CHAT_SHELL_STREAM, payload);
    });

    // Persist "Always Allow" from the permission modal so future sessions
    // (and page refreshes) don't re-prompt for shell commands.
    this.bus.on('permission:always_granted', async () => {
      this.config.allowShellAll = true;
      try {
        await db().userSettings.updateOne(
          { userId: this.userId },
          { $set: { allowShellAll: true } }
        );
      } catch (e) {
        console.error('Failed to persist allowShellAll to user settings:', e);
      }
    });

    // ── God-mode bus listeners (Phase 3) ──────────────────────────
    // Forward all subagent/wave/integration/build events to the web client
    // via dedicated Server-to-Client socket events.
    const godEventMap = {
      [EVENTS.SUBAGENT_CREATED]: S2C.SUBAGENT_CREATED,
      [EVENTS.SUBAGENT_ASSIGNED]: S2C.SUBAGENT_ASSIGNED,
      [EVENTS.SUBAGENT_STARTED]: S2C.SUBAGENT_STARTED,
      [EVENTS.SUBAGENT_STEP]: S2C.SUBAGENT_STEP,
      [EVENTS.SUBAGENT_DONE]: S2C.SUBAGENT_DONE,
      [EVENTS.SUBAGENT_FAILED]: S2C.SUBAGENT_FAILED,
      [EVENTS.SUBAGENT_FILE]: S2C.SUBAGENT_FILE,
      [EVENTS.SUBAGENT_TOOL_CALL]: S2C.SUBAGENT_TOOL_CALL,
      [EVENTS.SUBAGENT_TOOL_RESULT]: S2C.SUBAGENT_TOOL_RESULT,
      [EVENTS.SUBAGENT_NEEDS_REVIEW]: S2C.SUBAGENT_NEEDS_REVIEW,
      [EVENTS.WAVE_START]: S2C.WAVE_START,
      [EVENTS.WAVE_COMPLETE]: S2C.WAVE_COMPLETE,
      [EVENTS.INTEGRATION_PASS]: S2C.INTEGRATION_PASS,
      [EVENTS.BUILD_COMPLETE]: S2C.BUILD_COMPLETE,
      [EVENTS.TOAST]: S2C.TOAST,
    };
    this._godForwarder = (event, payload) => {
      const s2cEvent = godEventMap[event];
      if (s2cEvent) this.onEvent(s2cEvent, payload);
    };
    for (const evt of Object.keys(godEventMap)) {
      this.bus.on(evt, this._godForwarder);
    }

    return true;
  }

  /** God-mode parallel build — same as orchestrator.runGod() but driven from ChatSession.
   *  Creates a plan, runs SubagentManager with wave-based parallelism,
   *  and forwards all events to the web client. */
  async runGod(prompt, { deployTarget = null, noTests = false } = {}) {
    const t0 = Date.now();
    this.onEvent(S2C.CHAT_MESSAGE, {
      kind: 'system',
      text: `⚡ god mode: "${String(prompt).slice(0, 100)}"`,
      ts: Date.now()
    });

    // Phase 2: Planner — always runs in god-mode (no heuristic gate)
    const { Planner } = await import('mcode-cli/planner');
    const { DEFAULT_CONFIG } = await import('@mcode/shared');

    let repoContext = '';
    try {
      const { detectTechStack, smartDefaults } = await import('mcode-cli/techstack');
      const stack = await detectTechStack(this.workspacePath);
      const defaults = smartDefaults(stack);
      repoContext = `--- tech stack ---\nfrontend: ${stack.frontend.join(', ') || 'none'}\nbackend: ${stack.backend.join(', ') || 'none'}\ndatabases: ${stack.databases.join(', ') || 'none'}\ntest frameworks: ${stack.testFrameworks.join(', ') || 'none'}\nbuild tools: ${stack.buildTools.join(', ') || 'none'}\nlanguages: ${stack.languages.join(', ')}\npackage manager: ${stack.packageManager}\nsmart defaults: test=${defaults.testCommand}, build=${defaults.buildCommand}, port=${defaults.devPort}`;
    } catch {
      /* optional — continue with empty repo context */
    }

    let plan;
    try {
      const planner = new Planner({ router: this.router, bus: this.bus });
      plan = await planner.plan(prompt, { repoContext, projectPath: this.workspacePath });
      this.onEvent(S2C.CHAT_TODO_PLAN, { todos: plan.todos, summary: plan.summary });
      this.onEvent(S2C.TOAST, { kind: 'ok', text: `✓ plan generated — ${plan.todos.length} todos across ${new Set(plan.todos.map((t) => t.domain)).size} domains` });
    } catch (e) {
      console.error('Planner error:', e);
      this.onEvent(S2C.CHAT_ERROR, { message: `plan failed: ${e.message}` });
      return null;
    }

    // Phase 2: SubagentManager — wave-based parallel execution
    const { SubagentManager } = await import('mcode-cli/subagent-manager');

    this.manager = new SubagentManager({
      plan,
      router: this.router,
      projectPath: this.workspacePath,
      config: { ...DEFAULT_CONFIG, ...this.config, auditLog: this.auditLog },
      bus: this.bus,
      options: {
        ledger: this.router?.ledger,
        undoStack: this.undoStack,
        forceRef: this.modelRef,
        maxAgents: this.config?.maxAgents
      }
    });

    const results = await this.manager.runAll();
    if (!results) {
      this.onEvent(S2C.CHAT_ERROR, { message: 'god-mode build failed' });
      return null;
    }

    const elapsedSecs = (Date.now() - t0) / 1000;
    const summary = {
      ...results,
      elapsedSecs,
      deployTarget,
      projectName: this.workspacePath.split(/[\\/]/).pop() || 'mcode build'
    };

    this.onEvent(S2C.BUILD_COMPLETE, summary);
    this.onEvent(S2C.CHAT_DONE, { mode: 'god', ...summary });

    // Hand off to watch mode if requested
    if (this.config?.watchAfter) {
      await this.startWatch();
    }

    return summary;
  }

  /** Start the watch daemon from ChatSession (for god-mode watchAfter). */
  async startWatch(opts = {}) {
    const { WatchDaemon } = await import('mcode-cli/watch-daemon');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    this.watchDaemon = new WatchDaemon({
      projectPath: this.workspacePath,
      config: { ...DEFAULT_CONFIG.watch, ...(this.config?.watch || {}), ...opts },
      bus: this.bus,
      router: this.router,
      undoStack: new (await import('mcode-cli/tools')).UndoStack({
        filePath: join(homedir(), '.mcode', 'workspaces', String(this.userId).slice(-12), 'undo-watch.json'),
        projectPath: this.workspacePath
      }),
      projectId: String(this.userId).slice(-12),
      confirmHandler: null
    });
    await this.watchDaemon.start();
    return this.watchDaemon;
  }

  /** Handle a permission answer from the client. */
  handlePermissionAnswer(payload) {
    if (this.bus) {
      this.bus.emit(EVENTS.PERMISSION_ANSWER, payload);
    }
  }

  /** Handle an interrupt from the client. */
  interrupt() {
    if (this.chatAgent) {
      this.chatAgent.abort();
    }
  }

  /** Plain LLM chat with limited tools (read/search only) — no writes, no shell. */
  async runChat(prompt) {
    const assignment = (this.router.modelOverride && await this.router.find(this.router.modelOverride))
      || await this.router.pick('general');

    if (!assignment) {
      this.onEvent(S2C.CHAT_ERROR, { message: 'no model available for chat' });
      return;
    }

    const { ChatAgent } = await import('mcode-cli/chat-agent');

    // Create a strict read-only config for normal chat
    const chatConfig = {
      ...this.config,
      allowShellAll: false,
      requireEditApproval: true,
      domain: 'chat' // This will be passed to ToolExecutor to restrict tools
    };

    const agent = new ChatAgent({
      assignment,
      projectPath: this.workspacePath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: chatConfig,
      reasoning: this.router?.reasoning || null,
      history: this.history,
      onTool: ({ tool, args, replaceKey }) => {
        this.onEvent(S2C.CHAT_TOOL_CALL, { tool, args, replaceKey, status: 'running', timestamp: Date.now() });
      }
    });

    this.chatAgent = agent;
    try {
      const out = await agent.run(prompt);
      this.history = out.history;
      this.onEvent(S2C.CHAT_DONE, {
        text: out.text,
        turns: out.turns,
        interrupted: Boolean(out.interrupted),
        mode: 'chat'
      });
    } finally {
      this.chatAgent = null;
    }
  }

  /** Full agent mode — uses ChatAgent with tools (read/write/edit/shell/search/git/test). */
  async runAgent(prompt) {
    const assignment = (this.router.modelOverride && await this.router.find(this.router.modelOverride))
      || await this.router.pick('build');

    if (!assignment) {
      this.onEvent(S2C.CHAT_ERROR, { message: 'no model available for agent' });
      return;
    }

    const { ChatAgent } = await import('mcode-cli/chat-agent');
    const { Planner } = await import('mcode-cli/planner');

    let plan = null;
    if (promptNeedsPlanning(prompt)) {
      try {
        const planner = new Planner({ router: this.router, bus: this.bus });
        plan = await planner.plan(prompt, { repoContext: '' });
        this.onEvent(S2C.CHAT_TODO_PLAN, { todos: plan.todos, summary: plan.summary });
      } catch (e) {
        console.error('Planner error:', e);
        // continue without a plan if it fails
      }
    }

    const agent = new ChatAgent({
      assignment,
      projectPath: this.workspacePath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: this.config,
      reasoning: this.router?.reasoning || null,
      history: this.history,
      onTool: ({ tool, args, replaceKey }) => {
        this.onEvent(S2C.CHAT_TOOL_CALL, { tool, args, replaceKey, status: 'running', timestamp: Date.now() });
      }
    });

    // Listen to messages to update todo status
    const updateTodos = (msg) => {
      if (plan && plan.todos && msg.kind === 'tool' && msg.status === 'done' && (msg.tool === 'write_file' || msg.tool === 'edit_file')) {
        const changedFile = msg.path;
        if (!changedFile) return;

        for (const todo of plan.todos) {
          if (todo.status === 'done') continue;
          
          if (todo.files && todo.files.includes(changedFile)) {
            if (!todo.completedFiles) todo.completedFiles = new Set();
            todo.completedFiles.add(changedFile);
            
            if (todo.completedFiles.size >= todo.files.length) {
              todo.status = 'done';
              this.onEvent(S2C.CHAT_TODO_UPDATE, { id: todo.id, status: 'done' });
            } else {
              todo.status = 'in_progress';
              this.onEvent(S2C.CHAT_TODO_UPDATE, { id: todo.id, status: 'in_progress' });
            }
          }
        }
      }
    };
    this.bus.on(EVENTS.MESSAGE, updateTodos);

    this.chatAgent = agent;
    try {
      const out = await agent.run(prompt);
      this.history = out.history;
      this.onEvent(S2C.CHAT_DONE, {
        text: out.text,
        turns: out.turns,
        interrupted: Boolean(out.interrupted),
        mode: 'agent'
      });
    } finally {
      this.bus.off(EVENTS.MESSAGE, updateTodos);
      this.chatAgent = null;
    }
  }

  /** Send a message — dispatches to chat or agent mode. */
  async sendMessage(prompt, mode = 'chat') {
    if (this.running) {
      this.onEvent(S2C.CHAT_ERROR, { message: 'a message is already being processed — please wait' });
      return;
    }
    if (!this.bus) {
      await this.start();
      if (!this.initialized) return;
    }
    this.running = true;
    try {
      if (mode === 'agent') {
        await this.runAgent(prompt);
      } else {
        await this.runChat(prompt);
      }
    } finally {
      this.running = false;
    }
  }

  /** Clean up resources. */
  cleanup() {
    this.interrupt();
    this.bus = null;
    this.chatAgent = null;
    this.running = false;
  }
}
