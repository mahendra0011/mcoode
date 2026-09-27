"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/axios';

interface Session {
  _id: string;
  projectName?: string;
  mode?: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-label="Loading sessions">
      {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-white/5" />)}
    </div>
  );
}

export function SessionsPage() {
  const [items, setItems] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    api.get('/api/v1/sessions', { timeout: 10000 })
      .then((r) => { setItems(r.data.items || []); setTotal(r.data.total || 0); setState('ready'); })
      .catch(() => setState('error'));
  }, []);

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Sessions</h1>
      <p className="text-xs text-white/40 mb-6">{total} total · transcripts open per session · CLI runs live in <code className="text-emerald-300">mcode history</code></p>
      {state === 'loading' ? <Skeleton /> : state === 'error' ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-300 mb-3">Could not reach the backend.</p>
          <button type="button" onClick={() => window.location.reload()} className="text-sm px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-white/40 border border-dashed border-white/10 rounded-xl p-6 text-center">
          No sessions yet — start one from <Link href="/ai/chat" className="text-emerald-300 hover:underline">AI chat</Link>.
        </p>
      ) : (
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
      )}
    </div>
  );
}

export default SessionsPage;
