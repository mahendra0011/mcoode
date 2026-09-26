"use client";
import React, { useEffect, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import api from '../../lib/axios';
import { useIDEStore } from '../../store/ideStore';
import { toast } from 'sonner';

interface Hunk {
  header: string;
  oldStart: number;
  oldCount: number;
  lines: string[];
}

function parseHunks(diff: string): Hunk[] {
  const hunks: Hunk[] = [];
  const re = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
  let m: RegExpExecArray | null;
  const headers: { hunk: Hunk; index: number }[] = [];
  while ((m = re.exec(diff)) !== null) {
    headers.push({
      hunk: { header: m[0], oldStart: Number(m[1]), oldCount: m[2] === undefined ? 1 : Number(m[2]), lines: [] },
      index: m.index + m[0].length,
    });
  }
  const lines = diff.split('\n');
  let hi = -1;
  for (const line of lines) {
    if (line.startsWith('@@')) {
      hi++;
      continue;
    }
    if (hi >= 0 && headers[hi] && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-') || line === '')) {
      headers[hi].hunk.lines.push(line);
    }
  }
  return headers.map((h) => h.hunk);
}

/** Apply selected hunks to `original` (line-based, like `git apply` for adds/removes). */
export function applyHunks(original: string, hunks: Hunk[], selected: boolean[]): string {
  const src = original.split('\n');
  const out: string[] = [];
  let cursor = 0; // 0-based index into src
  hunks.forEach((h, i) => {
    const start = Math.max(0, h.oldStart - 1);
    while (cursor < start && cursor < src.length) out.push(src[cursor++]);
    if (!selected[i]) {
      // Skip the hunk region, keep original lines it spans.
      let span = 0;
      for (const l of h.lines) {
        if (l.startsWith(' ') || l.startsWith('-')) span++;
      }
      const end = Math.min(src.length, start + span);
      while (cursor < end) out.push(src[cursor++]);
      return;
    }
    for (const l of h.lines) {
      if (l.startsWith(' ')) {
        out.push(src[cursor++] ?? l.slice(1));
      } else if (l.startsWith('-')) {
        cursor++;
      } else if (l.startsWith('+')) {
        out.push(l.slice(1));
      }
    }
  });
  while (cursor < src.length) out.push(src[cursor++]);
  return out.join('\n');
}

/** File-vs-file compare viewer. Opened from the explorer
 *  ("Select for Compare" → "Compare with Selected") via diffPair state.
 *  Keep-left writes the original over the modified path (undoable via
 *  the file timeline); keep-right just closes. */
export function DiffReviewModal({ workspaceId }: { workspaceId: string }) {
  const diffPair = useIDEStore((s) => s.diffPair);
  const setDiffPair = useIDEStore((s) => s.setDiffPair);
  const [original, setOriginal] = useState<string | null>(null);
  const [modified, setModified] = useState<string | null>(null);
  const [hunks, setHunks] = useState<Hunk[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [showHunks, setShowHunks] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!diffPair || !workspaceId) return;
    setOriginal(null);
    setModified(null);
    setError('');
    (async () => {
      try {
        const [o, m] = await Promise.all([
          api.get(`/api/v1/workspaces/${workspaceId}/file`, { params: { path: diffPair.original } }),
          api.get(`/api/v1/workspaces/${workspaceId}/file`, { params: { path: diffPair.modified } }),
        ]);
        setOriginal(String(o.data?.content ?? ''));
        setModified(String(m.data?.content ?? ''));
        // Git hunks for per-hunk accept (same-file compares in git repos).
        try {
          const d = await api.get(`/api/v1/workspaces/${workspaceId}/diff`, { params: { path: diffPair.modified } });
          const parsed = parseHunks(String(d.data?.diff || ''));
          setHunks(parsed);
          setSelected(parsed.map(() => true));
        } catch {
          setHunks([]);
          setSelected([]);
        }
      } catch {
        setError('Could not load both files for comparison.');
      }
    })();
  }, [diffPair, workspaceId]);

  if (!diffPair) return null;

  const keepLeft = async () => {
    setSaving(true);
    try {
      await api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(diffPair.modified)}`, { content: original ?? '' });
      toast.success(`Kept ${diffPair.original} → overwrote ${diffPair.modified}`);
      setDiffPair(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const applySelected = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/api/v1/workspaces/${workspaceId}/hunks`, {
        path: diffPair.modified,
        hunks: hunks.map((h) => ({ oldStart: h.oldStart, lines: h.lines })),
        selected,
      });
      void data;
      toast.success(`Applied ${selected.filter(Boolean).length}/${hunks.length} hunks to ${diffPair.modified}`);
      setDiffPair(null);
    } catch (err: unknown) {
      // Fallback: client-side apply (e.g. non-git workspace without diff).
      try {
        if (original === null) throw new Error('original not loaded');
        const next = applyHunks(original, hunks, selected);
        await api.put(`/api/v1/workspaces/${workspaceId}/file?path=${encodeURIComponent(diffPair.modified)}`, { content: next });
        toast.success(`Applied ${selected.filter(Boolean).length}/${hunks.length} hunks to ${diffPair.modified}`);
        setDiffPair(null);
      } catch (e2: unknown) {
        const msg = (e2 as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'apply failed';
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#1e1e1e]/95 backdrop-blur-sm" role="dialog" aria-label="Compare files">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 text-xs">
        <span className="font-mono text-white/70 truncate">← {diffPair.original}</span>
        <span className="text-white/30">vs</span>
        <span className="font-mono text-white/70 truncate">{diffPair.modified} →</span>
        <div className="flex-1" />
        {hunks.length > 0 && (
          <button type="button" onClick={() => setShowHunks((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">
            {showHunks ? 'Hide hunks' : `Hunks (${hunks.length})`}
          </button>
        )}
        <button type="button" onClick={keepLeft} disabled={saving || original === null}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 disabled:opacity-50">
          {saving ? 'Saving…' : 'Keep left'}
        </button>
        <button type="button" onClick={() => setDiffPair(null)}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70">
          Keep right / close
        </button>
      </div>
      {showHunks && hunks.length > 0 && (
        <div className="border-b border-white/10 max-h-48 overflow-y-auto p-2 space-y-1">
          {hunks.map((h, i) => {
            const adds = h.lines.filter((l) => l.startsWith('+')).length;
            const dels = h.lines.filter((l) => l.startsWith('-')).length;
            return (
              <label key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 text-xs cursor-pointer hover:bg-white/[0.06]">
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={() => setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                  className="accent-emerald-500"
                />
                <code className="font-mono text-white/50">{h.header}</code>
                <span className="text-emerald-300">+{adds}</span>
                <span className="text-red-300">-{dels}</span>
              </label>
            );
          })}
          <button type="button" onClick={applySelected} disabled={saving || !selected.some(Boolean)}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-medium disabled:opacity-50">
            {saving ? 'Applying…' : `Apply selected (${selected.filter(Boolean).length}/${hunks.length})`}
          </button>
        </div>
      )}
      {error ? (
        <p className="p-6 text-sm text-red-300">{error}</p>
      ) : original === null ? (
        <div className="animate-pulse flex-1 m-4 rounded-xl bg-white/5" aria-label="Loading comparison" />
      ) : (
        <DiffEditor
          height="100%"
          language="typescript"
          original={original}
          modified={modified ?? ''}
          theme="vs-dark"
          options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false } }}
        />
      )}
    </div>
  );
}

export default DiffReviewModal;
