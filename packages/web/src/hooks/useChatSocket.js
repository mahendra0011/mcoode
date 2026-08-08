import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { getAuthHeaders, getToken } from '../lib/api';
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
  setDesignStreaming,
  setDesignStream,
  setDesignDone,
  setDesignError,
  setCurrentDesign,
  setDesigns,
  removeDesign
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

  // ── Fetch available models from the backend (GET /api/v1/keys/models) ──
  const reloadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/keys/models', { headers: getAuthHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          dispatch(chatError({ kind: 'keys', message: 'please select your api keys to use mcode' }));
        }
        return;
      }
      const data = await res.json();
      dispatch(setModels(data.models || []));
      // setModels reducer now auto-defaults selectedModel if it's invalid
      // (e.g. was set to a provider id by the socket chat:ready path).
    } catch (err) {
      console.error('Failed to load models:', err);
    }
  }, [dispatch]);

  // ── Fetch saved API keys (for the ModelSelector dropdown) ──
  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/keys', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        return data.keys || [];
      }
    } catch (err) {
      console.error('Failed to load keys:', err);
    }
    return [];
  }, []);

  // ── Fetch GitHub connection status (for IDE) ──
  const fetchGithubStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/github/status');
      if (res.ok) {
        return await res.json();
      }
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

    const onChatStream = (payload) => {
      if (payload && payload.text) {
        dispatch(streamUpdate(payload.text));
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

    const onChatDone = () => {
      dispatch(chatDone());
    };

    const onUndoResult = (payload) => {
      dispatch(setUndoResult(payload));
    };

    const onShellStream = (payload) => {
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

  const send = useCallback((prompt) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:send', { prompt, mode });
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

  const undo = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('chat:undo');
    }
  }, []);

  // ── Design tab: generate HTML from a prompt ──
  const generateDesign = useCallback(async (prompt, { baseTemplate = null, designId = null, device = 'desktop' } = {}) => {
    dispatch(setDesignStreaming());
    try {
      const res = await fetch('/api/v1/design/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt, baseTemplate, designId, device })
      });
      const data = await res.json();
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
      const res = await fetch('/api/v1/design', { headers: getAuthHeaders() });
      const data = await res.json();
      dispatch(setDesigns(data.designs || []));
    } catch (err) {
      console.error('Failed to load designs:', err);
    }
  }, [dispatch]);

  // ── Design tab: open an existing design ──
  const openDesign = useCallback(async (designId) => {
    try {
      const res = await fetch(`/api/v1/design/${designId}`, { headers: getAuthHeaders() });
      const data = await res.json();
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
      const res = await fetch(`/api/v1/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name: `from-design-${designId.slice(-6)}`, source: 'design', designId })
      });
      const data = await res.json();
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
      await fetch(`/api/v1/design/${designId}`, { method: 'DELETE', headers: getAuthHeaders() });
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
