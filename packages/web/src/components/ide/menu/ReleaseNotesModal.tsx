"use client";
import React from "react";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, X } from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

export function ReleaseNotesModal() {
  const isOpen = useIDEStore((s) => s.isReleaseNotesOpen);
  const setIsOpen = useIDEStore((s) => s.setReleaseNotesOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl max-h-[85vh] bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1f1f23]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Release Notes — v1.0.0</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm text-white/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Latest Release
              </span>
              <span className="text-xs text-white/40">v1.0.0 · Comprehensive IDE Menus & Navigation</span>
            </div>
            <p className="text-white/60 leading-relaxed">
              This milestone introduces the complete VS Code standard top-level menu architecture, bringing desktop-grade ergonomics, keyboard navigation, and file workflow capabilities to the web browser.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#141416] border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                Standard 8-Menu VS Code Bar
              </h3>
              <ul className="text-xs text-white/60 space-y-1.5 list-disc list-inside">
                <li><strong>File Menu:</strong> New file, open file/folder, recent files, save, save as, save all, auto save, revert file.</li>
                <li><strong>Edit Menu:</strong> Undo/redo, cut/copy/paste, find & replace, comments toggle, Emmet expansion.</li>
                <li><strong>Selection Menu:</strong> Smart syntax expand/shrink, line copy/move, multi-cursor, column selection.</li>
                <li><strong>View Menu:</strong> Command palette, Zen mode, full screen, word wrap, panel toggles.</li>
                <li><strong>Go Menu:</strong> Navigation history back/forward, Quick Open (Ctrl+P), symbol search (Ctrl+Shift+O), Go to line (Ctrl+G).</li>
                <li><strong>Run Menu:</strong> Debugger controls, breakpoint toggles, launch configurations.</li>
                <li><strong>Terminal Menu:</strong> Multi-terminal tabs, build task launcher, split pane.</li>
                <li><strong>Help Menu:</strong> Welcome page, keyboard shortcuts cheatsheet, documentation links.</li>
              </ul>
            </div>

            <div className="bg-[#141416] border border-white/5 rounded-xl p-4">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Enhanced Monaco Editor Integration
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Native hook-ins to Monaco's internal undo/redo stacks, smart bracket expand/shrink selections, block commenting, line duplication, and live reactive word wrapping.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-white/10 bg-[#141416] flex justify-end">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default ReleaseNotesModal;
