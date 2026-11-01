import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CircleDashed, BrainCircuit } from 'lucide-react';

export interface ThoughtBlockProps {
  content?: string | null;
  done?: boolean;
  startedAt?: number;
}

/**
 * ThoughtBlock — matches the reference mcode pattern:
 * while active: "Thinking..." with a brain-circuit icon (present tense,
 * no duration shown here — the overall turn duration lives in
 * WorkingHeader above).
 * once done: collapses to "Thought for Xs" (past tense, with the real
 * elapsed duration), expandable to show reasoning text if present.
 */
export function ThoughtBlock({ content, done = false, startedAt }: ThoughtBlockProps) {
  const [open, setOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(startedAt ?? Date.now());

  useEffect(() => {
    if (startedAt !== undefined) start.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 250);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    if (done) setElapsedMs((prev) => (prev > 0 ? prev : Date.now() - start.current));
  }, [done]);

  const seconds = Math.max(0, Math.round(elapsedMs / 1000));
  const durationLabel = seconds < 60
    ? `${seconds} second${seconds === 1 ? '' : 's'}`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  if (!done) {
    return (
      <div className="flex items-center gap-2 my-1.5 text-[13px]">
        <BrainCircuit size={14} className="text-white/90 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] animate-pulse" />
        <span className="animated-gradient-text font-semibold">Thinking...</span>
      </div>
    );
  }

  return (
    <div className="my-1.5">
      <button
        type="button"
        onClick={() => content && setOpen((o) => !o)}
        className="flex items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-colors"
      >
        <CircleDashed size={13} className="text-white/60" />
        <span className="font-semibold text-neutral-200">Thought</span>
        <span className="text-neutral-400">{`for ${durationLabel}`}</span>
        {content && (
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }} className="flex text-white/50">
            <ChevronRight size={12} />
          </motion.span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 pl-4 border-l border-white/10 text-xs leading-relaxed text-neutral-300 font-mono whitespace-pre-wrap">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
