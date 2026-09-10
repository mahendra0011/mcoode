import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * SpinnerBlock — terminal spinner animation matching mcode CLI pattern.
 *
 * Uses the 5-frame spinner from blocks.jsx: ['●', '◐', '◓', '◑', '◒']
 * at 80ms intervals (the shared useTicker rate).
 *
 * Used in: chat tool call status indicators, terminal pane loading,
 *          IDE status bar spinner, permission prompts.
 */
const SPIN_FRAMES = ['●', '◐', '◓', '◑', '◒'];

export function SpinnerBlock({
  label = 'Running…',
  size = 'sm',
  color = 'emerald',
  active = true,
}: {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'blue' | 'amber' | 'white';
  active?: boolean;
}) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % SPIN_FRAMES.length);
    }, 80); // 80ms — matches useTicker.js TICK_RATE_MS
    return () => clearInterval(id);
  }, [active]);

  const colorClasses = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    white: 'text-white/50',
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <motion.span
      className={`inline-flex items-center gap-1.5 font-mono ${sizeClasses[size]} ${colorClasses[color]}`}
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.span
        key={frame}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        {SPIN_FRAMES[frame]}
      </motion.span>
      <span>{label}</span>
    </motion.span>
  );
}
