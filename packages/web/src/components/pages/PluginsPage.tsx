"use client";
import React, { useEffect, useState } from 'react';
import api from '../../lib/axios';

interface Plugin {
  name: string;
  category?: string;
  desc?: string;
  description?: string;
}

export function PluginsPage() {
  const [items, setItems] = useState<Plugin[]>([]);
  const [filter, setFilter] = useState('');
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/v1/plugins', { timeout: 10000 })
      .then((r) => { setItems(Array.isArray(r.data) ? r.data : r.data.plugins || []); setState('ready'); })
      .catch(() => setState('error'));
  }, []);

  const copy = async (name: string) => {
    try {
      await navigator.clipboard.writeText(`mcode add ${name}`);
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  };

  const shown = items.filter((p) => !filter || `${p.name} ${p.category || ''}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Plugins</h1>
      <p className="text-xs text-white/40 mb-4">Registry — install with <code className="text-emerald-300">mcode add &lt;name&gt;</code></p>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter plugins…"
        className="mb-4 w-full max-w-sm rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
      />
      {state === 'loading' ? (
        <div className="animate-pulse grid gap-3 md:grid-cols-2" aria-label="Loading plugins">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-white/5" />)}
        </div>
      ) : state === 'error' ? (
        <p className="text-sm text-red-300">Plugin registry unreachable — is the backend running?</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-white/40">No plugins match.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {shown.map((p) => (
            <div key={p.name} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-emerald-300">{p.name}</span>
                {p.category && <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 text-white/50">{p.category}</span>}
              </div>
              {(p.desc || p.description) && <p className="mt-1 text-xs text-white/50">{p.desc || p.description}</p>}
              <button
                type="button"
                onClick={() => copy(p.name)}
                className="mt-3 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
              >
                {copied === p.name ? 'Copied ✓' : `Copy: mcode add ${p.name}`}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PluginsPage;
