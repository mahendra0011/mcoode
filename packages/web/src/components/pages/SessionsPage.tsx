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
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-white border border-slate-200/80 shadow-xs" />
      ))}
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
    <div className="min-h-screen bg-slate-50 text-neutral-900 py-10 px-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1">Sessions</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {total} total · transcripts open per session · CLI runs live in{' '}
        <code className="text-emerald-800 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
          mcode history
        </code>
      </p>
      
      <div role="tablist" aria-label="Session views" className="flex gap-2 mb-6">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => setTab('history')}
          className={`text-sm font-medium px-4 py-2 rounded-xl border transition-all cursor-pointer ${
            tab === 'history'
              ? 'bg-white border-slate-300 text-neutral-900 font-bold shadow-xs'
              : 'border-slate-200 text-neutral-500 hover:text-neutral-900 hover:bg-white/60'
          }`}
        >
          History
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'god'}
          onClick={() => setTab('god')}
          className={`text-sm font-medium px-4 py-2 rounded-xl border transition-all cursor-pointer ${
            tab === 'god'
              ? 'bg-white border-slate-300 text-neutral-900 font-bold shadow-xs'
              : 'border-slate-200 text-neutral-500 hover:text-neutral-900 hover:bg-white/60'
          }`}
        >
          God runs
        </button>
      </div>

      {tab === 'history' ? (
        state === 'loading' ? <Skeleton /> : state === 'error' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-800 mb-3">Could not reach the backend on port 3100.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm px-4 py-2 rounded-xl bg-white text-neutral-800 border border-slate-200 hover:bg-slate-50 transition cursor-pointer font-medium shadow-xs"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-neutral-500 border border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center shadow-xs">
            No sessions yet — start one from{' '}
            <Link href="/ai/chat" className="text-emerald-700 font-semibold hover:underline">
              AI chat
            </Link>.
          </div>
        ) : (
          <ErrorBoundary label="Sessions list">
            <ul className="space-y-2.5">
              {items.map((s) => (
                <li key={s._id}>
                  <Link
                    href={`/sessions/${s._id}`}
                    className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs px-5 py-4 transition-all group"
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        s.status === 'completed'
                          ? 'bg-emerald-500 ring-4 ring-emerald-100'
                          : s.status === 'failed'
                          ? 'bg-red-500 ring-4 ring-red-100'
                          : 'bg-amber-400 ring-4 ring-amber-100'
                      }`}
                    />
                    <span className="font-bold text-sm text-neutral-900 truncate flex-1 group-hover:text-emerald-700 transition">
                      {s.projectName || 'Untitled session'}
                    </span>
                    {s.mode && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-neutral-600 border border-slate-200">
                        {s.mode}
                      </span>
                    )}
                    <span className="text-xs text-neutral-400" suppressHydrationWarning>
                      {s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : ''}
                    </span>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 text-xs text-neutral-600 shadow-xs leading-relaxed">
            Local-desktop bridge: checkpoints from the CLI&apos;s{' '}
            <code className="font-mono text-neutral-800 bg-slate-100 px-1.5 py-0.5 rounded">
              ~/.mcode/sessions/*/state.json
            </code>.
            The web never executes runs — copy a command and run it in your terminal.
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="font-mono text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                mcode god --dry-run
              </code>
              <button
                type="button"
                onClick={() => copyCmd('dry-run', 'mcode god --dry-run')}
                className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-700 border border-slate-200 font-medium transition cursor-pointer shadow-xs"
                title="Copy the dry-run command"
              >
                {copied === 'dry-run' ? 'Copied ✓' : 'Copy'}
              </button>
              <span className="text-neutral-500">preview a plan without executing it.</span>
            </div>
          </div>
          {godState === 'loading' || godState === 'idle' ? <Skeleton /> : godState === 'error' ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-800 mb-3">Could not load god-run checkpoints.</p>
              <button
                type="button"
                onClick={() => setGodState('idle')}
                className="text-sm px-4 py-2 rounded-xl bg-white text-neutral-800 border border-slate-200 hover:bg-slate-50 transition cursor-pointer font-medium shadow-xs"
              >
                Retry
              </button>
            </div>
          ) : godRuns.length === 0 ? (
            <div className="text-sm text-neutral-500 border border-dashed border-slate-300 bg-white rounded-2xl p-8 text-center shadow-xs">
              No god-run checkpoints on this machine yet — run{' '}
              <code className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                mcode god &quot;…&quot;
              </code>{' '}
              in the CLI.
            </div>
          ) : (
            <ul className="space-y-3">
              {godRuns.map((g) => {
                const resumeCmd = `mcode god --resume ${g.projectId}`;
                const key = `resume-${g.projectId}`;
                return (
                  <li key={g.projectId} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          g.status === 'done' || g.status === 'complete'
                            ? 'bg-emerald-500 ring-4 ring-emerald-100'
                            : g.status === 'failed'
                            ? 'bg-red-500 ring-4 ring-red-100'
                            : 'bg-amber-400 ring-4 ring-amber-100'
                        }`}
                      />
                      <span className="font-bold text-sm text-neutral-900 truncate flex-1" title={g.prompt || g.projectId}>
                        {g.prompt ? (g.prompt.length > 80 ? `${g.prompt.slice(0, 80)}…` : g.prompt) : g.projectId}
                      </span>
                      <span className="text-xs text-neutral-500 whitespace-nowrap">{g.done ?? 0}/{g.total ?? 0} done</span>
                      {g.spendUsd != null && (
                        <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap" title="Checkpoint spend">
                          ${Number(g.spendUsd).toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-neutral-400 whitespace-nowrap" suppressHydrationWarning>
                        {g.updatedAt ? new Date(g.updatedAt).toISOString().slice(0, 10) : ''}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="font-mono text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                        {resumeCmd}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyCmd(key, resumeCmd)}
                        className="text-xs px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-700 border border-slate-200 font-medium transition cursor-pointer shadow-xs"
                        title="Copy the exact resume command — run it in your terminal"
                      >
                        {copied === key ? 'Copied ✓' : 'Copy resume command'}
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
