"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Code,
  Box,
  Layers,
  Variable,
  Search,
  X,
  Hash,
} from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

interface SymbolItem {
  name: string;
  kind: "function" | "class" | "interface" | "variable" | "method";
  line: number;
  preview: string;
}

function extractSymbols(code: string): SymbolItem[] {
  if (!code) return [];
  const lines = code.split("\n");
  const symbols: SymbolItem[] = [];

  const funcRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*function)/;
  const classRegex = /(?:class|interface|type|enum)\s+([a-zA-Z0-9_$]+)/;
  const constRegex = /(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=/;
  const methodRegex = /^\s*([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const lineNum = idx + 1;

    let match = line.match(classRegex);
    if (match && match[1]) {
      symbols.push({
        name: match[1],
        kind: line.startsWith("class") ? "class" : "interface",
        line: lineNum,
        preview: line,
      });
      return;
    }

    match = line.match(funcRegex);
    if (match) {
      const name = match[1] || match[2] || match[3];
      if (name) {
        symbols.push({
          name,
          kind: "function",
          line: lineNum,
          preview: line,
        });
        return;
      }
    }

    match = line.match(methodRegex);
    if (match && match[1] && !["if", "for", "while", "switch", "catch"].includes(match[1])) {
      symbols.push({
        name: match[1],
        kind: "method",
        line: lineNum,
        preview: line,
      });
      return;
    }

    match = line.match(constRegex);
    if (match && match[1]) {
      symbols.push({
        name: match[1],
        kind: "variable",
        line: lineNum,
        preview: line,
      });
    }
  });

  return symbols;
}

const getSymbolIcon = (kind: SymbolItem["kind"]) => {
  switch (kind) {
    case "function":
    case "method":
      return <Code className="w-4 h-4 text-purple-400" />;
    case "class":
      return <Box className="w-4 h-4 text-amber-400" />;
    case "interface":
      return <Layers className="w-4 h-4 text-cyan-400" />;
    case "variable":
      return <Variable className="w-4 h-4 text-emerald-400" />;
    default:
      return <Hash className="w-4 h-4 text-blue-400" />;
  }
};

export function SymbolPalette() {
  const isOpen = useIDEStore((s) => s.isSymbolSearchOpen);
  const setIsOpen = useIDEStore((s) => s.setSymbolSearchOpen);
  const activePath = useIDEStore((s) => s.activePath);
  const fileContentsCache = useIDEStore((s) => s.fileContentsCache);
  const setTargetJump = useIDEStore((s) => s.setTargetJump);
  const activeEditor = useIDEStore((s) => s.activeEditor);

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const symbols = useMemo(() => {
    if (!activePath) return [];
    let code = fileContentsCache[activePath] || "";
    if (!code && activeEditor) {
      try {
        code = activeEditor.getValue();
      } catch {
        // ignore
      }
    }
    return extractSymbols(code);
  }, [activePath, fileContentsCache, activeEditor]);

  const filteredSymbols = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return symbols;
    return symbols.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.kind.toLowerCase().includes(q) ||
        s.preview.toLowerCase().includes(q)
    );
  }, [symbols, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (sym: SymbolItem) => {
    if (activePath) {
      setTargetJump({ path: activePath, line: sym.line, column: 1 });
    } else if (activeEditor) {
      activeEditor.revealLineInCenter(sym.line);
      activeEditor.setPosition({ lineNumber: sym.line, column: 1 });
      activeEditor.focus();
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredSymbols.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev <= 0 ? filteredSymbols.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && filteredSymbols[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredSymbols[selectedIndex]);
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
        <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#1f1f23]">
          <Search className="w-4 h-4 text-white/40 mr-2.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Go to symbol in editor (e.g. myFunction, MyClass)…"
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
            ESC
          </kbd>
        </div>

        <div className="max-h-[380px] overflow-y-auto custom-scrollbar p-1">
          {filteredSymbols.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/40">
              {symbols.length === 0
                ? "No symbols found in current file"
                : "No matching symbols found"}
            </div>
          ) : (
            filteredSymbols.map((sym, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${sym.name}-${sym.line}-${idx}`}
                  onClick={() => handleSelect(sym)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
                    isSelected
                      ? "bg-purple-600/30 text-white border border-purple-500/40"
                      : "text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getSymbolIcon(sym.kind)}
                    <span className="font-medium text-white truncate">
                      {sym.name}
                    </span>
                    <span className="text-xs text-white/40 uppercase tracking-wider font-mono">
                      {sym.kind}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="truncate max-w-[200px] text-white/30 font-mono text-[11px]">
                      {sym.preview}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-white/50 font-mono text-[11px]">
                      line {sym.line}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 bg-[#141416] text-[11px] text-white/40">
          <span>Current file: {activePath || "None"}</span>
          <span>{filteredSymbols.length} symbols</span>
        </div>
      </motion.div>
    </div>
  );
}

export default SymbolPalette;
