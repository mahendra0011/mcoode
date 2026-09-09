"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  RotateCw,
  ChevronDown,
  ChevronRight,
  FilePlus,
  SlidersHorizontal,
  ExternalLink,
  Wand2,
  FileCode,
  Regex,
  CaseSensitive,
  WholeWord,
  X,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { toast } from "sonner";

export interface SearchResult {
  path: string;
  fileName: string;
  line: number;
  lineText: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchOptions {
  matchCase: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  preserveCase: boolean;
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(query: string, options: SearchOptions): RegExp | null {
  if (!query) return null;
  try {
    let pattern = options.useRegex ? query : escapeRegex(query);
    if (options.wholeWord) pattern = `\\b${pattern}\\b`;
    return new RegExp(pattern, options.matchCase ? "g" : "gi");
  } catch {
    return null;
  }
}

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [includeFilter, setIncludeFilter] = useState("");
  const [excludeFilter, setExcludeFilter] = useState("");
  const [allCollapsed, setAllCollapsed] = useState(false);
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  const [options, setOptions] = useState<SearchOptions>({
    matchCase: false,
    wholeWord: false,
    useRegex: false,
    preserveCase: false,
  });

  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const [refreshCount, setRefreshCount] = useState(0);

  const fileContentsCache = useIDEStore((s) => s.fileContentsCache);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const setFileContent = useIDEStore((s) => s.setFileContent);
  const recordTimeline = useIDEStore((s) => s.recordTimeline);

  const toggleOption = (key: keyof SearchOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Search across files with include/exclude filters (debounced 300ms)
  const results = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];
    const matcher = buildMatcher(q, options);
    if (!matcher) return [];

    const matches: SearchResult[] = [];
    const includes = includeFilter
      ? includeFilter.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const excludes = excludeFilter
      ? excludeFilter.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    for (const [path, content] of Object.entries(fileContentsCache)) {
      if (!content) continue;
      const lowerPath = path.toLowerCase();

      if (includes.length > 0 && !includes.some((inc) => lowerPath.includes(inc))) {
        continue;
      }
      if (excludes.length > 0 && excludes.some((exc) => lowerPath.includes(exc))) {
        continue;
      }

      const fileName = path.split("/").pop() || path;
      const lines = content.split("\n");

      lines.forEach((lineText, idx) => {
        matcher.lastIndex = 0;
        let match;
        while ((match = matcher.exec(lineText)) !== null) {
          matches.push({
            path,
            fileName,
            line: idx + 1,
            lineText,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
          });
          if (!matcher.global) break;
        }
      });
    }

    return matches;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, options, includeFilter, excludeFilter, fileContentsCache, refreshCount]);

  // Group by file path
  const grouped = useMemo(() => {
    const map: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!map[r.path]) map[r.path] = [];
      map[r.path].push(r);
    });
    return map;
  }, [results]);

  const toggleFileCollapse = (path: string) => {
    setCollapsedFiles((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleToggleCollapseAll = () => {
    const nextState = !allCollapsed;
    setAllCollapsed(nextState);
    const newCollapsed: Record<string, boolean> = {};
    Object.keys(grouped).forEach((path) => {
      newCollapsed[path] = nextState;
    });
    setCollapsedFiles(newCollapsed);
  };

  const handleJump = (path: string, line: number) => {
    addOpenFile(path);
    setTargetJump({ path, line });
  };

  const handleReplaceAll = useCallback(() => {
    if (!query || results.length === 0) return;
    const matcher = buildMatcher(query, options);
    if (!matcher) return;

    let totalReplacements = 0;
    let filesModified = 0;

    Object.entries(grouped).forEach(([path, matches]) => {
      const original = fileContentsCache[path];
      if (!original) return;

      const replaced = original.replace(matcher, (match) => {
        totalReplacements++;
        if (options.preserveCase) {
          if (match === match.toUpperCase()) return replaceText.toUpperCase();
          if (match === match.toLowerCase()) return replaceText.toLowerCase();
          if (match[0] === match[0].toUpperCase()) {
            return replaceText.charAt(0).toUpperCase() + replaceText.slice(1).toLowerCase();
          }
        }
        return replaceText;
      });

      if (replaced !== original) {
        filesModified++;
        setFileContent(path, replaced);
        recordTimeline(path, `Replaced ${matches.length} occurrences`, replaced);
      }
    });

    toast.success(
      `Replaced ${totalReplacements} occurrence${totalReplacements === 1 ? "" : "s"} across ${filesModified} file${
        filesModified === 1 ? "" : "s"
      }`
    );
  }, [query, replaceText, options, grouped, fileContentsCache, setFileContent, recordTimeline, results.length]);

  const handleOpenSearchEditor = () => {
    const reportPath = `Search: ${query || "results"}.txt`;
    const reportContent = [
      `# Search Results for: "${query}"`,
      `# Found ${results.length} matches in ${Object.keys(grouped).length} files\n`,
      ...Object.entries(grouped).map(([path, matches]) =>
        [`## ${path} (${matches.length})`, ...matches.map((m) => `  ${m.line}: ${m.lineText.trim()}`)].join("\n")
      ),
    ].join("\n\n");

    setFileContent(reportPath, reportContent);
    addOpenFile(reportPath);
    toast.success("Opened search results in editor tab");
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs w-full min-w-0 overflow-hidden">
      {/* Top Header Row with Exact Icons */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wider text-white/50 text-[11px]">
          Code Search
        </span>
        <div className="flex items-center gap-1">
          {/* ↻ Refresh */}
          <button
            type="button"
            onClick={() => setRefreshCount((c) => c + 1)}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Refresh (Ctrl+Shift+J)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* ≡ Collapse All */}
          <button
            type="button"
            onClick={handleToggleCollapseAll}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition font-mono"
            title={allCollapsed ? "Expand All" : "Collapse All"}
          >
            <span className="text-[13px] leading-none font-bold">≡</span>
          </button>

          {/* 📄+ New Search Editor */}
          <button
            type="button"
            onClick={handleOpenSearchEditor}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Open in New Search Editor"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>

          {/* ≡ Toggle Search Details (include/exclude) */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={`p-1 rounded transition ${
              showDetails ? "text-blue-400 bg-white/10" : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
            title="Toggle Search Details (Filters)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* ⧉ Open in Editor */}
          <button
            type="button"
            onClick={handleOpenSearchEditor}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition"
            title="Open Results in Editor Pane"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Replace Input Containers */}
      <div className="p-3 border-b border-white/5 flex flex-col gap-2">
        {/* Search Row */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowReplace(!showReplace)}
            className="text-white/40 hover:text-white transition p-0.5"
            title="Toggle Replace"
          >
            {showReplace ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          <div className="flex-1 flex items-center bg-[#1e1e1e] rounded border border-white/10 px-2 py-1 focus-within:border-blue-500">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="bg-transparent border-none outline-none text-xs text-white placeholder-white/30 flex-1 min-w-0"
            />
            <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
              {/* Aa: Match Case */}
              <button
                type="button"
                onClick={() => toggleOption("matchCase")}
                className={`px-1 py-0.5 rounded text-[10px] font-bold transition ${
                  options.matchCase ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
                }`}
                title="Match Case (Alt+C)"
              >
                Aa
              </button>

              {/* ab: Match Whole Word */}
              <button
                type="button"
                onClick={() => toggleOption("wholeWord")}
                className={`px-1 py-0.5 rounded text-[10px] font-bold transition ${
                  options.wholeWord ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
                }`}
                title="Match Whole Word (Alt+W)"
              >
                ab
              </button>

              {/* .*: Use Regular Expression */}
              <button
                type="button"
                onClick={() => toggleOption("useRegex")}
                className={`px-1 py-0.5 rounded text-[10px] font-bold transition ${
                  options.useRegex ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
                }`}
                title="Use Regular Expression (Alt+R)"
              >
                .*
              </button>
            </div>
          </div>
        </div>

        {/* Replace Row */}
        {showReplace && (
          <div className="flex items-center gap-1.5 pl-5">
            <div className="flex-1 flex items-center bg-[#1e1e1e] rounded border border-white/10 px-2 py-1 focus-within:border-blue-500">
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace"
                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/30 flex-1 min-w-0"
              />
              <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                {/* AB: Preserve Case */}
                <button
                  type="button"
                  onClick={() => toggleOption("preserveCase")}
                  className={`px-1 py-0.5 rounded text-[10px] font-bold transition ${
                    options.preserveCase ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"
                  }`}
                  title="Preserve Case (Alt+P)"
                >
                  AB
                </button>

                {/* 🪄 Replace All */}
                <button
                  type="button"
                  onClick={handleReplaceAll}
                  disabled={!query || results.length === 0}
                  className="px-1 py-0.5 text-xs text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60 transition flex items-center justify-center leading-none"
                  title="Replace All (Ctrl+Alt+Enter)"
                >
                  <span className="text-[12px] leading-none">🪄</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Details: Include & Exclude filters */}
        {showDetails && (
          <div className="flex flex-col gap-1.5 pl-5 pt-1 border-t border-white/5 mt-1">
            <div>
              <span className="text-[10px] text-white/40 mb-0.5 block">files to include</span>
              <input
                type="text"
                value={includeFilter}
                onChange={(e) => setIncludeFilter(e.target.value)}
                placeholder="e.g. *.ts, src/**"
                className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="text-[10px] text-white/40 mb-0.5 block">files to exclude</span>
              <input
                type="text"
                value={excludeFilter}
                onChange={(e) => setExcludeFilter(e.target.value)}
                placeholder="e.g. node_modules, dist"
                className="w-full bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-white/20 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Header Count */}
      <div className="px-3 py-1.5 border-b border-white/5 text-[11px] text-white/40 flex items-center justify-between bg-white/[0.02]">
        <span>
          {results.length} {results.length === 1 ? "result" : "results"} in {Object.keys(grouped).length}{" "}
          {Object.keys(grouped).length === 1 ? "file" : "files"}
        </span>
      </div>

      {/* Results Tree List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-2">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-white/30 text-center py-8">
            {query.trim() ? "No results match your search." : "Type to search in workspace files."}
          </div>
        ) : (
          Object.entries(grouped).map(([path, matches]) => {
            const isCollapsed = collapsedFiles[path] || false;
            const fileName = matches[0]?.fileName || path;
            const dirPath = path.substring(0, path.lastIndexOf("/"));

            return (
              <div key={path} className="mb-2">
                {/* File Header */}
                <button
                  type="button"
                  onClick={() => toggleFileCollapse(path)}
                  className="w-full flex items-center justify-between p-1 rounded hover:bg-white/5 text-left group select-none"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                    )}
                    <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="font-semibold text-white/90 truncate">{fileName}</span>
                    {dirPath && <span className="text-[10px] text-white/30 truncate">{dirPath}</span>}
                  </div>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60 ml-2">
                    {matches.length}
                  </span>
                </button>

                {/* Match Line Snippets */}
                {!isCollapsed && (
                  <div className="mt-0.5 flex flex-col pl-4">
                    {matches.map((m, i) => {
                      const before = m.lineText.slice(0, m.matchStart);
                      const matched = m.lineText.slice(m.matchStart, m.matchEnd);
                      const after = m.lineText.slice(m.matchEnd);

                      return (
                        <button
                          key={`${m.line}-${i}`}
                          type="button"
                          onClick={() => handleJump(m.path, m.line)}
                          className="flex items-start gap-2 text-left py-1 px-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition group"
                        >
                          <span className="text-[10px] font-mono text-blue-400/80 w-6 text-right flex-shrink-0 pt-0.5">
                            {m.line}
                          </span>
                          <div className="font-mono text-xs truncate flex-1 leading-snug">
                            <span>{before.trimStart()}</span>
                            <mark className="bg-yellow-500/40 text-yellow-200 px-0.5 rounded-sm">
                              {matched}
                            </mark>
                            <span>{after}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SearchPanel;
