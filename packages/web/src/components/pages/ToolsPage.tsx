"use client";
import React, { useEffect, useState } from 'react';
import { reportError } from '../../lib/logger';
import api from '../../lib/axios';
import { getSocket } from '../../hooks/useChatSocket';

type Tab = 'search' | 'ports' | 'watch' | 'enhance' | 'coverage';

function WebSearchTab() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setState('loading');
    try {
      const r = await api.post('/api/v1/search', { query: q }, { timeout: 30000 });
      setResults(r.data.results || r.data.items || []);
      setState('ready');
    } catch {
      setState('error');
    }
  };
  return (
    <div>
      <form onSubmit={run} className="flex gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the web…"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50" />
        <button type="submit" disabled={state === 'loading'}
          className="px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-sm font-medium disabled:opacity-50">
          {state === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>
      {state === 'error' && <p className="text-sm text-red-300">Search failed — is the backend running?</p>}
      {state === 'ready' && results.length === 0 && <p className="text-sm text-white/40">No results.</p>}
      <ul className="space-y-2">
        {results.map((r: any, i: number) => {
          const rawUrl = r.url || r.link || '';
          const safeUrl = (typeof rawUrl === 'string' && (/^https?:\/\//i.test(rawUrl))) ? rawUrl : '#';
          return (
            <li key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <a href={safeUrl} target="_blank" rel="noreferrer" className="text-sm text-sky-300 hover:underline">{r.title || r.url}</a>
              {(r.snippet || r.description) && <p className="text-xs text-white/50 mt-1">{r.snippet || r.description}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PortsTab() {
  const [ports, setPorts] = useState<number[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  // BUG-19-08: track liveness so late socket replies/timeouts never touch
  // an unmounted tab, and always detach listeners + timer on cleanup.
  const aliveRef = React.useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);
  const refresh = () => {
    setState('loading');
    let timer: any;
    let handler: any;
    const detach = () => {
      try {
        const socket = getSocket();
        if (handler) {
          socket?.off('ports:list-result', handler as any);
          socket?.off('ports:list', handler as any);
        }
      } catch { /* socket gone */ }
      if (timer) clearTimeout(timer);
    };
    try {
      const socket = getSocket();
      handler = (list: any) => {
        detach();
        if (!aliveRef.current) return;
        setPorts(Array.isArray(list) ? list : list?.ports || []);
        setState('ready');
      };
      socket?.on('ports:list-result' as any, handler as any);
      socket?.on('ports:list' as any, handler as any);
      socket?.emit('ports:list');
      timer = setTimeout(() => {
        detach();
        if (!aliveRef.current) return;
        setState((s) => (s === 'loading' ? 'error' : s));
      }, 8000);
    } catch {
      if (aliveRef.current) setState('error');
    }
    return detach;
  };
  useEffect(() => {
    const detach = refresh();
    return () => { try { detach?.(); } catch { /* already detached */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <button type="button" onClick={refresh}
        className="mb-4 px-3 py-1.5 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white/70">
        Refresh ports
      </button>
      {state === 'loading' ? (
        <div className="animate-pulse space-y-2" aria-label="Loading ports">{[0, 1].map((i) => <div key={i} className="h-10 rounded-lg bg-white/5" />)}</div>
      ) : state === 'error' ? (
        <p className="text-sm text-red-300">Could not list ports — check the socket connection.</p>
      ) : ports.length === 0 ? (
        <p className="text-sm text-white/40">No listening ports reported.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {ports.map((p) => (
            <a key={p} href={`http://localhost:${p}`} target="_blank" rel="noreferrer"
              className="font-mono text-sm px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300">
              :{p} ↗
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-white/30">Click a port to open its preview in a new tab.</p>
    </div>
  );
}

function WatchTab() {
  const [projectId, setProjectId] = useState('default');
  const [status, setStatus] = useState<any>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const load = async () => {
    setState('loading');
    try {
      const r = await api.get(`/api/v1/watch/${encodeURIComponent(projectId)}/status`, { timeout: 8000 });
      setStatus(r.data);
      setState('ready');
    } catch {
      setState('error');
    }
  };
  const act = async (op: 'start' | 'stop') => {
    try {
      const r = await api.post(`/api/v1/watch/${encodeURIComponent(projectId)}/${op}`);
      setStatus(r.data);
      setState('ready');
    } catch (e) { reportError('localStorage draft', e, { userVisible: false }); }
  };
  useEffect(() => { load(); }, []);
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="project id"
          className="flex-1 max-w-xs rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50" />
        <button type="button" onClick={load} className="px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 text-white/70">Status</button>
        <button type="button" onClick={() => act('start')} className="px-3 py-2 rounded-lg text-sm bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300">Start</button>
        <button type="button" onClick={() => act('stop')} className="px-3 py-2 rounded-lg text-sm bg-red-500/10 hover:bg-red-500/20 text-red-300">Stop</button>
      </div>
      {state === 'loading' ? (
        <div className="animate-pulse h-16 rounded-xl bg-white/5" aria-label="Loading watch status" />
      ) : state === 'error' ? (
        <p className="text-sm text-red-300">Watch API unreachable.</p>
      ) : status ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
          <p><span className="text-white/40">status:</span> <span className={status.status === 'running' ? 'text-emerald-300' : 'text-white/70'}>{status.status}</span></p>
          <p className="text-white/40 text-xs mt-1">scans {status.scansRun ?? 0} · fixes {status.fixesApplied ?? 0}</p>
        </div>
      ) : (
        <p className="text-sm text-white/40">No status yet.</p>
      )}
    </div>
  );
}

function EnhanceTab() {
  const [prompt, setPrompt] = useState('');
  const [out, setOut] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [library, setLibrary] = useState<{ name: string; text: string; _id?: string }[]>([]);
  const [libReady, setLibReady] = useState(false);
  useEffect(() => {
    // Backend library first (shared across devices); localStorage fallback.
    api.get('/api/v1/prompt/library', { timeout: 8000 })
      .then((r) => {
        setLibrary(Array.isArray(r.data.items) ? r.data.items.map((x: any) => ({ name: x.name, text: x.text, _id: x._id })) : []);
        setLibReady(true);
      })
      .catch(() => {
        try {
          setLibrary(JSON.parse(localStorage.getItem('mcode_prompt_library') || '[]'));
        } catch {
          setLibrary([]);
        }
        setLibReady(true);
      });
  }, []);
  const saveLibLocal = (next: { name: string; text: string; _id?: string }[]) => {
    setLibrary(next);
    try {
      localStorage.setItem('mcode_prompt_library', JSON.stringify(next));
    } catch (e) { reportError('localStorage draft', e, { userVisible: false }); }
  };
  const saveToLibrary = async (name: string, text: string) => {
    try {
      const r = await api.post('/api/v1/prompt/library', { name, text }, { timeout: 8000 });
      if (r.data?.item) {
        saveLibLocal([...library, { name, text, _id: r.data.item._id }]);
        return;
      }
    } catch (e) { reportError('localStorage draft', e, { userVisible: false }); }
    saveLibLocal([...library, { name, text }]);
  };
  const deleteFromLibrary = async (i: number) => {
    const item = library[i];
    if (item?._id) {
      try {
        await api.delete(`/api/v1/prompt/library/${item._id}`, { timeout: 8000 });
      } catch (e) { reportError('localStorage draft', e, { userVisible: false }); }
    }
    saveLibLocal(library.filter((_, j) => j !== i));
  };
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;
    setState('loading');
    try {
      const r = await api.post('/api/v1/prompt/enhance', { prompt }, { timeout: 60000 });
      setOut(r.data.enhanced || r.data.prompt || JSON.stringify(r.data));
      setState('ready');
    } catch {
      setState('error');
    }
  };
  return (
    <div>
      <form onSubmit={run} className="space-y-2 mb-4">
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
          placeholder="Rough prompt — typo-fix + clarify, then copy into god mode…"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50" />
        <button type="submit" disabled={state === 'loading'}
          className="px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-sm font-medium disabled:opacity-50">
          {state === 'loading' ? 'Enhancing…' : 'Enhance'}
        </button>
      </form>
      {state === 'error' && <p className="text-sm text-red-300">Enhance failed — check keys and backend.</p>}
      {state === 'ready' && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm whitespace-pre-wrap">{out}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(out)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">
              Copy enhanced prompt
            </button>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt('Save to prompt library as…', prompt.slice(0, 40) || 'Untitled');
                if (name) saveToLibrary(name, out);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">
              Save to library
            </button>
          </div>
        </div>
      )}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-white/60 mb-2">Prompt library ({libReady ? library.length : '…'}{libReady && library.some((x) => x._id) ? ' · synced' : libReady ? ' · local' : ''})</h3>
        {library.length === 0 ? (
          <p className="text-xs text-white/30">Nothing saved — enhance a prompt, then save it here for reuse.</p>
        ) : (
          <ul className="space-y-2">
            {library.map((item, i) => (
              <li key={`${item.name}-${i}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-white/40 truncate mt-0.5">{item.text}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => { setPrompt(item.text); setOut(''); setState('idle'); window.scrollTo({ top: 0 }); }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">Load</button>
                  <button type="button" onClick={() => navigator.clipboard.writeText(item.text)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">Copy</button>
                  <button type="button" onClick={() => deleteFromLibrary(i)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'search', label: 'Web search' },
  { id: 'ports', label: 'Ports' },
  { id: 'watch', label: 'Watch' },
  { id: 'enhance', label: 'Prompt enhance' },
  { id: 'coverage', label: 'Coverage' },
];

function CoverageTab() {
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready' | 'missing'>('loading');
  useEffect(() => {
    api.get('/api/v1/usage/coverage', { timeout: 8000 })
      .then((r) => { setData(r.data); setState('ready'); })
      .catch((e) => setState(e?.response?.status === 404 ? 'missing' : 'error'));
  }, []);
  const pct = (x: any) => (x && typeof x.pct === 'number' ? `${x.pct}%` : '—');
  return (
    <div>
      {state === 'loading' && <div className="animate-pulse h-24 rounded-xl bg-white/5" aria-label="Loading coverage" />}
      {state === 'missing' && (
        <p className="text-sm text-white/40">No coverage artifact yet — run <code className="text-emerald-300">npm run coverage</code> at the repo root, then refresh.</p>
      )}
      {state === 'error' && <p className="text-sm text-red-300">Coverage API unreachable.</p>}
      {state === 'ready' && data?.total && (
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(data.total).map(([k, v]: [string, any]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs text-white/40 capitalize">{k}</p>
              <p className="text-lg font-bold">{pct(v)}</p>
              <div className="mt-1 h-1.5 rounded bg-white/5 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded" style={{ width: `${typeof v?.pct === 'number' ? v.pct : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>('search');
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Tools</h1>
      <div className="flex gap-1 mb-6 bg-white/5 rounded-lg p-1 w-fit" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium ${tab === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'search' && <WebSearchTab />}
      {tab === 'ports' && <PortsTab />}
      {tab === 'watch' && <WatchTab />}
      {tab === 'enhance' && <EnhanceTab />}
      {tab === 'coverage' && <CoverageTab />}
    </div>
  );
}

export default ToolsPage;
