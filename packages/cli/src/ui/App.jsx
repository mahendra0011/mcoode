import { useEffect, useRef, useState } from 'react';
import { useKeyboard, useTerminalDimensions, useRenderer } from '@opentui/react';
import { theme } from './theme.js';
import { Header } from './Header.jsx';
import { MainPane } from './MainPane.jsx';
import { InputLine } from './InputLine.jsx';
import { CommandPalette } from './CommandPalette.jsx';
import { Toasts } from './Toasts.jsx';
import { WelcomeScreen } from './WelcomeScreen.jsx';
import { StatusBar } from './StatusBar.jsx';
import { ProviderWizard } from './ProviderWizard.jsx';
import { EVENTS, SUBAGENT_STATUS } from '@mcode/shared';
import { MODES, MODE_DESC } from '../core/router.js';

const VERSION = 'v2.4.6';

export function App({ orchestrator, projectName, history = [], onAction }) {
  const renderer = useRenderer();
  const exit = () => renderer.destroy();
  const { height } = useTerminalDimensions();
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
    }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const git = (await import('simple-git')).default(process.cwd());
        const b = await git.branch();
        if (!cancelled && b?.current) setBranch(b.current);
      } catch {
        /* not a git repo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshModelLabel = async () => {
    try {
      const { loadConfig } = await import('../core/store.js');
      const config = await loadConfig();
      if (config?.roles?.build) setModelLabel(config.roles.build.split(':').pop());
      setMode(MODES.includes(config?.mode) ? config.mode : 'medium');
      setEmail(config?.account?.email || '');
    } catch {}
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
        if (!msg.replaceKey) return [...m, msg];
        const idx = m.findIndex((x) => x.replaceKey === msg.replaceKey);
        if (idx === -1) return [...m, msg];
        const next = m.slice();
        next[idx] = { ...next[idx], ...msg };
        return next;
      });
    const toast = (t) => {
      setToasts((ts) => [...ts, { id: Date.now() + Math.random(), ...t }]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 4000);
    };

    const onPlan = (p) => {
      setPlan(p);
      const items = p.todos.map((t) => ({ id: t.id, domain: t.domain, title: t.title, status: 'pending' }));
      setTodos(items);
      push({ kind: 'ok', text: `\u2713 plan generated — ${p.todos.length} todos` });
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

    const onAgentStarted = (p) => upsertAgent(p.todoId, { status: 'running', domain: p.domain, model: p.model, startedAt: Date.now() });
    const onAgentStep = (p) => upsertAgent(p.todoId, { status: 'running', message: p.message });
    const onAgentDone = (p) => {
      upsertAgent(p.todoId, { status: 'done', message: p.summary || 'done' });
      patchTodo(p.todoId, 'done');
      push({ kind: 'ok', text: `\u2713 ${p.todoId} done — ${String(p.summary || '').slice(0, 90)}` });
      setTimeout(() => setAgents((list) => list.filter((a) => a.todoId !== p.todoId)), 1200);
    };
    const onAgentFailed = (p) => {
      upsertAgent(p.todoId, { status: 'failed', message: p.error });
      patchTodo(p.todoId, 'failed');
      push({ kind: 'err', text: `\u2717 ${p.todoId} failed — ${p.error}` });
      setTimeout(() => setAgents((list) => list.filter((a) => a.todoId !== p.todoId)), 1500);
    };

    const onWatchScan = (p) => push({ kind: 'system', text: `[watch] scan ${p.filesScanned} files` });
    const onWatchFix = (p) => push({ kind: p.outcome === 'auto-fixed' ? 'ok' : 'warn', text: `[watch] ${p.file} → ${p.outcome}` });
    const onNeedsReview = (p) => {
      upsertAgent(p.todoId, { status: 'needs_review', message: p.reason });
      toast({ kind: 'warn', text: `${p.todoId} needs human review` });
    };
    const onToast = (t) => toast(t);
    const flushStream = () => {
      if (streamBuffer.current === null) return;
      const text = streamBuffer.current;
      streamBuffer.current = null;
      streamTimer.current = null;
      setStreamingMessage(text);
    };
    const onMessage = (m) => {
      if (m.kind === 'stream') {
        thoughtRef.current += m.text;
        streamBuffer.current = m.text;
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
      toast({
        kind: 'ok',
        text: `${r.done}/${r.total} todos complete · ${(r.elapsedSecs / 60).toFixed(1)}m`
      });
    };
    const onWatchStatus = () => {};

    bus.on(EVENTS.PLAN_GENERATED, onPlan);
    bus.on(EVENTS.SUBAGENT_STARTED, onAgentStarted);
    bus.on(EVENTS.SUBAGENT_STEP, onAgentStep);
    bus.on(EVENTS.SUBAGENT_DONE, onAgentDone);
    bus.on(EVENTS.SUBAGENT_FAILED, onAgentFailed);
    bus.on(EVENTS.SUBAGENT_NEEDS_REVIEW, onNeedsReview);
    bus.on(EVENTS.TOAST, onToast);
    bus.on(EVENTS.MESSAGE, onMessage);
    bus.on(EVENTS.BUILD_COMPLETE, onBuildComplete);
    bus.on(EVENTS.WATCH_STATUS, onWatchStatus);
    bus.on(EVENTS.WATCH_SCAN, onWatchScan);
    bus.on(EVENTS.WATCH_FIX, onWatchFix);

    return () => {
      if (streamTimer.current) {
        clearTimeout(streamTimer.current);
        flushStream();
      }
      bus.off(EVENTS.PLAN_GENERATED, onPlan);
      bus.off(EVENTS.SUBAGENT_STARTED, onAgentStarted);
      bus.off(EVENTS.SUBAGENT_STEP, onAgentStep);
      bus.off(EVENTS.SUBAGENT_DONE, onAgentDone);
      bus.off(EVENTS.SUBAGENT_FAILED, onAgentFailed);
      bus.off(EVENTS.SUBAGENT_NEEDS_REVIEW, onNeedsReview);
      bus.off(EVENTS.TOAST, onToast);
      bus.off(EVENTS.MESSAGE, onMessage);
      bus.off(EVENTS.BUILD_COMPLETE, onBuildComplete);
      bus.off(EVENTS.WATCH_STATUS, onWatchStatus);
      bus.off(EVENTS.WATCH_SCAN, onWatchScan);
      bus.off(EVENTS.WATCH_FIX, onWatchFix);
    };
  }, [orchestrator]);

const handleSubmit = async (value) => {
    if (value.startsWith('/')) {
      await handleSlash(value.slice(1));
      return;
    }
    lastPrompt.current = value;
    inputHistory.current.push(value);
    setChatStarted(true);
    setMessages((m) => [...m, { kind: 'user', text: value }]);
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
      setMessages((m) => [
        ...m,
        { kind: 'assistant', text, thought: thoughtObj, meta: { tokens, secs, model: modelLabel, interrupted } }
      ]);
    } catch (err) {
      setStreamingMessage('');
      setIsGenerating(false);
      setPendingPermission(null);
      setMessages((m) => [...m, { kind: 'error', reason: err.message }]);
    }
  };

const handleSlash = async (raw) => {
    const [name, ...rest] = raw.split(' ');
    switch (name) {
      case 'help':
        setMessages((m) => [...m,
          { kind: 'system', text: 'commands: /connect /models /init /god /bugfix /watch /agents /plan /diff /undo /clear /help /exit' }
        ]);
        break;
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

      case 'god':
        await orchestrator.runGod(rest.join(' '), { interactive: true, addMessage: (msg) => setMessages((m) => [...m, msg]) });
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
      case 'bugfix':
      case 'watch':
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
      case 'diff':
        setMessages((m) => [...m, { kind: 'system', text: `${orchestrator.undoStack.pending()} pending undoable changes (see /undo)` }]);
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
      default:
        setMessages((m) => [...m, { kind: 'err', text: `unknown command /${name} — try /help` }]);
    }
  };

  const hasStarted = chatStarted || messages.length > 1 || plan || agents.length > 0;

  const tokens = messages.reduce((s, m) => {
    if (m.kind === 'user' || m.kind === 'assistant') return s + Math.round(String(m.text || '').length / 4);
    return s;
  }, 0);
  const percent = Math.min(99, Math.round((tokens / 200000) * 100));

  return (
    <box flexDirection="column" width="100%" height={hasStarted ? rows : undefined} backgroundColor={theme.bg}>
      {hasStarted ? (
        <>
          <Header
            projectName={projectName}
            model={modelLabel}
            watching={false}
            email={email}
            version={VERSION}
          />
          <box flexDirection="row" flexGrow={1}>
            <box flexDirection="column" flexGrow={1} overflow="hidden" paddingLeft={1} paddingRight={1}>
              <MainPane
                messages={messages}
                streamingMessage={streamingMessage}
                isGenerating={isGenerating}
                modelLabel={modelLabel}
                onInterrupt={() => {
                  orchestrator.interrupt?.();
                }}
                onRetry={() => {
                  if (lastPrompt.current) handleSubmit(lastPrompt.current);
                }}
                pendingPermission={pendingPermission}
                onPermission={(requestId, answer) => orchestrator.answerPermission?.(requestId, answer)}
              />
            </box>
          </box>
          <Toasts toasts={toasts} />
          <box flexShrink={0}>
            <InputLine
              onSubmit={handleSubmit}
              history={inputHistory.current}
              agentMode={agentMode}
              mode={mode}
              modelLabel={modelLabel}
              isActive={!activeModal && !paletteOpen}
              canRetry={messages.length > 0 && messages[messages.length - 1].kind === 'error'}
              onRetry={() => {
                if (lastPrompt.current) handleSubmit(lastPrompt.current);
              }}
              pendingPermission={pendingPermission}
              onPermission={(requestId, answer) => orchestrator.answerPermission?.(requestId, answer)}
            />
          </box>
          <box flexShrink={0}>
            <StatusBar tokens={tokens} percent={percent} cwd={process.cwd()} isGenerating={isGenerating} />
          </box>
        </>
      ) : (
        <>
          <WelcomeScreen modelLabel={modelLabel}>
            <InputLine onSubmit={handleSubmit} history={inputHistory.current} variant="welcome" agentMode={agentMode} mode={mode} modelLabel={modelLabel} isActive={!activeModal} />
          </WelcomeScreen>
          <Toasts toasts={toasts} />
          <box flexShrink={0}>
            <StatusBar tokens={tokens} percent={percent} />
          </box>
        </>
      )}
      {activeModal && <ProviderWizard mode={activeModal} onClose={() => setActiveModal(null)} />}
{paletteOpen && (
        <CommandPalette
          onRun={(cmd) => {
            setPaletteOpen(false);
            handleSlash(cmd);
          }}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </box>
  );
}

