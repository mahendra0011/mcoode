import React from 'react';
import { motion } from 'framer-motion';

/**
 * ThinkingIndicator — shows a "thinking..." animation (three bouncing dots)
 * while the backend is processing the user's request but before the first
 * stream chunk has arrived. This fills the gap between sending a prompt and
 * the first streamed token arriving, matching Claude's behavior.
 *
 * Props:
 *   size  — 'sm' | 'md' (dot size; sm = IDE pane, md = full chat)
 *   alignAssistantAvatar — when true, includes the assistant avatar circle
 *                          (for normal Chat tab; false = compact IDE pane)
 */
export function ThinkingIndicator({ size = 'md', showAvatar = false }) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`flex items-start gap-3 ${size === 'sm' ? 'text-[13px]' : 'text-[15px]'}`}
    >
      {showAvatar && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex-shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
          <span className="text-xs">M</span>
        </div>
      )}
      <div className="flex items-center gap-1 text-white/50">
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
                repeatType: 'loop',
                delay: i * 0.12,
                ease: 'easeInOut'
              }}
            />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
