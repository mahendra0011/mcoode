import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  status: 'idle', // 'idle' | 'connecting' | 'ready' | 'error'
  keysError: null,
  mode: 'chat', // 'chat' | 'agent'
  messages: [], // { id, role, kind, text, blocks, replaceKey }
  plan: null, // { summary, todos }
  permissionRequest: null,
  isStreaming: false,
  models: [],
  selectedModel: null,
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
      state.models = action.payload || [];
      if (!state.selectedModel && state.models.length > 0) {
        state.selectedModel = state.models[0].id;
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
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.isStreaming = true;
      state.keysError = null;
    },
    streamUpdate: (state, action) => {
      const text = action.payload;
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
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
      const replaceKey = action.payload.args?.replaceKey || action.payload.replaceKey || `t-${id}`;
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
    setCurrentDesign: (state, action) => {
      state.currentDesign = action.payload;
      state.designStatus = 'ready';
      state.designError = null;
    },
    setDesignStreaming: (state) => {
      state.designStatus = 'generating';
      state.designError = null;
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
      if (state.currentDesign && action.payload) {
        state.currentDesign.html = action.payload.html || state.currentDesign.html;
        state.currentDesign.version = action.payload.version || state.currentDesign.version;
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
  setPlan,
  updateTodo,
  chatDone,
  clearChat,
  setDesigns,
  setCurrentDesign,
  setDesignStreaming,
  setDesignStream,
  setDesignDone,
  setDesignError,
  clearDesign
} = chatSlice.actions;

export default chatSlice.reducer;
