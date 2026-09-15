import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react';

export interface ReviewFinding { file: string; line: number; severity: string; category: string; comment: string; }

const CATEGORY_COLOR: Record<string, string> = {
  bug: 'text-red-400', security: 'text-orange-400', perf: 'text-amber-400',
  style: 'text-blue-400', maintainability: 'text-purple-400', praise: 'text-emerald-400',
};

export function ReviewFindingsCard({ findings }: { findings: ReviewFinding[] }) {
  const grouped = (findings || []).reduce<Record<string, ReviewFinding[]>>((acc, f) => {
    (acc[f.file] ??= []).push(f); return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 text-xs font-semibold text-white/90 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Review — {findings.length} comments
      </div>
      {Object.entries(grouped).map(([file, items]) => (
        <div key={file} className="border-b border-white/5 last:border-0">
          <div className="px-3 py-1.5 text-[10px] font-mono text-white/40 bg-black/20">{file}</div>
          {items.map((f, i) => (
            <div key={i} className="px-3 py-2 flex items-start gap-2 hover:bg-white/5">
              {f.category === 'praise' ? <Sparkles className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
                : <span className="text-[9px] text-white/30 font-mono mt-0.5 flex-shrink-0">L{f.line}</span>}
              <div className="flex-1 min-w-0">
                <span className={`text-[9px] uppercase font-bold mr-1.5 ${CATEGORY_COLOR[f.category] || 'text-white/60'}`}>{f.category}</span>
                <span className="text-[11px] text-white/70">{f.comment}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </motion.div>
  );
}
