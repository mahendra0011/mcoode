import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Session state
  isReady: false,
  hasKeys: false,

  // Chat configuration
  mode: 'agent', // 'chat' | 'agent'
  selectedModel: null,
  providers: [],
  models: [],

  // Workspace
  workspace: null,
  workspaces: [],
  workspaceLoading: false,

  // Message list (flat: user, assistant, system, tool, summary)
  messages: [],

  // Generation state
  isGenerating: false,

  // Live tool calls (for right sidebar in agent mode)
  toolCalls: [],

  // Pending permission dialog
  pendingPermission: null,

  // File tree (agent mode)
  fileTree: [],
  fileTreeLoading: false,
  activeFile: null,

  error: null
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // ── Session lifecycle ──
    setReady: (state, action) => {
      state.isReady = true;
      state.hasKeys = true;
      state.error = null;
      state.providers = action.payload.providers || state.providers;
      state.models = action.payload.models || [];
    },
    setHasKeys: (state, action) => {
      state.hasKeys = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isGenerating = false;
    },
    resetSession: (state) => {
      state.isReady = false;
      state.hasKeys = false;
      state.error = action?.payload || null;
    },

    // ── Mode & model ──
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    setModels: (state, action) => {
      state.models = action.payload;
    },
    setProviders: (state, action) => {
      state.providers = action.payload;
    },
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },

    // ── Workspace ──
    setWorkspaces: (state, action) => {
      state.workspaces = action.payload;
      state.workspaceLoading = false;
    },
    setWorkspace: (state, action) => {
      state.workspace = action.payload;
    },
    setWorkspaceLoading: (state, action) => {
      state.workspaceLoading = action.payload;
    },
    setFileTree: (state, action) => {
      state.fileTree = action.payload;
      state.fileTreeLoading = false;
    },
    setActiveFile: (state, action) => {
      state.activeFile = action.payload;
    },

    // ── Messages ──
    addMessage: (state, action) => {
      state.messages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        ...action.payload
      });
    },
    updateLastAssistant: (state, action) => {
      // Update or create the last assistant message (for streaming)
      const last = state.messages[state.messages.length - 1];
      if (last && last.role === 'assistant' && !last.final) {
        last.content = action.payload.text;
        last.streaming = action.payload.streaming !== false;
      } else {
        state.messages.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          role: 'assistant',
          content: action.payload.text,
          streaming: action.payload.streaming !== false,
          timestamp: Date.now()
        });
      }
    },
    finalizeAssistant: (state) => {
      const last = state.messages[state.messages.length - 1];
      if (last && last.role === 'assistant') {
        last.streaming = false;
        last.final = true;
      }
    },
    clearMessages: (state) => {
      state.messages = [];
      state.toolCalls = [];
      state.streamingText = '';
    },
    reset: () => {
      Object.assign(state, initialState);
    },

    // ── Tool calls ──
    upsertToolCall: (state, action) => {
      const call = action.payload;
      const existing = state.toolCalls.find((t) => t.replaceKey === call.replaceKey);
      if (existing) {
        Object.assign(existing, call);
      } else {
        state.toolCalls.push(call);
      }
    },
    clearToolCall: (state, action) => {
      state.toolCalls = state.toolCalls.filter((t) => t.replaceKey !== action.payload);
    },
    clearToolCalls: (state) => {
      state.toolCalls = [];
    },

    // ── Permission ──
    setPendingPermission: (state, action) => {
      state.pendingPermission = action.payload;
    },
    clearPendingPermission: (state) => {
      state.pendingPermission = null;
    },

    // ── Generation state ──
    setGenerating: (state, action) => {
      state.isGenerating = action.payload;
      if (!action.payload) {
        // Generation stopped — finalize streaming messages
        const last = state.messages[state.messages.length - 1];
        if (last && last.streaming) {
          last.streaming = false;
          last.final = true;
        }
      }
    }
  }
});

export const {
  setReady,
  setHasKeys,
  setError,
  resetSession,
  setMode,
  setModels,
  setProviders,
  setSelectedModel,
  setWorkspaces,
  setWorkspace,
  setWorkspaceLoading,
  setFileTree,
  setActiveFile,
  addMessage,
  updateLastAssistant,
  finalizeAssistant,
  clearMessages,
  reset,
  upsertToolCall,
  clearToolCall,
  clearToolCalls,
  setPendingPermission,
  clearPendingPermission,
  setGenerating
} = chatSlice.actions;

export default chatSlice.reducer;
