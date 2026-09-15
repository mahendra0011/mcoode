import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Scissors, Copy, Ghost, CheckCircle2, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

export interface CleanFinding {
  id: string;
  category: 'unused-export' | 'unused-dependency' | 'duplicate-logic' | 'bloat' | 'dead-alternate' | string;
  file: string;
  startLine?: number;
  endLine?: number;
  issue: string;
  currentLines?: number;
  estimatedCleanLines?: number;
  costsAI?: boolean;
}

export interface CleanupReportProps {
  findings: CleanFinding[];
  totalLinesRemovable?: number;
  onCleanSelected?: (selectedIds: string[]) => Promise<void> | void;
  onDismiss?: () => void;
  isCleaning?: boolean;
  cleanComplete?: boolean;
  netLinesRemoved?: number;
  statusMessage?: string;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  'unused-export': <Trash2 className="w-3.5 h-3.5 text-white/40 shrink-0" />,
  'unused-dependency': <Trash2 className="w-3.5 h-3.5 text-white/40 shrink-0" />,
  'duplicate-logic': <Copy className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
  'bloat': <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
  'dead-alternate': <Ghost className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
};

export const CleanupReport: React.FC<CleanupReportProps> = ({
  findings = [],
  totalLinesRemovable,
  onCleanSelected,
  onDismiss,
  isCleaning = false,
  cleanComplete = false,
  netLinesRemoved = 0,
  statusMessage = '',
}) => {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(findings.map((f) => f.id)));
  const [flashingId, setFlashingId] = useState<string | null>(null);

  const calculatedRemovable = totalLinesRemovable ?? findings.reduce((sum, f) => {
    return sum + Math.max(0, (f.currentLines || 1) - (f.estimatedCleanLines || 0));
  }, 0);

  const selectedLinesCount = findings
    .filter((f) => selected.has(f.id))
    .reduce((sum, f) => sum + Math.max(0, (f.currentLines || 1) - (f.estimatedCleanLines || 0)), 0);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Trigger 200ms amber highlight flash
        setFlashingId(id);
        setTimeout(() => setFlashingId(null), 250);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === findings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(findings.map((f) => f.id)));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="w-full mb-4 bg-[#111216]/95 backdrop-blur-xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl"
    >
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-xs font-semibold text-white/90">
              Clean Mode — {findings.length} findings
            </span>
            <div className="text-[10px] text-white/40">
              Dead code + AI bloat detection (Doc 55)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            ~{calculatedRemovable.toLocaleString()} lines removable
          </span>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-white/40 hover:text-white/80 transition p-1 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Success banner if cleaning completed */}
      {cleanComplete && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-emerald-500/10 border-b border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold">Clean Complete:</span> removed{' '}
            <strong className="text-white font-mono">{netLinesRemoved || selectedLinesCount}</strong> lines net,{' '}
            <span className="text-emerald-300 font-medium">0 behavior changes</span>
          </div>
        </motion.div>
      )}

      {/* In-progress status message */}
      {isCleaning && (
        <div className="p-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2.5 text-emerald-300 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
          <span>{statusMessage || 'snapshotting current behavior & cleaning selected items...'}</span>
        </div>
      )}

      {/* Findings list */}
      <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
        <AnimatePresence>
          {findings.map((f) => {
            const isChecked = selected.has(f.id);
            const isFlashing = flashingId === f.id;
            const linesDiff = Math.max(0, (f.currentLines || 1) - (f.estimatedCleanLines || 0));

            return (
              <motion.label
                key={f.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  isChecked ? 'bg-white/[0.03]' : 'opacity-60 hover:opacity-100 hover:bg-white/[0.01]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isCleaning}
                  onChange={() => toggleItem(f.id)}
                  className="mt-1 accent-amber-500 rounded cursor-pointer"
                />

                <div className="mt-0.5">{CATEGORY_ICON[f.category] || <Scissors className="w-3.5 h-3.5 text-white/40 shrink-0" />}</div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs text-white/90 font-medium leading-tight">
                    {f.issue}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5 flex items-center gap-2">
                    <span>
                      {f.file}
                      {f.startLine ? `:${f.startLine}${f.endLine ? `-${f.endLine}` : ''}` : ''}
                    </span>

                    {f.currentLines !== undefined && (
                      <span
                        className={`transition-all duration-200 px-1 py-0.2 rounded ${
                          isFlashing
                            ? 'bg-amber-400 text-black font-bold scale-110 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                            : 'text-amber-400/80'
                        }`}
                      >
                        · {f.currentLines} → ~{f.estimatedCleanLines ?? 0} lines (-{linesDiff})
                      </span>
                    )}

                    {f.costsAI && (
                      <span className="text-[9px] px-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        AI bloat
                      </span>
                    )}
                  </div>
                </div>
              </motion.label>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={selectAll}
          disabled={isCleaning}
          className="text-xs text-white/50 hover:text-white transition disabled:opacity-50"
        >
          {selected.size === findings.length ? 'Deselect All' : 'Select All'}
        </button>

        <motion.button
          whileHover={{ scale: isCleaning || selected.size === 0 ? 1 : 1.02 }}
          whileTap={{ scale: isCleaning || selected.size === 0 ? 1 : 0.98 }}
          disabled={selected.size === 0 || isCleaning}
          onClick={() => onCleanSelected?.([...selected])}
          className="px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {isCleaning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying & Cleaning...</span>
            </>
          ) : (
            <>
              <Scissors className="w-3.5 h-3.5" />
              <span>
                Clean {selected.size > 0 ? `${selected.size} selected (~${selectedLinesCount} lines)` : 'selected'}
              </span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
