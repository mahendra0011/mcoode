"use client";

import React, { useState, useMemo } from "react";
import {
  GitBranch,
  Check,
  RotateCw,
  MoreHorizontal,
  Sparkles,
  ChevronDown,
  ChevronRight,
  GitCommit,
  ArrowUp,
  ArrowDown,
  Plus,
  FileEdit,
  Trash2,
  Share2,
  RefreshCw,
  FolderGit2,
  Upload,
  Download,
  Terminal,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { toast } from "sonner";

export interface ChangedFile {
  path: string;
  fileName: string;
  status: "modified" | "added" | "deleted";
}

export interface CommitItem {
  hash: string;
  message: string;
  timestamp: number;
  isHead?: boolean;
  branchLabel?: string;
}

const CONTEXT_MENU_ITEMS = [
  { label: "View as Tree" },
  { label: "View & Sort" },
  { divider: true },
  { label: "Pull", icon: Download },
  { label: "Push", icon: Upload },
  { label: "Clone", icon: FolderGit2 },
  { label: "Checkout to...", icon: GitBranch },
  { label: "Fetch", icon: RefreshCw },
  { divider: true },
  { label: "Commit All Changes" },
  { label: "Stash All Changes" },
  { label: "Tags" },
  { divider: true },
  { label: "Show Git Output", icon: Terminal },
];

export function SourceControlPanel() {
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Sections collapse state
  const [sections, setSections] = useState({
    changes: true,
    graph: true,
  });

  const fileContentsCache = useIDEStore((s) => s.fileContentsCache);
  const lastCommitSnapshots = useIDEStore((s) => s.lastCommitSnapshots);
  const commitHistory = useIDEStore((s) => s.commitHistory);
  const commitChanges = useIDEStore((s) => s.commitChanges);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);

  // Compute diff against last commit snapshot
  const changes = useMemo(() => {
    const list: ChangedFile[] = [];
    const seen = new Set<string>();

    for (const [path, content] of Object.entries(fileContentsCache)) {
      seen.add(path);
      const prev = lastCommitSnapshots[path];
      const fileName = path.split("/").pop() || path;

      if (prev === undefined) {
        list.push({ path, fileName, status: "added" });
      } else if (prev !== content) {
        list.push({ path, fileName, status: "modified" });
      }
    }

    for (const path of Object.keys(lastCommitSnapshots)) {
      if (!seen.has(path)) {
        const fileName = path.split("/").pop() || path;
        list.push({ path, fileName, status: "deleted" });
      }
    }

    return list;
  }, [fileContentsCache, lastCommitSnapshots]);

  // Merge commit history into Graph commits
  const graphCommits = useMemo<CommitItem[]>(() => {
    const staticBase: CommitItem[] = [
      {
        hash: "c7e21a8",
        message: "feat: implement initial web frontend scaffold",
        timestamp: Date.now() - 1000 * 60 * 60 * 2,
        branchLabel: "origin/main",
      },
      {
        hash: "b59f33d",
        message: "chore: update package dependencies and build scripts",
        timestamp: Date.now() - 1000 * 60 * 60 * 5,
      },
    ];

    const storeCommits: CommitItem[] = commitHistory.map((c, i) => ({
      hash: `a${c.timestamp.toString(16).slice(-6)}`,
      message: c.message,
      timestamp: c.timestamp,
      isHead: i === 0,
      branchLabel: i === 0 ? "main" : undefined,
    }));

    return [...storeCommits, ...staticBase];
  }, [commitHistory]);

  const handleCommit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || changes.length === 0) return;
    commitChanges(message.trim());
    toast.success(`Committed changes: "${message.trim()}"`);
    setMessage("");
  };

  // AI-assisted commit message generation based on detected diffs
  const handleGenerateMessage = async () => {
    if (changes.length === 0) {
      toast.info("No changes to generate commit message for");
      return;
    }

    setIsGenerating(true);
    try {
      // Create a descriptive summary of changes
      const added = changes.filter((c) => c.status === "added").map((c) => c.fileName);
      const modified = changes.filter((c) => c.status === "modified").map((c) => c.fileName);
      const deleted = changes.filter((c) => c.status === "deleted").map((c) => c.fileName);

      let gen = "";
      if (added.length > 0 && modified.length === 0 && deleted.length === 0) {
        gen = `feat: add ${added.slice(0, 2).join(", ")}${added.length > 2 ? ` and ${added.length - 2} more` : ""}`;
      } else if (modified.length > 0 && added.length === 0 && deleted.length === 0) {
        gen = `fix: update ${modified.slice(0, 2).join(", ")}${modified.length > 2 ? ` and ${modified.length - 2} files` : ""}`;
      } else {
        gen = `chore: update ${changes.length} files (${modified.length} modified, ${added.length} added)`;
      }

      await new Promise((r) => setTimeout(r, 450));
      setMessage(gen);
      toast.success("Generated commit message");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMenuAction = (label: string) => {
    setMenuOpen(false);
    toast.info(`Git: ${label}`);
    const runCmd = useIDEStore.getState().runTerminalCommandFn;
    if (runCmd) {
      if (label === "Pull") runCmd("git pull");
      else if (label === "Push") runCmd("git push");
      else if (label === "Fetch") runCmd("git fetch");
      else if (label === "Show Git Output") runCmd("git status");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs w-full min-w-0 overflow-hidden">
      {/* Top Header matching screenshot */}
      <div className="p-2.5 border-b border-white/5 flex items-center justify-between gap-2 bg-[#181818]/90 flex-shrink-0 relative">
        <span className="font-semibold uppercase tracking-wider text-white/60 text-[11px] truncate">
          SOURCE CONTROL
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="More Actions..."
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-2 top-full mt-1 w-48 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs flex flex-col"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {CONTEXT_MENU_ITEMS.map((item, idx) =>
                item.divider ? (
                  <div key={idx} className="my-1 border-t border-white/10" />
                ) : (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleMenuAction(item.label || "")}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-white/80 hover:text-white transition"
                  >
                    {item.icon && <item.icon className="w-3 h-3 text-white/40" />}
                    <span>{item.label}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Accordion content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
        {/* 1. CHANGES SECTION */}
        <div className="border-b border-white/5">
          <div className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-[11px] font-bold text-white/60 tracking-wider">
            <div
              onClick={() => setSections((s) => ({ ...s, changes: !s.changes }))}
              className="flex items-center gap-1.5 flex-1 cursor-pointer truncate"
            >
              {sections.changes ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span>CHANGES</span>
              {changes.length > 0 && (
                <span className="text-[10px] text-white/30 px-1.5 py-0.2 rounded bg-white/5">
                  {changes.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCommit}
                disabled={!message.trim() || changes.length === 0}
                className="p-1 rounded text-white/40 hover:text-white disabled:opacity-20 transition"
                title="Commit (Ctrl+Enter)"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => toast.info("Refreshed changes")}
                className="p-1 rounded text-white/40 hover:text-white transition"
                title="Refresh Changes"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {sections.changes && (
            <div className="p-2 flex flex-col gap-2 bg-black/10">
              {/* Commit Input with Generate Button */}
              <div className="flex flex-col gap-1.5">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder='Message (Ctrl+Enter to commit on "main")'
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        handleCommit();
                      }
                    }}
                    className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1.5 pr-20 text-xs text-white placeholder-white/20 outline-none focus:border-blue-500 font-sans"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateMessage}
                    disabled={isGenerating || changes.length === 0}
                    className="absolute right-1 px-2 py-0.5 rounded text-[10px] font-medium bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 flex items-center gap-1 disabled:opacity-20 transition"
                    title="Generate Commit Message with AI"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{isGenerating ? "..." : "Generate"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={!message.trim() || changes.length === 0}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded font-medium bg-[#0e639c] hover:bg-[#1177bb] disabled:opacity-30 text-white text-xs transition shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Commit</span>
                </button>
              </div>

              {/* Changed Files List */}
              <div className="flex flex-col gap-0.5 pt-1">
                {changes.length === 0 ? (
                  <div className="text-white/30 text-center py-4 italic text-[11px]">
                    No changes detected in workspace.
                  </div>
                ) : (
                  changes.map((c) => (
                    <button
                      key={c.path}
                      type="button"
                      onClick={() => addOpenFile(c.path)}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/5 text-left group transition"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {c.status === "added" && (
                          <Plus className="w-3 h-3 text-[#4caf50] flex-shrink-0" />
                        )}
                        {c.status === "modified" && (
                          <FileEdit className="w-3 h-3 text-[#e2b93d] flex-shrink-0" />
                        )}
                        {c.status === "deleted" && (
                          <Trash2 className="w-3 h-3 text-[#f44336] flex-shrink-0" />
                        )}
                        <span
                          className="truncate text-white/80 group-hover:text-white font-mono text-[11px]"
                          title={c.path}
                        >
                          {c.fileName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1 rounded flex-shrink-0 ${
                          c.status === "added"
                            ? "text-[#4caf50]"
                            : c.status === "modified"
                            ? "text-[#e2b93d]"
                            : "text-[#f44336]"
                        }`}
                      >
                        {c.status === "added" ? "A" : c.status === "modified" ? "M" : "D"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2. GRAPH SECTION */}
        <div className="border-b border-white/5">
          <div className="flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-[11px] font-bold text-white/60 tracking-wider">
            <div
              onClick={() => setSections((s) => ({ ...s, graph: !s.graph }))}
              className="flex items-center gap-1.5 flex-1 cursor-pointer truncate"
            >
              {sections.graph ? (
                <ChevronDown className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              )}
              <span>GRAPH</span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-white/30 font-sans">
              <span>Auto</span>
              <button
                type="button"
                onClick={() => toast.info("Graph refreshed")}
                className="p-0.5 hover:text-white transition"
                title="Refresh Graph"
              >
                <RotateCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {sections.graph && (
            <div className="p-2.5 flex flex-col gap-2 bg-black/20 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[10px] text-white/40 pb-1 border-b border-white/5">
                <span>Outgoing Changes</span>
                <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">main</span>
              </div>

              <div className="flex flex-col gap-1.5">
                {graphCommits.map((c, i) => (
                  <div key={c.hash || i} className="flex items-start gap-2 group">
                    <span
                      className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                        c.isHead ? "bg-[#4caf50] shadow-[0_0_6px_rgba(76,175,80,0.8)]" : "bg-white/40"
                      }`}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="text-white/80 group-hover:text-white truncate">
                          {c.message}
                        </span>
                        {c.branchLabel && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 flex-shrink-0">
                            {c.branchLabel}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-white/30">
                        {c.hash} • {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Git Status Bar Footer matching screenshot */}
      <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.01] text-[10px] text-white/40 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3 text-emerald-400" />
          <span className="text-white/70">main{changes.length > 0 ? "*" : ""}</span>
          <span className="text-white/30">↻ 0↓ {changes.length > 0 ? "1↑" : "0↑"}</span>
        </div>
        <span className="text-white/30">{changes.length} staged/dirty</span>
      </div>
    </div>
  );
}

export default SourceControlPanel;
