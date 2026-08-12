import React from 'react';
import { motion } from 'framer-motion';
import { MessageContent } from './MessageContent';
import { StepCard } from '../ide/StepCards';

/**
 * ChatMessage — Claude-style message bubble.
 *
 * Renders either a user message or an assistant/tool message with:
 *  - Markdown body via <MessageContent>
 *  - Assistant "avatar" (a subtle gradient circle with Sparkles icon)
 *  - Streaming cursor (blinking caret)
 *  - Tool call results via <StepCard>
 *
 * Props:
 *   msg            — the message object from Redux store
 *   idx            — index for animation stagger delay
 *   size           — 'sm' | 'md' (font size; sm = IDE pane, md = full chat)
 *   isStreaming    — whether the assistant is currently streaming
 *   undo           — undo callback passed to StepCard
 *   isNormalChat   — when true, uses Claude-like clean styling; when false (advanced/agent),
 *                    keeps the Zai-style styling with full borders and glows
 */
export function ChatMessage({ msg, idx, size = 'md', isStreaming, undo, isNormalChat = false }) {
  const showCursor = msg.kind === 'stream' && isStreaming;

  if (msg.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={`flex justify-end ${size === 'sm' ? 'max-w-[90%]' : 'max-w-[80%]'}`}
      >
        <div
          className={
            size === 'sm'
              ? 'bg-[#27272a] text-white/90 px-4 py-2.5 rounded-xl text-[13px] max-w-full border border-white/5 shadow-sm'
              : 'bg-[#27272a] text-white/90 px-5 py-3 rounded-2xl text-sm max-w-full border border-white/5 shadow-sm'
          }
        >
          {msg.text}
        </div>
      </motion.div>
    );
  }

  // ── Assistant message ──
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
        delay: idx != null ? idx * 0.02 : 0,
      }}
      className={`flex flex-col gap-3`}
    >
      <div className="flex items-start gap-3">
        {/* Assistant avatar — only visible in normal chat mode for Claude-like feel */}
        {isNormalChat && (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex-shrink-0 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <span className="text-xs">M</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          {msg.text && (
            <>
              <MessageContent
                text={msg.text}
                size={size}
                isStreaming={showCursor}
              >
                {showCursor && (
                  <motion.span
                    className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </MessageContent>
            </>
          )}
          {msg.kind === 'tool' && <StepCard msg={msg} undo={undo} />}
        </div>
      </div>
    </motion.div>
  );
}
