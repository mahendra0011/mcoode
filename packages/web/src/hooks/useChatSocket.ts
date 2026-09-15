import { useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { io, type Socket } from 'socket.io-client';
import { getToken } from '../lib/api';
import api from '../lib/axios';
import { useIDEStore } from '../store/ideStore';
import { useSettingsStore } from '../store/settingsStore';
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
  promptEnhancing,
  promptEnhanced,
  promptEnhancementResolved,
  clarifyAsked,
  clarifyAnswered,
  codebaseReadingProgress,
  codebaseReadingDone,
  roleAssignmentsSet,
  comparisonUpdated,
  securityAuditUpdated,
  playwrightAuditUpdated,
  playwrightIssueAdded,
  permissionAnswered,
  watchStatusUpdated,
  watchActivityReceived,
  // Bug check mode
  bugcheckTierStarted,
  bugcheckTierDone,
  bugcheckDone,
  // Security checkup mode
  securityCheckStarted,
  securityCheckDone,
  securityFixStarted,
  securityFixDone,
  // Test mode (doc 48)
  testModeStarted,
  testInventorySet,
  testFeatureUpdate,
  testTraditionalUpdate,
  testModeSummary,
  // Review mode (doc 49)
  reviewStarted,
  reviewDone,
  // Migrate mode (doc 51)
  migrationStarted,
  migrationStatusUpdated,
  migrationPassResult,
  migrationDone,
  // Audit mode (doc 52)
  auditStarted,
  auditDone,
  addToast,
  removeToast
} from '../store/chatSlice';

let socketSingleton: Socket | null = null;

export function getSocket(): Socket {
  const token = getToken() || '';
  if (!socketSingleton || socketSingleton.disconnected) {
    const backendUrl =
      typeof window !== 'undefined' && window.mcodeElectron?.backendUrl
        ? window.mcodeElectron.backendUrl
        : (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:3100` : 'http://localhost:3100'));

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

  const streamSpeed = useSettingsStore((s) => s.ai.streamSpeed);
  const streamSpeedRef = useRef(streamSpeed);
  streamSpeedRef.current = streamSpeed;

  const FLUSH_INTERVAL_MS: Record<string, number> = {
    fast: 16,       // ~60fps, near-instant deltas
    normal: 40,     // ~25fps
    balanced: 100,  // lower CPU, chunkier updates
  };

  // Stream chunk buffer — accumulates rapid-fire deltas and flushes based on streamSpeed
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
          const interval = FLUSH_INTERVAL_MS[streamSpeedRef.current] ?? 16;
          streamTimerRef.current = setTimeout(() => {
            dispatch(streamUpdate(streamBufferRef.current));
            streamBufferRef.current = '';
            streamTimerRef.current = null;
          }, interval);
        }
      }
    };

    const onChatMessage = (payload: any) => {
      dispatch(agentMessage(payload));

      // When the agent writes/edits a file via a tool, notify any open editor
      // panes so they can auto-refresh content for that file path and refresh the file tree.
      if (
        payload &&
        payload.kind === 'tool' &&
        (payload.tool === 'write_file' || payload.tool === 'edit_file') &&
        payload.status === 'done'
      ) {
        useIDEStore.getState().bumpRefresh();
        const filePath = typeof payload.args === 'string' ? payload.args : payload.path || '';
        document.dispatchEvent(
          new CustomEvent('file:changed', { detail: { path: filePath } })
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
      useIDEStore.getState().bumpRefresh();
      document.dispatchEvent(new CustomEvent('file:changed', { detail: {} }));
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
    const onSubagentFile = (payload: any) => {
      dispatch(setSubagentFile(payload));
      useIDEStore.getState().bumpRefresh();
      document.dispatchEvent(
        new CustomEvent('file:changed', { detail: { path: payload?.file } })
      );
    };
    const onSubagentToolCall = (payload: any) => { dispatch(setSubagentToolCall(payload)); };
    const onSubagentToolResult = (payload: any) => { dispatch(setSubagentToolResult(payload)); };
    const onSubagentNeedsReview = (payload: any) => { dispatch(setSubagentNeedsReview(payload)); };
    const onWaveStart = (payload: any) => { dispatch(setWaveStart(payload)); };
    const onWaveComplete = (payload: any) => { dispatch(setWaveComplete(payload)); };
    const onIntegrationPass = (payload: any) => { dispatch(setIntegrationPass(payload)); };
    const onBuildComplete = (payload: any) => {
      dispatch(setBuildComplete(payload));
      useIDEStore.getState().bumpRefresh();
      document.dispatchEvent(new CustomEvent('file:changed', { detail: {} }));
    };
    const onToast = (payload: any) => {
      if (payload) {
        const id = Date.now().toString();
        dispatch(addToast({ ...payload, id }));
        // Auto-dismiss after 5s
        setTimeout(() => dispatch(removeToast(id)), 5000);
      }
    };

    // Web God Mode handlers
    const onPromptEnhancing = () => { dispatch(promptEnhancing()); };
    const onPromptEnhanced = (payload: any) => { dispatch(promptEnhanced(payload)); };
    const onClarifyAsk = (payload: any) => { dispatch(clarifyAsked(payload)); };
    const onCodebaseReading = (payload: any) => { dispatch(codebaseReadingProgress(payload)); };
    const onCodebaseReadComplete = () => { dispatch(codebaseReadingDone()); };
    const onRolesAssigned = (payload: any) => {
      dispatch(roleAssignmentsSet(payload?.assignments || (Array.isArray(payload) ? payload : [])));
    };
    const onComparisonUpdate = (payload: any) => {
      if (payload?.scope === 'security') {
        dispatch(securityAuditUpdated(payload));
      } else {
        dispatch(comparisonUpdated(payload));
      }
    };
    const onPlaywrightStart = (payload: any) => {
      dispatch(playwrightAuditUpdated({ active: true, pass: payload?.pass || 1, issues: [], clean: false }));
    };
    const onPlaywrightIssue = (payload: any) => {
      dispatch(playwrightIssueAdded(payload));
    };
    const onPlaywrightPassComplete = (payload: any) => {
      dispatch(playwrightAuditUpdated({ active: true, pass: payload?.pass, clean: !!payload?.cleanSoFar }));
    };
    const onPlaywrightDone = (payload: any) => {
      dispatch(playwrightAuditUpdated({ active: true, clean: !!payload?.clean }));
    };

    // Watch mode handlers (docs 38-40)
    // CLI/backend outcome vocabulary (auto-fixed / no-issues) → web display vocabulary
    const WATCH_OUTCOME_ALIASES: Record<string, string> = {
      'auto-fixed': 'fixed',
      'no-issues': 'skipped',
    };
    const onWatchActivity = (payload: any) => {
      const normalized = payload
        ? { ...payload, outcome: WATCH_OUTCOME_ALIASES[payload.outcome] || payload.outcome }
        : payload;
      dispatch(watchActivityReceived(normalized));
      if (normalized?.outcome === 'fixed' || normalized?.outcome === 'needs-review') {
        const fileStr = normalized.file ? `${normalized.file}: ` : '';
        dispatch(addToast({
          id: Date.now().toString(),
          kind: normalized.outcome === 'fixed' ? 'ok' : 'warn',
          text: `Watch: ${fileStr}${normalized.detail || normalized.outcome}`,
        }));
      }
    };
    const onWatchStatus = (payload: any) => {
      dispatch(watchStatusUpdated(payload));
    };

    // Bugcheck mode handlers (doc 44)
    const onBugcheckTierStart = (payload: any) => {
      dispatch(bugcheckTierStarted(payload));
    };
    const onBugcheckTierDone = (payload: any) => {
      dispatch(bugcheckTierDone(payload));
      const findings = payload?.findings || [];
      const crashCount = findings.filter((f: any) => f.canCrashServer).length;
      if (crashCount > 0) {
        dispatch(addToast({
          id: Date.now().toString(),
          kind: 'warn',
          text: `Bug Check: ${crashCount} crash-risk finding${crashCount !== 1 ? 's' : ''} detected`,
        }));
      }
    };
    const onBugcheckDone = (payload: any) => {
      dispatch(bugcheckDone(payload));
      dispatch(addToast({
        id: Date.now().toString(),
        kind: 'ok',
        text: `Bug Check complete — ${payload?.totalFindings ?? 0} total finding${(payload?.totalFindings ?? 0) !== 1 ? 's' : ''}`,
      }));
    };

    // Security checkup mode handlers (doc 47)
    const onSecurityFindings = (payload: any) => {
      dispatch(securityCheckDone(payload));
      const count = payload?.findings?.length ?? 0;
      if (count > 0) {
        dispatch(addToast({
          id: Date.now().toString(),
          kind: 'warn',
          text: `Security Checkup: ${count} issue${count !== 1 ? 's' : ''} found`,
        }));
      } else {
        dispatch(addToast({
          id: Date.now().toString(),
          kind: 'ok',
          text: 'Security Checkup: All 17 controls passed clean!',
        }));
      }
    };
    const onSecurityFixComplete = (payload: any) => {
      dispatch(securityFixDone(payload));
      const fixedCount = (payload?.results || []).filter((r: any) => r.passed).length;
      dispatch(addToast({
        id: Date.now().toString(),
        kind: 'ok',
        text: `Security fix complete — ${fixedCount} issue${fixedCount !== 1 ? 's' : ''} verified fixed`,
      }));
    };

    // Review mode handler (doc 49)
    const onReviewResult = (payload: any) => {
      dispatch(reviewDone(payload));
      const count = payload?.findings?.length ?? 0;
      dispatch(addToast({
        id: Date.now().toString(),
        kind: count > 0 ? 'ok' : 'info',
        text: `Review complete — ${count} comment${count !== 1 ? 's' : ''}`,
      }));
    };

    // Migrate mode handlers (doc 51)
    const onMigrateStatus = (payload: any) => {
      dispatch(migrationStatusUpdated(payload));
      if (payload?.message) {
        dispatch(addToast({
          id: Date.now().toString(),
          kind: 'info',
          text: payload.message,
        }));
      }
    };
    const onMigratePassResult = (payload: any) => {
      const rows = (payload?.regressions || []).map((r: any) => ({
        id: r.feature || r.id,
        text: r.reason || r.feature,
        state: r.regressed ? 'incomplete' : 'done'
      }));
      dispatch(migrationPassResult({
        pass: payload?.pass,
        maxPasses: payload?.maxPasses,
        rows
      }));
    };
    const onMigrateComplete = (payload: any) => {
      dispatch(migrationDone(payload));
      dispatch(addToast({
        id: Date.now().toString(),
        kind: payload?.equivalent ? 'ok' : 'warn',
        text: payload?.equivalent
          ? '✓ Migration complete — behavior verified identical'
          : '⚠ Migration finished with unresolved regressions',
      }));
    };

    // Audit mode handler (doc 52)
    const onAuditResult = (payload: any) => {
      dispatch(auditDone(payload));
      dispatch(addToast({
        id: Date.now().toString(),
        kind: 'ok',
        text: `Audit complete — Overall Grade: ${payload?.overallGrade || 'A'}`,
      }));
    };

    // Test mode handlers (doc 48)
    const onTestStep = (payload: any) => {
      dispatch(testFeatureUpdate({
        featureId: payload?.featureId,
        feature: payload?.feature,
        route: payload?.route,
        desc: payload?.desc,
        stepStatus: payload?.status === 'ok' ? (payload?.retried ? 'fixed' : 'ok') : 'failed',
      }));
    };
    const onTestStepFailed = (payload: any) => {
      dispatch(testFeatureUpdate({
        featureId: payload?.featureId,
        feature: payload?.feature,
        route: payload?.route,
        desc: payload?.desc || `step ${payload?.index} failed`,
        stepStatus: 'failed',
        error: payload?.error,
      }));
    };
    const onTestDiagnosis = (payload: any) => {
      dispatch(addToast({
        id: Date.now().toString(),
        kind: 'info',
        text: `Test diagnosis (attempt ${payload?.attempt}): ${payload?.issue}`,
      }));
    };
    const onTestFeatureDone = (payload: any) => {
      dispatch(testFeatureUpdate({
        featureId: payload?.featureId,
        feature: payload?.feature,
        status: payload?.status,
        selfHealed: payload?.selfHealed,
      }));
    };
    const onTestTraditional = (payload: any) => {
      dispatch(testTraditionalUpdate(payload));
    };
    const onTestDone = (payload: any) => {
      dispatch(testModeSummary(payload));
      const healed = payload?.selfHealedCount ?? 0;
      const review = payload?.needsReview ?? 0;
      dispatch(addToast({
        id: Date.now().toString(),
        kind: review > 0 ? 'warn' : 'ok',
        text: review > 0
          ? `Test run complete — ${healed} auto-fixed, ${review} need manual review`
          : `Test run complete — ${healed} issue${healed === 1 ? '' : 's'} auto-fixed`,
      }));
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

    // Web God Mode (Phases 0-10) socket subscriptions
    socket.on('prompt:enhancing', onPromptEnhancing);
    socket.on('prompt:enhanced', onPromptEnhanced);
    socket.on('clarify:ask', onClarifyAsk);
    socket.on('codebase:reading', onCodebaseReading);
    socket.on('codebase:read-complete', onCodebaseReadComplete);
    socket.on('roles:assigned', onRolesAssigned);
    socket.on('comparison:update', onComparisonUpdate);
    socket.on('playwright:start', onPlaywrightStart);
    socket.on('playwright:issue', onPlaywrightIssue);
    socket.on('playwright:pass-complete', onPlaywrightPassComplete);
    socket.on('playwright:done', onPlaywrightDone);

    // Watch mode socket subscriptions (docs 38-40)
    socket.on('watch:activity', onWatchActivity);
    socket.on('watch:status', onWatchStatus);

    // Bug check mode socket subscriptions (doc 44)
    socket.on('bugcheck:tier-start', onBugcheckTierStart);
    socket.on('bugcheck:tier-done', onBugcheckTierDone);
    socket.on('bugcheck:done', onBugcheckDone);

    // Security checkup mode socket subscriptions (doc 47)
    socket.on('security:findings', onSecurityFindings);
    socket.on('security:fix-complete', onSecurityFixComplete);

    // Review mode socket subscriptions (doc 49)
    socket.on('review:result', onReviewResult);

    // Migrate mode socket subscriptions (doc 51)
    socket.on('migrate:status', onMigrateStatus);
    socket.on('migrate:pass_result', onMigratePassResult);
    socket.on('migrate:complete', onMigrateComplete);

    // Audit mode socket subscriptions (doc 52)
    socket.on('audit:result', onAuditResult);

    // Test mode socket subscriptions (doc 48)
    socket.on('test:started', (p) => dispatch(testModeStarted({ types: p?.types, targetUrl: p?.targetUrl })));
    socket.on('test:inventory', (p) => dispatch(testInventorySet(p)));
    socket.on('test:feature:start', (p) => dispatch(testFeatureUpdate({ featureId: p?.featureId, feature: p?.feature, route: p?.route, status: 'running' })));
    socket.on('test:step', onTestStep);
    socket.on('test:step:failed', onTestStepFailed);
    socket.on('test:diagnosis', onTestDiagnosis);
    socket.on('test:feature:done', onTestFeatureDone);
    socket.on('test:traditional', onTestTraditional);
    socket.on('test:done', onTestDone);

    // Real Debugger events
    const onDebugStarted = (p: any) => {
      dispatch(addToast({ id: Date.now().toString(), kind: 'ok', text: `Debugger listening on port ${p?.port || '9229'}` }));
    };
    const onDebugOutput = (p: any) => {
      document.dispatchEvent(new CustomEvent('terminal:write', { detail: p?.data || '' }));
    };
    const onDebugExited = (p: any) => {
      dispatch(addToast({ id: Date.now().toString(), kind: p?.code === 0 ? 'ok' : 'error', text: `Debug process exited (${p?.code ?? 0})` }));
    };

    socket.on('debug:started', onDebugStarted);
    socket.on('debug:output', onDebugOutput);
    socket.on('debug:exited', onDebugExited);
    socket.on('debug:error', onChatError);

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
      socket.off('prompt:enhancing', onPromptEnhancing);
      socket.off('prompt:enhanced', onPromptEnhanced);
      socket.off('clarify:ask', onClarifyAsk);
      socket.off('codebase:reading', onCodebaseReading);
      socket.off('codebase:read-complete', onCodebaseReadComplete);
      socket.off('roles:assigned', onRolesAssigned);
      socket.off('comparison:update', onComparisonUpdate);
      socket.off('playwright:start', onPlaywrightStart);
      socket.off('playwright:issue', onPlaywrightIssue);
      socket.off('playwright:pass-complete', onPlaywrightPassComplete);
      socket.off('playwright:done', onPlaywrightDone);
      socket.off('watch:activity', onWatchActivity);
      socket.off('watch:status', onWatchStatus);
      socket.off('bugcheck:tier-start', onBugcheckTierStart);
      socket.off('bugcheck:tier-done', onBugcheckTierDone);
      socket.off('bugcheck:done', onBugcheckDone);
      socket.off('security:findings', onSecurityFindings);
      socket.off('security:fix-complete', onSecurityFixComplete);
      socket.off('review:result', onReviewResult);
      socket.off('migrate:status', onMigrateStatus);
      socket.off('migrate:pass_result', onMigratePassResult);
      socket.off('migrate:complete', onMigrateComplete);
      socket.off('audit:result', onAuditResult);
      socket.off('test:started');
      socket.off('test:inventory');
      socket.off('test:feature:start');
      socket.off('test:step', onTestStep);
      socket.off('test:step:failed', onTestStepFailed);
      socket.off('test:diagnosis', onTestDiagnosis);
      socket.off('test:feature:done', onTestFeatureDone);
      socket.off('test:traditional', onTestTraditional);
      socket.off('test:done', onTestDone);
      socket.off('debug:started', onDebugStarted);
      socket.off('debug:output', onDebugOutput);
      socket.off('debug:exited', onDebugExited);
      socket.off('debug:error', onChatError);
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
    dispatch(permissionAnswered({ requestId, answer }));
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

  const runFile = useCallback((filename: string, code: string, stdin?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('code:run-file', { filename, code, stdin });
    }
  }, []);

  const runProject = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('project:run');
    }
  }, []);

  const startDebug = useCallback((filename: string, code: string) => {
    if (socketRef.current) {
      socketRef.current.emit('debug:start', { filename, code });
    }
  }, []);

  const continueDebug = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('debug:continue');
    }
  }, []);

  const stopDebug = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('debug:stop');
    }
  }, []);

  const terminateTask = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('task:terminate');
    }
  }, []);

  const restartTask = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('task:restart');
    }
  }, []);

  const runSecurityCheck = useCallback((category?: string) => {
    if (socketRef.current) {
      dispatch(securityCheckStarted());
      socketRef.current.emit('security:check', { category, projectId: workspaceIdRef.current });
    }
  }, [dispatch]);

  const fixSelectedSecurity = useCallback((ids: string[]) => {
    if (socketRef.current) {
      dispatch(securityFixStarted());
      socketRef.current.emit('security:fix-selected', { ids, projectId: workspaceIdRef.current });
    }
  }, [dispatch]);

  const runTestMode = useCallback((types: string[], targetUrl?: string) => {
    if (socketRef.current) {
      dispatch(testModeStarted({ types, targetUrl }));
      socketRef.current.emit('test:mode:run', { types, targetUrl, prompt: (types || []).join(' + ') });
    }
  }, [dispatch]);

  const runReview = useCallback((scope = 'diff', target?: string) => {
    if (socketRef.current) {
      dispatch(reviewStarted());
      socketRef.current.emit('review:run', { scope, target, projectId: workspaceIdRef.current });
    }
  }, [dispatch]);

  const runMigrate = useCallback((prompt: string, maxPasses = 5) => {
    if (socketRef.current) {
      dispatch(migrationStarted());
      socketRef.current.emit('migrate:run', { prompt, maxPasses, projectId: workspaceIdRef.current });
    }
  }, [dispatch]);

  const runAudit = useCallback((options: { pdf?: boolean; category?: string } = {}) => {
    if (socketRef.current) {
      dispatch(auditStarted());
      socketRef.current.emit('audit:run', {
        pdf: Boolean(options.pdf),
        category: options.category || null,
        projectId: workspaceIdRef.current
      });
    }
  }, [dispatch]);

  return {
    send,
    interrupt,
    answerPermission,
    undo,
    sendTerminalCommand,
    runFile,
    runProject,
    startDebug,
    continueDebug,
    stopDebug,
    terminateTask,
    restartTask,
    reloadModels,
    fetchKeys,
    fetchGithubStatus,
    runSecurityCheck,
    fixSelectedSecurity,
    runTestMode,
    runReview,
    runMigrate,
    runAudit
  };
}
