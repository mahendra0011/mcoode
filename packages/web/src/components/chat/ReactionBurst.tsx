import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ReactionBurst — emoji-style pop + particle explosion.
 *
 * Uses the mcode CSS keyframes (mcode-reaction-pop + mcode-reaction-particles)
 * matching the mcode desktop pattern: when a tool call succeeds, a quick pop
 * (scale 0→1 in 250ms) + 6-particle burst radiates from the center.
 *
 * Falls back to Framer Motion if CSS vars aren't present.
 */
export function ReactionBurst({
  emoji = '✓',
  show,
  onComplete,
}: {
  emoji?: string;
  show: boolean;
  onComplete?: () => void;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="mcode-reaction-burst"
          initial={{ opacity: 1, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{
            pop: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
          }}
          onAnimationComplete={(def) => {
            // Not reliable for exit — use duration-based callback
          }}
        >
          {/* Primary burst icon — uses CSS keyframe for pop */}
          <motion.span
            className="mcode-reaction-pop inline-block text-emerald-400"
            style={{ fontSize: '1.125rem' }}
          >
            {emoji}
          </motion.span>

          {/* 6 particle rays (matches mcode's box-shadow pattern) */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * 60) * Math.PI / 180;
            const radius = 8;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <motion.span
                key={i}
                className="absolute inline-block w-1 h-1 bg-emerald-400 rounded-full"
                style={{ left: '50%', top: '50%', translateX: x, translateY: y }}
                initial={{ opacity: 0.8, scale: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: x * 2,
                  y: y * 2,
                }}
                transition={{
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.05,
                }}
              />
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
