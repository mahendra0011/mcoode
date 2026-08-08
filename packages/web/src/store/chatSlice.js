import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle', // 'idle' | 'connecting' | 'ready' | 'error'
  keysError: null,
  mode: 'chat', // 'chat' | 'agent'
  messages: [], // { id, role, kind, text, blocks, replaceKey }
  plan: null, // { summary, todos }
  permissionRequest: null,
  lastUndoResult: null,
  isStreaming: false,
  models: [],
  selectedModel: null,
  // God-mode state
  godMode: false, // true when god-mode parallel build is active
  waves: [], // [{ wave, total, completed }]
  subagents: {}, // { todoId: { todoId, domain, status, message, progress } }
  buildSummary: null, // { done, total, failed, needsReview, elapsedSecs }
  toasts: [], // [{ id, kind, text }]
  // Design tab state
  designs: [], // list of saved designs
  currentDesign: null, // { _id, html, prompt, version, versions[], device }
  designStatus: 'idle', // 'idle' | 'generating' | 'ready' | 'error'
  designError: null,
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
      const payload = action.payload || [];
      // The socket emits provider objects ({id, displayName}) while the REST
      // API emits model objects ({ref, provider, name, ...}). Only overwrite
      // the models array when the payload contains actual model objects
      // (has a `ref` field) so we don't lose the model list that reloadModels
      // fetched from REST.
      const hasModels = payload.length > 0 && payload.some((m) => m.ref);
      if (hasModels) {
        state.models = payload;
      }
      if (!state.selectedModel && state.models.length > 0) {
        // Prefer poolside models when available (user's explicit choice).
        const poolSide = state.models.find((m) => m.provider === 'poolside');
        const first = poolSide || state.models[0];
        state.selectedModel = first.ref || first.id;
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
      // Validate the currently selected model against the new list. If it no
      // longer matches any model's ref (e.g. it was set to a provider id by
      // the socket chat:ready path), default to the first model's ref.
      // Prefer poolside models when available (they're the user's explicit
      // provider choice), otherwise fall back to the first model.
      if (state.models.length > 0) {
        const valid = state.models.some((m) => m.ref === state.selectedModel);
        if (!valid) {
          const poolSide = state.models.find((m) => m.provider === 'poolside');
          const first = poolSide || state.models[0];
          state.selectedModel = first.ref || first.id;
        }
      } else {
        state.selectedModel = null;
      }
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.isStreaming = true;
      state.keysError = null;
    },
    streamUpdate: (state, action) => {
      const text = action.payload;
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.kind === 'stream') {
        lastMessage.text = (lastMessage.text || '') + text;
      } else {
        state.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          kind: 'stream',
          text: text,
          blocks: []
        });
      }
      state.isStreaming = true;
    },
    agentMessage: (state, action) => {
      const msg = action.payload;
      if (msg.replaceKey) {
        // Find existing message by replaceKey
        const existingIdx = state.messages.findIndex(m => m.replaceKey === msg.replaceKey);
        if (existingIdx !== -1) {
           // We map blocks to replace the running block if needed, but since ChatAgent emits a whole MESSAGE for tool done,
           // we actually replace the entire message if it was a dedicated block, OR just update it.
           // Usually, ChatAgent tool results are sent as standalone messages with `kind: 'tool'`.
           state.messages[existingIdx] = msg;
           return;
        }
      }
      state.messages.push(msg);
    },
    toolCallStarted: (state, action) => {
      // In ChatAgent, a tool_call is just an announcement, but _blockMeta returns a replaceKey.
      // We will push a new message placeholder here that `agentMessage` can replace later.
      const id = Date.now().toString();
      const replaceKey = action.payload.replaceKey || action.payload.args?.replaceKey || `t-${id}`;
      // The same tool call is forwarded via two channels: chat:tool_call (this
      // action) and chat:message → agentMessage. If agentMessage already created
      // the running card with this replaceKey, update it in place instead of
      // pushing a duplicate that can never be matched by the 'done' message.
      const existingIdx = state.messages.findIndex(m => m.replaceKey === replaceKey);
      if (existingIdx !== -1) {
        state.messages[existingIdx] = {
          id: state.messages[existingIdx].id,
          role: 'assistant',
          kind: 'tool',
          replaceKey,
          ...action.payload,
          status: 'running'
        };
        return;
      }
      state.messages.push({
         id,
         role: 'assistant',
         kind: 'tool',
         replaceKey,
         ...action.payload,
         status: 'running'
      });
    },
    permissionRequested: (state, action) => {
       state.permissionRequest = action.payload;
    },
    clearPermission: (state) => {
       state.permissionRequest = null;
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
          const todo = state.plan.todos.find(t => t.id === id);
          if (todo) {
             todo.status = status;
          }
       }
    },
    chatDone: (state) => {
      state.isStreaming = false;
    },
    clearChat: (state) => {
      state.messages = [];
      state.plan = null;
      state.permissionRequest = null;
      state.isStreaming = false;
      state.keysError = null;
    },

    // Design tab reducers
    setDesigns: (state, action) => {
      state.designs = action.payload || [];
    },
    removeDesign: (state, action) => {
      state.designs = state.designs.filter((d) => d._id !== action.payload);
    },
    setCurrentDesign: (state, action) => {
      state.currentDesign = action.payload;
      state.designStatus = 'ready';
      state.designError = null;
    },
    setDesignStreaming: (state) => {
      state.designStatus = 'generating';
      state.designError = null;
      // Initialize a placeholder so streaming chunks can append without
      // needing the full design object to exist yet.
      if (!state.currentDesign) {
        state.currentDesign = { html: '', version: 1, _id: null };
      }
    },
    setDesignStream: (state, action) => {
      state.designStatus = 'generating';
      if (state.currentDesign) {
        state.currentDesign.html = (state.currentDesign.html || '') + (action.payload?.htmlChunk || '');
      }
    },
    setDesignDone: (state, action) => {
      state.designStatus = 'ready';
      state.designError = null;
      if (!state.currentDesign) {
        state.currentDesign = { html: '', version: 1, _id: null };
      }
      if (action.payload) {
        state.currentDesign.html = action.payload.html || state.currentDesign.html;
        state.currentDesign.version = action.payload.version || state.currentDesign.version;
        if (action.payload.designId) state.currentDesign._id = action.payload.designId;
        if (action.payload.parentId) state.currentDesign.parentId = action.payload.parentId;
      }
    },
    setDesignError: (state, action) => {
      state.designStatus = 'error';
      state.designError = action.payload;
    },
    clearDesign: (state) => {
      state.currentDesign = null;
      state.designStatus = 'idle';
      state.designError = null;
    },

    // ── God-mode reducers ───────────────────────────────────────────
    setGodMode: (state, action) => {
      state.godMode = action.payload;
    },
    setSubagentStarted: (state, action) => {
      const p = action.payload || {};
      state.subagents[p.todoId] = {
        todoId: p.todoId,
        domain: p.domain,
        status: 'running',
        message: p.message || '',
        progress: 0
      };
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
      const wave = state.waves.find(w => w.wave === p.wave);
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
  clearChat,
  setDesigns,
  removeDesign,
  setCurrentDesign,
  setDesignStreaming,
  setDesignStream,
  setDesignDone,
  setDesignError,
  clearDesign,
  // God-mode
  setGodMode,
  setSubagentStarted,
  setSubagentStep,
  setSubagentDone,
  setSubagentFailed,
  setSubagentFile,
  setWaveStart,
  setWaveComplete,
  setIntegrationPass,
  setBuildComplete,
  addToast,
  removeToast
} = chatSlice.actions;

export default chatSlice.reducer;
