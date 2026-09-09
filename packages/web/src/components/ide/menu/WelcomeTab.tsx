"use client";
import React from "react";
import { motion } from "framer-motion";
import {
  FilePlus,
  FolderOpen,
  GitBranch,
  Clock,
  Sparkles,
  BookOpen,
  Keyboard,
  Compass,
  ArrowRight,
} from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

interface WelcomeTabProps {
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onCloneRepo?: () => void;
}

export function WelcomeTab({ onOpenFile, onOpenFolder, onCloneRepo }: WelcomeTabProps) {
  const createUntitledFile = useIDEStore((s) => s.createUntitledFile);
  const recentFiles = useIDEStore((s) => s.recentFiles);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const toggleCommandPalette = useIDEStore((s) => s.toggleCommandPalette);
  const setShortcutsOpen = useIDEStore((s) => s.setShortcutsOpen);
  const setReleaseNotesOpen = useIDEStore((s) => s.setReleaseNotesOpen);

  return (
    <div className="flex-1 h-full bg-[#0e0e0e] text-white/90 overflow-y-auto custom-scrollbar p-8 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              M
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                M CODE
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  v1.0.0
                </span>
              </h1>
              <p className="text-xs text-white/50">Next-generation cloud AI code editor</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Start Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" /> Start
            </h2>

            <div className="space-y-2">
              <button
                onClick={() => createUntitledFile()}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141416] hover:bg-[#1c1c20] border border-white/5 hover:border-white/10 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
                    <FilePlus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-blue-400 transition">
                      New Text File
                    </div>
                    <div className="text-xs text-white/40">Create a blank scratchpad document</div>
                  </div>
                </div>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                  Ctrl+N
                </kbd>
              </button>

              <button
                onClick={onOpenFile}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141416] hover:bg-[#1c1c20] border border-white/5 hover:border-white/10 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-purple-400 transition">
                      Open File...
                    </div>
                    <div className="text-xs text-white/40">Upload and open any file from disk</div>
                  </div>
                </div>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                  Ctrl+O
                </kbd>
              </button>

              <button
                onClick={onOpenFolder}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141416] hover:bg-[#1c1c20] border border-white/5 hover:border-white/10 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition">
                      Open Folder...
                    </div>
                    <div className="text-xs text-white/40">Open a local project via File System API</div>
                  </div>
                </div>
              </button>

              <button
                onClick={onCloneRepo}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#141416] hover:bg-[#1c1c20] border border-white/5 hover:border-white/10 transition group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-105 transition">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-pink-400 transition">
                      Clone Git Repository...
                    </div>
                    <div className="text-xs text-white/40">Connect GitHub or clone remote repository</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" /> Recent Files
            </h2>

            <div className="bg-[#141416] border border-white/5 rounded-xl p-2 divide-y divide-white/5 max-h-[260px] overflow-y-auto custom-scrollbar">
              {recentFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-white/40">
                  No recently opened files
                </div>
              ) : (
                recentFiles.slice(0, 8).map((path) => {
                  const name = path.split("/").pop() || path;
                  return (
                    <div
                      key={path}
                      onClick={() => {
                        addOpenFile(path);
                        setActivePath(path);
                      }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition group"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white group-hover:text-blue-400 transition truncate">
                          {name}
                        </div>
                        <div className="text-[11px] text-white/40 truncate">{path}</div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition flex-shrink-0" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Walkthroughs & Quick Guides */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" /> Walkthroughs & Discoveries
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => toggleCommandPalette()}
              className="p-4 rounded-xl bg-[#141416] border border-white/5 hover:border-white/10 cursor-pointer transition hover:bg-[#18181b] group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition mb-1">
                Command Palette
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Press <kbd className="px-1 bg-white/5 rounded border border-white/10 font-mono">Ctrl+Shift+P</kbd> to access all features.
              </p>
            </div>

            <div
              onClick={() => setShortcutsOpen(true)}
              className="p-4 rounded-xl bg-[#141416] border border-white/5 hover:border-white/10 cursor-pointer transition hover:bg-[#18181b] group"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Keyboard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-medium text-white group-hover:text-purple-400 transition mb-1">
                Key Bindings
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                View the interactive reference for all keyboard shortcuts.
              </p>
            </div>

            <div
              onClick={() => setReleaseNotesOpen(true)}
              className="p-4 rounded-xl bg-[#141416] border border-white/5 hover:border-white/10 cursor-pointer transition hover:bg-[#18181b] group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-medium text-white group-hover:text-emerald-400 transition mb-1">
                What's New in v1.0.0
              </h3>
              <p className="text-xs text-white/40 leading-relaxed">
                Explore the complete menu system, smart selection, and palettes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeTab;
