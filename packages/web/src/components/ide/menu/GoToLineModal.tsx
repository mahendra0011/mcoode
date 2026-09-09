"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Hash, X } from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

export function GoToLineModal() {
  const isOpen = useIDEStore((s) => s.isGoToLineOpen);
  const setIsOpen = useIDEStore((s) => s.setGoToLineOpen);
  const activeEditor = useIDEStore((s) => s.activeEditor);
  const activePath = useIDEStore((s) => s.activePath);
  const recordNavPoint = useIDEStore((s) => s.recordNavPoint);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);

  const [inputVal, setInputVal] = useState("");
  const [totalLines, setTotalLines] = useState(1);
  const [currentLine, setCurrentLine] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputVal("");
      if (activeEditor) {
        const model = activeEditor.getModel();
        if (model) {
          setTotalLines(model.getLineCount());
        }
        const pos = activeEditor.getPosition();
        if (pos) {
          setCurrentLine(pos.lineNumber);
        }
      }
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, activeEditor]);

  const handleJump = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    const parts = trimmed.split(/[:;,]/);
    const line = parseInt(parts[0], 10);
    const column = parts[1] ? parseInt(parts[1], 10) : 1;

    if (isNaN(line) || line < 1) return;

    if (activeEditor) {
      activeEditor.revealLineInCenter(line);
      activeEditor.setPosition({ lineNumber: line, column });
      activeEditor.focus();
      if (activePath) {
        recordNavPoint({ path: activePath, line, column });
      }
    } else if (activePath) {
      setTargetJump({ path: activePath, line, column });
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleJump();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-md bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1f1f23]">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Hash className="w-4 h-4 text-blue-400" />
            <span>Go to Line / Column</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Type a line number between 1 and ${totalLines}...`}
              className="w-full bg-[#121214] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              onClick={handleJump}
              className="absolute right-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs flex items-center gap-1 font-medium transition"
            >
              Go <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-white/40">
            <span>
              Current line: <strong className="text-white/70 font-mono">{currentLine}</strong> of{" "}
              <strong className="text-white/70 font-mono">{totalLines}</strong>
            </span>
            <span>Format: <code className="text-white/60">line[:column]</code></span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default GoToLineModal;
