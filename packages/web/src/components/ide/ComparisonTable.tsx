import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export interface ComparisonRow {
  id: string;
  text: string;
  state: 'done' | 'incomplete' | 'checking';
}

export function ComparisonTable({
  rows,
  pass,
  maxPasses,
  title = 'Verification',
}: {
  rows: ComparisonRow[];
  pass: number;
  maxPasses: number;
  title?: string;
}) {
  if (!rows || !rows.length) return null;
  const doneCount = rows.filter((r) => r.state === 'done').length;
  const allDone = doneCount === rows.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/80">{title} — pass {pass}/{maxPasses}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${allDone ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {doneCount}/{rows.length}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        <AnimatePresence>
          {rows.map((r) => (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between px-3 py-1.5 text-xs"
            >
              <span className="text-white/70 truncate max-w-[80%]">{r.text}</span>
              {r.state === 'done' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
              {r.state === 'incomplete' && <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
              {r.state === 'checking' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {allDone && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-3 py-2 bg-emerald-500/5 border-t border-emerald-500/10 text-[11px] text-emerald-400"
        >
          ✓ 100% — all {rows.length} requirements met
        </motion.div>
      )}
    </motion.div>
  );
}
