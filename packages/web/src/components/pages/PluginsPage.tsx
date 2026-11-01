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
    <div className="min-h-screen bg-slate-50 text-neutral-900 py-10 px-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1">Plugin Registry</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Extend your environment with official plugins — install with{' '}
        <code className="text-emerald-800 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
          mcode add &lt;name&gt;
        </code>
      </p>
      
      <div className="relative mb-6 max-w-sm">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter plugins by name or category..."
          className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 shadow-xs transition"
        />
      </div>

      {state === 'loading' ? (
        <div className="animate-pulse grid gap-4 md:grid-cols-2" aria-label="Loading plugins">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200/80 shadow-xs" />
          ))}
        </div>
      ) : state === 'error' ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800">
          Plugin registry unreachable — is the backend running on port 3100?
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-neutral-500">
          No plugins match your filter.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((p) => (
            <div key={p.name} className="rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs p-5 transition-all">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-bold text-emerald-800">{p.name}</span>
                {p.category && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-neutral-600 border border-slate-200">
                    {p.category}
                  </span>
                )}
              </div>
              {(p.desc || p.description) && (
                <p className="mt-2 text-xs text-neutral-500 leading-relaxed">{p.desc || p.description}</p>
              )}
              <button
                type="button"
                onClick={() => copy(p.name)}
                className={`mt-4 text-xs px-3.5 py-2 rounded-xl transition cursor-pointer font-medium shadow-xs flex items-center gap-1.5 ${
                  copied === p.name
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-neutral-700 border border-slate-200'
                }`}
              >
                {copied === p.name ? 'Copied to clipboard ✓' : `Copy: mcode add ${p.name}`}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PluginsPage;
