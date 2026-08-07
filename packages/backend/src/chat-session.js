import { EventEmitter } from 'node:events';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { db } from './db.js';
import { deriveMasterKey, decryptKey } from './secret-enc.js';
import { EVENTS, SOCKET, CostLedger } from '@mcode/shared';
const S2C = SOCKET.SERVER_TO_CLIENT;

/**
 * ChatSession — bridges the CLI's ChatAgent/ToolExecutor to a web socket client.
 * One session per connected socket. Reuses the CLI's ChatAgent, ModelRouter,
 * and provider adapters directly — no logic is reimplemented.
 */
export class ChatSession {
  constructor({ userId, secret, workspacePath, onEvent = () => {} } = {}) {
    this.userId = userId;
    this.secret = secret;
    this.workspacePath = workspacePath;
    this.onEvent = onEvent; // (event, payload) => forwards to socket client
    this.bus = null;       // EventEmitter — passed to ChatAgent as its `bus`
    this.providers = null;
    this.router = null;
    this.chatAgent = null;
    this.history = [];
    this.undoStack = null;
    this.initialized = false;
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
      // Forward all MESSAGE events to the client
      this.onEvent(S2C.CHAT_MESSAGE, msg);
      // Special: permission requests need a dedicated client event
      if (msg.block === 'permission' && msg.status === 'running') {
        this.onEvent(S2C.CHAT_PERMISSION, msg);
      }
    });

    this.bus.on('SUBAGENT_SHELL_OUTPUT', (payload) => {
      this.onEvent('chat:shell_stream', payload);
    });

    return true;
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

  /** Plain LLM chat (no tools) — mirrors Orchestrator.chat() non-agent path. */
  async runChat(prompt) {
    const assignment = (this.router.modelOverride && await this.router.find(this.router.modelOverride))
      || await this.router.pick('general');

    if (!assignment) {
      this.onEvent(S2C.CHAT_ERROR, { message: 'no model available for chat' });
      return;
    }

    const messages = [
      { role: 'system', content: 'You are mcode, a coding assistant. Be concise and technical.' },
      ...this.history,
      { role: 'user', content: prompt }
    ];
    this.history.push({ role: 'user', content: prompt });
    this.history = this.history.slice(-20);

    this.onEvent(S2C.CHAT_TOOL_CALL, { tool: 'llm', args: { model: assignment.ref }, status: 'running' });

    const stream = assignment.provider.stream(assignment.model.id, {
      messages,
      temperature: 0.3,
      reasoning: this.router?.reasoning || null
    });

    let full = '';
    for await (const chunk of stream) {
      full += chunk;
      this.onEvent(S2C.CHAT_STREAM, { text: full });
    }

    this.history.push({ role: 'assistant', content: full });
    this.history = this.history.slice(-20);
    this.onEvent(S2C.CHAT_DONE, { text: full, interrupted: false, mode: 'chat' });
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
    try {
      const planner = new Planner({ router: this.router, bus: this.bus });
      plan = await planner.plan(prompt, { repoContext: '' });
      this.onEvent(S2C.CHAT_TODO_PLAN, { todos: plan.todos, summary: plan.summary });
    } catch (e) {
      console.error('Planner error:', e);
      // continue without a plan if it fails
    }

    const agent = new ChatAgent({
      assignment,
      projectPath: this.workspacePath,
      bus: this.bus,
      undoStack: this.undoStack,
      config: this.config,
      reasoning: this.router?.reasoning || null,
      history: this.history,
      onTool: ({ tool, args }) => {
        this.onEvent(S2C.CHAT_TOOL_CALL, { tool, args, status: 'running', timestamp: Date.now() });
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
    if (!this.bus) {
      await this.start();
      if (!this.initialized) return;
    }
    if (mode === 'agent') {
      await this.runAgent(prompt);
    } else {
      await this.runChat(prompt);
    }
  }

  /** Clean up resources. */
  cleanup() {
    this.interrupt();
    this.bus = null;
    this.chatAgent = null;
  }
}
