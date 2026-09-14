import { addMessage } from '../store/chatSlice';

/**
 * Web slash commands — client-side subset of CLI's 33 commands.
 * These execute instantly without a round-trip to the backend.
 */
export const WEB_SLASH_COMMANDS = [
  { cmd: 'clear', desc: 'Clear chat history', icon: '🗑' },
  { cmd: 'help', desc: 'Show available commands', icon: '❓' },
  { cmd: 'undo', desc: 'Undo last file change', icon: '↶' },
  { cmd: 'model', desc: 'Switch AI model', icon: '🤖' },
  { cmd: 'god', desc: 'Enter god-mode parallel build', icon: '⚡' },
  { cmd: 'watch', desc: 'Toggle watch daemon', icon: '👁' },
  { cmd: 'bugcheck', desc: 'Run bug check (static analysis + AI review)', icon: '🐛' },
  { cmd: 'debug', desc: 'Toggle debug mode', icon: '🐛' },
  { cmd: 'export', desc: 'Export session', icon: '📄' },
];

export const CODE_MODE_COMMANDS = new Set(['god', 'watch', 'bugcheck', 'undo']);

export function getAvailableSlashCommands(activeTab) {
  const isCodeMode = activeTab === 'AI Code Assistant' || activeTab === 'AI Code Editor';
  if (isCodeMode) {
    return WEB_SLASH_COMMANDS;
  }
  return WEB_SLASH_COMMANDS.filter((c) => !CODE_MODE_COMMANDS.has(c.cmd));
}

/**
 * Handle a slash command on the client side.
 * @param {string} cmd - Full command string (e.g. "/clear", "/undo")
 * @param {object} dispatch - Redux dispatch function
 * @param {object} socket - Chat socket interface
 * @param {object} state - Current component state { mode, setPrompt, toggleWatchMode, activeTab, ... }
 * @returns {boolean} - true if command was handled, false to fall through to send()
 */
export function handleSlashCommand(cmd, dispatch, socket, state = {}) {
  const trimmed = cmd.trim();
  if (!trimmed.startsWith('/')) return false;

  const [name, ...rest] = trimmed.slice(1).split(' ');
  const { setPrompt, toggleWatchMode, switchToAssistantTab, activeTab } = state;

  const isCodeMode = activeTab === 'AI Code Assistant' || activeTab === 'AI Code Editor';
  if (CODE_MODE_COMMANDS.has(name) && !isCodeMode) {
    dispatch(addMessage({
      kind: 'system',
      text: `⚠️ /${name} is only available in AI Code Assistant and AI Code Editor.`
    }));
    return true;
  }

  switch (name) {
    case 'clear':
      // Clear first, then show confirmation so the message survives the clear
      if (state.clearMessages) state.clearMessages();
      else dispatch({ type: 'chat/clear' });
      dispatch(addMessage({ kind: 'system', text: '🧹 Chat cleared' }));
      return true;

    case 'help': {
      const commands = getAvailableSlashCommands(activeTab);
      const list = commands.map((c) => `/${c.cmd} — ${c.desc}`).join('\n');
      dispatch(addMessage({ kind: 'system', text: `Available commands:\n${list}` }));
      return true;
    }

    case 'undo':
      socket?.undo();
      dispatch(addMessage({ kind: 'system', text: '↶ Attempting undo...' }));
      return true;

    case 'model':
      // Let the ModelSelector handle this — just show a hint
      dispatch(addMessage({
        kind: 'system',
        text: '🤖 Use the ModelSelector dropdown in the toolbar to switch models'
      }));
      return true;

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
      // Switch to assistant tab if in another tab
      if (switchToAssistantTab && activeTab !== 'AI Code Assistant' && activeTab !== 'AI Code Editor') {
        switchToAssistantTab();
      }
      dispatch(addMessage({
        kind: 'system',
        text: `⚡ God-mode: Starting parallel build for: "${prompt}"`
      }));
      // Send as god-mode prompt
      socket?.send(prompt, 'god');
      return true;
    }

    case 'watch': {
      const sub = rest[0]?.toLowerCase();
      if (!sub) {
        if (toggleWatchMode) toggleWatchMode();
        return true;
      }
      if (sub === 'on' || sub === 'off') {
        if (toggleWatchMode) toggleWatchMode(sub === 'on');
        return true;
      }
      if (sub === 'status') {
        const status = state.watchMode ? 'active' : 'inactive';
        dispatch(addMessage({ kind: 'system', text: `👁 Watch: ${status}` }));
        return true;
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

    case 'debug':
      if (state.toggleDebug) state.toggleDebug();
      dispatch(addMessage({ kind: 'system', text: state.debugMode ? '🐛 Debug: off' : '🐛 Debug: on' }));
      return true;

    case 'export': {
      const fmt = rest[0]?.toLowerCase() || 'markdown';
      dispatch(addMessage({
        kind: 'system',
        text: `📄 Exporting session as ${fmt}...`
      }));
      // In a full implementation, this would trigger a download
      if (state.handleExport) state.handleExport(fmt);
      return true;
    }

    default:
      // Unknown command — let it through as a regular message
      return false;
  }
}

/**
 * Check if a prompt string is a slash command.
 */
export function isSlashCommand(prompt) {
  return prompt?.trim().startsWith('/');
}
