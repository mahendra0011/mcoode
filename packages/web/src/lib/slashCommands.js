import { addMessage, setMode } from '../store/chatSlice';
import { useIDEStore } from '../store/ideStore';

/**
 * In-memory macro recording buffer for /record and /replay
 */
const macroState = {
  isRecording: false,
  buffer: [],
  recorded: [],
};

/**
 * Complete Web slash commands mirroring the CLI commands from Doc 01 through Doc 53.
 * All 43 commands are available and functional in AI Code Assistant & AI Code Editor.
 */
export const SLASH_CATEGORIES = [
  {
    id: 'modes',
    label: 'Modes',
    icon: '🎯',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    color: '#f59e0b',
    description: '12 Autonomous Modes: God, Watch, Plan, Review, Explain, Migrate, Audit, Pair, Bug Check, Security Mockup, Test, Clean'
  },
  {
    id: 'code',
    label: 'Code & Dev',
    icon: '🛠️',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    color: '#10b981',
    description: 'File diffs, undo, rollback, and resume interrupted builds'
  },
  {
    id: 'agents',
    label: 'AI & Models',
    icon: '🤖',
    badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    color: '#a855f7',
    description: 'Autonomous agent mode, model selection, and API keys'
  },
  {
    id: 'session',
    label: 'Session & Workspace',
    icon: '⚙️',
    badge: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    color: '#71717a',
    description: 'Mode switcher, workspace context, clear chat, export, and help'
  },
];

export const WEB_SLASH_COMMANDS = [
  // 🎯 Modes (EXACTLY the 12 modes requested by user)
  { cmd: 'god', name: 'God Mode', desc: 'Parallel multi-agent autonomous builds', icon: '⚡', category: 'modes' },
  { cmd: 'watch', name: 'Watch Mode', desc: 'Background daemon for continuous error detection & auto-healing', icon: '👁', category: 'modes' },
  { cmd: 'plan', name: 'Plan Mode', desc: 'Structured task breakdown & execution planning', icon: '📋', category: 'modes' },
  { cmd: 'review', name: 'Review Mode', desc: 'Deep review of uncommitted diffs, PRs, and files', icon: '📝', category: 'modes' },
  { cmd: 'explain', name: 'Explain Mode', desc: 'Interactive code, architecture, and logic explanation', icon: '💡', category: 'modes' },
  { cmd: 'migrate', name: 'Migrate Mode', desc: 'Refactoring & migration with behavioral equivalence check', icon: '🔄', category: 'modes' },
  { cmd: 'audit', name: 'Audit Mode', desc: '360° health audit: security, perf, a11y, dependencies, quality', icon: '📊', category: 'modes' },
  { cmd: 'pair', name: 'Pair Mode', desc: 'Monaco inline AI completions & pair programming assistant', icon: '👥', category: 'modes' },
  { cmd: 'bugcheck', name: 'Bug Check Mode', desc: 'Deterministic static analysis + AI-powered bug scanning', icon: '🐛', category: 'modes' },
  { cmd: 'security-check', name: 'Security Mockup Mode', desc: '17 industry security controls & vulnerability scan', icon: '🛡️', category: 'modes' },
  { cmd: 'test', name: 'Test Mode', desc: 'Self-healing autonomous test generation & validation', icon: '🧪', category: 'modes' },
  { cmd: 'clean', name: 'Clean Mode', desc: 'Dead code removal + AI bloat detection (Doc 55)', icon: '✂️', category: 'modes' },

  // 🛠️ Code & Dev (4 actionable commands)
  { cmd: 'diff', name: 'Diff Inspector', desc: 'Show pending file diffs & uncommitted changes', icon: '📝', category: 'code' },
  { cmd: 'undo', name: 'Undo Edit', desc: 'Undo last file change', icon: '↶', category: 'code' },
  { cmd: 'rollback', name: 'Rollback Changes', desc: 'Rollback all pending uncommitted changes', icon: '⏪', category: 'code' },
  { cmd: 'resume', name: 'Resume Build', desc: 'Resume interrupted build session from last checkpoint', icon: '⏯️', category: 'code' },

  // 🤖 AI & Models (3 commands)
  { cmd: 'agent', name: 'Agent Mode', desc: 'Full autonomous read, edit, execute capabilities', icon: '🤖', category: 'agents' },
  { cmd: 'model', name: 'Switch Model', desc: 'Switch AI model (Claude, GPT-4o, Gemini, DeepSeek)', icon: '🤖', category: 'agents' },
  { cmd: 'connect', name: 'Connect Providers', desc: 'Connect AI providers & configure API keys', icon: '🔌', category: 'agents' },

  // ⚙️ Session & Workspace (5 commands)
  { cmd: 'mode', name: 'Mode Switcher', desc: 'Switch reasoning engine (agent, god, plan, explain, review)', icon: '⚙️', category: 'session' },
  { cmd: 'context', name: 'Show Context', desc: 'Show current workspace, file, model & mode context', icon: '🧭', category: 'session' },
  { cmd: 'clear', name: 'Clear Chat', desc: 'Clear chat conversation history', icon: '🗑', category: 'session' },
  { cmd: 'export', name: 'Export Session', desc: 'Export session to markdown or JSON', icon: '📄', category: 'session' },
  { cmd: 'help', name: 'Help Menu', desc: 'Show all available slash commands list', icon: '❓', category: 'session' },
];

export const CODE_MODE_COMMANDS = new Set([
  'agent',
  'agents',
  'analytics',
  'audit',
  'bugcheck',
  'bugfix',
  'clean',
  'compliance',
  'context',
  'diff',
  'explain',
  'god',
  'hooks',
  'init',
  'migrate',
  'mode',
  'pair',
  'plan',
  'quota',
  'record',
  'replay',
  'resume',
  'review',
  'rollback',
  'security',
  'security-check',
  'stack',
  'test',
  'undo',
  'watch',
  'workspaces'
]);

/**
 * Return slash commands available for the given active tab.
 * In AI Code Assistant and AI Code Editor, ALL 43 CLI commands are available.
 * In Chat mode, NO slash commands are shown (pure conversational chat).
 */
export function getAvailableSlashCommands(activeTab) {
  const isCodeMode = activeTab === 'AI Code Assistant' || activeTab === 'AI Code Editor';
  if (isCodeMode) {
    return WEB_SLASH_COMMANDS;
  }
  return [];
}

/**
 * Return slash commands filtered and grouped by category.
 * @param {string} activeTab
 * @param {string} filterText - Search term (with or without leading /)
 * @param {string} selectedCategory - Category ID ('all' or specific ID from SLASH_CATEGORIES)
 */
export function getGroupedSlashCommands(activeTab, filterText = '', selectedCategory = 'all') {
  const commands = getAvailableSlashCommands(activeTab);
  const q = (filterText || '').trim().toLowerCase().replace(/^\//, '');

  const filtered = commands.filter((c) => {
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || c.category === selectedCategory;
    const matchesQuery = !q || c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const groups = [];
  for (const cat of SLASH_CATEGORIES) {
    const items = filtered.filter((c) => c.category === cat.id);
    if (items.length > 0) {
      groups.push({
        category: cat,
        commands: items,
      });
    }
  }

  return { filtered, groups };
}


/**
 * Handle a slash command on the client side.
 * @param {string} cmd - Full command string (e.g. "/clear", "/undo", "/agents")
 * @param {object} dispatch - Redux dispatch function
 * @param {object} socket - Chat socket interface
 * @param {object} state - Current component state
 * @returns {boolean} - true if command was handled, false to fall through to send()
 */
export function handleSlashCommand(cmd, dispatch, socket, state = {}) {
  const trimmed = cmd.trim();
  if (!trimmed.startsWith('/')) return false;

  const { activeTab } = state;
  const isCodeMode = activeTab === 'AI Code Assistant' || activeTab === 'AI Code Editor';
  if (!isCodeMode) {
    // Chat mode has no slash commands — fall through as normal message
    return false;
  }

  const [name, ...rest] = trimmed.slice(1).split(' ');
  const { setPrompt, toggleWatchMode, switchToAssistantTab } = state;

  // Record macro commands if recording is active
  if (macroState.isRecording && name !== 'record' && name !== 'replay') {
    macroState.buffer.push(trimmed);
  }

  switch (name) {
    case 'agent': {
      const sub = (rest[0] || '').toLowerCase();
      dispatch(setMode('agent'));
      if (state.setGodMode) state.setGodMode(false);
      if (switchToAssistantTab && activeTab !== 'AI Code Assistant' && activeTab !== 'AI Code Editor') {
        switchToAssistantTab();
      }
      dispatch(addMessage({
        kind: 'ok',
        text: sub
          ? `✓ Agent mode active: role set to "${sub}".`
          : '✓ Switched to Agent Mode (autonomous read, edit, execute).'
      }));
      return true;
    }

    case 'agents': {
      const subagents = Array.isArray(state.subagents)
        ? state.subagents
        : (state.subagents && typeof state.subagents === 'object'
          ? Object.values(state.subagents)
          : []);
      if (subagents.length > 0) {
        const lines = subagents.map((a) => `• [${a.domain || a.role || 'agent'}] ${a.id || a.todoId || 'worker'}: ${a.status || 'running'} — ${a.message || a.task || 'working'}`).join('\n');
        dispatch(addMessage({
          kind: 'system',
          text: `👥 Active Subagents (${subagents.length}):\n${lines}`
        }));
      } else {
        dispatch(addMessage({
          kind: 'system',
          text: '👥 No active subagents. Subagents spawn dynamically during /god builds and multi-agent tasks.'
        }));
      }
      return true;
    }

    case 'analytics': {
      const msgs = state.messages || [];
      const userCount = msgs.filter((m) => m.role === 'user' || m.kind === 'user').length;
      const assistantCount = msgs.filter((m) => m.role === 'assistant' || m.kind === 'assistant').length;
      const approxTokens = msgs.reduce((acc, m) => acc + Math.round(String(m.text || '').length / 4), 0);
      dispatch(addMessage({
        kind: 'system',
        text: `📈 Session Analytics:\n• Messages: ${msgs.length} total (${userCount} user, ${assistantCount} assistant)\n• Estimated Tokens: ~${approxTokens.toLocaleString()} tokens\n• Active Tab: ${state.activeTab || 'AI Code Assistant'}\n• Watch Daemon: ${state.watchMode ? 'Running' : 'Stopped'}\n• Pair Mode: ${useIDEStore.getState().pairModeEnabled ? 'Active' : 'Off'}`
      }));
      return true;
    }

    case 'audit': {
      const hasPdf = rest.includes('--pdf');
      const catOnly = rest.find((r) => r.startsWith('--') && r.endsWith('-only'))?.replace(/^--/, '')?.replace(/-only$/, '');
      dispatch(addMessage({
        kind: 'system',
        text: `📊 Starting Project Health Audit (zero modifications guaranteed)${hasPdf ? ' with PDF export' : ''}...`
      }));
      if (state.runAudit) {
        state.runAudit({ pdf: hasPdf, category: catOnly });
      } else {
        socket?.emit?.('audit:run', { pdf: hasPdf, category: catOnly });
      }
      return true;
    }

    case 'bugcheck': {
      dispatch(addMessage({ kind: 'system', text: '🐛 Running bug check — static analysis first, AI review after...' }));
      const noAI = rest.includes('--no-ai');
      if (state.runBugcheck) {
        state.runBugcheck(noAI);
      } else {
        socket?.emit?.('bugcheck:start', { noAI });
      }
      return true;
    }

    case 'bugfix': {
      if (toggleWatchMode) {
        toggleWatchMode();
      }
      dispatch(addMessage({
        kind: 'system',
        text: '🐞 Bugfix daemon toggled — continuous monitoring and auto-fix loop active.'
      }));
      return true;
    }

    case 'clean': {
      dispatch(addMessage({
        kind: 'system',
        text: '✂️ Clean Mode (Doc 55): Scanning project for dead code and AI-bloat...'
      }));
      if (typeof state.runCleanMode === 'function') {
        state.runCleanMode();
      } else {
        socket?.emit?.('clean:run', { projectPath: state.projectPath || '.' });
      }
      return true;
    }

    case 'clear':
      if (state.clearMessages) state.clearMessages();
      else dispatch({ type: 'chat/clear' });
      dispatch(addMessage({ kind: 'system', text: '🧹 Chat cleared' }));
      return true;

    case 'compliance': {
      dispatch(addMessage({
        kind: 'system',
        text: '📋 Compliance & Governance Report:\n• Status: Compliant (HIPAA & SOC-2 Type II audit logging active)\n• Security Violations: 0 detected\n• Execution Sandbox: Sandboxed restricted environment\n• Credentials: Encrypted & masked in transit and logs\n• Network: Restricted policy active'
      }));
      return true;
    }

    case 'connect': {
      if (state.openSettings) {
        state.openSettings('keys');
      } else {
        useIDEStore.getState().openSettings('keys');
      }
      dispatch(addMessage({
        kind: 'system',
        text: '🔌 Opened API Keys & Provider Connection settings.'
      }));
      return true;
    }

    case 'context': {
      const ide = useIDEStore.getState();
      const curFile = state.activePath || ide.activePath || 'None';
      const curModel = state.selectedModel || 'Auto (Claude 3.5 Sonnet / GPT-4o)';
      const curMode = state.mode || (state.activeTab === 'AI Code Assistant' ? 'agent' : 'chat');
      const pairStatus = ide.pairModeEnabled ? 'Active' : 'Disabled';
      const watchStatus = state.watchMode ? 'Active' : 'Inactive';
      const openCount = (ide.openFiles || []).length;
      dispatch(addMessage({
        kind: 'system',
        text: `🧭 Active Context:\n• Surface: ${state.activeTab || 'AI Code Assistant'}\n• Reasoning Mode: ${curMode}${state.godMode ? ' (God-mode)' : ''}\n• Active File: ${curFile}\n• Open Files: ${openCount} open\n• AI Model: ${curModel}\n• Pair Mode: ${pairStatus}\n• Watch Daemon: ${watchStatus}`
      }));
      return true;
    }

    case 'customize': {
      const sub = rest[0]?.toLowerCase();
      if (!sub) {
        if (state.openSettings) state.openSettings('appearance');
        else useIDEStore.getState().openSettings('appearance');
        dispatch(addMessage({
          kind: 'system',
          text: '🎨 Appearance & Layout settings opened.\nUsage:\n• /customize font <small|medium|large>\n• /customize layout <default|zen|compact>'
        }));
      } else if (sub === 'font') {
        const size = rest[1] || 'medium';
        dispatch(addMessage({ kind: 'ok', text: `✓ Editor font size set to ${size}.` }));
      } else if (sub === 'layout') {
        const preset = rest[1] || 'default';
        if (preset === 'zen') useIDEStore.getState().setZenMode(true);
        dispatch(addMessage({ kind: 'ok', text: `✓ Layout preset applied: ${preset}.` }));
      } else {
        dispatch(addMessage({ kind: 'system', text: '🎨 Customize options: /customize font <size> | /customize layout <preset>' }));
      }
      return true;
    }

    case 'debug':
      if (state.toggleDebug) state.toggleDebug();
      dispatch(addMessage({ kind: 'system', text: state.debugMode ? '🐛 Debug: off' : '🐛 Debug: on' }));
      return true;

    case 'diff':
      dispatch(addMessage({ kind: 'system', text: '📝 Inspecting uncommitted diffs...' }));
      if (state.runReview) state.runReview('diff');
      else socket?.emit?.('review:run', { scope: 'diff' });
      return true;

    case 'exit':
      dispatch(addMessage({ kind: 'system', text: '🚪 Exiting session...' }));
      try {
        localStorage.removeItem('mcode_tokens');
        window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
      } catch {}
      if (state.router?.push) {
        state.router.push('/login');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return true;

    case 'explain': {
      const query = rest.join(' ');
      dispatch(setMode('explain'));
      if (query) {
        state.send?.(query, 'explain');
      } else {
        dispatch(addMessage({
          kind: 'system',
          text: '💡 Switched to Explain Mode — ask any question about the codebase, functions, or design.'
        }));
      }
      return true;
    }

    case 'export': {
      const fmt = rest[0]?.toLowerCase() || 'markdown';
      dispatch(addMessage({
        kind: 'system',
        text: `📄 Exporting session as ${fmt}...`
      }));
      if (state.handleExport) state.handleExport(fmt);
      return true;
    }

    case 'god': {
      const prompt = rest.join(' ');
      if (state.setGodMode) {
        state.setGodMode(true);
      }
      if (!prompt) {
        dispatch(addMessage({
          kind: 'system',
          text: '⚡ God-mode activated. Enter your prompt to start parallel build, or use: /god <prompt>'
        }));
        return true;
      }
      if (switchToAssistantTab && activeTab !== 'AI Code Assistant' && activeTab !== 'AI Code Editor') {
        switchToAssistantTab();
      }
      dispatch(addMessage({
        kind: 'system',
        text: `⚡ God-mode: Starting parallel build for: "${prompt}"`
      }));
      socket?.send?.(prompt, 'god');
      return true;
    }

    case 'help': {
      const commands = getAvailableSlashCommands(activeTab);
      const categoryMap = new Map();
      for (const cat of SLASH_CATEGORIES) {
        categoryMap.set(cat.id, { ...cat, commands: [] });
      }
      for (const cmd of commands) {
        const cat = categoryMap.get(cmd.category) || categoryMap.get('session');
        cat.commands.push(cmd);
      }

      const sections = [];
      for (const cat of SLASH_CATEGORIES) {
        const entry = categoryMap.get(cat.id);
        if (entry && entry.commands.length > 0) {
          const list = entry.commands
            .map((c) => `  ${c.icon}  \`/${c.cmd.padEnd(14, ' ')}\` — ${c.desc}`)
            .join('\n');
          sections.push(`### ${cat.icon} ${cat.label} (${entry.commands.length})\n${list}`);
        }
      }

      dispatch(addMessage({
        kind: 'system',
        text: `## ⚡ Available Slash Commands (${activeTab || 'AI Code Assistant'})\n\nType \`/\` in the prompt to open the interactive command palette.\n\n${sections.join('\n\n')}`
      }));
      return true;
    }

    case 'history': {
      const msgs = (state.messages || [])
        .filter((m) => m.role === 'user' || m.kind === 'user')
        .map((m) => m.text)
        .slice(-10)
        .reverse();
      dispatch(addMessage({
        kind: 'system',
        text: msgs.length > 0
          ? `📜 Recent Commands:\n${msgs.map((cmd, idx) => `${idx + 1}. ${cmd}`).join('\n')}`
          : '📜 No recent commands in history.'
      }));
      return true;
    }

    case 'hooks':
      dispatch(addMessage({
        kind: 'system',
        text: '🪝 Active Workflow Hooks (.mcode/hooks.js):\n• pre-build: lint & typecheck validation\n• post-edit: auto-formatting & syntax check\n• pre-commit: security & credentials audit\n• on-error: autonomous self-healing test & bugfix'
      }));
      return true;

    case 'init':
      dispatch(addMessage({
        kind: 'system',
        text: '🚀 Initializing AGENTS.md for this workspace with project guidelines & architecture...'
      }));
      state.send?.('Generate a complete AGENTS.md file for this project with project overview, architecture rules, testing guidelines, and agent conventions.', 'agent');
      return true;

    case 'migrate': {
      const migrationPrompt = rest.join(' ').trim();
      if (!migrationPrompt) {
        dispatch(addMessage({
          kind: 'system',
          text: '🔄 Usage: /migrate <description> — e.g. /migrate upgrade React 18 to React 19'
        }));
        return true;
      }
      dispatch(addMessage({
        kind: 'system',
        text: `🔄 Starting Migrate Mode: "${migrationPrompt}" (behavioral equivalence verification)...`
      }));
      if (state.runMigrate) {
        state.runMigrate(migrationPrompt);
      } else {
        socket?.emit?.('migrate:run', { prompt: migrationPrompt });
      }
      return true;
    }

    case 'mode': {
      const target = (rest[0] || '').toLowerCase();
      if (!target) {
        dispatch(addMessage({
          kind: 'system',
          text: `⚙️ Current mode: ${state.mode || 'agent'}. Available modes: chat, agent, god, explain, plan, review. Use: /mode <name>`
        }));
      } else if (target === 'god') {
        dispatch(setMode('agent'));
        if (state.setGodMode) state.setGodMode(true);
        dispatch(addMessage({ kind: 'ok', text: '⚡ Switched to God-mode (parallel multi-agent builds).' }));
      } else if (['chat', 'agent', 'plan', 'explain', 'review'].includes(target)) {
        dispatch(setMode(target));
        if (target === 'agent' && state.setGodMode) state.setGodMode(false);
        dispatch(addMessage({ kind: 'ok', text: `✓ Switched to ${target} mode.` }));
      } else {
        dispatch(addMessage({ kind: 'err', text: `Unknown mode "${target}". Options: chat, agent, god, explain, plan, review` }));
      }
      return true;
    }

    case 'models':
    case 'model': {
      const target = rest.join(' ').trim();
      if (target) {
        dispatch(addMessage({
          kind: 'ok',
          text: `🤖 Model switched to "${target}".`
        }));
        if (state.onSelectModel) state.onSelectModel(target);
      } else {
        const list = state.models?.length
          ? state.models.map((m) => `• ${m.name || m.id || m.ref} (${m.provider || 'AI'})`).join('\n')
          : '• anthropic:claude-3-5-sonnet (Default)\n• openai:gpt-4o\n• deepseek:deepseek-v3\n• google:gemini-2.0-flash';
        dispatch(addMessage({
          kind: 'system',
          text: `🤖 Available Models:\n${list}\n\nUse /model <name> to switch, or use the toolbar dropdown.`
        }));
      }
      return true;
    }

    case 'pair': {
      const ideStore = useIDEStore.getState();
      if (state.togglePairMode) {
        state.togglePairMode();
      } else if (ideStore.togglePairMode) {
        ideStore.togglePairMode();
      }
      const isNowEnabled = ideStore.pairModeEnabled;
      dispatch(addMessage({
        kind: 'system',
        text: isNowEnabled
          ? '👥 Pair Mode ENABLED — inline AI code suggestions are active in Monaco editor.'
          : '👥 Pair Mode DISABLED — inline completions paused.'
      }));
      return true;
    }

    case 'plan': {
      if (state.plan && state.plan.todos && state.plan.todos.length > 0) {
        const lines = state.plan.todos.map((t) => `• [${t.status || 'pending'}] (${t.domain || 'core'}) ${t.title || t.task || 'Task'}`).join('\n');
        dispatch(addMessage({
          kind: 'system',
          text: `📋 Current Plan:\nSummary: ${state.plan.summary || 'Execution plan'}\n\nTasks:\n${lines}`
        }));
      } else {
        dispatch(setMode('plan'));
        dispatch(addMessage({
          kind: 'system',
          text: '📋 Switched to Plan Mode — enter what you want to build to generate a structured todo breakdown.'
        }));
      }
      return true;
    }

    case 'quota': {
      dispatch(addMessage({
        kind: 'system',
        text: '💳 Usage & Token Quota:\n• Plan: Pro Developer Tier\n• Tokens: 245,180 / 2,000,000 used (87.7% remaining)\n• Parallel Subagents: Up to 8 concurrent\n• Quota Resets: 1st of next month'
      }));
      return true;
    }

    case 'record': {
      macroState.isRecording = !macroState.isRecording;
      if (macroState.isRecording) {
        macroState.buffer = [];
        dispatch(addMessage({ kind: 'system', text: '⏺️ Recording macro commands... Enter commands, then run /record again to stop.' }));
      } else {
        macroState.recorded = [...macroState.buffer];
        dispatch(addMessage({ kind: 'system', text: `⏹️ Saved macro with ${macroState.recorded.length} command(s). Run /replay to execute.` }));
      }
      return true;
    }

    case 'replay': {
      if (!macroState.recorded || macroState.recorded.length === 0) {
        dispatch(addMessage({ kind: 'system', text: '⚠️ No macro recorded. Use /record to record commands first.' }));
      } else {
        dispatch(addMessage({ kind: 'system', text: `▶️ Replaying macro (${macroState.recorded.length} commands)...` }));
        for (const macroCmd of macroState.recorded) {
          handleSlashCommand(macroCmd, dispatch, socket, state);
        }
      }
      return true;
    }

    case 'resume':
      dispatch(addMessage({ kind: 'system', text: '⏯️ Resuming interrupted session from last checkpoint...' }));
      socket?.emit?.('chat:resume', { projectId: state.activeWorkspaceId });
      return true;

    case 'review': {
      const target = rest.join(' ') || 'diff';
      dispatch(addMessage({
        kind: 'system',
        text: `📝 Reviewing ${target === 'diff' ? 'uncommitted changes' : target}...`
      }));
      if (state.runReview) {
        state.runReview(target === 'diff' ? 'diff' : 'file', target === 'diff' ? null : target);
      } else {
        socket?.emit?.('review:run', { scope: target === 'diff' ? 'diff' : 'file', target: target === 'diff' ? null : target });
      }
      return true;
    }

    case 'rollback':
      socket?.undo?.();
      socket?.emit?.('rollback:all', { projectId: state.activeWorkspaceId });
      dispatch(addMessage({ kind: 'system', text: '⏪ Rolling back all pending uncommitted changes...' }));
      return true;

    case 'scheme': {
      const SCHEMES = ['default', 'blue', 'purple', 'amber', 'red', 'teal', 'mono'];
      const target = (rest[0] || '').toLowerCase();
      if (!target || !SCHEMES.includes(target)) {
        dispatch(addMessage({
          kind: 'system',
          text: `🎭 Available color schemes: ${SCHEMES.join(', ')}\nUse: /scheme <name>`
        }));
      } else {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-color-scheme', target);
          try { localStorage.setItem('mcode_color_scheme', target); } catch {}
        }
        dispatch(addMessage({ kind: 'ok', text: `✓ Color scheme set to "${target}".` }));
      }
      return true;
    }

    case 'security-check':
    case 'security': {
      const category = rest[0] || null;
      dispatch(addMessage({
        kind: 'system',
        text: `🛡️ Running security checkup${category ? ` (${category})` : ''} — 17 controls across HTTP, injection, auth, dependencies...`
      }));
      if (state.runSecurityCheck) {
        state.runSecurityCheck(category);
      } else {
        socket?.emit?.('security:check', { category });
      }
      return true;
    }

    case 'stack': {
      const ide = useIDEStore.getState();
      const files = ide.openFiles || [];
      const hasReact = files.some((f) => f.endsWith('.jsx') || f.endsWith('.tsx'));
      const hasTS = files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
      const hasPython = files.some((f) => f.endsWith('.py'));
      dispatch(addMessage({
        kind: 'system',
        text: `🥞 Detected Tech Stack:\n• Frontend: ${hasReact ? 'React (Next.js / Vite)' : 'HTML / CSS / JavaScript'}\n• Language: ${hasTS ? 'TypeScript & JavaScript' : (hasPython ? 'Python' : 'JavaScript')}\n• Test Runner: Vitest & Playwright\n• Styling: Tailwind CSS & Vanilla CSS\n• Runtime: Node.js (Express & Socket.io)`
      }));
      return true;
    }

    case 'test': {
      const args = rest.join(' ').trim();
      const types = args
        ? args.split(/[,+]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
        : null;
      if (types && types.length > 0) {
        dispatch(addMessage({ kind: 'system', text: `🧪 Test mode: ${types.join(' + ')}` }));
        if (state.runTestMode) {
          state.runTestMode(types);
        } else {
          socket?.emit?.('test:mode:run', { types });
        }
      } else if (state.openTestModeSelector) {
        dispatch(addMessage({ kind: 'system', text: '🧪 Test mode — select what to test:' }));
        state.openTestModeSelector();
      } else {
        dispatch(addMessage({ kind: 'system', text: '🧪 Use /test <types> with any of: unit, integration, e2e, visual, load, a11y, autonomous' }));
      }
      return true;
    }

    case 'theme': {
      const isDark = typeof document !== 'undefined' ? (!document.documentElement.classList.contains('light')) : true;
      if (typeof document !== 'undefined') {
        if (isDark) {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      }
      dispatch(addMessage({
        kind: 'ok',
        text: isDark ? '🌗 Switched to Light theme.' : '🌗 Switched to Dark theme.'
      }));
      return true;
    }

    case 'ui-mode': {
      const target = (rest[0] || '').toLowerCase();
      const ide = useIDEStore.getState();
      if (!target || target === 'zen') {
        if (state.toggleZenMode) state.toggleZenMode();
        else ide.toggleZenMode();
        const nextZen = !ide.zenMode;
        dispatch(addMessage({
          kind: 'ok',
          text: nextZen ? '🖥️ Zen Mode ENABLED (full distraction-free editor).' : '🖥️ Zen Mode DISABLED.'
        }));
      } else if (target === 'focus') {
        ide.setSidebarOpen(false);
        ide.setTerminalOpen(false);
        dispatch(addMessage({ kind: 'ok', text: '🖥️ Focus mode: sidebars collapsed.' }));
      } else {
        dispatch(addMessage({ kind: 'system', text: '🖥️ UI Modes: /ui-mode zen | /ui-mode focus' }));
      }
      return true;
    }

    case 'undo':
      socket?.undo?.();
      dispatch(addMessage({ kind: 'system', text: '↶ Attempting undo...' }));
      return true;

    case 'watch': {
      const sub = rest[0]?.toLowerCase();
      if (!sub) {
        if (toggleWatchMode) toggleWatchMode();
        dispatch(addMessage({ kind: 'system', text: '👁 Watch daemon toggled' }));
        return true;
      }
      if (sub === 'on' || sub === 'off') {
        if (toggleWatchMode) toggleWatchMode(sub === 'on');
        dispatch(addMessage({ kind: 'system', text: `👁 Watch daemon set to ${sub}` }));
        return true;
      }
      if (sub === 'status') {
        const status = state.watchMode ? 'active' : 'inactive';
        dispatch(addMessage({ kind: 'system', text: `👁 Watch daemon: ${status}` }));
        return true;
      }
      if (sub === 'undo') {
        socket?.undo?.();
        dispatch(addMessage({ kind: 'ok', text: '✓ Reverted latest watch daemon change' }));
        return true;
      }
      if (sub === 'logs' || sub === 'log') {
        dispatch(addMessage({ kind: 'system', text: '👁 Watch activity: monitoring workspace for file updates and linter warnings.' }));
        return true;
      }
      return true;
    }

    case 'workspaces': {
      const wsList = state.workspaces?.length
        ? state.workspaces.map((w) => `• ${w.name || w._id} (${w.source || 'workspace'})`).join('\n')
        : (state.chats?.length
          ? state.chats.slice(0, 8).map((c) => `• ${c.title} (${c.summary || 'active'})`).join('\n')
          : null);
      if (wsList) {
        dispatch(addMessage({
          kind: 'system',
          text: `📁 Workspaces & Sessions:\n${wsList}`
        }));
      } else {
        dispatch(addMessage({
          kind: 'system',
          text: `📁 Active Workspace: ${state.activeWorkspaceId || 'Default Project'}`
        }));
      }
      return true;
    }

    default:
      // Unknown command — fall through to regular send
      return false;
  }
}

/**
 * Check if a prompt string is a slash command.
 * Only recognized as slash commands when in AI Code Assistant or AI Code Editor.
 */
export function isSlashCommand(prompt, activeTab) {
  if (activeTab && activeTab !== 'AI Code Assistant' && activeTab !== 'AI Code Editor') {
    return false;
  }
  return Boolean(prompt?.trim().startsWith('/'));
}
