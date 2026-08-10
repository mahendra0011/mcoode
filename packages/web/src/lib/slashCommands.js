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
  { cmd: 'debug', desc: 'Toggle debug mode', icon: '🐛' },
  { cmd: 'export', desc: 'Export session', icon: '📄' },
];

/**
 * Handle a slash command on the client side.
 * @param {string} cmd - Full command string (e.g. "/clear", "/undo")
 * @param {object} dispatch - Redux dispatch function
 * @param {object} socket - Chat socket interface
 * @param {object} state - Current component state { mode, setPrompt, toggleWatchMode, ... }
 * @returns {boolean} - true if command was handled, false to fall through to send()
 */
export function handleSlashCommand(cmd, dispatch, socket, state = {}) {
  const trimmed = cmd.trim();
  if (!trimmed.startsWith('/')) return false;

  const [name, ...rest] = trimmed.slice(1).split(' ');
  const { setPrompt, toggleWatchMode, toggleAdvancedMode } = state;

  switch (name) {
    case 'clear':
      // Clear first, then show confirmation so the message survives the clear
      if (state.clearMessages) state.clearMessages();
      else dispatch({ type: 'chat/clear' });
      dispatch(addMessage({ kind: 'system', text: '🧹 Chat cleared' }));
      return true;

    case 'help': {
      const list = WEB_SLASH_COMMANDS.map((c) => `/${c.cmd} — ${c.desc}`).join('\n');
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
      if (!prompt) {
        dispatch(addMessage({
          kind: 'system',
          text: '⚡ /god <prompt> — Enter god-mode parallel build. Example: /god Build a todo app with Express backend'
        }));
        return true;
      }
      // Switch to agent mode + god sub-mode
      if (toggleAdvancedMode) toggleAdvancedMode();
      dispatch(addMessage({
        kind: 'system',
        text: `⚡ God-mode: Starting parallel build for: "${prompt}"`
      }));
      // Send as agent-mode prompt
      socket?.send(prompt, 'agent');
      return true;
    }

    case 'watch': {
      const sub = rest[0]?.toLowerCase();
      if (!sub) {
        const status = state.watchMode ? 'ON' : 'OFF';
        dispatch(addMessage({ kind: 'system', text: `👁 Watch daemon: ${status} — use /watch on or /watch off` }));
        return true;
      }
      if ((sub === 'on' || sub === 'off') && toggleWatchMode) {
        toggleWatchMode();
        dispatch(addMessage({ kind: 'system', text: `👁 Watch daemon: ${sub === 'on' ? 'enabled' : 'disabled'}` }));
        return true;
      }
      if (sub === 'status') {
        const status = state.watchMode ? 'active' : 'inactive';
        dispatch(addMessage({ kind: 'system', text: `👁 Watch: ${status}` }));
        return true;
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
