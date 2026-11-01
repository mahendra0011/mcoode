"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "../../types/chat";
import { ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VirtualChatMessagesProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  size?: "sm" | "md";
  isNormalChat?: boolean;
  undo?: any;
  onResubmitPrompt?: (text: string) => void;
}

export function VirtualChatMessages({
  messages,
  isStreaming,
  size = "md",
  isNormalChat = false,
  undo,
  onResubmitPrompt,
}: VirtualChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const prevCountRef = useRef(messages.length);
  const isUserScrollingRef = useRef(false);

  // Check how close to bottom the user is
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 100;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceFromBottom > threshold;
    setIsScrolledUp(scrolledUp);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
    setIsScrolledUp(false);
  }, []);

  // When a new message is appended (e.g. user sends message or new response arrives)
  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = messages.length;

    if (messages.length > prevCount) {
      const lastMsg = messages[messages.length - 1];
      // If user just sent a message, ALWAYS scroll to bottom
      if (lastMsg?.role === "user") {
        requestAnimationFrame(() => scrollToBottom("smooth"));
      } else if (!isScrolledUp) {
        // If assistant replied and user is not scrolled up, auto-scroll to bottom
        requestAnimationFrame(() => scrollToBottom("smooth"));
      }
    }
  }, [messages.length, isScrolledUp, scrollToBottom, messages]);

  // When streaming chunks arrive: ONLY scroll if user is NOT scrolled up reading history
  useEffect(() => {
    if (isStreaming && !isScrolledUp) {
      const el = containerRef.current;
      if (el) {
        // Direct assignment without animation prevents lag and rubber-banding during fast token stream
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [isStreaming, isScrolledUp, messages]);

  // Initial scroll on mount or when chat session loads
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom("auto");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []); // on mount / session change

  return (
    <div className="relative flex-1 min-h-0 w-full flex flex-col overflow-hidden">
      {/* Native scrollable message stream */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden custom-scrollbar space-y-4 px-1"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-busy={isStreaming}
        aria-label="Chat messages"
      >
        {messages.map((msg, index) => {
          const prevMsg = index > 0 ? messages[index - 1] : null;
          const showAvatar =
            msg.role === "assistant" &&
            msg.kind !== "tool" &&
            (!prevMsg || prevMsg.role !== "assistant" || prevMsg.kind === "tool");

          return (
            <div key={msg.id || `msg-${index}`} className="w-full">
              <ChatMessage
                msg={msg}
                idx={index}
                size={size}
                isStreaming={isStreaming && index === messages.length - 1}
                undo={undo}
                isNormalChat={isNormalChat}
                showAvatar={showAvatar}
                onResubmitPrompt={onResubmitPrompt}
              />
            </div>
          );
        })}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-2 w-full flex-shrink-0" />
      </div>

      {/* Floating "Scroll to bottom" button when user has scrolled up */}
      <AnimatePresence>
        {isScrolledUp && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-4 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e1e24] hover:bg-[#282832] text-white/90 hover:text-white border border-white/15 shadow-xl backdrop-blur-md text-xs font-medium cursor-pointer transition group"
            title="Scroll to latest messages"
          >
            <ArrowDown className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
            <span>Latest</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VirtualChatMessages;
