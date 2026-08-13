import React from 'react';
import { motion } from 'framer-motion';

/**
 * ThinkingIndicator — minimal "thinking..." dots.
 * Matches ZCode's simple bounce animation.
 *
 * Props:
 *   size       — 'sm' | 'md'
 *   showAvatar — boolean
 */
export function ThinkingIndicator({ size = 'md', showAvatar = false }) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`flex items-center gap-1.5 ${size === 'sm' ? 'text-[13px]' : 'text-[15px]'}`}
    >
      {showAvatar && (
        <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center">
          <span className="text-xs">M</span>
        </div>
      )}
      <span className="text-white/30">Thinking</span>
      <span className="flex items-end gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${dotSize} bg-emerald-400 rounded-full`}
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.12,
            }}
          />
        ))}
      </span>
    </motion.div>
  );
}
