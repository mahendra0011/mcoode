import { useEffect, useRef, useState } from 'react';
import { useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/react';
import { useTicker } from './useTicker.js';
import { theme, SPACING } from './theme.js';
import { MainPane } from './MainPane.jsx';
import { InputLine } from './InputLine.jsx';
import { Toasts } from './Toasts.jsx';
import { WelcomeScreen } from './WelcomeScreen.jsx';
import { StatusBar } from './StatusBar.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';
import { lazyComponent } from './lazy.js';
const CommandPalette = lazyComponent('./CommandPalette.jsx', 'CommandPalette');
const ProviderWizard = lazyComponent('./ProviderWizard.jsx', 'ProviderWizard');
const AgentStrip = lazyComponent('./AgentStrip.jsx', 'AgentStrip');
const ActivePanel = lazyComponent('./ActivePanel.jsx', 'ActivePanel');
const PermissionModal = lazyComponent('./PermissionModal.jsx', 'PermissionModal');
const ProcessingScreen = lazyComponent('./ProcessingScreen.jsx', 'ProcessingScreen');
const AnalyticsPanel = lazyComponent('./AnalyticsPanel.jsx', 'AnalyticsPanel');
const DebugPanel = lazyComponent('./DebugPanel.jsx', 'DebugPanel');
const DiffViewer = lazyComponent('./DiffViewer.jsx', 'DiffViewer');
import { EVENTS, SUBAGENT_STATUS, planWaves } from '@mcode/shared';
import { setTheme, THEME_NAMES } from './theme.js';
import { saveHistory, listHistory } from '../core/history.js';
import { HOOK_POINTS } from '../core/hooks.js';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { MODES, MODE_DESC } from '../core/router.js';
import { getModeList, describeMode } from '../core/modes.js';
import { COLOR_SCHEME_NAMES, getThemedColors, ICON_SET_NAMES, getIcons, FONT_SIZE_NAMES, LAYOUT_PRESET_NAMES } from './themes.js';

const VERSION = 'v2.4.6';
const MAX_MESSAGES = 400;
const cap = (list) => list.slice(-MAX_MESSAGES);

export function App({ orchestrator, projectName, history = [], onAction }) {
  const renderer = useRenderer();
  const exit = () => renderer.destroy();
  const { height, width: termWidth } = useTerminalDimensions();
  const rows = height || 24;
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [plan, setPlan] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [modelLabel, setModelLabel] = useState('auto');
  const [mode, setMode] = useState('medium');
  const [agentMode, setAgentMode] = useState('Build');
  const [email, setEmail] = useState('');
  const [branch, setBranch] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [todos, setTodos] = useState([]);
  const [pendingPermission, setPendingPermission] = useState(null);
  const [agentFiles, setAgentFiles] = useState({});
  const [activePanelId, setActivePanelId] = useState(null);
  const [panelPinned, setPanelPinned] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isBuilding, setIsBuilding] = useState(false);
  const ticks = useTicker();
  const [currentWave, setCurrentWave] = useState(0);
  const [totalWaves, setTotalWaves] = useState(0);
  const [buildWaves, setBuildWaves] = useState([]);
  const [buildElapsed, setBuildElapsed] = useState(0);
  const [buildCost, setBuildCost] = useState(0);
  const [lastLatency, setLastLatency] = useState(0);
  const [tokenIn, setTokenIn] = useState(0);
  const [tokenOut, setTokenOut] = useState(0);
  const [completedWaves, setCompletedWaves] = useState([]);
  const [gitDirty, setGitDirty] = useState(false);
  const [watchLogs, setWatchLogs] = useState([]);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [macroRecording, setMacroRecording] = useState(false);
  const [macroBuffer, setMacroBuffer] = useState([]);
  const [recordedMacros, setRecordedMacros] = useState([]);
  const [debugMode, setDebugMode] = useState(false);
  const [debugEvents, setDebugEvents] = useState([]);
  const [themeName, setThemeName] = useState('dark');
  const [themeVersion, setThemeVersion] = useState(0);
  const [specialMode, setSpecialMode] = useState(null);
  const lastPrompt = useRef('');
  
  const streamTimer = useRef(null);
  const streamBuffer = useRef(null);
  const thoughtRef = useRef('');
  const [activeModal, setActiveModal] = useState(null);
  const inputHistory = useRef(history);

  const pushTodoMsg = (items) =>
    setMessages((m) => {
      const idx = m.findIndex((x) => x.replaceKey === 'todos');
      const msg = { kind: 'todo', replaceKey: 'todos', items };
      if (idx === -1) return [...m, msg];
      const next = m.slice();
      next[idx] = { ...next[idx], items };
      return next;
    });

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'p') {
      setPaletteOpen((o) => !o);
      return;
    }
    if (key.name === 'escape' && activePanelId && !isGenerating) {
      setActivePanelId(null);
      return;
    }
    if (key.name === 'escape' && isBuilding) {
      orchestrator.manager?.stop?.();
      setIsBuilding(false);
      return;
    }
    if (key.name === 'escape' && debugMode) {
      setDebugMode(false);
      return;
    }
    if (key.name === 'escape' && diffOpen) {
      setDiffOpen(false);
      return;
    }
    if (!isGenerating) return;
    // generation hotkeys — input is locked during generation, so keys are free
    if (key.name === 'p' && activePanelId) {
      setPanelPinned((p) => !p);
      return;
    }
    if (key.name === 'escape' && activePanelId) {
      setActivePanelId(null);
      return;
    }
    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    if (digits.includes(key.sequence)) {
      // the strip shows todoId digits (t3 → '3', t10 → '10'), not array index
      const match = agents.find((a) => String(a.todoId || '').replace(/\D/g, '') === key.sequence);
      if (match) {
        setActivePanelId(match.todoId);
        setPanelPinned(true);
      }
    }
  });

  useEffect(() => {
    if (isGenerating) {
      setElapsed(Math.floor(ticks / 12.5)); // 80ms ticks → ~1000ms per second
    } else {
      setElapsed(0);
    }
  }, [isGenerating, ticks]);

  useEffect(() => {
    if (isBuilding) {
      setBuildElapsed(Math.floor(ticks / 12.5));
    } else {
      setBuildElapsed(0);
    }
  }, [isBuilding, ticks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const git = (await import('simple-git')).default(process.cwd());
        const b = await git.branch();
        const s = await git.status();
        if (!cancelled && b?.current) {
          setBranch(b.current);
          setGitDirty(s.edited.length > 0 || s.untracked.length > 0 || s.staged.length > 0);
        }
      } catch {
        /* not a git repo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save session state every 30s during active builds
  useEffect(() => {
    if (!isBuilding || !plan) return;
    const id = setInterval(() => {
      saveHistory({
        id: orchestrator.sessionId,
        mode: 'god',
        projectName: projectName,
        projectPath: process.cwd(),
        startedAt: new Date(Date.now() - buildElapsed * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        status: 'in_progress',
        plan,
        results: {
          done: todos.filter((t) => t.status === 'done').length,
          total: todos.length,
          failed: todos.filter((t) => t.status === 'failed').length,
        },
      }).catch(() => { /* best-effort */ });
    }, 30_000);
    return () => clearInterval(id);
  }, [isBuilding, plan, buildElapsed]);

  const refreshModelLabel = async () => {
    try {
      const { loadConfig } = await import('../core/store.js');
      const config = await loadConfig();
      if (config?.roles?.build) setModelLabel(config.roles.build.split(':').pop());
      setMode(MODES.includes(config?.mode) ? config.mode : 'medium');
      setEmail(config?.account?.email || '');
    } catch { /* config may be missing */ }
  };

  useEffect(() => {
    if (!activeModal) {
      refreshModelLabel();
      orchestrator.reloadConfig().catch(console.error);
    }
  }, [activeModal]);

  useEffect(() => {
    const bus = orchestrator;

    const push = (msg) =>
      setMessages((m) => {
        if (!msg.replaceKey) return cap([...m, msg]);
        const idx = m.findIndex((x) => x.replaceKey === msg.replaceKey);
        if (idx === -1) return cap([...m, msg]);
        const next = m.slice();
        next[idx] = { ...next[idx], ...msg };
        return next;
      });
    const toast = (t) => {
      const id = Date.now() + Math.random();
      setToasts((ts) => [...ts, { id, ...t }]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4000);
    };

    const onPlan = (p) => {
      setPlan(p);
      const items = p.todos.map((t) => ({ id: t.id, domain: t.domain, title: t.title, status: 'pending', dependsOn: t.dependsOn || [] }));
      setTodos(items);
      const waves = planWaves(p);
      setBuildWaves(waves);
      setTotalWaves(waves.length);
      setCurrentWave(0);
      setIsBuilding(true);
      setBuildElapsed(0);
      setTokenIn(0);
      setTokenOut(0);
      push({ kind: 'ok', text: `\u2713 plan generated — ${p.todos.length} todos across ${waves.length} wave(s)` });
      push({ kind: 'todo', replaceKey: 'todos', items });
    };

    const patchTodo = (id, status) => {
      setTodos((list) => {
        const next = list.map((t) => (t.id === id ? { ...t, status } : t));
        push({ kind: 'todo', replaceKey: 'todos', items: next });
        return next;
      });
    };

    const upsertAgent = (id, patch) =>
      setAgents((list) => {
        const existing = list.find((a) => a.todoId === id);
        if (existing) return list.map((a) => (a.todoId === id ? { ...a, ...patch } : a));
        return [...list, { todoId: id, status: SUBAGENT_STATUS.PENDING, domain: 'backend', model: '…', message: 'queued', ...patch }];
      });

    const onAgentStarted = (p) => upsertAgent(p.todoId, { status: 'running', domain: p.domain, model: p.model, title: p.title, startedAt: Date.now(), tokens: p.tokens || { in: 0, out: 0 }, latency: p.latency || 0 });
    const onAgentStep = (p) => {
      if (p.latency) setLastLatency(p.latency);
      upsertAgent(p.todoId, { status: 'running', message: p.message, tokens: p.tokens || { in: 0, out: 0 }, latency: p.latency || 0 });
    };
    const onAgentDone = (p) => {
      upsertAgent(p.todoId, { status: 'done', message: p.summary || 'done', tokens: p.tokens || { in: 0, out: 0 }, latency: p.latency || 0 });
      // Real-time token counter: accumulate as each agent finishes
      setTokenIn((prev) => prev + (p.tokens?.in || 0));
      setTokenOut((prev) => prev + (p.tokens?.out || 0));
      patchTodo(p.todoId, 'done');
      push({ kind: 'ok', text: `\u2713 ${p.todoId} done — ${String(p.summary || '').slice(0, 90)}` });
      if (!panelPinned) {
        setTimeout(() => setActivePanelId((cur) => (cur === p.todoId ? null : cur)), 1800);
      }
      setAgents((list) => list.filter((a) => a.todoId !== p.todoId));
    };
    const onAgentFailed = (p) => {
      upsertAgent(p.todoId, { status: 'failed', message: p.error, retryCount: p.retryCount });
      patchTodo(p.todoId, 'failed');
      push({ kind: 'err', text: `\u2717 ${p.todoId} failed${p.retryCount ? ` (retried \u00d7${p.retryCount})` : ''} — ${p.error}` });
      if (!panelPinned) {
        setTimeout(() => setActivePanelId((cur) => (cur === p.todoId ? null : cur)), 1800);
      }
      setAgents((list) => list.filter((a) => a.todoId !== p.todoId));
    };
    const onAgentFile = (p) => {
      const lines = p.diff?.lines || (p.content ? String(p.content).split('\n').map((text, i) => ({ kind: 'add', newNo: i + 1, text })) : []);
      setAgentFiles((map) => {
        const list = [...(map[p.todoId] || [])].slice(-2);
        list.push({ file: p.file, created: Boolean(p.content && !p.diff), lines });
        return { ...map, [p.todoId]: list };
      });
    };
    const onIntegration = (p) => {
      if (p.status === 'running') {
        push({ kind: 'system', text: `\u25c9 running integration tests${p.round ? ` (bugfix round ${p.round})` : ''}` });
      } else if (p.status === 'passed') {
        push({ kind: 'ok', text: `\u2713 integration tests passed${p.round ? ` (round ${p.round})` : ''}` });
        if (p.tail) push({ kind: 'code', id: `test-out-${p.round || 'init'}`, title: 'Test output (passed)', code: p.tail, domain: 'test' });
      } else if (p.status === 'failed') {
        push({ kind: 'warn', text: `integration tests failed (exit ${p.exitCode})${p.round ? ` — bugfix round ${p.round}` : ''}` });
        if (p.tail) push({ kind: 'code', id: `test-out-${p.round || 'init'}`, title: 'Test output (failed)', code: p.tail, domain: 'test' });
      } else if (p.status === 'error') {
        push({ kind: 'err', text: `integration tests error: ${p.error}` });
      }
    };

    const onWaveStart = (p) => {
      setCurrentWave(p.wave);
      setTotalWaves(p.totalWaves);
    };

    const onWaveComplete = (p) => {
      setCompletedWaves((cur) => [...new Set([...cur, p.wave])]);
    };

    const onWatchStatus = (status) => logWatch(`${new Date().toLocaleTimeString()} watch daemon ${status}`);
    const logWatch = (line) => setWatchLogs((logs) => [...logs, line].slice(-50));
    const onWatchScan = (p) => {
      logWatch(`${new Date(p.scannedAt || Date.now()).toLocaleTimeString()} scan — ${p.files || p.filesScanned} files, ${p.changes || 0} change(s)`);
    };
    const onWatchFix = (p) => {
      const label = p.outcome === 'auto-fixed' ? 'auto-fixed' : 'needs review';
      logWatch(`${new Date().toLocaleTimeString()} ${label} ${p.file} — ${String(p.detail || '').slice(0, 80)}`);
      toast({ kind: p.outcome === 'auto-fixed' ? 'ok' : 'warn', text: `watch ${label}: ${p.file}` });
    };
    const onNeedsReview = (p) => {
      upsertAgent(p.todoId, { status: 'needs_review', message: p.reason });
      toast({ kind: 'warn', text: `${p.todoId} needs human review` });
    };
    const onToast = (t) => toast(t);
    const flushStream = () => {
      if (!streamBuffer.current) return;
      const delta = streamBuffer.current;
      streamBuffer.current = '';
      streamTimer.current = null;
      setStreamingMessage((prev) => (prev || '') + delta);
    };
    const onMessage = (m) => {
      if (m.kind === 'stream') {
        thoughtRef.current = (thoughtRef.current || '') + m.text;
        streamBuffer.current = (streamBuffer.current || '') + m.text;
        if (!streamTimer.current) streamTimer.current = setTimeout(flushStream, 60);
      } else {
        if (streamTimer.current) {
          clearTimeout(streamTimer.current);
          flushStream();
        }
        if (m.block === 'permission' && m.status === 'running') {
          setPendingPermission(m);
        }
        if (m.block === 'permission' && m.status === 'done') {
          setPendingPermission((p) => (p?.requestId === m.replaceKey ? null : p));
        }
        push(m);
      }
    };
    const onBuildComplete = (r) => {
      setAgents([]);
      setActivePanelId(null);
      setIsBuilding(false);
      setBuildCost(r.cost || 0);
      setTokenIn(r.tokensIn || 0);
      setTokenOut(r.tokensOut || 0);
      toast({
        kind: 'ok',
        text: `${r.done}/${r.total} todos complete · ${(r.elapsedSecs / 60).toFixed(1)}m · $${Number(r.cost || 0).toFixed(2)}`
      });
      setMessages((m) => cap([...m, { kind: 'build', data: r, projectName }]));

      // Persist build results to history so analytics has data to aggregate
      const now = Date.now();
      const startedAt = now - (r.elapsedSecs || 0) * 1000;
      saveHistory({
        id: orchestrator.sessionId,
        mode: 'god',
        projectName: projectName,
        projectPath: process.cwd(),
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date(now).toISOString(),
        status: (r.failed || 0) > 0 ? 'failed' : 'completed',
        plan: plan || null,
        results: r,
      }).catch(() => { /* best-effort */ });
    };

    const onAgentStartWrapped = (p) => {
      if (!panelPinned) setActivePanelId(p.todoId);
      onAgentStarted(p);
    };
    bus.on(EVENTS.PLAN_GENERATED, onPlan);
    bus.on(EVENTS.SUBAGENT_STARTED, onAgentStartWrapped);
    bus.on(EVENTS.SUBAGENT_STEP, onAgentStep);
    bus.on(EVENTS.SUBAGENT_DONE, onAgentDone);
    bus.on(EVENTS.SUBAGENT_FAILED, onAgentFailed);
    bus.on(EVENTS.SUBAGENT_NEEDS_REVIEW, onNeedsReview);
    bus.on(EVENTS.SUBAGENT_FILE, onAgentFile);
    bus.on(EVENTS.INTEGRATION_PASS, onIntegration);
    bus.on(EVENTS.TOAST, onToast);
    bus.on(EVENTS.MESSAGE, onMessage);
    bus.on(EVENTS.BUILD_COMPLETE, onBuildComplete);
    bus.on(EVENTS.WAVE_START, onWaveStart);
    bus.on(EVENTS.WAVE_COMPLETE, onWaveComplete);
    bus.on(EVENTS.WATCH_STATUS, onWatchStatus);
    bus.on(EVENTS.WATCH_SCAN, onWatchScan);
    const onHookExecuted = (p) => {
      toast({
        kind: p.ok ? 'ok' : 'err',
        text: `hook: ${p.hook}${p.error ? ` \u2717 ${p.error}` : ''} (${p.ms}ms)`,
      });
    };
    bus.on(EVENTS.WATCH_FIX, onWatchFix);
    bus.on(EVENTS.HOOK_EXECUTED, onHookExecuted);
    
    const onAlwaysGranted = async (p) => {
      if (p.tool === 'run_shell') {
        const { saveConfig } = await import('../core/store.js');
        await saveConfig({ allowShellAll: true });
        toast({ kind: 'ok', text: 'Terminal permissions saved for all future runs' });
      }
    };
    bus.on('permission:always_granted', onAlwaysGranted);

    return () => {
      bus.off(EVENTS.PLAN_GENERATED, onPlan);
      bus.off(EVENTS.SUBAGENT_STARTED, onAgentStartWrapped);
      bus.off(EVENTS.SUBAGENT_STEP, onAgentStep);
      bus.off(EVENTS.SUBAGENT_DONE, onAgentDone);
      bus.off(EVENTS.SUBAGENT_FAILED, onAgentFailed);
      bus.off(EVENTS.SUBAGENT_NEEDS_REVIEW, onNeedsReview);
      bus.off(EVENTS.SUBAGENT_FILE, onAgentFile);
      bus.off(EVENTS.INTEGRATION_PASS, onIntegration);
      bus.off(EVENTS.TOAST, onToast);
      bus.off(EVENTS.MESSAGE, onMessage);
      bus.off(EVENTS.BUILD_COMPLETE, onBuildComplete);
      bus.off(EVENTS.WAVE_START, onWaveStart);
      bus.off(EVENTS.WAVE_COMPLETE, onWaveComplete);
      bus.off(EVENTS.WATCH_STATUS, onWatchStatus);
      bus.off(EVENTS.WATCH_SCAN, onWatchScan);
      bus.off(EVENTS.WATCH_FIX, onWatchFix);
      bus.off(EVENTS.HOOK_EXECUTED, onHookExecuted);
      bus.off('permission:always_granted', onAlwaysGranted);
    };
  }, [orchestrator]);

  // Debug mode: sniff every event type from the bus for the DebugPanel
  // Uses a mutable ref to avoid creating new array snapshots on every event
  useEffect(() => {
    if (!debugMode) return;
    const bus = orchestrator;
    const handlers = {};
    const MAX_EVENTS = 200;

    // Mutable circular buffer — avoids re-allocating on every event
    const buffer = [];
    let cursor = 0;

    for (const key of Object.keys(EVENTS)) {
      handlers[key] = (payload) => {
        const entry = { type: EVENTS[key], timestamp: Date.now(), payload };
        if (buffer.length < MAX_EVENTS) {
          buffer.push(entry);
        } else {
          buffer[cursor] = entry;
        }
        cursor = (cursor + 1) % MAX_EVENTS;

        // Only trigger re-render periodically to batch updates
        if (buffer.length % 4 === 0 || buffer.length < MAX_EVENTS) {
          setDebugEvents(buffer.slice());
        }
      };
      bus.on(EVENTS[key], handlers[key]);
    }
    return () => {
      for (const key of Object.keys(EVENTS)) {
        bus.off(EVENTS[key], handlers[key]);
      }
    };
  }, [debugMode, orchestrator]);

const handleSubmit = async (value) => {
    if (value.startsWith('/')) {
      await handleSlash(value.slice(1));
      return;
    }
    if (isGenerating) return;
    lastPrompt.current = value;
    inputHistory.current.push(value);
    if (inputHistory.current.length > 100) inputHistory.current = inputHistory.current.slice(-100);
    setChatStarted(true);
    setMessages((m) => cap([...m, { kind: 'user', text: value }]));
    setIsGenerating(true);
    const t0 = Date.now();
    try {
      const reply = await orchestrator.chat(value);
      if (streamTimer.current) clearTimeout(streamTimer.current);
      streamTimer.current = null;
      streamBuffer.current = null;
      setStreamingMessage('');
      setIsGenerating(false);
      setPendingPermission(null);
      const text = typeof reply === 'string' ? reply : (reply?.text || '');
      const interrupted = !!(reply && typeof reply === 'object' && reply.interrupted);
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      const tokens = Math.max(1, Math.round((text.length || 0) / 4));
      const thoughtText = thoughtRef.current;
      thoughtRef.current = '';
      const thoughtObj = thoughtText ? { text: thoughtText, secs: Number(secs) } : null;
      if (interrupted) {
        setTodos((list) => {
          const next = list.map((t) => (t.status === 'running' ? { ...t, status: 'paused' } : t));
          pushTodoMsg(next);
          return next;
        });
      }
      setMessages((m) => cap([
        ...m,
        { kind: 'assistant', text, thought: thoughtObj, meta: { tokens, secs, model: modelLabel, interrupted } }
      ]));
    } catch (err) {
      setStreamingMessage('');
      setIsGenerating(false);
      setPendingPermission(null);
      setMessages((m) => cap([...m, { kind: 'error', reason: err.message }]));
    }
  };

const handleSlash = async (raw) => {
    const [name, ...rest] = raw.split(' ');
    // Capture commands while recording (except /record itself)
    if (macroRecording && name !== 'record') {
      setMacroBuffer((b) => [...b, raw]);
    }
    switch (name) {
      case 'help':
        setMessages((m) => [...m,
          { kind: 'system', text: 'commands: /connect /models /init /god /hooks /security /audit /quota /compliance /workspaces /resume /stack /bugfix /watch on|off|status|logs|undo /agents /plan /diff /undo /rollback /mode /ui-mode /agent /analytics /theme /scheme /customize /debug /export /record /replay /clear /help /exit' }
        ]);
        break;
      case 'history': {
        const cmds = inputHistory.current.slice(-10).reverse();
        setMessages((m) => [...m,
          { kind: 'system', text: cmds.length ? cmds.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'no history yet' }
        ]);
        break;
      }
      case 'context': {
        const cfg = orchestrator.config || {};
        const provs = (orchestrator.providers || []).length;
        setMessages((m) => [...m, {
          kind: 'system',
          text: `model: ${cfg.roles?.build || 'none'} \u00b7 mode: ${cfg.mode || 'medium'} \u00b7 account: ${cfg.account?.email || 'none'}\nproviders: ${provs} \u00b7 watch: ${orchestrator.watchStatus || 'inactive'} \u00b7 root: ${process.cwd()}`,
        }]);
        break;
      }
      case 'stack': {
        try {
          const { detectTechStack, smartDefaults } = await import('../core/techstack.js');
          const stack = await detectTechStack(process.cwd());
          const d = smartDefaults(stack);
          setMessages((m) => [...m, {
            kind: 'system',
            text: `frontend: ${stack.frontend.join(', ') || 'none'}\nbackend: ${stack.backend.join(', ') || 'none'}\ndb: ${stack.databases.join(', ') || 'none'}\ntest: ${stack.testFrameworks.join(', ') || 'none'}\nbuild: ${stack.buildTools.join(', ') || 'none'}\nlangs: ${stack.languages.join(', ')}\npackage manager: ${stack.packageManager}\nsmart defaults: test=${d.testCommand}, build=${d.buildCommand}, port=${d.devPort}`,
          }]);
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `stack detection error: ${err.message}` }]);
        }
        break;
      }
      case 'clear':
        setMessages([]);
        break;
      case 'exit':
        exit();
        break;
      case 'agents':
        setMessages((m) => [...m,
          { kind: 'system', text: agents.length ? agents.map((a) => `${a.todoId} [${a.domain}] ${a.status} — ${a.message}`).join('\n') : 'no active subagents' }
        ]);
        break;
      case 'plan':
        setMessages((m) => [...m,
          plan
            ? { kind: 'system', text: plan.todos.map((t) => `[${t.id}] (${t.domain}) ${t.status || 'pending'} — ${t.title}`).join('\n') }
            : { kind: 'system', text: 'no plan yet — use /god <prompt>' }
        ]);
        break;
      case 'undo': {
        const file = await orchestrator.undo();
        setMessages((m) => [...m, { kind: 'ok', text: file ? `\u2713 reverted ${file}` : 'nothing to undo' }]);
        break;
      }
      case 'rollback': {
        const count = orchestrator.undoStack?.pending() || 0;
        if (count === 0) {
          setMessages((m) => [...m, { kind: 'system', text: 'no pending changes to rollback' }]);
          break;
        }
        let reverted = 0;
        while (true) {
          const file = await orchestrator.undo();
          if (!file) break;
          reverted++;
        }
        setMessages((m) => [...m, { kind: 'ok', text: `\u2713 rolled back ${reverted} file(s)` }]);
        break;
      }

      case 'god':
        await orchestrator.runGod(rest.join(' '), { interactive: true, addMessage: (msg) => setMessages((m) => cap([...m, msg])) });
        break;
      case 'agent': {
        const AGENTS = ['Build', 'Edit', 'Read', 'Notebook', 'Architect'];
        const want = (rest[0] || '').toLowerCase();
        const hit = want ? AGENTS.find((a) => a.toLowerCase() === want) : null;
        if (want && !hit) {
          setMessages((m) => [...m, { kind: 'err', text: `unknown agent "${want}" — options: ${AGENTS.join(', ')}` }]);
          break;
        }
        const next = hit || AGENTS[(AGENTS.indexOf(agentMode) + 1) % AGENTS.length];
        setAgentMode(next);
        setMessages((m) => [...m, { kind: 'ok', text: `\u2713 agent mode: ${next}` }]);
        break;
      }
      case 'mode': {
        const level = (rest[0] || '').toLowerCase();
        if (!level) {
          setMessages((m) => [...m, { kind: 'system', text: `mode: ${mode} (${MODE_DESC[mode]}) — options: ${MODES.join(', ')} — use /mode <level>` }]);
          break;
        }
        if (!MODES.includes(level)) {
          setMessages((m) => [...m, { kind: 'err', text: `unknown mode "${level}" — use one of: ${MODES.join(', ')}` }]);
          break;
        }
        orchestrator.setMode(level);
        setMode(level);
        const { saveConfig } = await import('../core/store.js');
        await saveConfig({ mode: level });
        setMessages((m) => [...m, { kind: 'ok', text: `\u2713 mode set to ${level} (${MODE_DESC[level]})` }]);
        break;
      }
      case 'ui-mode': {
        const target = (rest[0] || '').toLowerCase();
        if (!target) {
          const available = getModeList().join(', ');
          setMessages((m) => [...m, { kind: 'system', text: `special mode: ${specialMode || 'none'} · available: ${available} · use /ui-mode <name>` }]);
          break;
        }
        if (!getModeList().includes(target)) {
          setMessages((m) => [...m, { kind: 'err', text: `unknown special mode "${target}" · available: ${getModeList().join(', ')}` }]);
          break;
        }
        setSpecialMode(target);
        setMessages((m) => [...m, { kind: 'ok', text: describeMode(target) }]);
        break;
      }
      case 'bugfix':
        if (orchestrator.watchStatus === 'active') {
          await orchestrator.stopWatch();
          setMessages((m) => [...m, { kind: 'system', text: 'watch daemon stopped' }]);
        } else {
          setMessages((m) => [...m, { kind: 'system', text: '\u25c9 watching — scanning every 30s (Ctrl+C or /bugfix to stop)' }]);
          orchestrator.startWatch().catch((err) => {
            setMessages((m) => [...m, { kind: 'err', text: `watch failed: ${err.message}` }]);
          });
        }
        break;
      case 'watch': {
        const sub = (rest[0] || '').toLowerCase();
        if (sub === 'on') {
          if (orchestrator.watchStatus === 'active') {
            setMessages((m) => [...m, { kind: 'system', text: 'watch daemon already active' }]);
            break;
          }
          setMessages((m) => [...m, { kind: 'system', text: '\u25c9 watching — scanning every 30s (/watch off to stop)' }]);
          orchestrator.startWatch().catch((err) => {
            setMessages((m) => [...m, { kind: 'err', text: `watch failed: ${err.message}` }]);
          });
          break;
        }
        if (sub === 'off') {
          if (orchestrator.watchStatus !== 'active') {
            setMessages((m) => [...m, { kind: 'system', text: 'watch daemon is not running' }]);
            break;
          }
          await orchestrator.stopWatch();
          setMessages((m) => [...m, { kind: 'system', text: 'watch daemon stopped' }]);
          break;
        }
        if (sub === 'status') {
          const st = orchestrator.watchStatus || 'inactive';
          const cfg = orchestrator.watchDaemon?.config || {};
          setMessages((m) => [...m, {
            kind: 'system',
            text: `watch: ${st}${st === 'active' ? ` — max ${orchestrator.watchMaxPerHour} fixes/hr, debounce ${cfg.debounceMs ?? 400}ms, scan ${Math.round((cfg.scanIntervalMs ?? 30000) / 1000)}s` : ' — use /watch on'}`,
          }]);
          break;
        }
        if (sub === 'undo') {
          const file = await (orchestrator.undoWatch ? orchestrator.undoWatch() : orchestrator.undo());
          setMessages((m) => [...m, { kind: 'ok', text: file ? `\u2713 reverted watch fix ${file}` : 'nothing to undo' }]);
          break;
        }
        if (sub === 'logs' || sub === 'log') {
          setMessages((m) => [...m, { kind: 'system', text: watchLogs.length ? watchLogs.slice(-20).join('\n') : 'no watch activity yet' }]);
          break;
        }
        setMessages((m) => [...m, { kind: 'err', text: '/watch needs: on | off | status | logs' }]);
        break;
      }
      case 'diff':
        setDiffOpen(true);
        break;
      case 'connect':
        setActiveModal('connect');
        break;
      case 'models':
        setActiveModal('models');
        break;
      case 'init':
        if (onAction) onAction('init');
        else setMessages((m) => [...m, { kind: 'err', text: 'init not supported here' }]);
        break;
      case 'analytics':
        setAnalyticsOpen(true);
        break;
      case 'hooks': {
        const hooks = orchestrator.manager?.hooks;
        if (!hooks) {
          setMessages((m) => [...m, { kind: 'system', text: 'no hooks loaded (create .mcode/hooks.js to enable)' }]);
          break;
        }
        const list = HOOK_POINTS.filter((h) => hooks.has(h));
        setMessages((m) => [...m, {
          kind: 'system',
          text: list.length
            ? `hooks active: ${list.join(', ')} (from ${hooks.hooksPath || '.mcode/hooks.js'})`
            : 'no hooks defined in .mcode/hooks.js',
        }]);
        break;
      }
      case 'debug': {
        setDebugMode((d) => !d);
        if (!debugMode) {
          setDebugEvents([]);
        }
        break;
      }
      case 'audit': {
        try {
          const logs = await orchestrator.auditLog?.recent(20);
          if (!logs || logs.length === 0) {
            setMessages((m) => [...m, { kind: 'system', text: 'no audit entries yet' }]);
          } else {
            const lines = logs.map((e) => {
              const t = new Date(e.timestamp).toLocaleTimeString();
              const risk = e.risk ? ` [${e.risk}]` : '';
              const decision = e.decision ? ` ${e.decision}` : '';
              return `${t} ${e.type}${risk}${decision} ${e.operation || e.action || ''}`;
            });
            setMessages((m) => [...m, { kind: 'system', text: `audit (${logs.length} recent):\n${lines.join('\n')}` }]);
          }
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `audit error: ${err.message}` }]);
        }
        break;
      }
      case 'resume': {
        try {
          const history = await listHistory();
          const inProgress = history.find((h) => h.status === 'in_progress' || h.status === 'paused');
          if (!inProgress) {
            const last = history[0];
            if (!last) {
              setMessages((m) => [...m, { kind: 'system', text: 'no sessions to resume' }]);
              break;
            }
            setMessages((m) => [...m, {
              kind: 'system',
              text: `last session: ${last.projectName} (${new Date(last.startedAt).toLocaleString()}) — ${last.results?.done || 0}/${last.results?.total || '?'} todos done`,
            }]);
          } else {
            setMessages((m) => [...m, {
              kind: 'system',
              text: `resuming: ${inProgress.projectName} (${inProgress.results?.done || 0}/${inProgress.results?.total || '?'} todos done)`,
            }]);
            setMessages((m) => [...m, {
              kind: 'system',
              text: `\u25c9 continuing build from last checkpoint\u2026`,
            }]);
            await orchestrator.runGod(inProgress.plan?.summary || '', {
              interactive: true,
              addMessage: (msg) => setMessages((ms) => cap([...ms, msg])),
            });
          }
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `resume error: ${err.message}` }]);
        }
        break;
      }
      case 'theme': {
        const names = THEME_NAMES || ['dark', 'light', 'opencode'];
        const idx = names.indexOf(themeName);
        const next = names[(idx + 1) % names.length];
        setTheme(next);
        setThemeName(next);
        setThemeVersion((v) => v + 1);
        setMessages((m) => [...m, { kind: 'ok', text: `\u2713 theme: ${next}` }]);
        break;
      }
      case 'scheme': {
        const target = (rest[0] || '').toLowerCase();
        if (!target) {
          setMessages((m) => [...m, { kind: 'system', text: `color scheme: cycling through: ${COLOR_SCHEME_NAMES.join(', ')}` }]);
          break;
        }
        if (!COLOR_SCHEME_NAMES.includes(target)) {
          setMessages((m) => [...m, { kind: 'err', text: `unknown scheme "${target}" · available: ${COLOR_SCHEME_NAMES.join(', ')}` }]);
          break;
        }
        const themed = getThemedColors(themeName, target);
        for (const key of Object.keys(themed)) {
          theme[key] = themed[key];
        }
        setThemeVersion((v) => v + 1);
        setMessages((m) => [...m, { kind: 'ok', text: `✓ color scheme: ${target}` }]);
        break;
      }
      case 'customize': {
        const sub = (rest[0] || '').toLowerCase();
        if (!sub) {
          setMessages((m) => [...m, { kind: 'system', text: 'customize: /customize icons <set> | /customize font <size> | /customize layout <preset> · icons: ' + ICON_SET_NAMES.join(', ') + ' · fonts: ' + FONT_SIZE_NAMES.join(', ') + ' · layouts: ' + LAYOUT_PRESET_NAMES.join(', ') }]);
          break;
        }
        switch (sub) {
          case 'icons': {
            const set = (rest[1] || '').toLowerCase();
            if (!set) {
              setMessages((m) => [...m, { kind: 'system', text: `icon set options: ${ICON_SET_NAMES.join(', ')}` }]);
              break;
            }
            if (!ICON_SET_NAMES.includes(set)) {
              setMessages((m) => [...m, { kind: 'err', text: `unknown icon set "${set}" · options: ${ICON_SET_NAMES.join(', ')}` }]);
              break;
            }
            theme.iconSet = set;
            setThemeVersion((v) => v + 1);
            setMessages((m) => [...m, { kind: 'ok', text: `✓ icon set: ${set}` }]);
            break;
          }
          case 'font': {
            const size = (rest[1] || '').toLowerCase();
            if (!size) {
              setMessages((m) => [...m, { kind: 'system', text: `font size options: ${FONT_SIZE_NAMES.join(', ')}` }]);
              break;
            }
            if (!FONT_SIZE_NAMES.includes(size)) {
              setMessages((m) => [...m, { kind: 'err', text: `unknown font size "${size}" · options: ${FONT_SIZE_NAMES.join(', ')}` }]);
              break;
            }
            theme.fontSize = size;
            setThemeVersion((v) => v + 1);
            setMessages((m) => [...m, { kind: 'ok', text: `✓ font size: ${size}` }]);
            break;
          }
          case 'layout': {
            const preset = (rest[1] || '').toLowerCase();
            if (!preset) {
              setMessages((m) => [...m, { kind: 'system', text: `layout options: ${LAYOUT_PRESET_NAMES.join(', ')}` }]);
              break;
            }
            if (!LAYOUT_PRESET_NAMES.includes(preset)) {
              setMessages((m) => [...m, { kind: 'err', text: `unknown layout "${preset}" · options: ${LAYOUT_PRESET_NAMES.join(', ')}` }]);
              break;
            }
            theme.layout = preset;
            setThemeVersion((v) => v + 1);
            setMessages((m) => [...m, { kind: 'ok', text: `✓ layout: ${preset}` }]);
            break;
          }
          default:
            setMessages((m) => [...m, { kind: 'err', text: `unknown customize option "${sub}" · options: icons, font, layout` }]);
        }
        break;
      }

      case 'quota': {
        try {
          const resp = await fetch(`${orchestrator.config?.backend?.url || 'http://localhost:3100'}/api/v1/usage/quotas`, {
            headers: { Authorization: `Bearer ${orchestrator.config?.account?.token || ''}` },
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const q = await resp.json();
          setMessages((m) => [...m, {
            kind: 'system',
            text: `plan: ${q.plan} \u00b7 tokens: ${q.tokens.used.toLocaleString()}/${q.tokens.limit.toLocaleString()} (${q.tokens.remaining.toLocaleString()} left) \u00b7 builds: ${q.builds.used}/${q.builds.limit} (${q.builds.remaining} left)\nquota resets: ${new Date(q.resetAt).toLocaleString()}`,
          }]);
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `quota check failed: ${err.message}` }]);
        }
        break;
      }
      case 'workspaces': {
        try {
          const resp = await fetch(`${orchestrator.config?.backend?.url || 'http://localhost:3100'}/api/v1/sessions/workspaces`, {
            headers: { Authorization: `Bearer ${orchestrator.config?.account?.token || ''}` },
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const w = await resp.json();
          setMessages((m) => [...m, {
            kind: 'system',
            text: w.workspaces.length
              ? `workspaces:\n${w.workspaces.map((ws) => `${ws.name} (${ws.sessions} sessions, last: ${ws.lastActive ? new Date(ws.lastActive).toLocaleDateString() : '—'})`).join('\n')}`
              : 'no workspaces found',
          }]);
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `workspace list failed: ${err.message}` }]);
        }
        break;
      }
      case 'compliance': {
        try {
          const resp = await fetch(`${orchestrator.config?.backend?.url || 'http://localhost:3100'}/api/v1/usage/compliance`, {
            headers: { Authorization: `Bearer ${orchestrator.config?.account?.token || ''}` },
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const c = await resp.json();
          setMessages((m) => [...m, {
            kind: 'system',
            text: `compliance: ${c.complianceStatus} \u00b7 success: ${c.successRate}% (${c.completedSessions}/${c.totalSessions} completed)\u00b7 security violations: ${c.securityViolations}\nlast session: ${c.lastSession || 'none'} \u00b7 last activity: ${c.lastActivity || 'never'}`,
          }]);
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `compliance check failed: ${err.message}` }]);
        }
        break;
      }
      case 'security': {
        const cfg = orchestrator.config || {};
        const wl = cfg.networkWhitelist;
        const wlLabel = wl ? wl.map((d) => d).join(', ') : 'all (no whitelist)';
        setMessages((m) => [...m, {
          kind: 'system',
          text: `network: ${wlLabel} \u00b7 secrets: redacted \u00b7 shell: ${cfg.allowShellAll ? 'unrestricted' : 'sandboxed'}`,
        }]);
        break;
      }
      case 'export': {
        const fmt = (rest[0] || 'markdown').toLowerCase();
        const now = new Date().toISOString().replace(/[:.]/g, '-');
        const ext = fmt === 'json' ? 'json' : 'md';
        const fileName = `mcode-session-${now}.${ext}`;
        const filePath = join(process.cwd(), fileName);

        try {
          if (fmt === 'json') {
            const data = { messages, agents, plan, todos };
            await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
          } else {
            // Markdown export
            const lines = [
              `# mcode Session — ${new Date().toLocaleString()}`,
              '',
              `## Project`,
              projectName,
              '',
              `## Messages`,
              ...messages.map((m) => {
                switch (m.kind) {
                  case 'user': return `**User:** ${m.text}`;
                  case 'assistant': return `**Assistant:** ${m.text}${m.thought ? `\n\n> ${m.thought.text}` : ''}`;
                  case 'system': return `_${m.text}_`;
                  case 'ok': return `✓ ${m.text}`;
                  case 'err': return `✗ ${m.text}`;
                  case 'warn': return `⚠ ${m.text}`;
                  case 'build': return `## Build Summary\n${JSON.stringify(m.data, null, 2)}`;
                  default: return m.text || '';
                }
              }),
              '',
              `## Plan`,
              plan ? plan.todos.map((t) => `- [${t.status || 'pending'}] (${t.domain}) ${t.title}`).join('\n') : 'No plan',
              '',
            ];
            await writeFile(filePath, lines.join('\n'), 'utf8');
          }
          setMessages((m) => [...m, { kind: 'ok', text: `\u2713 exported to ${fileName}` }]);
        } catch (err) {
          setMessages((m) => [...m, { kind: 'err', text: `export failed: ${err.message}` }]);
        }
        break;
      }
      case 'record': {
        if (!macroRecording) {
          setMacroRecording(true);
          setMacroBuffer([]);
          setMessages((m) => [...m, { kind: 'system', text: '\u25c9 recording commands (use /record stop to finish)' }]);
        } else {
          setMacroRecording(false);
          const buf = [...macroBuffer];
          setRecordedMacros((macros) => [...macros, buf]);
          setMessages((m) => [...m, { kind: 'system', text: `\u2713 recorded ${buf.length} commands (use /replay <n> to execute)` }]);
        }
        break;
      }
      case 'replay': {
        const idx = parseInt(rest[0] || '1', 10) - 1;
        if (idx >= 0 && idx < recordedMacros.length && recordedMacros[idx]) {
          const macro = recordedMacros[idx];
          setMessages((m) => [...m, { kind: 'system', text: `\u2713 replaying macro ${idx + 1} (${macro.length} commands)` }]);
          for (const cmd of macro) {
            setMessages((m) => [...m, { kind: 'system', text: `  > ${cmd}` }]);
            await handleSlash(cmd);
          }
        } else {
          setMessages((m) => [...m, { kind: 'err', text: `macro ${rest[0] || 1} not found` }]);
        }
        break;
      }
      default:
        setMessages((m) => [...m, { kind: 'err', text: `unknown command /${name} — try /help` }]);
    }
  };

  const handleWelcomeQuickAction = (n) => {
    if (n === 1) handleSubmit('Build a REST API for orders with tests');
    else if (n === 2) handleSlash('watch on');
    else if (n === 3) handleSlash('connect');
    else if (n === 4) handleSlash('debug');
  };

  const handleTemplate = (template) => {
    handleSubmit(template.prompt);
  };

  const hasStarted = chatStarted || messages.length > 1 || plan || agents.length > 0;

  const tokens = messages.reduce((s, m) => {
    if (m.kind === 'user' || m.kind === 'assistant') return s + Math.round(String(m.text || '').length / 4);
    return s;
  }, 0);
  const percent = Math.min(99, Math.round((tokens / 200000) * 100));

  return (
    <box key={themeVersion} flexDirection="column" width="100%" height={hasStarted ? rows : undefined} backgroundColor={theme.bg}>
      {hasStarted ? (
        <box flexDirection="row" width="100%" height="100%">
          <box flexDirection="column" flexGrow={1} overflow="hidden">
            <Header
              projectName={projectName}
              model={modelLabel}
              watching={orchestrator.watchStatus === 'active'}
              email={email}
              version={VERSION}
              agentsRunning={agents.filter((a) => a.status === 'running').length}
              agentsTotal={agents.length}
              elapsed={elapsed}
            />
            <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={SPACING.sm} paddingRight={SPACING.sm}>
                <MainPane
                  messages={messages}
                  streamingMessage={streamingMessage}
                  isGenerating={isGenerating}
                  modelLabel={modelLabel}
                  agentMode={agentMode}
                onInterrupt={() => {
                  orchestrator.interrupt?.();
                  setMessages((m) => cap([...m, { kind: 'system', text: 'generation interrupted — press r to retry' }]));
                }}
                onRetry={() => {
                  if (lastPrompt.current) handleSubmit(lastPrompt.current);
                }}
                pendingPermission={pendingPermission}
                onPermission={(requestId, answer) => orchestrator.answerPermission?.(requestId, answer)}
              />
            </box>
{!['focus', 'silent'].includes(specialMode) && <Toasts toasts={toasts} />}
            {specialMode !== 'zen' && <AgentStrip agents={agents} selectedId={activePanelId} onSelect={setActivePanelId} />}
            <box flexShrink={0}>
              <InputLine
                onSubmit={handleSubmit}
                history={inputHistory.current}
                agentMode={agentMode}
                mode={mode}
                modelLabel={modelLabel}
                isActive={!activeModal && !paletteOpen && !isBuilding}
                isGenerating={isGenerating}
                canRetry={messages.length > 0 && messages[messages.length - 1].kind === 'error'}
                onRetry={() => {
                  if (lastPrompt.current) handleSubmit(lastPrompt.current);
                }}
                pendingPermission={pendingPermission}
                onPermission={(requestId, answer) => orchestrator.answerPermission?.(requestId, answer)}
              />
            </box>
            <box flexShrink={0}>
              <StatusBar tokens={tokens} percent={percent} cwd={process.cwd()} isGenerating={isGenerating} branch={branch} gitDirty={gitDirty} mode={mode} agentMode={agentMode} watching={orchestrator.watchStatus === 'active'} agentsRunning={agents.filter((a) => a.status === 'running').length} agentsTotal={agents.length} elapsed={elapsed} cost={buildCost} tokenIn={tokenIn} tokenOut={tokenOut} latency={lastLatency} providers={(orchestrator.providers || []).length} modelLabel={modelLabel} specialMode={specialMode} />
            </box>
          </box>
          {activePanelId && (
            <ActivePanel
              agents={agents}
              files={agentFiles}
              selectedId={activePanelId}
              pinned={panelPinned}
              onTogglePin={() => setPanelPinned((p) => !p)}
              onClose={() => setActivePanelId(null)}
            />
          )}
          {isBuilding && plan && (
            <ProcessingScreen
              plan={plan}
              waves={buildWaves}
              currentWave={currentWave}
              totalWaves={totalWaves}
              completedWaves={completedWaves}
              todos={todos}
              agents={agents}
              elapsed={buildElapsed}
              contextTokens={tokens}
              cost={buildCost}
              onInterrupt={() => {
                orchestrator.manager?.stop?.();
                setIsBuilding(false);
              }}
              height={rows}
            />
          )}
          {specialMode !== 'zen' && <Sidebar
            width={40}
            title={messages.find((m) => m.kind === 'user')?.text || 'New Chat'}
            workspace={process.cwd()}
            branch={branch}
            version={VERSION}
            tokens={tokens}
            percent={percent}
            todos={todos}
          />}
        </box>
      ) : (
        <>
          <WelcomeScreen modelLabel={modelLabel} onQuickAction={handleWelcomeQuickAction} onTemplate={handleTemplate}>
            <InputLine onSubmit={handleSubmit} history={inputHistory.current} variant="welcome" agentMode={agentMode} mode={mode} modelLabel={modelLabel} isActive={!activeModal} onQuickAction={handleWelcomeQuickAction} />
          </WelcomeScreen>
          <Toasts toasts={toasts} />
          <box flexShrink={0}>
            <StatusBar tokens={tokens} percent={percent} cwd={process.cwd()} mode={mode} agentMode={agentMode} modelLabel={modelLabel} tokenIn={tokenIn} tokenOut={tokenOut} providers={(orchestrator.providers || []).length} branch={branch} gitDirty={gitDirty} specialMode={specialMode} />
          </box>
        </>
      )}
      {activeModal && <ProviderWizard mode={activeModal} onClose={() => setActiveModal(null)} />}
      {analyticsOpen && (
        <AnalyticsPanel
          width={52}
          height={rows}
          onBack={() => setAnalyticsOpen(false)}
        />
      )}
      {pendingPermission && (
        <PermissionModal
          request={{
            prompt: pendingPermission.prompt || pendingPermission.command || 'Allow this action?',
            detail: pendingPermission.detail || '',
          }}
          onAnswer={(answer) => orchestrator.answerPermission?.(pendingPermission.requestId, answer)}
          onClose={() => orchestrator.answerPermission?.(pendingPermission.requestId, 'n')}
        />
      )}
      {paletteOpen && (
        <CommandPalette
          onRun={(cmd) => {
            setPaletteOpen(false);
            handleSlash(cmd);
          }}
          onClose={() => setPaletteOpen(false)}
        />
      )}
      {debugMode && (
        <DebugPanel
          events={debugEvents}
          onClose={() => setDebugMode(false)}
        />
      )}
      {diffOpen && (
        <DiffViewer
          width={Math.min(100, termWidth ? termWidth - 4 : 90)}
          height={Math.min(40, rows - 10)}
          cwd={process.cwd()}
          onBack={() => setDiffOpen(false)}
        />
      )}
    </box>
  );
}
