import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { getToken } from '../lib/api';
import api from '../lib/axios';
import {
  setStatus,
  chatReady,
  chatError,
  streamUpdate,
  agentMessage,
  toolCallStarted,
  permissionRequested,
  clearPermission,
  setUndoResult,
  setPlan,
  setModels,
  updateTodo,
  chatDone,
  resetStreaming,
  setDesignStreaming,
  setDesignStream,
  setDesignDone,
  setDesignError,
  setCurrentDesign,
  setDesigns,
  removeDesign,
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
} from '../store/chatSlice';

let socketSingleton = null;

function getSocket() {
  if (!socketSingleton || socketSingleton.disconnected) {
    socketSingleton = io({
      path: '/live',
      auth: { token: getToken() || '' },
      reconnection: true,
      reconnectionDelayMax: 2000,
    });
  }
  return socketSingleton;
}

/**
 * useChatSocket — owns the socket.io-client instance + Redux dispatches.
 *
 * The socket is created once and kept alive across model/workspace changes.
 * When `workspaceId` or `selectedModel` changes, we re-emit `chat:start`
 * instead of tearing down and recreating the socket (which would lose the
 * server-side ChatSession and any conversation context).
 */
export function useChatSocket(workspaceId = null) {
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const { mode, selectedModel } = useSelector((state) => state.chat);

  // Refs so the onConnect handler always uses the latest workspace/model
  // even after a socket reconnection (avoids stale closure from effect deps)
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  // Stream chunk buffer — accumulates rapid-fire deltas and flushes as a
  // single batched dispatch every 16ms to reduce React re-renders.
  const streamBufferRef = useRef('');
  const streamTimerRef = useRef(null);
  // Guard: once chat:done fires, ignore any stray/late chat:stream events
  // that arrive after (prevents isStreaming from flipping back to true).
  const doneRef = useRef(false);

  // ── Fetch available models from the backend (GET /api/v1/keys/models) ──
  const reloadModels = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/keys/models', { timeout: 5000 });
      if (res.status === 401) {
        dispatch(chatError({ kind: 'keys', message: 'please select your api keys to use mcode' }));
        return;
      }
      dispatch(setModels(res.data.models || []));
      // setModels reducer now auto-defaults selectedModel if it's invalid
      // (e.g. was set to a provider id by the socket chat:ready path).
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  }, [dispatch]);

  // ── Fetch saved API keys (for the ModelSelector dropdown) ──
  const fetchKeys = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/keys', { timeout: 5000 });
      return res.data.keys || [];
    } catch (err) {
      console.error('Failed to load keys:', err);
    }
    return [];
  }, []);

  // ── Fetch GitHub connection status (for IDE) ──
  const fetchGithubStatus = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/github/status', { timeout: 5000 });
      return res.data;
    } catch (err) {
      console.error('Failed to load github status:', err);
    }
    return { connected: false };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      dispatch(setStatus('connecting'));
      // Emit chat:start with current workspace + model (use refs for latest values)
      socket.emit('chat:start', { workspaceId: workspaceIdRef.current, modelRef: selectedModelRef.current });
    };

    const onChatReady = (payload) => {
      dispatch(chatReady(payload?.models));
    };

    const onChatError = (payload) => {
      dispatch(chatError(payload));
    };

    // Buffer rapid-fire stream chunks and flush as a single batch every 16ms
    // (~60fps) to avoid a React re-render on every tiny delta. This dramatically
    // reduces churn when the provider sends hundreds of small chunks.
    const onChatStream = (payload) => {
      // Ignore stray stream chunks that arrive after chat:done
      if (doneRef.current) return;
      if (payload && payload.text) {
        streamBufferRef.current += payload.text;
        if (!streamTimerRef.current) {
          streamTimerRef.current = setTimeout(() => {
            dispatch(streamUpdate(streamBufferRef.current));
            streamBufferRef.current = '';
            streamTimerRef.current = null;
          }, 16);
        }
      }
    };

    const onChatMessage = (payload) => {
      dispatch(agentMessage(payload));

      // When the agent writes/edits a file via a tool, notify any open editor
      // panes so they can auto-refresh content for that file path.
      if (
        payload &&
        payload.kind === 'tool' &&
        (payload.tool === 'write_file' || payload.tool === 'edit_file') &&
        payload.status === 'done' &&
        typeof payload.args === 'string'
      ) {
        document.dispatchEvent(
          new CustomEvent('file:changed', { detail: { path: payload.args } })
        );
      }
    };

    const onChatToolCall = (payload) => {
      dispatch(toolCallStarted(payload));
    };

    const onChatPermission = (payload) => {
      dispatch(permissionRequested(payload));
    };

    const onChatTodoPlan = (payload) => {
      dispatch(setPlan(payload));
    };

    const onChatTodoUpdate = (payload) => {
      dispatch(updateTodo(payload));
    };

    const onChatDone = (payload) => {
      // Flush any remaining buffered deltas before finalizing so no chunks are lost
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        if (streamBufferRef.current) {
          dispatch(streamUpdate(streamBufferRef.current));
          streamBufferRef.current = '';
        }
        streamTimerRef.current = null;
      }
      dispatch(chatDone(payload || {}));
      doneRef.current = true;
    };

    const onUndoResult = (payload) => {
      dispatch(setUndoResult(payload));
    };

    const onShellStream = (payload) => {
      window.__socketDebug = window.__socketDebug || [];
      window.__socketDebug.push({ type: 'chat:shell_stream', chunk: payload?.chunk?.substring(0, 50) });
      if (payload && payload.chunk) {
        document.dispatchEvent(new CustomEvent('terminal:write', { detail: payload.chunk }));
      }
    };

    // Design tab streaming handlers
    const onDesignStream = (payload) => {
      if (payload && payload.htmlChunk) {
        dispatch(setDesignStream(payload));
      }
    };

    const onDesignDone = (payload) => {
      if (payload) {
        dispatch(setDesignDone(payload));
      }
    };

    const onDisconnect = () => {
      dispatch(setStatus('idle'));
      // If the backend crashed or restarted mid-response, isStreaming can be
      // stuck true (chat:done was never sent). Reset it so the ThinkingIndicator
      // stops spinning and the user can send a new message.
      dispatch(resetStreaming());
    };

    // ── God-mode socket event handlers ──
    const onSubagentCreated = (payload) => { dispatch(setSubagentCreated(payload)); };
    const onSubagentAssigned = (payload) => { dispatch(setSubagentAssigned(payload)); };
    const onSubagentStarted = (payload) => { dispatch(setSubagentStarted(payload)); };
    const onSubagentStep = (payload) => { dispatch(setSubagentStep(payload)); };
    const onSubagentDone = (payload) => { dispatch(setSubagentDone(payload)); };
    const onSubagentFailed = (payload) => { dispatch(setSubagentFailed(payload)); };
    const onSubagentFile = (payload) => { dispatch(setSubagentFile(payload)); };
    const onSubagentToolCall = (payload) => { dispatch(setSubagentToolCall(payload)); };
    const onSubagentToolResult = (payload) => { dispatch(setSubagentToolResult(payload)); };
    const onSubagentNeedsReview = (payload) => { dispatch(setSubagentNeedsReview(payload)); };
    const onWaveStart = (payload) => { dispatch(setWaveStart(payload)); };
    const onWaveComplete = (payload) => { dispatch(setWaveComplete(payload)); };
    const onIntegrationPass = (payload) => { dispatch(setIntegrationPass(payload)); };
    const onBuildComplete = (payload) => { dispatch(setBuildComplete(payload)); };
    const onToast = (payload) => {
      if (payload) {
        const id = Date.now().toString();
        dispatch(addToast({ ...payload, id }));
        // Auto-dismiss after 5s
        setTimeout(() => dispatch(removeToast(id)), 5000);
      }
    };

    socket.on('connect', onConnect);
    socket.on('chat:ready', onChatReady);
    socket.on('chat:error', onChatError);
    socket.on('chat:stream', onChatStream);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:tool_call', onChatToolCall);
    socket.on('chat:permission', onChatPermission);
    socket.on('chat:todo_plan', onChatTodoPlan);
    socket.on('chat:todo_update', onChatTodoUpdate);
    socket.on('chat:done', onChatDone);
    socket.on('chat:undo_result', onUndoResult);
    socket.on('chat:shell_stream', onShellStream);
    socket.on('design:stream', onDesignStream);
    socket.on('design:done', onDesignDone);
    socket.on('disconnect', onDisconnect);

    // God-mode events
    socket.on('subagent:created', onSubagentCreated);
    socket.on('subagent:assigned', onSubagentAssigned);
    socket.on('subagent:started', onSubagentStarted);
    socket.on('subagent:step', onSubagentStep);
    socket.on('subagent:done', onSubagentDone);
    socket.on('subagent:failed', onSubagentFailed);
    socket.on('subagent:file', onSubagentFile);
    socket.on('subagent:tool_call', onSubagentToolCall);
    socket.on('subagent:tool_result', onSubagentToolResult);
    socket.on('subagent:needs_review', onSubagentNeedsReview);
    socket.on('wave:start', onWaveStart);
    socket.on('wave:complete', onWaveComplete);
    socket.on('integration:pass', onIntegrationPass);
    socket.on('build:complete', onBuildComplete);
    socket.on('toast', onToast);

    // Load available models on mount
    reloadModels();

    // Listen for external requests to reload models (e.g. after adding a key)
    const reloadHandler = () => reloadModels();
    window.addEventListener('mcode:reload-models', reloadHandler);

    // Force reconnection when auth token changes (e.g. re-login in another tab)
    // so the socket doesn't carry a stale Bearer token.
    const handleTokenChange = () => {
      const newToken = getToken();
      if (socketRef.current && !socketRef.current.disconnected) {
        socketRef.current.auth = { token: newToken || '' };
        socketRef.current.disconnect();
        socketRef.current.connect();
      }
    };
    const storageHandler = (e) => {
      if (e.key === 'mcode_tokens') handleTokenChange();
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      // Clear any pending stream flush timer
      if (streamTimerRef.current) {
        clearTimeout(streamTimerRef.current);
        streamTimerRef.current = null;
        streamBufferRef.current = '';
      }
      socket.disconnect();
      socket.off('connect', onConnect);
      socket.off('chat:ready', onChatReady);
      socket.off('chat:error', onChatError);
      socket.off('chat:stream', onChatStream);
      socket.off('chat:message', onChatMessage);
      socket.off('chat:tool_call', onChatToolCall);
      socket.off('chat:permission', onChatPermission);
      socket.off('chat:todo_plan', onChatTodoPlan);
      socket.off('chat:todo_update', onChatTodoUpdate);
      socket.off('chat:done', onChatDone);
      socket.off('chat:undo_result', onUndoResult);
      socket.off('chat:shell_stream', onShellStream);
      socket.off('design:stream', onDesignStream);
      socket.off('design:done', onDesignDone);
      socket.off('disconnect', onDisconnect);

      // God-mode cleanup
      socket.off('subagent:created', onSubagentCreated);
      socket.off('subagent:assigned', onSubagentAssigned);
      socket.off('subagent:started', onSubagentStarted);
      socket.off('subagent:step', onSubagentStep);
      socket.off('subagent:done', onSubagentDone);
      socket.off('subagent:failed', onSubagentFailed);
      socket.off('subagent:file', onSubagentFile);
      socket.off('subagent:tool_call', onSubagentToolCall);
      socket.off('subagent:tool_result', onSubagentToolResult);
      socket.off('subagent:needs_review', onSubagentNeedsReview);
      socket.off('wave:start', onWaveStart);
      socket.off('wave:complete', onWaveComplete);
      socket.off('integration:pass', onIntegrationPass);
      socket.off('build:complete', onBuildComplete);
      socket.off('toast', onToast);
      window.removeEventListener('mcode:reload-models', reloadHandler);
      window.removeEventListener('storage', storageHandler);
    };
  }, [dispatch, reloadModels]);

  // Re-emit chat:start when workspaceId or selectedModel changes
  // (only after the socket is connected so the event is picked up)
  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit('chat:start', { workspaceId, modelRef: selectedModel });
    }
  }, [workspaceId, selectedModel]);

    const send = useCallback((prompt, overrideMode = null) => {
    if (socketRef.current) {
      doneRef.current = false; // Reset guard for the new turn
      const effectiveMode = overrideMode || mode;
      socketRef.current.emit('chat:send', { prompt, mode: effectiveMode });
    }
  }, [mode]);

  const interrupt = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('chat:interrupt');
    }
  }, []);

  const answerPermission = useCallback((requestId, answer) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:permission_answer', { requestId, answer });
    }
    // Clear the permission modal from Redux state now that we've answered
    dispatch(clearPermission());
  }, [dispatch]);

  const undo = useCallback((msg) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:undo', { undoId: msg?.undoId });
    }
  }, []);

  const sendTerminalCommand = useCallback((command) => {
    console.log('[DEBUG] sendTerminalCommand called:', command, 'socketRef:', !!socketRef.current, 'disconnected:', socketRef.current?.disconnected);
    if (socketRef.current && command && command.trim()) {
      socketRef.current.emit('terminal:command', { command: command.trim() });
    } else {
      console.log('[DEBUG] sendTerminalCommand skipped — socket or command invalid');
    }
  }, []);

  // ── Design tab: generate HTML from a prompt ──
  const generateDesign = useCallback(async (prompt, { baseTemplate = null, designId = null, device = 'desktop' } = {}) => {
    dispatch(setDesignStreaming());
    try {
      const res = await api.post('/api/v1/design/generate', { prompt, baseTemplate, designId, device });
      const data = res.data;
      if (data.design) {
        dispatch(setCurrentDesign(data.design));
      } else {
        dispatch(setDesignError(data.error?.message || 'Generation failed'));
      }
    } catch (err) {
      dispatch(setDesignError(err.message || 'Network error'));
    }
  }, [dispatch]);

  // ── Design tab: load user's saved designs ──
  const loadDesigns = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/design', { timeout: 5000 });
      dispatch(setDesigns(res.data.designs || []));
    } catch (err) {
      console.error('Failed to load designs:', err);
    }
  }, [dispatch]);

  // ── Design tab: open an existing design ──
  const openDesign = useCallback(async (designId) => {
    try {
      const res = await api.get(`/api/v1/design/${designId}`, { timeout: 5000 });
      const data = res.data;
      if (data.design) {
        dispatch(setCurrentDesign({ ...data.design, versions: data.versions || [] }));
      }
    } catch (err) {
      console.error('Failed to load design:', err);
    }
  }, [dispatch]);

  // ── Design tab: open a design in the AI Code Agent workspace ──
  const openInAgent = useCallback(async (designId) => {
    try {
      const res = await api.post('/api/v1/workspaces', { name: `from-design-${designId.slice(-6)}`, source: 'design', designId });
      const data = res.data;
      if (data.workspace) {
        // Navigate to the AI Chat page with the new workspace pre-selected
        window.location.href = `/ai/chat?workspace=${data.workspace._id}`;
      }
    } catch (err) {
      console.error('Failed to create workspace from design:', err);
    }
  }, []);

  // ── Design tab: delete a design ──
  const deleteDesign = useCallback(async (designId) => {
    try {
      await api.delete(`/api/v1/design/${designId}`);
      dispatch(removeDesign(designId));
    } catch (err) {
      console.error('Failed to delete design:', err);
    }
  }, [dispatch]);

  return {
    send,
    interrupt,
    answerPermission,
    undo,
    sendTerminalCommand,
    reloadModels,
    fetchKeys,
    fetchGithubStatus,
    generateDesign,
    loadDesigns,
    openDesign,
    openInAgent,
    deleteDesign
  };
}
