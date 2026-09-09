"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Terminal, Wrench, Search, X } from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

interface TaskItem {
  id: string;
  label: string;
  command: string;
  isBuild?: boolean;
}

const DEFAULT_TASKS: TaskItem[] = [
  { id: "build", label: "npm run build", command: "npm run build", isBuild: true },
  { id: "typecheck", label: "TypeScript: tsc --noEmit", command: "npx tsc --noEmit", isBuild: true },
  { id: "test", label: "npm test", command: "npm test" },
  { id: "lint", label: "npm run lint", command: "npm run lint" },
  { id: "dev", label: "npm run dev", command: "npm run dev" },
];

export function TasksModal() {
  const isOpen = useIDEStore((s) => s.isTasksOpen);
  const setIsOpen = useIDEStore((s) => s.setTasksOpen);
  const setTerminalOpen = useIDEStore((s) => s.setTerminalOpen);
  const setActivePanelTab = useIDEStore((s) => s.setActivePanelTab);
  const runTerminalCommandFn = useIDEStore((s) => s.runTerminalCommandFn);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredTasks = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return DEFAULT_TASKS;
    return DEFAULT_TASKS.filter(
      (t) => t.label.toLowerCase().includes(q) || t.command.toLowerCase().includes(q)
    );
  }, [query]);

  const runTask = (cmd: string) => {
    setTerminalOpen(true);
    setActivePanelTab("terminal");
    if (runTerminalCommandFn) {
      runTerminalCommandFn(cmd);
    } else {
      document.dispatchEvent(
        new CustomEvent("terminal:write", {
          detail: `\r\n\x1b[36mRunning task: ${cmd}\x1b[0m\r\n`,
        })
      );
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredTasks.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? filteredTasks.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTasks[selectedIndex]) {
        runTask(filteredTasks[selectedIndex].command);
      } else if (query.trim()) {
        runTask(query.trim());
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xl bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#1f1f23]">
          <Wrench className="w-4 h-4 text-emerald-400 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Select task to run, or type custom shell command…"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 ml-2 bg-white/5 border border-white/10 text-white/50 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto custom-scrollbar p-1">
          {filteredTasks.map((t, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={t.id}
                onClick={() => runTask(t.command)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                  isSelected
                    ? "bg-emerald-600/30 text-white border border-emerald-500/40"
                    : "text-white/80 hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Terminal className="w-4 h-4 text-white/50" />
                  <span className="font-medium text-white truncate">{t.label}</span>
                  {t.isBuild && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                      build task
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && query.trim() && (
            <div
              onClick={() => runTask(query.trim())}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm bg-blue-600/20 text-white border border-blue-500/30 hover:bg-blue-600/30"
            >
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Run custom command: <strong className="font-mono text-emerald-300">{query}</strong></span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-[#141416] text-[11px] text-white/40">
          <span>Navigate with ↑ ↓, press Enter to execute in terminal</span>
          <span>{filteredTasks.length} tasks configured</span>
        </div>
      </motion.div>
    </div>
  );
}

export default TasksModal;
