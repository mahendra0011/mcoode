"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/axios';
import { ErrorBoundary } from '../ErrorBoundary';

interface Session {
  _id: string;
  projectName?: string;
  mode?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
}

// WEB-018: god-run checkpoint surfaced by GET /api/v1/sessions/god-runs
// (local-desktop bridge over the CLI's ~/.mcode/sessions/*/state.json).
interface GodRun {
  projectId: string;
  status?: string;
  done?: number;
  total?: number;
  prompt?: string;
  updatedAt?: string | null;
  spendUsd?: number | null;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading sessions">
      {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
    </div>
  );
}

export function SessionsPage() {
  const [tab, setTab] = useState<'history' | 'god'>('history');
  const [items, setItems] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [godRuns, setGodRuns] = useState<GodRun[]>([]);
  const [godState, setGodState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/sessions', { timeout: 10000 })
      .then((r) => { setItems(r.data.items || []); setTotal(r.data.total || 0); setState('ready'); })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    if (tab !== 'god' || godState !== 'idle') return;
    setGodState('loading');
    api.get('/api/v1/sessions/god-runs', { timeout: 10000 })
      .then((r) => { setGodRuns(r.data.runs || []); setGodState('ready'); })
      .catch(() => setGodState('error'));
  }, [tab, godState]);

  // WEB-018: handoff-only — buttons copy the exact CLI command to the
  // clipboard. Nothing executes from the web (no god mode in the browser).
  const copyCmd = async (key: string, cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      // Clipboard unavailable (non-secure context) — the command text stays
      // visible so it can still be copied manually.
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Sessions</h1>
      <p className="text-xs text-white/40 mb-6">{total} total · transcripts open per session · CLI runs live in <code className="text-emerald-300">mcode history</code></p>
      <div role="tablist" aria-label="Session views" className="flex gap-2 mb-6">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => setTab('history')}
          className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${tab === 'history' ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          History
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'god'}
          onClick={() => setTab('god')}
          className={`text-sm px-4 py-1.5 rounded-lg border transition-colors ${tab === 'god' ? 'bg-white/10 border-white/20 text-white' : 'border-white/10 text-white/50 hover:text-white hover:bg-white/5'}`}
        >
          God runs
        </button>
      </div>
      {tab === 'history' ? (
        state === 'loading' ? <Skeleton /> : state === 'error' ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-sm text-red-300 mb-3">Could not reach the backend.</p>
            <button type="button" onClick={() => window.location.reload()} className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Retry</button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40 border border-dashed border-white/10 rounded-xl p-6 text-center">
            No sessions yet — start one from <Link href="/ai/chat" className="text-emerald-300 hover:underline">AI chat</Link>.
          </p>
        ) : (
          <ErrorBoundary label="Sessions list">
            <ul className="space-y-2">
              {items.map((s) => (
                <li key={s._id}>
                  <Link href={`/sessions/${s._id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3 transition-colors">
                    <span className={`w-2 h-2 rounded-full ${s.status === 'completed' ? 'bg-emerald-400' : s.status === 'failed' ? 'bg-red-400' : 'bg-amber-300'}`} />
                    <span className="font-medium text-sm truncate flex-1">{s.projectName || 'Untitled session'}</span>
                    <span className="text-xs text-white/40">{s.mode || ''}</span>
                    <span className="text-xs text-white/30" suppressHydrationWarning>{s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </ErrorBoundary>
        )
      ) : (
        <ErrorBoundary label="God runs list">
          {/* WEB-018: handoff banner — the web surfaces checkpoints and hands
              off to the CLI; it never runs god mode itself. */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-4 text-xs text-white/50 leading-relaxed">
            Local-desktop bridge: checkpoints from the CLI&apos;s <code className="font-mono text-white/70">~/.mcode/sessions/*/state.json</code>.
            The web never executes runs — copy a command and run it in your terminal.
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="font-mono text-emerald-300 bg-black/40 px-2 py-1 rounded">mcode god --dry-run</code>
              <button
                type="button"
                onClick={() => copyCmd('dry-run', 'mcode god --dry-run')}
                className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 transition-colors"
                title="Copy the dry-run command"
              >
                {copied === 'dry-run' ? 'Copied' : 'Copy'}
              </button>
              <span className="text-white/40">preview a plan without executing it.</span>
            </div>
          </div>
          {godState === 'loading' || godState === 'idle' ? <Skeleton /> : godState === 'error' ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
              <p className="text-sm text-red-300 mb-3">Could not load god-run checkpoints.</p>
              <button type="button" onClick={() => setGodState('idle')} className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Retry</button>
            </div>
          ) : godRuns.length === 0 ? (
            <p className="text-sm text-white/40 border border-dashed border-white/10 rounded-xl p-6 text-center">
              No god-run checkpoints on this machine yet — run <code className="text-emerald-300">mcode god &quot;…&quot;</code> in the CLI.
            </p>
          ) : (
            <ul className="space-y-2">
              {godRuns.map((g) => {
                const resumeCmd = `mcode god --resume ${g.projectId}`;
                const key = `resume-${g.projectId}`;
                return (
                  <li key={g.projectId} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.status === 'done' || g.status === 'complete' ? 'bg-emerald-400' : g.status === 'failed' ? 'bg-red-400' : 'bg-amber-300'}`} />
                      <span className="font-medium text-sm truncate flex-1" title={g.prompt || g.projectId}>
                        {g.prompt ? (g.prompt.length > 80 ? `${g.prompt.slice(0, 80)}…` : g.prompt) : g.projectId}
                      </span>
                      <span className="text-xs text-white/40 whitespace-nowrap">{g.done ?? 0}/{g.total ?? 0} done</span>
                      {g.spendUsd != null && (
                        <span className="text-xs text-white/60 whitespace-nowrap" title="Checkpoint spend">${Number(g.spendUsd).toFixed(2)}</span>
                      )}
                      <span className="text-xs text-white/30 whitespace-nowrap" suppressHydrationWarning>
                        {g.updatedAt ? new Date(g.updatedAt).toISOString().slice(0, 10) : ''}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="font-mono text-xs text-emerald-300 bg-black/40 px-2 py-1 rounded">{resumeCmd}</code>
                      <button
                        type="button"
                        onClick={() => copyCmd(key, resumeCmd)}
                        className="text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 transition-colors"
                        title="Copy the exact resume command — run it in your terminal"
                      >
                        {copied === key ? 'Copied' : 'Copy resume command'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ErrorBoundary>
      )}
    </div>
  );
}

export default SessionsPage;
