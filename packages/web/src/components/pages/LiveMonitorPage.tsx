"use client";
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../hooks/useChatSocket';
import { SOCKET_EVENTS } from '../../lib/socketEvents';
import api from '../../lib/axios';
import type { BuildSummary } from '../../store/chatSlice';

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
    <div className="animate-pulse space-y-3" role="status" aria-label="Loading live activity">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-white border border-slate-200/80 shadow-xs" />
      ))}
    </div>
  );
}

export function LiveMonitorPage() {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<Record<string, Agent>>({});
  const [fixes, setFixes] = useState<WatchFix[]>([]);
  const [ready, setReady] = useState(false);
  // WEB-018: cost line from the `build:complete` socket payload (fields
  // declared once in chatSlice.BuildSummary, WEB-004). The page reads the
  // payload directly — no store round-trip, same as the agent lists above.
  const [summary, setSummary] = useState<BuildSummary | null>(null);
  // WEB-018: backend version chip (`mcode version` provenance).
  const [version, setVersion] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  // WEB-018: single-sourced backend version (GET /api/v1/version), so UI/CLI
  // provenance can be correlated in bug reports.
  useEffect(() => {
    let live = true;
    api.get('/api/v1/version', { timeout: 5000 })
      .then((r) => { if (live && r.data?.version) setVersion(String(r.data.version)); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

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
    // BUG-19-16: needs_review is its own status, not a failure.
    const onNeedsReview = (p: any) => upsert(String(p.todoId || p.id), { title: p.title }, 'needs_review');
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
    socket.on(SOCKET_EVENTS.AGENT_STARTED, onStarted);
    socket.on(SOCKET_EVENTS.AGENT_STEP, onStep);
    socket.on(SOCKET_EVENTS.AGENT_DONE, onDone);
    socket.on(SOCKET_EVENTS.AGENT_FAILED, onFailed);
    // BUG-19-16: needs_review is its own status, not a failure.
    socket.on(SOCKET_EVENTS.AGENT_NEEDS_REVIEW, onNeedsReview);
    socket.on(SOCKET_EVENTS.WATCH_FIX, onFix);
    // WEB-018: the page already had access to `build:complete` — now it
    // renders the payload (spend/budget/conflicts) instead of dropping it.
    const onBuildComplete = (p: any) => setSummary((p || {}) as BuildSummary);
    socket.on(SOCKET_EVENTS.BUILD_COMPLETE, onBuildComplete);
    const t = setTimeout(() => setReady(true), 600);
    return () => {
      clearTimeout(t);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(SOCKET_EVENTS.AGENT_STARTED, onStarted);
      socket.off(SOCKET_EVENTS.AGENT_STEP, onStep);
      socket.off(SOCKET_EVENTS.AGENT_DONE, onDone);
      socket.off(SOCKET_EVENTS.AGENT_FAILED, onFailed);
      // BUG-19-16: needs_review is its own status, not a failure.
      socket.off(SOCKET_EVENTS.AGENT_NEEDS_REVIEW, onNeedsReview);
      socket.off(SOCKET_EVENTS.WATCH_FIX, onFix);
      socket.off(SOCKET_EVENTS.BUILD_COMPLETE, onBuildComplete);
    };
  }, []);

  const list = Object.values(agents).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 py-10 px-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-red-500 ring-4 ring-red-100'}`} />
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Live monitor</h1>
        {/* WEB-019: polite live region announces connect/disconnect + build completion. */}
        <span role="status" aria-live="polite" className="text-xs text-neutral-500">
          {connected ? 'connected to /live' : 'disconnected — start backend (`mcode serve`)'}
        </span>
        {/* WEB-018: backend version chip — correlate with `mcode version`. */}
        {version && (
          <span title="Backend version — correlate with `mcode version`" className="ml-auto text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-neutral-600 shadow-xs">
            mcode v{version}
          </span>
        )}
      </div>

      {/* WEB-018: live cost line — spend, budget banner, conflicts from the
          `build:complete` payload. Surface-only: resume runs in the CLI. */}
      {summary && (
        <div data-testid="build-cost-line" role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 mb-8 shadow-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-bold text-neutral-900">Build complete — {summary.done ?? 0}/{summary.total ?? 0} done</span>
            {(summary.failed ?? 0) > 0 && <span className="text-red-600 font-semibold">✗ {summary.failed} failed</span>}
            {(summary.needsReview ?? 0) > 0 && <span className="text-amber-600 font-semibold">⚑ {summary.needsReview} review</span>}
            {summary.spendUsd != null ? (
              <span className="text-neutral-700 font-semibold" title="Ledger-attributed spend">spent ${Number(summary.spendUsd).toFixed(2)}</span>
            ) : (
              summary.cost != null && summary.cost > 0 && (
                <span className="text-neutral-500 font-medium" title="Legacy rate-table estimate">~${Number(summary.cost).toFixed(2)}</span>
              )
            )}
            {summary.elapsedSecs != null && <span className="text-xs text-neutral-400 font-mono">{Math.round(summary.elapsedSecs)}s</span>}
          </div>
          {summary.budget != null && (
            <div data-testid="build-budget-banner" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <strong className="font-bold">Stopped at the cost ceiling.</strong>{' '}
              spent ${Number(summary.budget.spentUsd ?? 0).toFixed(2)} of the ${Number(summary.budget.limitUsd ?? 0).toFixed(2)} limit.
              Resume with <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">mcode god --resume</code>.
            </div>
          )}
          {((summary.overlaps?.length ?? 0) > 0 || (summary.lockConflicts?.length ?? 0) > 0) && (
            <div data-testid="build-conflicts" className="mt-2 text-xs text-neutral-500">
              {(summary.overlaps?.length ?? 0) > 0 && (
                <span className="mr-3 text-amber-700 font-medium">⚠ {summary.overlaps!.length} overlapping file write{summary.overlaps!.length !== 1 && 's'}</span>
              )}
              {(summary.lockConflicts?.length ?? 0) > 0 && (
                <span className="text-red-700 font-medium">⛔ {summary.lockConflicts!.length} lock conflict{summary.lockConflicts!.length !== 1 && 's'}</span>
              )}
            </div>
          )}
        </div>
      )}

      <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Subagents ({list.length})</h2>
      {!ready ? <Skeleton /> : list.length === 0 ? (
        <div className="text-sm text-neutral-500 border border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center shadow-xs">
          No agent activity yet — run <code className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">mcode god &quot;…&quot;</code> and watch it here live.
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2" role="log" aria-live="polite" aria-atomic="false" aria-label="Subagent activity">
          <AnimatePresence>
            {list.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs p-5 transition-all shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: a.status === 'running' ? '#10b981' : a.status === 'done' ? '#0284c7' : '#ef4444' }} />
                  <span className="font-bold text-sm text-neutral-900 truncate">{a.title || a.todoId || a.id}</span>
                  {a.domain && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border" style={{ color: DOMAIN_COLORS[a.domain] || '#334155', background: `${DOMAIN_COLORS[a.domain] || '#334155'}15`, borderColor: `${DOMAIN_COLORS[a.domain] || '#334155'}30` }}>
                      {a.domain}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  {a.model && <span className="mr-3 font-mono text-neutral-600">{a.model}</span>}
                  {a.wave != null && <span className="mr-3 font-medium">wave {a.wave}</span>}
                  <span>{a.steps} steps · {a.status}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mt-10 mb-3">Watch fixes ({fixes.length})</h2>
      {fixes.length === 0 ? (
        <div className="text-sm text-neutral-500 bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-xs">
          No auto-fixes streamed yet.
        </div>
      ) : (
        <ul className="space-y-2.5" role="log" aria-live="polite" aria-atomic="false" aria-label="Watch fixes">
          <AnimatePresence>
            {fixes.map((f) => (
              <motion.li
                key={f.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs flex items-center justify-between"
              >
                <span className="text-emerald-800 font-mono text-xs font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">{f.file || 'watch'}</span>
                <span className="text-neutral-600 text-xs ml-2">{f.detail || f.outcome || 'fixed'}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export default LiveMonitorPage;
