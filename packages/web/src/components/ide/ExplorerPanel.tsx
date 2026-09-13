"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  FileCode,
  X,
  Play,
  History,
  Check,
  Code2,
  FileText,
  Boxes,
  Plus,
  FilePlus,
  FolderPlus,
  RotateCw,
  FolderMinus,
} from "lucide-react";
import { FileTree } from "./FileTree";
import { useIDEStore } from "../../store/ideStore";
import { ALL_LANGUAGES } from "../../lib/languagesData";
import { LanguageIcon } from "./LanguageIcon";
import { toast } from "sonner";
import api from "../../lib/axios";

interface OutlineSymbol {
  name: string;
  kind: "function" | "class" | "variable" | "interface";
  line: number;
}

function extractOutline(code: string, filePath = ""): OutlineSymbol[] {
  if (!code) return [];
  const symbols: OutlineSymbol[] = [];
  const lines = code.split("\n");
  const ext = filePath.split(".").pop()?.toLowerCase() || "";

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") && ext !== "md" && ext !== "markdown") {
      // In python, check if it's a comment or code
      if (ext === "py" && trimmed.startsWith("#")) return;
    }

    // 1. Python
    if (ext === "py") {
      const pyClass = line.match(/^class\s+([a-zA-Z0-9_]+)/);
      const pyDef = line.match(/^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)/);
      if (pyClass) {
        symbols.push({ name: pyClass[1], kind: "class", line: idx + 1 });
        return;
      }
      if (pyDef) {
        symbols.push({ name: pyDef[1], kind: "function", line: idx + 1 });
        return;
      }
    }

    // 2. Go
    if (ext === "go") {
      const goFunc = line.match(/^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)/);
      const goStruct = line.match(/^type\s+([a-zA-Z0-9_]+)\s+struct/);
      const goIface = line.match(/^type\s+([a-zA-Z0-9_]+)\s+interface/);
      if (goFunc) {
        symbols.push({ name: goFunc[1], kind: "function", line: idx + 1 });
        return;
      }
      if (goStruct) {
        symbols.push({ name: goStruct[1], kind: "class", line: idx + 1 });
        return;
      }
      if (goIface) {
        symbols.push({ name: goIface[1], kind: "interface", line: idx + 1 });
        return;
      }
    }

    // 3. Rust
    if (ext === "rs") {
      const rsFn = line.match(/(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/);
      const rsStruct = line.match(/(?:pub(?:\([^)]+\))?\s+)?struct\s+([a-zA-Z0-9_]+)/);
      const rsEnum = line.match(/(?:pub(?:\([^)]+\))?\s+)?enum\s+([a-zA-Z0-9_]+)/);
      const rsTrait = line.match(/(?:pub(?:\([^)]+\))?\s+)?trait\s+([a-zA-Z0-9_]+)/);
      const rsImpl = line.match(/^impl(?:<[^>]+>)?\s+(?:[a-zA-Z0-9_:]+\s+for\s+)?([a-zA-Z0-9_:]+)/);
      if (rsFn) {
        symbols.push({ name: rsFn[1], kind: "function", line: idx + 1 });
        return;
      }
      if (rsStruct) {
        symbols.push({ name: rsStruct[1], kind: "class", line: idx + 1 });
        return;
      }
      if (rsEnum) {
        symbols.push({ name: rsEnum[1], kind: "class", line: idx + 1 });
        return;
      }
      if (rsTrait) {
        symbols.push({ name: rsTrait[1], kind: "interface", line: idx + 1 });
        return;
      }
      if (rsImpl) {
        symbols.push({ name: `impl ${rsImpl[1]}`, kind: "class", line: idx + 1 });
        return;
      }
    }

    // 4. Markdown headings
    if (ext === "md" || ext === "markdown") {
      const heading = line.match(/^(#{1,6})\s+(.+)/);
      if (heading) {
        symbols.push({ name: `${heading[1]} ${heading[2].trim()}`, kind: "variable", line: idx + 1 });
        return;
      }
    }

    // 5. JavaScript / TypeScript / General
    const fn = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/);
    const cls = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/);
    const iface = line.match(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_$]+)/);
    const constFn = line.match(/(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
    const regularConst = line.match(/(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=/);

    if (fn) symbols.push({ name: fn[1], kind: "function", line: idx + 1 });
    else if (cls) symbols.push({ name: cls[1], kind: "class", line: idx + 1 });
    else if (iface) symbols.push({ name: iface[1], kind: "interface", line: idx + 1 });
    else if (constFn) symbols.push({ name: constFn[1], kind: "function", line: idx + 1 });
    else if (regularConst) symbols.push({ name: regularConst[1], kind: "variable", line: idx + 1 });
  });

  return symbols;
}

function kindIcon(kind: OutlineSymbol["kind"]) {
  switch (kind) {
    case "function":
      return <span className="text-purple-400 font-mono font-bold text-[11px] w-3 text-center">ƒ</span>;
    case "class":
      return <span className="text-yellow-400 font-mono font-bold text-[11px] w-3 text-center">C</span>;
    case "interface":
      return <span className="text-blue-400 font-mono font-bold text-[11px] w-3 text-center">I</span>;
    case "variable":
      return <span className="text-cyan-400 font-mono font-bold text-[11px] w-3 text-center">V</span>;
    default:
      return <span className="text-white/40 font-mono font-bold text-[11px] w-3 text-center">•</span>;
  }
}

interface SectionProps {
  title: string;
  count?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, count, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/5 flex flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 text-left text-white/60 hover:text-white transition group select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white" />
          )}
          <span className="font-semibold text-[11px] uppercase tracking-wider truncate">
            {title}
          </span>
        </div>
        {count !== undefined && (
          <span className="text-[10px] text-white/40 bg-white/5 px-1.5 rounded">{count}</span>
        )}
      </button>
      {open && <div className="pb-1">{children}</div>}
    </div>
  );
}

const VIEWS_STORAGE_KEY = "mcode_explorer_views";

export interface ExplorerPanelProps {
  workspaceId: string | null | undefined;
  projectName?: string;
}

export function ExplorerPanel({ workspaceId, projectName = "cli" }: ExplorerPanelProps) {
  const openFiles = useIDEStore((s) => s.openFiles);
  const activePath = useIDEStore((s) => s.activePath);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const closeFile = useIDEStore((s) => s.closeFile);
  const fileContentsCache = useIDEStore((s) => s.fileContentsCache);
  const setFileContent = useIDEStore((s) => s.setFileContent);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const timelines = useIDEStore((s) => s.timelines);
  const runTerminalCommandFn = useIDEStore((s) => s.runTerminalCommandFn);
  const selectedLanguages = useIDEStore((s) => s.selectedLanguages);
  const toggleLanguage = useIDEStore((s) => s.toggleLanguage);
  const createLanguageFile = useIDEStore((s) => s.createLanguageFile);
  const bumpRefresh = useIDEStore((s) => s.bumpRefresh);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddLanguages, setShowAddLanguages] = useState(false);
  const [searchLanguage, setSearchLanguage] = useState("");
  const [visibleViews, setVisibleViews] = useState<Record<string, boolean>>({
    "Open Editors": true,
    "Folders": true,
    "Languages": true,
    "Outline": true,
    "Timeline": true,
    "NPM Scripts": true,
  });

  // Restore view preferences
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(VIEWS_STORAGE_KEY);
      if (saved) setVisibleViews(JSON.parse(saved));
    } catch (e) {
      console.warn("Failed to load explorer view preferences:", e);
    }
  }, []);

  const toggleView = (view: string) => {
    const next = { ...visibleViews, [view]: !visibleViews[view] };
    setVisibleViews(next);
    try {
      localStorage.setItem(VIEWS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save explorer view preferences:", e);
    }
  };

  const handleNewFile = async () => {
    if (!workspaceId) {
      toast.info("Create or select a workspace to add files");
      return;
    }
    const name = window.prompt("New File name (e.g. index.ts):");
    if (!name || !name.trim()) return;
    const filePath = name.trim();
    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/file`, {
        path: filePath,
        content: "",
      });
      toast.success(`Created file "${filePath}"`);
      useIDEStore.getState().addOpenFile(filePath);
      bumpRefresh();
    } catch (err: any) {
      toast.error(`Failed to create file: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const handleNewFolder = async () => {
    if (!workspaceId) {
      toast.info("Create or select a workspace to add folders");
      return;
    }
    const name = window.prompt("New Folder name (e.g. src/components):");
    if (!name || !name.trim()) return;
    const folderPath = name.trim();
    try {
      await api.post(`/api/v1/workspaces/${workspaceId}/file`, {
        path: `${folderPath}/.keep`,
        content: "",
      });
      toast.success(`Created folder "${folderPath}"`);
      bumpRefresh();
    } catch (err: any) {
      toast.error(`Failed to create folder: ${err?.response?.data?.error?.message || err.message}`);
    }
  };

  const handleRefresh = () => {
    bumpRefresh();
    toast.success("Refreshed explorer files");
  };

  const handleCollapseAll = () => {
    document.dispatchEvent(new CustomEvent("filetree:collapse-all"));
    toast.info("Collapsed all folders");
  };

  // Active file code for Outline
  const activeCode = activePath ? fileContentsCache[activePath] || "" : "";
  const outlineSymbols = useMemo(() => extractOutline(activeCode, activePath || ""), [activeCode, activePath]);

  // Active file timeline
  const activeTimeline = activePath ? timelines[activePath] || [] : [];

  // Parse package.json scripts
  const npmScripts = useMemo<Record<string, string>>(() => {
    let pkgContent = "";
    for (const [path, content] of Object.entries(fileContentsCache)) {
      if (path.endsWith("package.json")) {
        pkgContent = content;
        break;
      }
    }
    if (!pkgContent) return {};
    try {
      const parsed = JSON.parse(pkgContent);
      const scripts = parsed?.scripts || {};
      const res: Record<string, string> = {};
      for (const [k, v] of Object.entries(scripts)) {
        res[k] = String(v);
      }
      return res;
    } catch {
      return {};
    }
  }, [fileContentsCache]);

  const handleRunScript = (scriptName: string, command: string) => {
    if (runTerminalCommandFn) {
      runTerminalCommandFn(`npm run ${scriptName}`);
      toast.success(`Running npm script: ${scriptName}`);
    } else {
      toast.info(`Script: npm run ${scriptName} (${command})`);
    }
  };

  const handleRestoreSnapshot = (snapshot: string, label: string) => {
    if (!activePath) return;
    setFileContent(activePath, snapshot);
    toast.success(`Restored snapshot: ${label}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs w-full min-w-0 overflow-hidden">
      {/* Explorer Main Header matching VS Code UI */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between relative bg-[#181818]/60">
        <span className="font-semibold uppercase tracking-wider text-white/70 text-[11px] truncate max-w-[120px]">
          {projectName || "EXPLORER"}
        </span>

        {/* Header Action Buttons (Image 1) */}
        <div className="flex items-center gap-0.5 text-white/50 relative">
          <button
            type="button"
            onClick={handleNewFile}
            className="p-1 rounded hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="New File..."
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNewFolder}
            className="p-1 rounded hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="New Folder..."
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1 rounded hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Refresh Explorer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCollapseAll}
            className="p-1 rounded hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Collapse All Folders"
          >
            <FolderMinus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Views and More Actions..."
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Views Dropdown Menu with Checkmarks (Image 2) */}
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1.5 w-48 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs flex flex-col"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="px-3 py-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/5">
                Toggle Explorer Views
              </div>
              {[
                { key: "Open Editors", label: "Open Editors" },
                { key: "Folders", label: "Folders" },
                { key: "Languages", label: "Languages" },
                { key: "Outline", label: "Outline" },
                { key: "Timeline", label: "Timeline" },
                { key: "NPM Scripts", label: "NPM Scripts" },
              ].map(({ key, label }) => {
                const isVisible = visibleViews[key] !== false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleView(key)}
                    className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 text-left text-white/80 hover:text-white transition cursor-pointer"
                  >
                    <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {isVisible && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </span>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Sections Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col">
        {/* 1. Open Editors Section */}
        {visibleViews["Open Editors"] && (
          <Section title="Open Editors" count={openFiles.length} defaultOpen={true}>
            {openFiles.length === 0 ? (
              <div className="px-5 py-2 text-[11px] text-white/30 italic">No open editors</div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {openFiles.map((path) => {
                  const fileName = path.split("/").pop() || path;
                  const isActive = activePath === path;
                  return (
                    <div
                      key={path}
                      onClick={() => setActivePath(path)}
                      className={`flex items-center justify-between px-3 py-1 cursor-pointer group text-xs ${
                        isActive ? "bg-white/10 text-white font-medium" : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        <span className="truncate" title={path}>
                          {fileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeFile(path);
                        }}
                        className="p-0.5 text-white/20 hover:text-white rounded opacity-0 group-hover:opacity-100 transition"
                        title="Close File"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* 2. Folders (File Tree + Upload) Section */}
        {visibleViews["Folders"] && (
          <Section title={projectName} defaultOpen={true}>
            <div className="min-h-[160px]">
              <FileTree workspaceId={workspaceId} />
            </div>
          </Section>
        )}

        {/* 2.5 Languages Section */}
        {visibleViews["Languages"] && (
          <Section title="Languages" count={selectedLanguages.length} defaultOpen={true}>
            <div className="flex flex-col gap-1 px-2 py-1.5">
              {selectedLanguages.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-white/40 italic">
                  No languages selected.
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {selectedLanguages.map((langName) => {
                    const lang = ALL_LANGUAGES.find((l) => l.name === langName);
                    const color = lang ? lang.color : "#3b82f6";
                    const ext = lang ? lang.extension : "";
                    return (
                      <div
                        key={langName}
                        className="flex items-center justify-between px-2 py-1 hover:bg-white/5 rounded-md group text-xs text-white/80"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <LanguageIcon
                            id={langName}
                            name={langName}
                            color={color}
                            className="w-4 h-4 flex-shrink-0 rounded shadow-sm"
                          />
                          <span className="truncate font-medium">{langName}</span>
                          <span className="text-[10px] text-white/30 font-mono">{ext}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              createLanguageFile(langName);
                              toast.success(`Created new ${langName} file`);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-blue-400 hover:text-blue-300"
                            title={`New ${langName} file`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLanguage(langName)}
                            className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white"
                            title="Remove language"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add / Manage languages expandable row */}
              <div className="pt-1 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddLanguages(!showAddLanguages)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-white/5 rounded transition"
                >
                  <span className="flex items-center gap-1">
                    <Plus className="w-3 h-3" /> {showAddLanguages ? "Close Languages List" : "Add / Manage Languages..."}
                  </span>
                  <span className="text-[10px] text-white/30">54 available</span>
                </button>

                {showAddLanguages && (
                  <div className="mt-1.5 p-2 bg-[#141416] border border-white/10 rounded-lg space-y-2">
                    <input
                      type="text"
                      value={searchLanguage}
                      onChange={(e) => setSearchLanguage(e.target.value)}
                      placeholder="Filter 50+ languages..."
                      className="w-full px-2 py-1 text-[11px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-blue-500/50"
                    />
                    <div className="max-h-36 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                      {ALL_LANGUAGES.filter((l) =>
                        l.name.toLowerCase().includes(searchLanguage.toLowerCase()) ||
                        l.category.toLowerCase().includes(searchLanguage.toLowerCase())
                      ).map((lang) => {
                        const isSelected = selectedLanguages.includes(lang.name);
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => toggleLanguage(lang.name)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[11px] transition text-left ${
                              isSelected
                                ? "bg-blue-500/20 text-white font-medium"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <LanguageIcon
                                id={lang.id}
                                name={lang.name}
                                color={lang.color}
                                className="w-3.5 h-3.5 flex-shrink-0 rounded shadow-sm"
                              />
                              <span className="truncate">{lang.name}</span>
                              <span className="text-[9px] text-white/30 font-mono">{lang.extension}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* 3. Outline (Active File Symbols) Section */}
        {visibleViews["Outline"] && (
          <Section title="Outline" count={outlineSymbols.length} defaultOpen={false}>
            {!activePath ? (
              <div className="px-5 py-2 text-[11px] text-white/30 italic">No active file</div>
            ) : outlineSymbols.length === 0 ? (
              <div className="px-5 py-2 text-[11px] text-white/30 italic">No symbols found</div>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                {outlineSymbols.map((sym, i) => (
                  <button
                    key={`${sym.name}-${sym.line}-${i}`}
                    type="button"
                    onClick={() => setTargetJump({ path: activePath, line: sym.line })}
                    className="flex items-center gap-2 px-4 py-1 hover:bg-white/5 text-left text-white/70 hover:text-white transition group"
                  >
                    {kindIcon(sym.kind)}
                    <span className="truncate flex-1 font-mono text-xs">{sym.name}</span>
                    <span className="text-[10px] text-white/30 font-mono group-hover:text-white/50">
                      :{sym.line}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* 4. Timeline (Edit & Save History) Section */}
        {visibleViews["Timeline"] && (
          <Section title="Timeline" count={activeTimeline.length} defaultOpen={false}>
            {!activePath ? (
              <div className="px-5 py-2 text-[11px] text-white/30 italic">No active file</div>
            ) : activeTimeline.length === 0 ? (
              <div className="px-5 py-2 text-[11px] text-white/30 italic">No timeline entries yet</div>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                {activeTimeline.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRestoreSnapshot(item.contentSnapshot, item.label)}
                    className="flex items-center justify-between px-4 py-1 hover:bg-white/5 text-left text-white/70 hover:text-white transition group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <History className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono group-hover:text-white/50 flex-shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* 5. NPM Scripts Section */}
        {visibleViews["NPM Scripts"] && (
          <Section title="NPM Scripts" count={Object.keys(npmScripts).length} defaultOpen={false}>
            {Object.keys(npmScripts).length === 0 ? (
              <div className="px-5 py-2 text-[11px] text-white/30 italic">No scripts in package.json</div>
            ) : (
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                {Object.entries(npmScripts).map(([name, cmd]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleRunScript(name, cmd)}
                    className="flex items-center justify-between px-4 py-1 hover:bg-white/5 text-left text-white/70 hover:text-white transition group"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Play className="w-3 h-3 text-emerald-400 fill-current flex-shrink-0" />
                      <span className="font-mono text-xs text-white/90 truncate">{name}</span>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono truncate max-w-[90px]" title={cmd}>
                      {cmd}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

export default ExplorerPanel;
