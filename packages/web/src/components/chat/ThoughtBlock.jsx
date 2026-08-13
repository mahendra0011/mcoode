import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, CircleDashed, BrainCircuit } from 'lucide-react';

/**
 * ThoughtBlock — matches the reference ZCode pattern:
 * while active: "Thinking..." with a brain-circuit icon (present tense,
 * no duration shown here — the overall turn duration lives in
 * WorkingHeader above).
 * once done: collapses to "Thought for Xs" (past tense, with the real
 * elapsed duration), expandable to show reasoning text if present.
 */
export function ThoughtBlock({ content, done, startedAt }) {
  const [open, setOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(startedAt || Date.now());

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 250);
    return () => clearInterval(id);
  }, [done]);

  useEffect(() => {
    if (done) setElapsedMs((prev) => (prev > 0 ? prev : Date.now() - start.current));
  }, [done]);

  const seconds = Math.max(1, Math.round(elapsedMs / 1000));
  const durationLabel = seconds < 60
    ? `${seconds} second${seconds === 1 ? '' : 's'}`
    : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  if (!done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0', fontSize: 13 }}>
        <BrainCircuit size={14} style={{ color: 'var(--zc-text-dim, #8b8d98)' }} />
        <span style={{ fontWeight: 600, color: 'var(--zc-text, #e6e6ea)' }}>Thinking...</span>
      </div>
    );
  }

  return (
    <div style={{ margin: '4px 0' }}>
      <button
        type="button"
        onClick={() => content && setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: content ? 'pointer' : 'default',
          color: 'var(--zc-text-dim, #8b8d98)',
          fontSize: 13,
        }}
      >
        <CircleDashed size={13} />
        <span style={{ fontWeight: 600, color: 'var(--zc-text, #e6e6ea)' }}>Thought</span>
        <span>{`for ${durationLabel}`}</span>
        {content && (
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} style={{ display: 'flex' }}>
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
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 6,
              paddingLeft: 19,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'var(--zc-text-dim, #8b8d98)',
              whiteSpace: 'pre-wrap',
            }}>
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
