import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export interface PairSuggestion {
  id?: string;
  message: string;
  preview: string;
  diff?: string;
  file?: string;
  replacement?: string;
  line?: number;
  range?: any;
}

export interface PairSuggestionToastProps {
  suggestion: PairSuggestion | null;
  onAccept: () => void;
  onDismiss: () => void;
}

export function PairSuggestionToast({
  suggestion,
  onAccept,
  onDismiss,
}: PairSuggestionToastProps) {
  if (!suggestion) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-16 right-4 w-72 bg-[#151515] border border-purple-500/20 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-md"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-purple-400 font-semibold text-[10px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Pair Mode Suggestion
          </div>
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white/70 p-0.5 rounded transition-colors"
            title="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <div className="text-[11px] text-white/80 mb-2 leading-snug font-normal">
          {suggestion.message}
        </div>

        <div className="bg-black/40 border border-white/5 rounded-lg p-2 text-[10px] font-mono text-purple-200/70 mb-2.5 max-h-24 overflow-auto custom-scrollbar whitespace-pre">
          {suggestion.preview}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAccept}
            className="flex-1 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-400 text-[10px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Apply
          </button>
          <button
            onClick={onDismiss}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-[10px] transition-all"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PairSuggestionToast;
