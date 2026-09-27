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
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-3xl mx-auto">
      <Link href="/sessions" className="text-xs text-emerald-300 hover:underline">← All sessions</Link>
      {state === 'loading' ? (
        <div className="animate-pulse mt-4 space-y-3" aria-label="Loading transcript">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-white/5" />)}
        </div>
      ) : state === 'error' || !data ? (
        <p className="mt-4 text-sm text-red-300">Session not found or backend unreachable.</p>
      ) : (
        <div className="mt-3">
          <h1 className="text-xl font-bold">{data.projectName || 'Untitled session'}</h1>
          <p className="text-xs text-white/40 mb-4">{data.mode || ''} · {data.status || ''}</p>
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
            className="mb-6 text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70"
          >
            Replay in chat (copies prompts)
          </button>
          {((data.transcripts && data.transcripts.length > 0) || (data.messages && data.messages.length > 0)) ? (
            <div className="space-y-4">
              {(data.transcripts || data.messages || []).map((t: any, i: number) => (
                <div key={t._id || `msg-${i}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-[11px] uppercase tracking-wide text-white/30 mb-2">{t.role || 'message'}</p>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{String(t.content || '')}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/40">No transcript messages recorded for this session.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionDetailPage;
