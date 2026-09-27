"use client";
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useChatSocket';

interface Agent {
  id: string;
  todoId?: string;
  title?: string;
  domain?: string;
  model?: string;
  wave?: number;
  status: 'running' | 'done' | 'failed' | 'needs_review';
  steps: number;
  updatedAt: number;
}

interface WatchFix {
  id: number;
  file?: string;
  detail?: string;
  outcome?: string;
  at: number;
}

const DOMAIN_COLORS: Record<string, string> = {
  frontend: '#38bdf8', backend: '#a78bfa', db: '#fbbf24', devops: '#34d399',
  test: '#f472b6', docs: '#94a3b8', bugfix: '#f87171', planning: '#4ade80',
  reviewer: '#fb923c', migration: '#22d3ee',
};

let fixSeq = 0;

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading live activity">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-xl bg-white/5" />
      ))}
    </div>
  );
}

export function LiveMonitorPage() {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [fixes, setFixes] = useState<WatchFix[]>([]);
  const [ready, setReady] = useState(false);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const upsert = (id: string, patch: Partial<Agent>, status: Agent['status'] = 'running') => {
      setAgents((prev) => {
        const base: Agent = { ...prev[id], id, steps: prev[id]?.steps ?? 0, updatedAt: Date.now(), status };
        Object.assign(base, patch);
        base.id = id;
        base.status = patch.status || status;
        base.updatedAt = Date.now();
        return { ...prev, [id]: base };
      });
    };
    const onStarted = (p: any) => upsert(String(p.todoId || p.id || Date.now()), { todoId: p.todoId, title: p.title, domain: p.domain, model: p.model, wave: p.wave });
    const onStep = (p: any) => setAgents((prev) => {
      const id = String(p.todoId || p.id);
      if (!prev[id]) return prev;
      return { ...prev, [id]: { ...prev[id], steps: prev[id].steps + 1, updatedAt: Date.now() } };
    });
    const onDone = (p: any) => upsert(String(p.todoId || p.id), { title: p.title }, 'done');
    const onFailed = (p: any) => upsert(String(p.todoId || p.id), { title: p.title }, 'failed');
    const onFix = (p: any) => {
      // BUG-19-15: time-windowed dedupe (5min) instead of an ever-growing
      // set — re-fixes of the same file surface again, memory stays flat.
      const now = Date.now();
      const key = `${p.file}:${p.detail}:${p.outcome}`;
      const prevAt = (seen.current as any)._at as Map<string, number> | undefined;
      const at = prevAt || new Map<string, number>();
      (seen.current as any)._at = at;
      for (const [k, t] of at) {
        if (now - t > 5 * 60 * 1000) { at.delete(k); seen.current.delete(k); }
      }
      if (seen.current.has(key)) return;
      seen.current.add(key);
      at.set(key, now);
      setFixes((prev) => [{ id: ++fixSeq, file: p.file, detail: p.detail, outcome: p.outcome, at: now }, ...prev].slice(0, 30));
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('agent:started', onStarted);
    socket.on('agent:step', onStep);
    socket.on('agent:done', onDone);
    socket.on('agent:failed', onFailed);
    // BUG-19-16: needs_review is its own status, not a failure.
    socket.on('agent:needs_review', (p: any) => upsert(String(p.todoId || p.id), { title: p.title }, 'needs_review'));
    socket.on('watch:fix', onFix);
    socket.on('WATCH_FIX', onFix);
    const t = setTimeout(() => setReady(true), 600);
    return () => {
      clearTimeout(t);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('agent:started', onStarted);
      socket.off('agent:step', onStep);
      socket.off('agent:done', onDone);
      socket.off('agent:failed', onFailed);
      socket.off('agent:needs_review', onFailed);
      socket.off('watch:fix', onFix);
      socket.off('WATCH_FIX', onFix);
    };
  }, []);

  const list = Object.values(agents).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        <h1 className="text-xl font-bold">Live monitor</h1>
        <span className="text-xs text-white/40">{connected ? 'connected to /live' : 'disconnected — start the backend (`mcode serve`)'}</span>
      </div>

      <h2 className="text-sm font-semibold text-white/60 mb-3">Subagents ({list.length})</h2>
      {!ready ? <Skeleton /> : list.length === 0 ? (
        <p className="text-sm text-white/40 border border-dashed border-white/10 rounded-xl p-6 text-center">
          No agent activity yet — run <code className="text-emerald-300">mcode god "…"</code> and watch it here live.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence>
            {list.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: a.status === 'running' ? '#4ade80' : a.status === 'done' ? '#38bdf8' : '#f87171' }} />
                  <span className="font-medium text-sm truncate">{a.title || a.todoId || a.id}</span>
                  {a.domain && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: DOMAIN_COLORS[a.domain] || '#fff', background: `${DOMAIN_COLORS[a.domain] || '#fff'}1a` }}>
                      {a.domain}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-white/40">
                  {a.model && <span className="mr-3">{a.model}</span>}
                  {a.wave != null && <span className="mr-3">wave {a.wave}</span>}
                  <span>{a.steps} steps · {a.status}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <h2 className="text-sm font-semibold text-white/60 mt-8 mb-3">Watch fixes ({fixes.length})</h2>
      {fixes.length === 0 ? (
        <p className="text-sm text-white/40">No auto-fixes streamed yet.</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence>
            {fixes.map((f) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <span className="text-emerald-300 font-mono text-xs">{f.file || 'watch'}</span>
                <span className="text-white/60 text-xs ml-2">{f.detail || f.outcome || 'fixed'}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export default LiveMonitorPage;
