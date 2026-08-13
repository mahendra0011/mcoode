import React from 'react';
import { motion } from 'framer-motion';
import { MessageContent } from './MessageContent';
import { StepCard } from '../ide/StepCards';

/**
 * ChatMessage — simple Claude-style message.
 * No fancy stagger, no pop, no spring — just opacity fade + slight y slide.
 *
 * Props:
 *   msg            — message object
 *   idx            — index for stagger delay
 *   size           — 'sm' | 'md'
 *   isStreaming    — whether streaming is active
 *   undo           — undo callback
 *   isNormalChat   — when true, shows Claude-like clean style
 */
export function ChatMessage({ msg, idx, size = 'md', isStreaming, undo, isNormalChat = false }) {
  const showCursor = msg.kind === 'stream' && isStreaming;

  if (msg.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={`flex justify-end ${size === 'sm' ? 'max-w-[90%]' : 'max-w-[80%]'}`}
      >
        <div
          className={
            size === 'sm'
              ? 'bg-transparent border border-white/10 text-white/90 px-4 py-2.5 rounded-lg text-[13px] max-w-full'
              : 'bg-transparent border border-white/10 text-white/90 px-5 py-3 rounded-xl text-sm max-w-full'
          }
        >
          {msg.text}
        </div>
      </motion.div>
    );
  }

  // Assistant message
  const staggerDelay = idx != null ? idx * 0.02 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut', delay: staggerDelay }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-start gap-2.5">
        {isNormalChat && (
          <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0 flex items-center justify-center text-xs">
            M
          </div>
        )}
        <div className="flex-1 min-w-0">
          {msg.text && (
            <>
              <MessageContent
                msg={msg}
                text={msg.text}
                size={size}
                isStreaming={showCursor}
              >
                {showCursor && (
                  <motion.span
                    className="inline-block w-1.5 h-3.5 ml-0.5 bg-emerald-400 align-middle"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </MessageContent>
            </>
          )}
          {msg.kind === 'tool' && msg.block !== 'permission' && msg.searchResults ? (
            <MessageContent msg={msg} size={size} />
          ) : (
            msg.kind === 'tool' && msg.block !== 'permission' && <StepCard msg={msg} undo={undo} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
