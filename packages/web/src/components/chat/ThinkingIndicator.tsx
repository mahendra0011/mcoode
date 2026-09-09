import React from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export type ThinkingIndicatorSize = 'sm' | 'md';

export interface ThinkingIndicatorProps {
  size?: ThinkingIndicatorSize;
  showAvatar?: boolean;
}

/**
 * ThinkingIndicator — ZCode-style thinking header.
 *
 * Matches ZCode's `gJ` reasoning-header component exactly:
 *   • Brain icon (size-4, text-foreground-subtlest)
 *   • "Thinking..." text with `animated-gradient-text` class
 *     (linear gradient animation via CSS — 4s linear infinite, gradient-flow)
 *   • `data-zcode-chat-loading-animate="true"` for the
 *     zcode-stream-text-in CSS fade-in animation
 *   • `role="status"` with aria-label="Loading..."
 *     (ZCode uses the `common.loading` translation key)
 *
 * When showAvatar is true, a circular "M" avatar is rendered
 * before the brain icon (used in agent mode).
 */
export function ThinkingIndicator({ size = 'md', showAvatar = false }: ThinkingIndicatorProps) {
  const textSize = size === 'sm' ? 'text-[13px]' : 'text-[15px]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`flex items-center gap-2 ${textSize}`}
      data-zcode-chat-loading-animate="true"
      role="status"
      aria-label="Loading..."
    >
      {showAvatar && (
        <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center">
          <span className="text-xs">M</span>
        </div>
      )}
      <Brain className="w-4 h-4 shrink-0 text-white/40" />
      <span className="animated-gradient-text font-medium">
        Thinking...
      </span>
    </motion.div>
  );
}
