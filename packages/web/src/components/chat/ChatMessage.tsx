"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageContent } from "./MessageContent";
import { StepCard } from "../ide/StepCards";
import { ThoughtBlock } from "./ThoughtBlock";
import type { ChatMessageProps } from "../../types/chat";
import { Pencil, Trash2, Copy, Check, Send, X } from "lucide-react";
import { useAppDispatch } from "../../store";
import { editMessage, deleteMessage } from "../../store/chatSlice";
import { toast } from "sonner";

/**
 * ChatMessage — Claude-style message with mcode animation patterns.
 * Supports inline editing, copying, and deleting user prompts with resubmit capability.
 */
export function ChatMessage({
  msg,
  idx,
  size = "md",
  isStreaming,
  undo,
  isNormalChat = false,
  showAvatar = true,
  onResubmitPrompt,
}: ChatMessageProps) {
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.text || "");
  const [copied, setCopied] = useState(false);

  const showCursor = msg.kind === "stream" && isStreaming;

  const handleCopy = () => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Prompt copied to clipboard");
    }
  };

  const handleDelete = () => {
    dispatch(deleteMessage({ id: msg.id, index: idx }));
    toast.success("Prompt deleted");
  };

  const handleSaveEdit = (resubmit: boolean = false) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    dispatch(editMessage({ id: msg.id, index: idx, text: trimmed }));
    setIsEditing(false);
    toast.success(resubmit ? "Prompt updated & resubmitted" : "Prompt updated");
    if (resubmit && onResubmitPrompt) {
      onResubmitPrompt(trimmed);
    }
  };

  if (msg.role === "user") {
    if (isEditing) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={`flex flex-col gap-2 ${size === "sm" ? "max-w-[95%]" : "max-w-[85%]"} ml-auto w-full`}
        >
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span className="font-medium flex items-center gap-1.5 text-emerald-400">
              <Pencil className="w-3.5 h-3.5" /> Edit prompt
            </span>
            <span className="text-[11px] text-neutral-500">Esc to cancel</span>
          </div>
          <div className="relative rounded-xl border border-emerald-500/40 bg-neutral-900/90 shadow-xl overflow-hidden focus-within:border-emerald-500 transition">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSaveEdit(true);
                } else if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditText(msg.text || "");
                }
              }}
              rows={Math.max(2, Math.min(8, (editText.match(/\n/g) || []).length + 2))}
              className="w-full bg-transparent text-white/95 px-4 py-3 text-sm focus:outline-none resize-none custom-scrollbar"
              autoFocus
            />
            <div className="flex items-center justify-between px-3 py-2 border-t border-white/10 bg-white/[0.02]">
              <span className="text-[11px] text-neutral-400">
                Ctrl+Enter to resubmit
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(msg.text || "");
                  }}
                  className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(false)}
                  className="px-2.5 py-1 text-xs text-white/90 hover:text-white rounded bg-white/10 hover:bg-white/15 transition cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded shadow transition cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Resubmit</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={`group relative flex items-start justify-end gap-2 ${size === "sm" ? "max-w-[95%]" : "max-w-[85%]"} ml-auto`}
      >
        {/* Action buttons — visible subtly and prominent on hover */}
        <div className="opacity-70 group-hover:opacity-100 hover:!opacity-100 transition-opacity flex items-center gap-1 bg-neutral-900/95 border border-white/20 rounded-lg px-1.5 py-0.5 shadow-md mr-1.5 mt-1 flex-shrink-0 self-center">
          <button
            type="button"
            onClick={() => {
              setEditText(msg.text || "");
              setIsEditing(true);
            }}
            className="p-1.5 rounded text-white/70 hover:text-emerald-400 hover:bg-white/10 transition cursor-pointer"
            title="Edit prompt"
            aria-label="Edit prompt"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={copied ? "Copied!" : "Copy prompt"}
            aria-label="Copy prompt"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded text-white/70 hover:text-red-400 hover:bg-white/10 transition cursor-pointer"
            title="Delete prompt"
            aria-label="Delete prompt"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className={
            size === "sm"
              ? "bg-transparent border border-white/10 text-white/90 px-4 py-2.5 rounded-lg text-[13px] max-w-full break-words whitespace-pre-wrap"
              : "bg-transparent border border-white/10 text-white/90 px-5 py-3 rounded-xl text-sm max-w-full break-words whitespace-pre-wrap"
          }
        >
          {msg.text}
        </div>
        <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-emerald-400 mt-0.5 shadow-sm">
          M
        </div>
      </motion.div>
    );
  }

  // Assistant message
  // Cap the cascade: with idx * 0.02 a long session (400+ messages) delayed
  // the newest bubble by 8-10s before it rendered at all.
  const staggerDelay = idx != null ? Math.min(idx * 0.02, 0.3) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1], delay: staggerDelay }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-start gap-2.5">
        {showAvatar && msg.kind !== "tool" ? (
          <div className="w-5 h-5 rounded-full border border-white/10 bg-white/[0.03] flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-white/60 mt-0.5 shadow-sm">
            M
          </div>
        ) : isNormalChat ? (
          <div className="w-5 h-5 flex-shrink-0" />
        ) : null}
        <div className="flex-1 min-w-0">
          {((msg as any).thought || (msg as any).reasoning) && (
            <ThoughtBlock content={(msg as any).thought || (msg as any).reasoning} done={!isStreaming} />
          )}
          {msg.text && msg.kind !== "tool" && (
            <div
              data-zcode-tool-stream-animate={showCursor ? "true" : undefined}
              data-mcode-tool-stream-animate={showCursor ? "true" : undefined}
            >
              <MessageContent msg={msg} text={msg.text} size={size} isStreaming={showCursor}>
                {showCursor && (
                  <motion.span
                    className="inline-block w-[1.5px] h-[14px] ml-0.5 align-middle"
                    style={{ background: 'var(--mcode-green, #3ecf8e)' }}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </MessageContent>
            </div>
          )}
          {msg.kind === "tool" && msg.block !== "permission" && (msg.searchResults || msg.tool === "web_search" || msg.tool === "web_fetch") ? (
            <MessageContent msg={msg} size={size} />
          ) : (
            msg.kind === "tool" && msg.block !== "permission" && <StepCard msg={msg} undo={undo} />
          )}
        </div>
      </div>
    </motion.div>
  );
}
