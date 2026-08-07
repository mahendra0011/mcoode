import { io } from 'socket.io-client';
import { SOCKET } from '@mcode/shared';
import { store } from '../store/index.js';
import {
  agentStarted,
  agentStep,
  agentFile,
  agentDone,
  agentFailed,
  agentNeedsReview,
  planGenerated,
  removeAgent
} from '../store/slices/agentsSlice.js';
import { pushToast } from '../store/slices/toastSlice.js';
import { watchScan, watchFix, watchStatus } from '../store/slices/watchSlice.js';
import {
  setReady,
  setHasKeys,
  setError as setChatError,
  setGenerating,
  addMessage,
  updateLastAssistant,
  finalizeAssistant,
  upsertToolCall,
  clearToolCall,
  clearToolCalls,
  setPendingPermission,
  clearPendingPermission
} from '../store/slices/chatSlice.js';

const C2S = SOCKET.CLIENT_TO_SERVER;
const S2C = SOCKET.SERVER_TO_CLIENT;

let socket = null;

/**
 * Register all chat-related socket event handlers on the existing socket.
 * Called during connectSocket() — single connection handles both build
 * events and chat/agent events.
 */
function registerChatHandlers(s) {
  // Session ready — server loaded keys + providers
  s.on(S2C.CHAT_READY, (payload) => {
    store.dispatch(setReady({
      providers: payload.providers || [],
      models: payload.models || []
    }));
  });

  // Error (includes "no keys" case)
  s.on(S2C.CHAT_ERROR, (payload) => {
    store.dispatch(setChatError(payload.message || 'chat error'));
    store.dispatch(setGenerating(false));
    if (payload.kind === 'keys') {
      store.dispatch(setHasKeys(false));
    }
  });

  // Chat mode: streaming text (accumulates, replaces last assistant)
  s.on(S2C.CHAT_STREAM, (payload) => {
    store.dispatch(updateLastAssistant({ text: payload.text }));
    store.dispatch(setGenerating(true));
  });

  // Agent mode: all MESSAGE events from ChatAgent's bus
  s.on(S2C.CHAT_MESSAGE, (msg) => {
    handleBusMessage(msg);
  });

  // Permission prompt — show modal
  s.on(S2C.CHAT_PERMISSION, (msg) => {
    store.dispatch(setPendingPermission({
      requestId: msg.requestId || `perm-${Date.now()}`,
      command: msg.command || msg.args || '?',
      block: msg.block
    }));
  });

  // Tool call start (from onTool callback — feeds the right sidebar strip)
  s.on(S2C.CHAT_TOOL_CALL, (payload) => {
    store.dispatch(upsertToolCall({
      replaceKey: payload.replaceKey || `toolcall-${Date.now()}`,
      tool: payload.tool,
      args: payload.args,
      status: payload.status || 'running'
    }));
  });

  // Done
  s.on(S2C.CHAT_DONE, (payload) => {
    store.dispatch(finalizeAssistant());
    store.dispatch(setGenerating(false));
    store.dispatch(clearToolCalls());
    if (payload.mode === 'agent' && payload.text) {
      // Ensure final assistant text is visible
      const msgs = store.getState().chat.messages;
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant' && !last.final) {
        store.dispatch(updateLastAssistant({ text: payload.text }));
        store.dispatch(finalizeAssistant());
      } else if (payload.text) {
        store.dispatch(addMessage({
          role: 'assistant',
          content: payload.text,
          final: true
        }));
      }
    }
  });
}

/** Process a MESSAGE event from ChatAgent's EventEmitter bus. */
function handleBusMessage(msg) {
  const kind = msg.kind;

  if (kind === 'stream') {
    store.dispatch(updateLastAssistant({ text: msg.text || '' }));
    store.dispatch(setGenerating(true));
    return;
  }

  if (kind === 'tool') {
    const replaceKey = msg.replaceKey || `tool-${Date.now()}`;
    const call = {
      replaceKey,
      tool: msg.tool,
      args: msg.args,
      status: msg.status || 'running',
      block: msg.block
    };

    if (msg.status === 'running') {
      // Add to message list
      store.dispatch(addMessage({
        role: 'assistant',
        kind: 'tool',
        block: msg.block || 'tool',
        tool: msg.tool,
        args: msg.args,
        status: 'running',
        replaceKey
      }));
      // Feed right sidebar strip
      store.dispatch(upsertToolCall(call));
    } else {
      // Tool completed — update the message item with results
      const msgs = store.getState().chat.messages;
      const idx = msgs.findIndex((m) => m.replaceKey === replaceKey);
      if (idx >= 0) {
        const existing = msgs[idx];
        store.dispatch(addMessage({
          id: existing.id,
          role: 'assistant',
          kind: 'tool',
          block: msg.block || existing.block || 'command',
          tool: msg.tool,
          args: msg.args,
          status: msg.status,
          replaceKey,
          ...msg,
          // Keep the server's full block metadata
          path: msg.path || existing.path,
          lines: msg.lines,
          diffLines: msg.diffLines,
          command: msg.command,
          output: msg.output,
          title: msg.title,
          created: msg.created,
          error: msg.error
        }));
      } else {
        // No matching message — add it
        store.dispatch(addMessage({
          role: 'assistant',
          kind: 'tool',
          block: msg.block || 'command',
          tool: msg.tool,
          args: msg.args,
          status: msg.status,
          replaceKey,
          ...msg
        }));
      }
      // Update or remove from tool strip
      if (msg.status === 'done' || msg.status === 'failed') {
        store.dispatch(upsertToolCall({ ...call, status: msg.status, ...msg }));
        setTimeout(() => store.dispatch(clearToolCall(replaceKey)), 2000);
      }
    }
    return;
  }

  // System, ok, err, warn, summary, interrupt
  const role = ['ok', 'err', 'warn', 'system', 'interrupt'].includes(kind) ? 'system' : 'assistant';
  const block = kind === 'summary' ? 'summary' : (msg.block || kind);
  store.dispatch(addMessage({
    role,
    kind,
    block,
    content: msg.text || '',
    ...msg
  }));
}

export function connectSocket() {
  if (socket) return socket;
  const token = localStorage.getItem('mcode_access');
  if (!token) return null;

  socket = io({ path: SOCKET.NS, auth: { token }, autoConnect: true });
  const s = store;

  socket.on(C2S.PLAN_GENERATED, (p) => s.dispatch(planGenerated(p)));
  socket.on(C2S.AGENT_STARTED, (p) => s.dispatch(agentStarted(p)));
  socket.on(C2S.AGENT_STEP, (p) => s.dispatch(agentStep(p)));
  socket.on(C2S.AGENT_FILE, (p) => s.dispatch(agentFile(p)));
  socket.on(C2S.AGENT_DONE, (p) => {
    s.dispatch(agentDone(p));
    setTimeout(() => s.dispatch(removeAgent(p.todoId)), 8000);
  });
  socket.on(C2S.AGENT_FAILED, (p) => {
    s.dispatch(agentFailed(p));
    setTimeout(() => s.dispatch(removeAgent(p.todoId)), 8000);
  });
  socket.on(C2S.AGENT_NEEDS_REVIEW, (p) => {
    s.dispatch(agentNeedsReview(p));
    setTimeout(() => s.dispatch(removeAgent(p.todoId)), 8000);
  });

  // Watch events
  socket.on(C2S.WATCH_SCAN, (p) => s.dispatch(watchScan(p)));
  socket.on(C2S.WATCH_FIX, (p) => s.dispatch(watchFix(p)));
  socket.on(C2S.WATCH_STATUS, (p) => s.dispatch(watchStatus(p)));

  // Build events (kept as hardcoded strings for compatibility with CLI emitters)
  socket.on('build:complete', (p) => {
    s.dispatch(agentDone(p));
    s.dispatch(pushToast({
      kind: p.failed > 0 ? 'warn' : 'ok',
      text: `build complete — ${p.done}/${p.total} todos${p.failed ? ` · ${p.failed} failed` : ''}`
    }));
  });
  socket.on('integration:pass', (p) => {
    const summary = p.ran && p.status === 'running'
      ? 'integration tests running…'
      : p.status === 'error' ? `integration failed: ${p.error || ''}`
        : p.ran ? `integration ${p.status || 'passed'}` : 'integration skipped';
    s.dispatch(pushToast({ kind: p.status === 'error' ? 'err' : 'info', text: summary }));
  });
  socket.on('toast', (p) => {
    s.dispatch(pushToast({ kind: p.kind || 'info', text: p.text || '' }));
  });

  // Chat / agent events
  registerChatHandlers(socket);

  socket.on('disconnect', () => {
    s.dispatch(setGenerating(false));
    s.dispatch(clearToolCalls());
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function joinSession(sessionId) {
  socket?.emit('session:join', { sessionId });
}

export function joinProject(projectId) {
  socket?.emit('project:join', { projectId });
}

// ── Chat / Agent socket helpers ──

export function startChat(payload) {
  socket?.emit(C2S.CHAT_START, payload || {});
}

export function sendChatMessage(payload) {
  socket?.emit(C2S.CHAT_SEND, payload);
}

export function answerPermission(payload) {
  socket?.emit(C2S.CHAT_PERMISSION_ANSWER, payload);
}

export function interruptChat() {
  socket?.emit(C2S.CHAT_INTERRUPT);
}
