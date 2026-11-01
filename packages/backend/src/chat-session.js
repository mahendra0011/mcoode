import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { db } from './db.js';
import { keyManagerFromEnv } from './secret-enc.js';
import { EVENTS, SOCKET, CostLedger } from '@mcode/shared';
const S2C = SOCKET.SERVER_TO_CLIENT;

/**
 * Regex matching prompts that are simple/repetitive and don't warrant the
 * planning step (greetings, acknowledgments, trivial one-word commands).
 * Even when a prompt is > 50 chars, a match here means skip planning.
 */
const SIMPLE_PROMPT_RE = /^(hi\b|hello\b|hey\b|thanks?\b|ok(ay)?\b|yes\b|no\b|yep\b|nope\b|lol\b|undo\b|clear\b|help\b|new chat\b|stop\b|cancel\b|exit\b|restart\b|run tests?\b|build\b)/i;

/** Keywords that trigger automatic web search in chat mode (like Claude/Perplexity). */
// 044: tightened — bare words like "best", "cost", "review", "new" or
// "find" fired searches for plain coding questions ("best way to sort").
// Only explicit research signals trigger now.
const AUTO_SEARCH_RE = /\b(web\s*search|google|browse|internet|prices?|cheapest|latest|current|news|tutorial|how to|where to|deal|discount|vs\b|comparison|who is|who was|who are|capital of|when was|when did|history of|tell me about|what happened|today|weather|stocks?|top\s+\d+)\b/i;

const BUILD_KEYWORDS_RE = /\b(create|build|make|generate|develop|implement|design|write|add|setup|init|clone|website|app|application|page|dashboard|store|ecommerce|e-commerce|shop|api|game|service|bot|system|portfolio|calculator|todo|banao|banaye|karo|chahiye)\b/i;
const QUESTION_CHAT_RE = /^(what|why|how|explain|tell me|who|when|where|which|can you explain|difference between)\b/i;

/**
 * Determine whether a prompt warrants the planning step.
 * Any prompt matching build/create keywords (e.g. "make an ecommerce website",
 * "build a todo app", "create dashboard") automatically plans so granular
 * todos can be tracked in the UI and executed by the agent.
 */
function promptNeedsPlanning(prompt) {
  const p = String(prompt || '').trim();
  if (SIMPLE_PROMPT_RE.test(p)) return false;
  if (BUILD_KEYWORDS_RE.test(p)) return true;
  if (QUESTION_CHAT_RE.test(p)) return false;
  if (p.length < 50) return false;
  return true;
}

/**
 * ChatSession — bridges the CLI's ChatAgent/ToolExecutor to a web socket client.
 * One session per connected socket. Reuses the CLI's ChatAgent, ModelRouter,
 * and provider adapters directly — no logic is reimplemented.
 */
export const OUTPUT_LENGTH_MAP = {
  very_low: 512,
  low: 1024,
  mid: 2048,
  high: 4096,
  xhigh: 8192,
  max: 16384,
  ultra: 32768,
};

export class ChatSession {
  /**
   * @param {object} [opts]
   * @param {string} [opts.userId]
   * @param {string} [opts.secret]
   * @param {object} [opts.env] environment source for API_KEY_ENCRYPTION_* fallback
   * @param {string} [opts.workspacePath]
   * @param {string|null} [opts.modelRef]
   * @param {(event: string, payload?: any) => void} [opts.onEvent]
   */
  constructor({ userId, secret, env = process.env, workspacePath, modelRef = null, outputLength = 'xhigh', onEvent = () => {} } = {}) {
    this.userId = userId;
    this.secret = secret;
    this.env = env;
    // BSEC-001: at-rest decryption via the dedicated keyring when configured.
    this.keyManager = keyManagerFromEnv({ secret, env });
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
    this.outputLength = outputLength || 'xhigh';
    this.config = { chatAgentTurns: 15, allowShellAll: false, requireEditApproval: false };
  }

  /** Load user's API keys, decrypt, initialize providers + router. */
  async init() {
    const keys = await db().apiKey.find({ userId: this.userId });

    const secrets = {};
    for (const k of keys) {
      try {
        const dec = this.keyManager.decrypt(k.encryptedKey, this.userId);
        if (dec && !/[\u2022\u25cf\u2219]/.test(dec) && dec !== 'existing-key') {
          secrets[k.envVar] = dec;
        }
      } catch {
        /* skip undecryptable key */
      }
    }

    // Merge environment variables from process.env as fallback
    for (const [envK, envV] of Object.entries(this.env || {})) {
      if (envV && !secrets[envK] && (envK.endsWith('_API_KEY') || envK.endsWith('_KEY') || envK.endsWith('_HOST') || envK.endsWith('_TOKEN'))) {
        secrets[envK] = envV;
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
    } else {
      this.router.modelOverride = 'openrouter:openrouter/free';
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

    // Per-user long-term memory file (Claude-style durable facts — chat mode only)
    this.memoryDir = join(userDir, 'memory.md');

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
    // Transcript persistence: one db session row per ChatSession, every
    // finalized (non-stream) message stored with sessionId. Powers
    // /sessions/:id transcripts + usage message counts + future replay.
    try {
      const row = await db().session.create({
        userId: this.userId,
        projectName: this.workspacePath ? String(this.workspacePath).split(/[\\/]/).pop() : 'mcode chat',
        mode: 'chat',
        status: 'active',
        plan: null,
        createdAt: new Date(),
      });
      this.dbSessionId = row._id;
    } catch {
      this.dbSessionId = null;
    }
    const persist = (role, text) => {
      if (!this.dbSessionId || !text) return;
      db().chatMessage.create({
        sessionId: this.dbSessionId,
        role,
        content: String(text).slice(0, 20000),
        timestamp: new Date(),
      }).catch(() => {});
    };
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
      if ((msg.status === 'done' || msg.kind === 'summary') && msg.kind !== 'user') {
        persist('assistant', msg.text || msg.content || '');
      }
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
    // FIX: runGod bypassed sendMessage's running flag — a "build" sent while
    // one already runs double-executed in the same session.
    this.running = true;
    try {
      return await this._runGodInner(prompt, { deployTarget, noTests });
    } finally {
      this.running = false;
    }
  }

  async _runGodInner(prompt, { deployTarget = null, noTests = false } = {}) {
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
      // FIX: without a terminal CHAT_DONE the client spinner hung forever.
      this.onEvent(S2C.CHAT_DONE, { mode: 'god', error: true, interrupted: false });
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
      // FIX: without a terminal CHAT_DONE the client spinner hung forever.
      this.onEvent(S2C.CHAT_DONE, { mode: 'god', error: true, interrupted: false });
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
    const { DEFAULT_CONFIG } = await import('@mcode/shared');
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

  /** Test Mode (doc 48) — autonomous self-healing testing agent, driven from the web.
   *  Mirrors runGod(): builds a test-mode bus, forwards all TEST_* events to
   *  the web client, runs the CLI's test-mode core, and emits chat:done. */
  async runTestMode(prompt, { types = null, targetUrl = null, allowRemote = false } = {}) {
    const t0 = Date.now();
    this.onEvent(S2C.CHAT_MESSAGE, {
      kind: 'system',
      text: `🧪 test mode: "${String(prompt || 'autonomous self-healing testing').slice(0, 100)}"`,
      ts: Date.now()
    });

    // Parse requested types from the prompt when not explicitly given
    // (e.g. "run autonomous + unit tests" → ['autonomous', 'unit']).
    let selectedTypes = Array.isArray(types) && types.length > 0 ? types : null;
    if (!selectedTypes) {
      const p = String(prompt || '').toLowerCase();
      selectedTypes = [];
      if (/autonomous|exploratory|e2e|browser|real user/.test(p)) selectedTypes.push('autonomous');
      if (/unit/.test(p)) selectedTypes.push('unit');
      if (/integration/.test(p)) selectedTypes.push('integration');
      if (/load|performance/.test(p)) selectedTypes.push('load');
      if (/a11y|accessib/.test(p)) selectedTypes.push('a11y');
      if (selectedTypes.length === 0) selectedTypes = ['autonomous'];
    }

    // Test-mode bus — forwards TEST_* events to dedicated S2C socket events
    const { EVENTS: E } = await import('@mcode/shared');
    const testEventMap = {
      [E.TEST_MODE_STARTED]: S2C.TEST_MODE_STARTED,
      [E.TEST_INVENTORY]: S2C.TEST_INVENTORY,
      [E.TEST_FEATURE_START]: S2C.TEST_FEATURE_START,
      [E.TEST_STEP]: S2C.TEST_STEP,
      [E.TEST_STEP_FAILED]: S2C.TEST_STEP_FAILED,
      [E.TEST_DIAGNOSIS]: S2C.TEST_DIAGNOSIS,
      [E.TEST_FEATURE_DONE]: S2C.TEST_FEATURE_DONE,
      [E.TEST_TRADITIONAL]: S2C.TEST_TRADITIONAL,
      [E.TEST_MODE_DONE]: S2C.TEST_MODE_DONE
    };
    const testBus = new EventEmitter();
    this._testForwarder = (event, payload) => {
      const s2c = testEventMap[event];
      if (s2c) this.onEvent(s2c, payload);
    };
    for (const evt of Object.keys(testEventMap)) {
      testBus.on(evt, this._testForwarder);
    }
    // Free-form progress lines go through the normal chat message channel
    testBus.on('MESSAGE', (msg) => this.onEvent(S2C.CHAT_MESSAGE, { kind: msg.kind || 'system', text: msg.text, ts: Date.now() }));

    try {
      const { runTestMode: runCore } = await import('mcode-cli/test-mode');
      const summary = await runCore(selectedTypes, {
        projectPath: this.workspacePath,
        router: this.router,
        config: this.config || {},
        bus: testBus,
        undoStack: this.undoStack,
        auditLog: this.auditLog,
        ledger: this.router?.ledger || null,
        targetUrl,
        allowRemote,
        headless: true
      });

      this.onEvent(S2C.TOAST, {
        kind: summary.needsReview > 0 ? 'warn' : 'ok',
        text: summary.needsReview > 0
          ? `Test run complete — ${summary.selfHealedCount} auto-fixed, ${summary.needsReview} need manual review`
          : `Test run complete — ${summary.selfHealedCount} issue${summary.selfHealedCount === 1 ? '' : 's'} auto-fixed`
      });
      this.onEvent(S2C.CHAT_DONE, {
        text: `Test report saved to ${summary.reportFileName}`,
        mode: 'test',
        ...summary
      });
      return summary;
    } catch (err) {
      this.onEvent(S2C.CHAT_ERROR, { message: `test mode failed: ${err.message}` });
      this.onEvent(S2C.CHAT_DONE, { text: '', mode: 'test', error: true, interrupted: false });
      return null;
    } finally {
      for (const evt of Object.keys(testEventMap)) {
        testBus.off(evt, this._testForwarder);
      }
      testBus.removeAllListeners();
      void t0;
    }
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
    // FIX: god-mode/dispatch still leaves subagents running — stop the
    // SubagentManager too (was only ever reached via `cleanup`).
    try { this.manager?.stop?.(); } catch { /* already settled */ }
  }

  /** Plain LLM chat with limited tools (read/search only) — no writes, no shell. */
  async runChat(prompt, mode = 'chat', { maxTokens = 8192, outputLength = 'xhigh' } = {}) {
    const assignment = (this.router.modelOverride && await this.router.find(this.router.modelOverride))
      || await this.router.pick('general');

    if (!assignment) {
      this.onEvent(S2C.CHAT_ERROR, { message: 'no model available for chat' });
      return;
    }

    const { ChatAgent } = await import('mcode-cli/chat-agent');

    // --- Auto-search: like Claude/Perplexity, automatically search the web
    // when the query looks like it needs current information (products, prices,
    // latest versions, recent releases, etc.). The search runs before the model
    // sees the prompt, and the results are injected into the model's environment
    // so it can answer directly without needing to emit a tool call.
    let webContext = '';
    if (AUTO_SEARCH_RE.test(prompt)) {
      const { searchAndFetch, buildContextBlock } = await import('./web-search/index.js');
      const searchReplaceKey = `search-auto-${Date.now()}`;

      // Emit "searching" phase so the frontend shows the spinner animation
      this.onEvent(S2C.CHAT_TOOL_CALL, {
        tool: 'web_search',
        args: { query: prompt },
        replaceKey: searchReplaceKey,
        status: 'running',
        searchResults: { query: prompt, phase: 'searching', results: [], answer: '' }
      });

      try {
        // searchAndFetch resolves to the enriched result array directly.
        const results = await searchAndFetch(prompt, { maxResults: 5 });
        if (results.length > 0) {
          webContext = buildContextBlock(results);
          this.onEvent(S2C.CHAT_TOOL_CALL, {
            tool: 'web_search',
            args: { query: prompt },
            replaceKey: searchReplaceKey,
            status: 'done',
            searchResults: {
              query: prompt,
              phase: 'done',
              results,
              answer: ''
            }
          });
        } else {
          this.onEvent(S2C.CHAT_TOOL_CALL, {
            tool: 'web_search',
            args: { query: prompt },
            replaceKey: searchReplaceKey,
            status: 'done',
            searchResults: { query: prompt, phase: 'done', results: [], answer: '' }
          });
        }
      } catch (err) {
        this.onEvent(S2C.CHAT_TOOL_CALL, {
          tool: 'web_search',
          args: { query: prompt },
          replaceKey: searchReplaceKey,
          status: 'done',
          searchResults: { query: prompt, phase: 'done', results: [], answer: '' }
        });
        console.error('[Auto-search error]:', err.message);
      }
    }

    // Claude-style chat: the model gets the FULL toolset (search, read,
    // edit, write, explore, shell, tests, web) so the user sees the same
    // animated step cards as agent mode — but every write/edit/shell still
    // flows through the permission gate before it executes.
    const isExplain = mode === 'explain';
    const isGreeting = SIMPLE_PROMPT_RE.test(String(prompt || '').trim());
    const chatDomain = (isExplain || isGreeting || mode === 'chat') ? 'chat' : (this.config.domain || 'backend');

    let extraRules = '';
    if (isExplain) {
      extraRules = `Explain code clearly to someone new to this codebase. Be concrete — reference actual function/file names, walk through the logic step by step where helpful, and explain WHY something is designed a certain way when it's not obvious, not just WHAT it does. No code changes, no opinions on quality — pure explanation.`;
    } else if (isGreeting) {
      extraRules = `The user sent a friendly greeting or casual inquiry. Greet them warmly and politely in text, introduce yourself as mcode, their AI coding assistant, and ask what project, feature, or bug they would like to work on today. DO NOT invoke any tools! DO NOT create or edit any files!`;
    } else {
      extraRules = `Respond directly and helpfully to the user's question or request. For technical questions, provide clear explanations or code snippets in markdown. Only use tools when needed to inspect existing code or search.`;
    }

    const chatConfig = {
      ...this.config,
      allowShellAll: false,
      requireEditApproval: true,
      domain: chatDomain,
      mode,
      maxTokens,
      outputLength,
      // Claude-style: the whole history goes into context fresh — but
      // 046: bounded to the last 100 messages so marathon sessions can't
      // blow past model context limits (400s on overflow).
      historyLimit: 100,
      extraRules
    };

    // Inject auto-searched web context into the environment so the model has
    // the results to cite when answering (matches Claude/Perplexity behavior).
    let environment = 'mcode web chat interface (claude.ai-style assistant — plain chat mode, single model, no subagents)';
    if (webContext) {
      environment += `\n\nAUTOMATIC WEB SEARCH RESULTS (already retrieved — use these facts to answer, do not call web_search again unless you need different information):\n${webContext}`;
    }

    const agent = new ChatAgent({
      assignment,
      projectPath: this.workspacePath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: chatConfig,
      reasoning: this.router?.reasoning || null,
      history: this.history,
      memoryDir: this.memoryDir,
      environment,
      onTool: ({ tool, args, replaceKey }) => {
        const preview = typeof args === 'object' && args !== null
          ? (args.path || args.file || args.command || args.query || args.url || '')
          : args;
        const payload = { tool, args: preview, replaceKey, status: 'running', timestamp: Date.now() };
        // For search-type tools, include a searchResults stub so the frontend
        // renders the ZCode-style animated SearchResultBlock with a spinner
        // while the tool executes, then swaps to the done results.
        if (tool === 'web_search' || tool === 'web_fetch') {
          payload.searchResults = {
            query: tool === 'web_search' ? (args?.query || preview) : (args?.url || preview),
            phase: 'searching',
            results: [],
            answer: ''
          };
        }
        this.onEvent(S2C.CHAT_TOOL_CALL, payload);
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
        mode
      });
    } catch (err) {
      console.error('[chat-session] runChat failed:', err.message);
      // Surfacing: the client otherwise waited on a spinner with no reason.
      this.onEvent(S2C.CHAT_ERROR, { message: err.message || 'chat failed' });
      this.onEvent(S2C.CHAT_DONE, { text: '', mode, error: true, interrupted: false });
    } finally {
      this.chatAgent = null;
    }
  }

  /** Full agent mode — uses ChatAgent with tools (read/write/edit/shell/search/git/test). */
  async runAgent(prompt, { maxTokens = 8192, outputLength = 'xhigh' } = {}) {
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

    let planContext = '';
    if (plan && Array.isArray(plan.todos) && plan.todos.length > 0) {
      planContext = `ACTIVE EXECUTION PLAN:
Summary: ${plan.summary || 'Execute build'}
Tasks to complete:
${plan.todos.map((t, idx) => `${idx + 1}. [${t.id}] ${t.title}${t.description ? ': ' + t.description : ''} (${t.domain || 'code'}) -> Files: ${(t.files || []).join(', ')}`).join('\n\n')}

INSTRUCTIONS:
- Implement every todo item in the plan by writing or editing files using your tools (write_file, edit_file).
- Implement each file completely. Do NOT leave placeholder stubs, '// TODO', or empty containers.
- Write multi-line formatted, production-ready code with full styling, logic, and sample data.
- After completing all files, summarize your work to the user.`;
    }

    const agentRules = `You are running in autonomous AGENT mode.
CRITICAL:
- If the user sends a greeting (e.g. "hi", "hello", "hey"), asks a question, or chats casually:
  DO NOT call any tools! DO NOT create, write, or edit any files!
  Simply respond politely in chat and ask what project or task they want to build or work on.
- ONLY when explicitly asked to build, create, or modify code:
  1. Always write complete, robust, full-featured files using write_file or edit_file.
  2. NEVER emit single-line minified code. Always use proper newlines (\\n) and indentation.
  3. Tailor the implementation specifically to the user's request (e.g. do not assume every website is an e-commerce store unless asked).
  4. NEVER write minimal 3-4 line placeholder skeletons or empty container tags. Every project must be comprehensive, production-ready, beautiful, and fully working.
  5. Never stop until all requested files are created with full detail and completely functional.`;

    let lengthGuidance = '';
    if (outputLength === 'very_low' || outputLength === 'low') {
      lengthGuidance = `USER OUTPUT LENGTH PREFERENCE: Concise (${outputLength}).
- Keep explanations and conversational text brief, to-the-point, and minimal.
- For small bug fixes or targeted changes, do not add filler or unrequested boilerplate.
- For code files and functions, ALWAYS generate complete, functional, working code without truncation or broken syntax.`;
    } else if (outputLength === 'max' || outputLength === 'ultra') {
      lengthGuidance = `USER OUTPUT LENGTH PREFERENCE: Deep & Comprehensive (${outputLength}).
- For large project requests or feature builds, provide exhaustive, enterprise-grade implementations covering all features, styling, rich mock data, and edge cases.
- For small tasks, single-line bug fixes, or quick answers, stay concise and directly fix the issue without adding unnecessary bloat or artificial lines.
- The exact number of lines is naturally determined by the task requirements. Never truncate or leave code incomplete.`;
    } else {
      lengthGuidance = `USER OUTPUT LENGTH PREFERENCE: Balanced (${outputLength}). Provide thorough, well-crafted code with clean explanations. Solve small tasks concisely; build large projects fully without truncation.`;
    }

    const chatAgentTurns = Math.max(25, (plan?.todos?.length || 5) * 5);
    const agentConfig = {
      ...this.config,
      mode: 'agent',
      domain: 'backend',
      chatAgentTurns,
      maxTokens,
      outputLength,
      extraRules: [agentRules, lengthGuidance, planContext].filter(Boolean).join('\n\n')
    };

    const agent = new ChatAgent({
      assignment,
      projectPath: this.workspacePath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: agentConfig,
      reasoning: this.router?.reasoning || null,
      history: this.history,
      onTool: ({ tool, args, replaceKey }) => {
        const preview = typeof args === 'object' && args !== null
          ? (args.path || args.file || args.command || args.query || args.url || '')
          : args;
        const payload = { tool, args: preview, replaceKey, status: 'running', timestamp: Date.now() };
        if (tool === 'web_search' || tool === 'web_fetch') {
          payload.searchResults = {
            query: tool === 'web_search' ? (args?.query || preview) : (args?.url || preview),
            phase: 'searching',
            results: [],
            answer: ''
          };
        }
        this.onEvent(S2C.CHAT_TOOL_CALL, payload);
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
            if (!Array.isArray(todo.completedFiles)) todo.completedFiles = [];
            if (!todo.completedFiles.includes(changedFile)) todo.completedFiles.push(changedFile);

            if (todo.completedFiles.length >= todo.files.length) {
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
    } catch (err) {
      console.error('[chat-session] runAgent failed:', err.message);
      // Surfacing: the client otherwise waited on a spinner with no reason.
      this.onEvent(S2C.CHAT_ERROR, { message: err.message || 'agent run failed' });
      this.onEvent(S2C.CHAT_DONE, { text: '', mode: 'agent', error: true, interrupted: false });
    } finally {
      this.bus.off(EVENTS.MESSAGE, updateTodos);
      this.chatAgent = null;
    }
  }

  /** Send a message — dispatches to chat or agent mode. */
  async sendMessage(prompt, mode = 'chat', opts = {}) {
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
      if (this.dbSessionId && prompt) {
        db().chatMessage.create({
          sessionId: this.dbSessionId,
          role: 'user',
          content: String(prompt).slice(0, 20000),
          timestamp: new Date(),
        }).catch(() => {});
      }
      const outputLength = opts?.outputLength || this.outputLength || 'xhigh';
      this.outputLength = outputLength;
      const maxTokens = OUTPUT_LENGTH_MAP[outputLength] || 8192;
      const trimmed = String(prompt || '').trim();
      const isSimpleGreetingOrCasual = SIMPLE_PROMPT_RE.test(trimmed) && !BUILD_KEYWORDS_RE.test(trimmed);
      if (mode === 'agent' && !isSimpleGreetingOrCasual) {
        await this.runAgent(prompt, { maxTokens, outputLength });
      } else if (promptNeedsPlanning(prompt)) {
        await this.runAgent(prompt, { maxTokens, outputLength });
      } else {
        await this.runChat(prompt, mode === 'agent' ? 'chat' : mode, { maxTokens, outputLength });
      }
    } finally {
      this.running = false;
    }
  }

  /** Clean up resources. */
  cleanup() {
    this.interrupt();
    // 043: detach any bus listeners before dropping the reference.
    try { this.bus?.removeAllListeners?.(); } catch { /* already gone */ }
    this.bus = null;
    this.chatAgent = null;
    this.running = false;
  }
}
