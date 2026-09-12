import { createSlice } from '@reduxjs/toolkit';
import type { ChatMessage } from '../types/chat';

function safeHostname(url: string | null | undefined): string {
  try {
    return new URL(url as string).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '').slice(0, 30);
  }
}

function sanitizeToolArgs(args: any): any {
  if (typeof args === 'string') {
    const trimmed = args.trim();
    if (trimmed.startsWith('{') && (trimmed.includes('"path"') || trimmed.includes('"command"') || trimmed.includes('"content"'))) {
      try {
        const p = JSON.parse(trimmed);
        return p.path || p.file || p.command || p.query || p.url || args;
      } catch {
        const m = /"path"\s*:\s*"([^"]+)"/.exec(trimmed);
        if (m) return m[1];
      }
    }
    return args;
  }
  if (args && typeof args === 'object') {
    return args.path || args.file || args.command || args.query || args.url || '';
  }
  return args;
}

type Status = 'idle' | 'connecting' | 'ready' | 'error';
type Mode = 'chat' | 'agent';

export interface Model { ref?: string; id?: string; provider?: string; name?: string }
export interface TodoItem { id: string | number; status: string; [k: string]: unknown }
export interface Plan { summary?: string; todos?: TodoItem[] | null }
export interface PermissionRequest { requestId?: string; [k: string]: unknown }
export interface Toast { id: string; kind?: string; text?: string }
export interface Wave { wave: number; total: number; completed: number; status: string; subagentIds?: string[] }
export interface Subagent {
  todoId: string;
  domain?: string;
  status: string;
  message?: string;
  progress?: number;
  model?: string;
  title?: string;
  startedAt?: string;
  tokens?: number;
  latency?: number;
  secs?: number;
  lastFile?: string;
  lastTool?: string;
  lastToolArgs?: unknown;
  lastToolResult?: { tool?: string; ms?: number; risk?: string };
  reviewReason?: string;
}
export interface BuildSummary { done?: number; total?: number; failed?: number; needsReview?: number; elapsedSecs?: number; cost?: number }

interface ChatState {
  status: Status;
  keysError: string | null;
  mode: Mode;
  messages: ChatMessage[];
  plan: Plan | null;
  permissionRequest: PermissionRequest | null;
  lastUndoResult: unknown;
  isStreaming: boolean;
  models: Model[];
  selectedModel: string | null;
  godMode: boolean;
  waves: Wave[];
  subagents: Record<string, Subagent>;
  buildSummary: BuildSummary | null;
  buildIntegration?: unknown;
  toasts: Toast[];
  _turnDone: boolean;
}

const initialState: ChatState = {
  status: 'idle',
  keysError: null,
  mode: 'chat',
  messages: [],
  plan: null,
  permissionRequest: null,
  lastUndoResult: null,
  isStreaming: false,
  models: [],
  selectedModel: null,
  godMode: false,
  waves: [],
  subagents: {},
  buildSummary: null,
  toasts: [],
  _turnDone: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    chatReady: (state, action) => {
      state.status = 'ready';
      const payload: Model[] = action.payload || [];
      const hasModels = payload.length > 0 && payload.some((m) => m.ref);
      if (hasModels) {
        state.models = payload;
      }
      if (!state.selectedModel && state.models.length > 0) {
        const poolSide = state.models.find((m) => m.provider === 'poolside');
        const first = poolSide || state.models[0];
        state.selectedModel = first.ref || first.id || null;
      }
      state.keysError = null;
    },
    chatError: (state, action) => {
      const { kind, message } = action.payload || {};
      if (kind === 'keys') {
        state.keysError = message || 'please select your api keys to use mcode';
      }
      state.status = 'error';
      state.isStreaming = false;
      state._turnDone = true;
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.kind === 'stream') {
        lastMessage.kind = 'assistant';
        lastMessage.status = 'done';
      }
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },
    setModels: (state, action) => {
      state.models = action.payload || [];
      state.keysError = null;
      if (state.models.length > 0) {
        const valid = state.models.some((m) => m.ref === state.selectedModel);
        if (!valid) {
          const poolSide = state.models.find((m) => m.provider === 'poolside');
          const first = poolSide || state.models[0];
          state.selectedModel = first.ref || first.id || null;
        }
      } else {
        state.selectedModel = null;
      }
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.isStreaming = true;
      state._turnDone = false;
      state.keysError = null;
    },
    streamUpdate: (state, action) => {
      if (state._turnDone) return;

      const text = action.payload;
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.kind === 'stream') {
        lastMessage.text = text.startsWith(lastMessage.text)
          ? text
          : (lastMessage.text || '') + text;
      } else {
        state.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          kind: 'stream',
          text: text,
          blocks: []
        });
      }
    },
    agentMessage: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const isWebTool =
        payload.kind === 'tool' &&
        (payload.tool === 'web_search' || payload.tool === 'web_fetch' || payload.searchResults);

      if (isWebTool) {
        // Consolidate into a single web tool component for the current assistant turn
        let existingWebMsg: ChatMessage | null = null;
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.role === 'user') break;
          if (m.kind === 'tool' && (m.tool === 'web_search' || m.tool === 'web_fetch' || m.searchResults)) {
            existingWebMsg = m;
            break;
          }
        }

        const incomingResults = payload.searchResults?.results || [];
        const fetchUrl =
          payload.tool === 'web_fetch'
            ? (typeof payload.args === 'string' ? payload.args : payload.args?.url || payload.path || '')
            : '';

        if (existingWebMsg) {
          if (!existingWebMsg.searchResults) {
            existingWebMsg.searchResults = {
              query: payload.searchResults?.query || payload.args?.query || fetchUrl || '',
              phase: payload.status === 'running' ? 'searching' : 'done',
              results: [],
              answer: ''
            };
          }

          const results = existingWebMsg.searchResults.results || [];
          const seen = new Set(results.map((r: any) => r.url).filter(Boolean));

          for (const r of incomingResults) {
            if (r.url && !seen.has(r.url)) {
              seen.add(r.url);
              results.push(r);
            }
          }

          if (fetchUrl && !seen.has(fetchUrl)) {
            seen.add(fetchUrl);
            results.push({
              title: payload.title || fetchUrl,
              url: fetchUrl,
              domain: safeHostname(fetchUrl),
              snippet: (payload.output || '').slice(0, 200)
            });
          }

          existingWebMsg.searchResults.results = results;
          if (payload.status === 'running') {
            existingWebMsg.status = 'running';
            existingWebMsg.searchResults.phase = payload.searchResults?.phase || 'searching';
          } else if (payload.status === 'done') {
            existingWebMsg.status = 'done';
            existingWebMsg.searchResults.phase = 'done';
          }
          return;
        }

        const initialResults = [...incomingResults];
        if (fetchUrl && !initialResults.some((r: any) => r.url === fetchUrl)) {
          initialResults.push({
            title: payload.title || fetchUrl,
            url: fetchUrl,
            domain: safeHostname(fetchUrl),
            snippet: (payload.output || '').slice(0, 200)
          });
        }

        state.messages.push({
          id: payload.replaceKey || Date.now().toString(),
          role: 'assistant',
          kind: 'tool',
          tool: 'web_search',
          status: payload.status || 'running',
          args: payload.args,
          searchResults: {
            query: payload.searchResults?.query || payload.args?.query || fetchUrl || 'web search',
            phase: payload.status === 'running' ? (payload.searchResults?.phase || 'searching') : 'done',
            results: initialResults,
            answer: ''
          },
          blocks: []
        });
        return;
      }

      const cleanArgs = sanitizeToolArgs(payload.args);
      const sanitizedPayload = payload.args !== undefined ? { ...payload, args: cleanArgs } : payload;

      if (payload.replaceKey) {
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.id === payload.replaceKey || (m as any).replaceKey === payload.replaceKey) {
            state.messages[i] = {
              ...state.messages[i],
              ...sanitizedPayload,
              id: payload.replaceKey
            };
            return;
          }
        }
      }

      state.messages.push({
        id: payload.replaceKey || Date.now().toString(),
        role: 'assistant',
        kind: payload.kind || 'tool',
        ...sanitizedPayload
      });
    },
    toolCallStarted: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const cleanArgs = sanitizeToolArgs(payload.args);

      const isWebTool =
        payload.tool === 'web_search' || payload.tool === 'web_fetch' || payload.searchResults;

      if (isWebTool) {
        let existingWebMsg: ChatMessage | null = null;
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.role === 'user') break;
          if (m.kind === 'tool' && (m.tool === 'web_search' || m.tool === 'web_fetch' || m.searchResults)) {
            existingWebMsg = m;
            break;
          }
        }

        const fetchUrl =
          payload.tool === 'web_fetch'
            ? (typeof cleanArgs === 'string' ? cleanArgs : cleanArgs?.url || '')
            : '';

        if (existingWebMsg) {
          existingWebMsg.status = 'running';
          if (existingWebMsg.searchResults) {
            existingWebMsg.searchResults.phase = payload.searchResults?.phase || 'searching';
            if (fetchUrl) {
              const results = existingWebMsg.searchResults.results || [];
              if (!results.some((r: any) => r.url === fetchUrl)) {
                results.push({
                  title: fetchUrl,
                  url: fetchUrl,
                  domain: safeHostname(fetchUrl)
                });
                existingWebMsg.searchResults.results = results;
              }
            }
          }
          return;
        }

        state.messages.push({
          id: payload.replaceKey || Date.now().toString(),
          role: 'assistant',
          kind: 'tool',
          tool: 'web_search',
          status: 'running',
          args: cleanArgs,
          searchResults: payload.searchResults || {
            query: typeof cleanArgs === 'string' ? cleanArgs : fetchUrl || 'web search',
            phase: 'searching',
            results: fetchUrl ? [{ title: fetchUrl, url: fetchUrl, domain: safeHostname(fetchUrl) }] : [],
            answer: ''
          },
          blocks: []
        });
        return;
      }

      // Deduplicate: If replaceKey already exists, update in-place instead of creating duplicate
      if (payload.replaceKey) {
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.id === payload.replaceKey || (m as any).replaceKey === payload.replaceKey) {
            state.messages[i] = {
              ...state.messages[i],
              status: 'running',
              tool: payload.tool,
              args: cleanArgs,
              replaceKey: payload.replaceKey
            };
            return;
          }
        }
      }

      state.messages.push({
        id: payload.replaceKey || Date.now().toString(),
        role: 'assistant',
        kind: 'tool',
        tool: payload.tool,
        args: cleanArgs,
        status: 'running',
        replaceKey: payload.replaceKey,
        blocks: []
      });
    },
    permissionRequested: (state, action) => {
      state.permissionRequest = action.payload;
    },
    clearPermission: (state) => {
      state.permissionRequest = null;
    },
    resetStreaming: (state) => {
      state.isStreaming = false;
      state._turnDone = true;
    },
    setUndoResult: (state, action) => {
      state.lastUndoResult = action.payload;
    },
    setPlan: (state, action) => {
      state.plan = action.payload;
    },
    updateTodo: (state, action) => {
      if (state.plan && state.plan.todos) {
        const { id, status } = action.payload;
        const todo = state.plan.todos.find((t) => t.id === id);
        if (todo) {
          todo.status = status;
        }
      }
    },
    chatDone: (state, action) => {
      state.isStreaming = false;
      state._turnDone = true;
      const payloadText = action.payload?.text;
      let lastStreamIdx = -1;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].kind === 'stream') {
          lastStreamIdx = i;
          break;
        }
      }
      for (let i = state.messages.length - 1; i >= 0; i--) {
        const m = state.messages[i];
        if (m.kind === 'stream') {
          if (i === lastStreamIdx && payloadText && (!m.text || payloadText.startsWith(m.text))) {
            m.text = payloadText;
          }
          m.kind = 'assistant';
          m.status = 'done';
        }
      }
    },
    clearChat: (state) => {
      state.messages = [];
      state.plan = null;
      state.permissionRequest = null;
      state.isStreaming = false;
      state._turnDone = false;
      state.keysError = null;
    },

    // ── God-mode reducers ───────────────────────────────────────────
    setGodMode: (state, action) => {
      state.godMode = action.payload;
    },
    setSubagentCreated: (state, action) => {
      const p = action.payload || {};
      state.subagents[p.todoId] = {
        todoId: p.todoId,
        domain: p.domain,
        status: 'pending',
        message: '',
        progress: 0
      };
    },
    setSubagentAssigned: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'assigned';
        state.subagents[p.todoId].model = p.model;
        state.subagents[p.todoId].title = p.title;
      }
    },
    setSubagentStarted: (state, action) => {
      const p = action.payload || {};
      if (!state.subagents[p.todoId]) {
        state.subagents[p.todoId] = {
          todoId: p.todoId,
          domain: p.domain,
          status: 'running',
          message: '',
          progress: 0
        };
      } else {
        state.subagents[p.todoId].status = 'running';
      }
      state.subagents[p.todoId].startedAt = p.startedAt;
      state.subagents[p.todoId].tokens = p.tokens;
      state.subagents[p.todoId].latency = p.latency;
    },
    setSubagentStep: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].message = p.message || state.subagents[p.todoId].message;
        if (p.tokens != null) state.subagents[p.todoId].tokens = p.tokens;
        if (p.secs != null) state.subagents[p.todoId].secs = p.secs;
      }
    },
    setSubagentDone: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'done';
        state.subagents[p.todoId].progress = 100;
      }
    },
    setSubagentFailed: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'failed';
      }
    },
    setSubagentFile: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].lastFile = p.file;
      }
    },
    setSubagentToolCall: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].lastTool = p.tool;
        state.subagents[p.todoId].lastToolArgs = p.args;
      }
    },
    setSubagentToolResult: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].lastToolResult = { tool: p.tool, ms: p.ms, risk: p.risk };
      }
    },
    setSubagentNeedsReview: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'needs_review';
        state.subagents[p.todoId].reviewReason = p.reason;
      }
    },
    setWaveStart: (state, action) => {
      const p = action.payload || {};
      state.waves.push({
        wave: p.wave,
        total: p.total || 0,
        completed: 0,
        status: 'running'
      });
    },
    setWaveComplete: (state, action) => {
      const p = action.payload || {};
      const wave = state.waves.find((w) => w.wave === p.wave);
      if (wave) {
        wave.status = 'complete';
        wave.completed = p.completed || wave.total;
      }
    },
    setIntegrationPass: (state, action) => {
      state.buildIntegration = action.payload || {};
    },
    setBuildComplete: (state, action) => {
      state.buildSummary = action.payload;
      state.isStreaming = false;
      state.godMode = false;
    },
    addToast: (state, action) => {
      const { id, kind = 'info', text } = action.payload || {};
      state.toasts.push({ id: id || Date.now().toString(), kind, text });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    }
  }
});

export const {
  setStatus,
  chatReady,
  chatError,
  setMode,
  setSelectedModel,
  setModels,
  addMessage,
  streamUpdate,
  agentMessage,
  toolCallStarted,
  permissionRequested,
  clearPermission,
  setUndoResult,
  setPlan,
  updateTodo,
  chatDone,
  resetStreaming,
  clearChat,
  // God-mode
  setGodMode,
  setSubagentCreated,
  setSubagentAssigned,
  setSubagentStarted,
  setSubagentStep,
  setSubagentDone,
  setSubagentFailed,
  setSubagentFile,
  setSubagentToolCall,
  setSubagentToolResult,
  setSubagentNeedsReview,
  setWaveStart,
  setWaveComplete,
  setIntegrationPass,
  setBuildComplete,
  addToast,
  removeToast
} = chatSlice.actions;

export default chatSlice.reducer;
