import { useEffect, useRef, useState } from 'react';
import { Box, useApp } from 'ink';
import { Header } from './Header.jsx';
import { MainPane } from './MainPane.jsx';
import { Sidebar } from './Sidebar.jsx';
import { InputLine } from './InputLine.jsx';
import { Toasts } from './Toasts.jsx';
import { EVENTS, SUBAGENT_STATUS } from '@mcode/shared';

export function App({ orchestrator, projectName, history = [] }) {
  const { exit } = useApp();
  const [messages, setMessages] = useState([{ kind: 'system', text: `mcode v2.4.6 — type /help for commands` }]);
  const [agents, setAgents] = useState([]);
  const [plan, setPlan] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [watchOn, setWatchOn] = useState(false);
  const [modelLabel] = useState('auto');
  const [sidebarWidth, setSidebarWidth] = useState(0);
  const inputHistory = useRef(history);

  useEffect(() => {
    const bus = orchestrator;

    const push = (msg) => setMessages((m) => [...m, msg]);
    const toast = (t) => {
      setToasts((ts) => [...ts, { id: Date.now() + Math.random(), ...t }]);
      setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 4000);
    };

    const onPlan = (p) => {
      setPlan(p);
      push({ kind: 'ok', text: `\u2713 plan generated — ${p.todos.length} todos` });
      for (const t of p.todos.slice(0, 14)) {
        push({ kind: 'system', text: `  [${t.id}] (${t.domain}) ${t.title}` });
      }
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
      push({ kind: 'ok', text: `\u2713 ${p.todoId} done — ${String(p.summary || '').slice(0, 90)}` });
      setTimeout(() => setAgents((list) => list.filter((a) => a.todoId !== p.todoId)), 1200);
    };
    const onAgentFailed = (p) => {
      upsertAgent(p.todoId, { status: 'failed', message: p.error });
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
    let streamTimer = null;
    let streamBuffer = null;
    const flushStream = () => {
      if (streamBuffer === null) return;
      const text = streamBuffer;
      streamBuffer = null;
      streamTimer = null;
      setMessages((list) => {
        const last = list[list.length - 1];
        if (last?.streaming) return [...list.slice(0, -1), { ...last, text }];
        return [...list, { kind: 'assistant', text, streaming: true }];
      });
    };
    const onMessage = (m) => {
      if (m.kind === 'stream') {
        streamBuffer = m.text;
        if (!streamTimer) streamTimer = setTimeout(flushStream, 60);
      } else {
        if (streamTimer) {
          clearTimeout(streamTimer);
          flushStream();
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
    const onWatchStatus = (s) => setWatchOn(s === 'active');

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
      if (streamTimer) {
        clearTimeout(streamTimer);
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

  // animate the sidebar in/out when agents exist
  useEffect(() => {
    const target = agents.length > 0 ? 34 : 0;
    if (sidebarWidth === target) return;
    const t = setInterval(() => {
      setSidebarWidth((w) => {
        const step = 6;
        if (w < target) return Math.min(target, w + step);
        return Math.max(0, w - step);
      });
    }, 25);
    return () => clearInterval(t);
  }, [agents.length > 0, sidebarWidth]);

  const handleSubmit = async (value) => {
    if (value.startsWith('/')) {
      await handleSlash(value.slice(1));
      return;
    }
    inputHistory.current.push(value);
    setMessages((m) => [...m, { kind: 'user', text: value }]);
    try {
      const reply = await orchestrator.chat(value);
      setMessages((m) => [
        ...m.slice(0, -1),
        { kind: 'assistant', text: reply }
      ]);
    } catch (err) {
      setMessages((m) => [...m, { kind: 'err', text: `error: ${err.message}` }]);
    }
  };

  const handleSlash = async (raw) => {
    const [name, ...rest] = raw.split(' ');
    switch (name) {
      case 'help':
        setMessages((m) => [...m,
          { kind: 'system', text: 'commands: /init /god /bugfix /watch /agents /model /plan /diff /undo /clear /help /exit' }
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
      case 'model':
        setMessages((m) => [...m, { kind: 'system', text: 'model routing table:' }]);
        try {
          const catalog = await orchestrator.router.catalog();
          setMessages((m) => [...m, ...catalog.slice(0, 20).map((c) => ({
            kind: 'system',
            text: `  ${c.ref.padEnd(48)} best: ${c.bestDomain} (${c.bestScore})${c.free ? ' · free' : ''}`
          }))]);
        } catch { /* ignore */ }
        break;
      case 'god':
        await orchestrator.runGod(rest.join(' '), { interactive: true, addMessage: (msg) => setMessages((m) => [...m, msg]) });
        break;
      case 'bugfix':
      case 'watch':
        if (orchestrator.watchStatus === 'active') {
          await orchestrator.stopWatch();
          setWatchOn(false);
          setMessages((m) => [...m, { kind: 'system', text: 'watch daemon stopped' }]);
        } else {
          setWatchOn(true);
          setMessages((m) => [...m, { kind: 'system', text: '\u25c9 watching — scanning every 30s (Ctrl+C or /bugfix to stop)' }]);
          orchestrator.startWatch().catch((err) => {
            setMessages((m) => [...m, { kind: 'err', text: `watch failed: ${err.message}` }]);
            setWatchOn(false);
          });
        }
        break;
      case 'diff':
        setMessages((m) => [...m, { kind: 'system', text: `${orchestrator.undoStack.pending()} pending undoable changes (see /undo)` }]);
        break;
      default:
        setMessages((m) => [...m, { kind: 'err', text: `unknown command /${name} — try /help` }]);
    }
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Header projectName={projectName} model={modelLabel} watching={watchOn} />
      <Box flexDirection="row" flexGrow={1}>
        <Sidebar agents={agents} plan={plan} width={sidebarWidth} />
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          <MainPane messages={messages} />
        </Box>
      </Box>
      <Toasts toasts={toasts} />
      <InputLine onSubmit={handleSubmit} history={inputHistory.current} />
    </Box>
  );
}
