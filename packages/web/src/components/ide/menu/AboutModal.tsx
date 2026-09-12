"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Info, Copy, Check, X } from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

export function AboutModal() {
  const isOpen = useIDEStore((s) => s.isAboutOpen);
  const setIsOpen = useIDEStore((s) => s.setAboutOpen);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const info = {
    name: "M CODE",
    edition: "Professional AI Cloud Code Editor",
    version: "1.0.0",
    commit: "7b4e9f2",
    date: new Date().toISOString().split("T")[0],
    runtime: typeof window !== "undefined" ? navigator.userAgent : "Node.js",
    monaco: "^4.7.0",
    next: "^16.3.4",
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(info, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1f1f23]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="MCODE"
              className="w-8 h-8 rounded-lg object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.6)] flex-shrink-0"
            />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">About MCODE</h2>
              <p className="text-xs text-white/40">Version 1.0.0</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-white/80">
          <div className="bg-[#121214] border border-white/5 rounded-xl p-4 space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-white/40">Product:</span>
              <span className="text-white font-semibold">M CODE (AI Code Editor)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Version:</span>
              <span className="text-emerald-400">1.0.0 (Release)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Commit:</span>
              <span className="text-blue-400 font-bold">{info.commit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Build Date:</span>
              <span className="text-white/70">{info.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Monaco Core:</span>
              <span className="text-white/70">v0.45.0</span>
            </div>
            <div className="pt-2 border-t border-white/5">
              <span className="text-white/40 block mb-1">User Agent:</span>
              <span className="text-[11px] text-white/50 break-all leading-tight">
                {info.runtime}
              </span>
            </div>
          </div>

          <p className="text-xs text-white/50 leading-relaxed">
            M CODE is a high-performance, browser-first cloud IDE and AI pair programming platform engineered with Monaco editor, multi-agent AI orchestration, full terminal emulation, and VS Code desktop ergonomics.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-[#141416] flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 flex items-center gap-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied Info" : "Copy Info"}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default AboutModal;
