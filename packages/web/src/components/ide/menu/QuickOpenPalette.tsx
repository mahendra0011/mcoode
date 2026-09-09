"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FileCode,
  FileJson,
  FileType2,
  File as FileIcon,
  Search,
  Clock,
  X,
} from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";
import api from "../../../lib/axios";

interface QuickOpenProps {
  workspaceId?: string | null;
}

const getFileIcon = (name: string) => {
  if (name.endsWith(".jsx") || name.endsWith(".tsx"))
    return <FileType2 className="w-4 h-4 text-cyan-400" />;
  if (name.endsWith(".js") || name.endsWith(".ts"))
    return <FileCode className="w-4 h-4 text-blue-400" />;
  if (name.endsWith(".json"))
    return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (name.endsWith(".md"))
    return <FileText className="w-4 h-4 text-emerald-400" />;
  return <FileIcon className="w-4 h-4 text-white/50" />;
};

function fuzzyMatch(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100 - (t.indexOf(q) * 2);

  let score = 0;
  let ti = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return -1;
    score += 1 / (idx - ti + 1);
    ti = idx + 1;
  }
  return score;
}

export function QuickOpenPalette({ workspaceId }: QuickOpenProps) {
  const isOpen = useIDEStore((s) => s.isQuickOpenOpen);
  const setIsOpen = useIDEStore((s) => s.setQuickOpenOpen);
  const openFiles = useIDEStore((s) => s.openFiles);
  const recentFiles = useIDEStore((s) => s.recentFiles);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch workspace file list
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setSelectedIndex(0);

    if (workspaceId) {
      api
        .get(`/api/v1/workspaces/${workspaceId}/files`)
        .then((res) => {
          const files: string[] = [];
          const traverse = (items: any[]) => {
            if (!Array.isArray(items)) return;
            for (const item of items) {
              if (item.type === "file" || !item.children) {
                files.push(item.path || item.name);
              } else if (item.children) {
                traverse(item.children);
              }
            }
          };
          traverse(res.data?.files || res.data || []);
          if (files.length > 0) {
            setWorkspaceFiles(Array.from(new Set(files)));
          } else {
            setWorkspaceFiles(Array.from(new Set([...openFiles, ...recentFiles])));
          }
        })
        .catch(() => {
          setWorkspaceFiles(Array.from(new Set([...openFiles, ...recentFiles])));
        });
    } else {
      setWorkspaceFiles(Array.from(new Set([...openFiles, ...recentFiles])));
    }
  }, [isOpen, workspaceId, openFiles, recentFiles]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    const list = workspaceFiles.length > 0
      ? workspaceFiles
      : Array.from(new Set([...openFiles, ...recentFiles]));

    return list
      .map((path) => {
        const name = path.split("/").pop() || path;
        const nameScore = fuzzyMatch(query, name);
        const pathScore = fuzzyMatch(query, path);
        const isRecent = recentFiles.includes(path);
        const isOpenDoc = openFiles.includes(path);
        const baseScore = Math.max(nameScore * 1.5, pathScore);
        const boost = (isOpenDoc ? 15 : 0) + (isRecent ? 10 : 0);
        return {
          path,
          name,
          score: baseScore >= 0 ? baseScore + boost : -1,
          isRecent,
          isOpenDoc,
        };
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);
  }, [workspaceFiles, openFiles, recentFiles, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (path: string) => {
    addOpenFile(path);
    setActivePath(path);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? filteredResults.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredResults[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl bg-[#18181b] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#1f1f23]">
          <Search className="w-4 h-4 text-white/40 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files by name (type to filter)…"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-white/40 hover:text-white p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 ml-2 bg-white/5 border border-white/10 text-white/50 rounded">
            ESC to close
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-1">
          {filteredResults.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">
              No matching files found
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const dir = item.path.includes("/")
                ? item.path.substring(0, item.path.lastIndexOf("/"))
                : "";

              return (
                <div
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600/30 text-white border border-blue-500/40"
                      : "text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(item.name)}
                    <span className="font-medium text-white truncate">
                      {item.name}
                    </span>
                    {dir && (
                      <span className="text-xs text-white/40 truncate">
                        {dir}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-white/40">
                    {item.isOpenDoc && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                        Open
                      </span>
                    )}
                    {item.isRecent && !item.isOpenDoc && (
                      <span className="flex items-center gap-1 text-[10px] text-white/40">
                        <Clock className="w-3 h-3" /> Recent
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-[#141416] text-[11px] text-white/40">
          <span>Navigate with ↑ ↓, press Enter to open</span>
          <span>{filteredResults.length} files</span>
        </div>
      </motion.div>
    </div>
  );
}

export default QuickOpenPalette;
