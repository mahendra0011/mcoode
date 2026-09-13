import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export interface ReadingState {
  active: boolean;
  filesRead: number;
  totalFiles: number;
  readers: number;
  currentAreas: string[];
}

export function CodebaseReadingCard({ state }: { state: ReadingState | null }) {
  if (!state?.active) return null;
  const pct = state.totalFiles > 0 ? Math.round((state.filesRead / state.totalFiles) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full mb-4 bg-[#151515] border border-white/10 rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-white/90">Reading codebase — {state.readers} parallel readers</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
        <motion.div
          className="h-full bg-cyan-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>{state.filesRead}/{state.totalFiles} files</span>
        <span className="truncate max-w-[60%]">{state.currentAreas?.slice(0, 3).join(', ')}</span>
      </div>
    </motion.div>
  );
}
