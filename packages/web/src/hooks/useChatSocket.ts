import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { io, type Socket } from 'socket.io-client';
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

let socketSingleton: Socket | null = null;

function getSocket(): Socket {
  const token = getToken() || '';
  if (!socketSingleton || socketSingleton.disconnected) {
    const backendUrl =
      typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3100`)
        : 'http://localhost:3100';

    socketSingleton = io(backendUrl, {
      path: '/live',
      auth: { token },
      reconnection: true,
      reconnectionDelayMax: 2000,
      transports: ['websocket', 'polling'],
    });
  } else {
    socketSingleton.auth = { token };
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
export function useChatSocket(workspaceId: string | null = null) {
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);
  const { mode, selectedModel } = useAppSelector((state) => state.chat);

  // Refs so the onConnect handler always uses the latest workspace/model
  // even after a socket reconnection (avoids stale closure from effect deps)
  const workspaceIdRef = useRef(workspaceId);
  workspaceIdRef.current = workspaceId;
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;

  // Stream chunk buffer — accumulates rapid-fire deltas and flushes as a
  // single batched dispatch every 16ms to reduce React re-renders.
  const streamBufferRef = useRef('');
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard: once chat:done fires, ignore any stray/late chat:stream events
  // that arrive after (prevents isStreaming from flipping back to true).
  const doneRef = useRef(false);

  // ── Fetch available models from the backend (GET /api/v1/keys/models) ──
  const reloadModels = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await api.get('/api/v1/keys/models', { timeout: 15000 });
      dispatch(setModels(res.data.models || []));
      // setModels reducer now auto-defaults selectedModel if it's invalid
      // (e.g. was set to a provider id by the socket chat:ready path).
    } catch (err: any) {
      if (err?.response?.status === 401) {
        dispatch(chatError({ kind: 'keys', message: 'please select your api keys to use mcode' }));
        return;
      }
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        console.warn('[useChatSocket] Timeout fetching models from /api/v1/keys/models');
        return;
      }
      console.error('Failed to load models:', err);
    }
  }, [dispatch]);

  // ── Fetch saved API keys (for the ModelSelector dropdown) ──
  const fetchKeys = useCallback(async () => {
    const token = getToken();
    if (!token) return [];
    try {
      const res = await api.get('/api/v1/keys', { timeout: 10000 });
      return res.data.keys || [];
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Failed to load keys:', err);
      }
    }
    return [];
  }, []);

  // ── Fetch GitHub connection status (for IDE) ──
  const fetchGithubStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return { connected: false };
    try {
      const res = await api.get('/api/v1/github/status', { timeout: 10000 });
      return res.data;
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.error('Failed to load github status:', err);
      }
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

    const onChatReady = (payload: any) => {
      dispatch(chatReady(payload?.models));
    };

    const onChatError = (payload: any) => {
      dispatch(chatError(payload));
    };

    // Buffer rapid-fire stream chunks and flush as a single batch every 16ms
    // (~60fps) to avoid a React re-render on every tiny delta. This dramatically
    // reduces churn when the provider sends hundreds of small chunks.
    const onChatStream = (payload: any) => {
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

    const onChatMessage = (payload: any) => {
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

    const onChatToolCall = (payload: any) => {
      dispatch(toolCallStarted(payload));
    };

    const onChatPermission = (payload: any) => {
      dispatch(permissionRequested(payload));
    };

    const onChatTodoPlan = (payload: any) => {
      dispatch(setPlan(payload));
    };

    const onChatTodoUpdate = (payload: any) => {
      dispatch(updateTodo(payload));
    };

    const onChatDone = (payload: any) => {
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

    const onUndoResult = (payload: any) => {
      dispatch(setUndoResult(payload));
    };

    const onShellStream = (payload: any) => {
      (window as any).__socketDebug = (window as any).__socketDebug || [];
      (window as any).__socketDebug.push({ type: 'chat:shell_stream', chunk: payload?.chunk?.substring(0, 50) });
      if (payload && payload.chunk) {
        document.dispatchEvent(new CustomEvent('terminal:write', { detail: payload.chunk }));
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
    const onSubagentCreated = (payload: any) => { dispatch(setSubagentCreated(payload)); };
    const onSubagentAssigned = (payload: any) => { dispatch(setSubagentAssigned(payload)); };
    const onSubagentStarted = (payload: any) => { dispatch(setSubagentStarted(payload)); };
    const onSubagentStep = (payload: any) => { dispatch(setSubagentStep(payload)); };
    const onSubagentDone = (payload: any) => { dispatch(setSubagentDone(payload)); };
    const onSubagentFailed = (payload: any) => { dispatch(setSubagentFailed(payload)); };
    const onSubagentFile = (payload: any) => { dispatch(setSubagentFile(payload)); };
    const onSubagentToolCall = (payload: any) => { dispatch(setSubagentToolCall(payload)); };
    const onSubagentToolResult = (payload: any) => { dispatch(setSubagentToolResult(payload)); };
    const onSubagentNeedsReview = (payload: any) => { dispatch(setSubagentNeedsReview(payload)); };
    const onWaveStart = (payload: any) => { dispatch(setWaveStart(payload)); };
    const onWaveComplete = (payload: any) => { dispatch(setWaveComplete(payload)); };
    const onIntegrationPass = (payload: any) => { dispatch(setIntegrationPass(payload)); };
    const onBuildComplete = (payload: any) => { dispatch(setBuildComplete(payload)); };
    const onToast = (payload: any) => {
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

    // Load available models on mount (only if authenticated)
    if (getToken()) {
      reloadModels();
    }

    // Listen for external requests to reload models (e.g. after adding a key)
    const reloadHandler = () => {
      if (getToken()) reloadModels();
    };
    window.addEventListener('mcode:reload-models', reloadHandler);

    // Force reconnection when auth token changes (e.g. re-login in another tab)
    // so the socket doesn't carry a stale Bearer token.
    const handleTokenChange = () => {
      const newToken = getToken();
      if (socketRef.current) {
        socketRef.current.auth = { token: newToken || '' };
        if (!socketRef.current.disconnected) {
          socketRef.current.disconnect();
          socketRef.current.connect();
        }
      }
      if (newToken) {
        reloadModels();
      }
    };
    const storageHandler = (e: StorageEvent) => {
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

    const send = useCallback((prompt: string, overrideMode: string | null = null) => {
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

  const answerPermission = useCallback((requestId: string, answer: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:permission_answer', { requestId, answer });
    }
    // Clear the permission modal from Redux state now that we've answered
    dispatch(clearPermission());
  }, [dispatch]);

  const undo = useCallback((msg: { undoId?: string }) => {
    if (socketRef.current) {
      socketRef.current.emit('chat:undo', { undoId: msg?.undoId });
    }
  }, []);

  const sendTerminalCommand = useCallback((command: string) => {
    console.log('[DEBUG] sendTerminalCommand called:', command, 'socketRef:', !!socketRef.current, 'disconnected:', socketRef.current?.disconnected);
    if (socketRef.current && command && command.trim()) {
      socketRef.current.emit('terminal:command', { command: command.trim() });
    } else {
      console.log('[DEBUG] sendTerminalCommand skipped — socket or command invalid');
    }
  }, []);

  return {
    send,
    interrupt,
    answerPermission,
    undo,
    sendTerminalCommand,
    reloadModels,
    fetchKeys,
    fetchGithubStatus
  };
}
