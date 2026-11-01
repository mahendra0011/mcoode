"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import api from '../../lib/axios';

export function SessionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');

  useEffect(() => {
    if (!id) return;
    api.get(`/api/v1/sessions/${id}`, { timeout: 10000 })
      .then((r) => { setData(r.data); setState('ready'); })
      .catch(() => setState('error'));
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 py-10 px-6 max-w-3xl mx-auto">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 mb-6 transition shadow-xs"
      >
        ← All sessions
      </Link>
      {state === 'loading' ? (
        <div className="animate-pulse mt-4 space-y-3" aria-label="Loading transcript">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-white border border-slate-200/80 shadow-xs" />
          ))}
        </div>
      ) : state === 'error' || !data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-xs">
          Session not found or backend unreachable.
        </div>
      ) : (
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{data.projectName || 'Untitled session'}</h1>
          <p className="text-xs text-neutral-500 mb-5 mt-1">
            <span className="font-semibold text-neutral-700">{data.mode || 'session'}</span> · {data.status || 'unknown'}
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                const r = await api.get(`/api/v1/sessions/${id}/replay`, { timeout: 10000 });
                const prompts: string[] = r.data.prompts || [];
                if (!prompts.length) return;
                try {
                  await navigator.clipboard.writeText(prompts.join('\n\n---\n\n'));
                } catch {}
                window.location.href = '/ai/chat';
              } catch {}
            }}
            className="mb-8 text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-neutral-700 border border-slate-200 shadow-xs transition cursor-pointer"
          >
            Replay in chat (copies prompts)
          </button>
          {((data.transcripts && data.transcripts.length > 0) || (data.messages && data.messages.length > 0)) ? (
            <div className="space-y-4">
              {(data.transcripts || data.messages || []).map((t: any, i: number) => (
                <div key={t._id || `msg-${i}`} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">{t.role || 'message'}</p>
                  <div className="prose prose-slate prose-sm max-w-none text-neutral-800">
                    <ReactMarkdown>{String(t.content || '')}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-neutral-500 shadow-xs">
              No transcript messages recorded for this session.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionDetailPage;
