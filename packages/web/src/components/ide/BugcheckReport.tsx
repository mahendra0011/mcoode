import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ChevronDown, Download, Bug } from 'lucide-react';
import type { DeepFinding, BugcheckTierStatus } from '../../store/chatSlice';

export type { DeepFinding, BugcheckTierStatus };

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  low: 'bg-white/5 text-white/50 border-white/10',
};

export function BugcheckReport({
  findings = [],
  reportUrl,
  running = false,
  tierStatus = [],
}: {
  findings?: DeepFinding[];
  reportUrl?: string;
  running?: boolean;
  tierStatus?: BugcheckTierStatus[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const crashRisk = (findings || []).filter((f) => f.canCrashServer);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
          <Bug className="w-3.5 h-3.5 text-red-400" /> Bug Check
        </span>
        {reportUrl && (
          <a
            href={reportUrl}
            download
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
          >
            <Download className="w-3 h-3" /> download .md report
          </a>
        )}
      </div>

      {/* Tier progress — mirrors WaveProgress's per-item row pattern */}
      <div className="px-3 py-2 border-b border-white/5 space-y-1">
        {(tierStatus || []).map((t) => (
          <div key={t.tier} className="flex items-center justify-between text-[11px]">
            <span className={t.done ? 'text-white/60' : 'text-white/30'}>
              Tier {t.tier} — {t.label} {t.costsAI && <span className="text-purple-400">(AI)</span>}
            </span>
            <span className="text-white/40">
              {t.done ? `${t.count} findings` : running ? '…' : 'pending'}
            </span>
          </div>
        ))}
      </div>

      {crashRisk.length > 0 && (
        <div className="px-3 py-2 bg-red-500/5 border-b border-red-500/10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {crashRisk.length} crash-risk finding
            {crashRisk.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
        <AnimatePresence initial={false}>
          {(findings || []).map((f, i) => (
            <motion.div key={i} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button
                type="button"
                onClick={() => toggle(i, expanded, setExpanded)}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-white/5 cursor-pointer transition-colors"
              >
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${
                    SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.low
                  }`}
                >
                  {f.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-white/80 truncate">
                    {f.flow ? `Flow: ${f.flow}` : `${f.file}${f.line ? `:${f.line}` : ''}`}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">{f.issue}</div>
                </div>
                <ChevronDown
                  className={`w-3 h-3 text-white/30 transition-transform flex-shrink-0 ${
                    expanded.has(i) ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expanded.has(i) && f.explanation && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-3 pb-2 text-[10px] text-white/50"
                >
                  {f.explanation}
                  {f.files && <div className="mt-1 text-white/30">files: {f.files.join(', ')}</div>}
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {(!findings || findings.length === 0) && !running && (
          <div className="px-3 py-4 text-center text-[11px] text-white/30">
            No deep logic or multi-file issues detected
          </div>
        )}
      </div>
    </motion.div>
  );
}

function toggle(i: number, set: Set<number>, setter: (s: Set<number>) => void) {
  const next = new Set(set);
  if (next.has(i)) {
    next.delete(i);
  } else {
    next.add(i);
  }
  setter(next);
}
