"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Keyboard, Search, X } from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";

interface ShortcutEntry {
  command: string;
  keys: string;
  category: string;
}

const ALL_SHORTCUTS: ShortcutEntry[] = [
  // File
  { command: "New Text File", keys: "Ctrl+N", category: "File" },
  { command: "New Window", keys: "Ctrl+Shift+N", category: "File" },
  { command: "Open File...", keys: "Ctrl+O", category: "File" },
  { command: "Save", keys: "Ctrl+S", category: "File" },
  { command: "Save As...", keys: "Ctrl+Shift+S", category: "File" },
  { command: "Save All", keys: "Ctrl+K S", category: "File" },
  { command: "Close Editor", keys: "Ctrl+W", category: "File" },
  { command: "Close Folder", keys: "Ctrl+K F", category: "File" },
  { command: "Close Window", keys: "Ctrl+Shift+W", category: "File" },

  // Edit
  { command: "Undo", keys: "Ctrl+Z", category: "Edit" },
  { command: "Redo", keys: "Ctrl+Y", category: "Edit" },
  { command: "Cut", keys: "Ctrl+X", category: "Edit" },
  { command: "Copy", keys: "Ctrl+C", category: "Edit" },
  { command: "Paste", keys: "Ctrl+V", category: "Edit" },
  { command: "Find in File", keys: "Ctrl+F", category: "Edit" },
  { command: "Replace in File", keys: "Ctrl+H", category: "Edit" },
  { command: "Find in Files", keys: "Ctrl+Shift+F", category: "Edit" },
  { command: "Replace in Files", keys: "Ctrl+Shift+H", category: "Edit" },
  { command: "Toggle Line Comment", keys: "Ctrl+/", category: "Edit" },
  { command: "Toggle Block Comment", keys: "Shift+Alt+A", category: "Edit" },

  // Selection
  { command: "Select All", keys: "Ctrl+A", category: "Selection" },
  { command: "Expand Selection", keys: "Shift+Alt+Right", category: "Selection" },
  { command: "Shrink Selection", keys: "Shift+Alt+Left", category: "Selection" },
  { command: "Copy Line Up", keys: "Shift+Alt+Up", category: "Selection" },
  { command: "Copy Line Down", keys: "Shift+Alt+Down", category: "Selection" },
  { command: "Move Line Up", keys: "Alt+Up", category: "Selection" },
  { command: "Move Line Down", keys: "Alt+Down", category: "Selection" },
  { command: "Add Cursor Above", keys: "Ctrl+Alt+Up", category: "Selection" },
  { command: "Add Cursor Below", keys: "Ctrl+Alt+Down", category: "Selection" },
  { command: "Add Cursors to Line Ends", keys: "Shift+Alt+I", category: "Selection" },
  { command: "Add Next Occurrence", keys: "Ctrl+D", category: "Selection" },
  { command: "Select All Occurrences", keys: "Ctrl+Shift+L", category: "Selection" },

  // View
  { command: "Command Palette", keys: "Ctrl+Shift+P", category: "View" },
  { command: "Toggle Primary Sidebar", keys: "Ctrl+B", category: "View" },
  { command: "Toggle Panel (Terminal)", keys: "Ctrl+J", category: "View" },
  { command: "Explorer", keys: "Ctrl+Shift+E", category: "View" },
  { command: "Search in Files", keys: "Ctrl+Shift+F", category: "View" },
  { command: "Source Control", keys: "Ctrl+Shift+G", category: "View" },
  { command: "Run & Debug", keys: "Ctrl+Shift+D", category: "View" },
  { command: "Extensions", keys: "Ctrl+Shift+X", category: "View" },
  { command: "Problems", keys: "Ctrl+Shift+M", category: "View" },
  { command: "Output", keys: "Ctrl+Shift+U", category: "View" },
  { command: "Debug Console", keys: "Ctrl+Shift+Y", category: "View" },
  { command: "Terminal", keys: "Ctrl+`", category: "View" },
  { command: "Toggle Word Wrap", keys: "Alt+Z", category: "View" },

  // Go
  { command: "Go Back", keys: "Alt+Left", category: "Go" },
  { command: "Go Forward", keys: "Alt+Right", category: "Go" },
  { command: "Last Edit Location", keys: "Ctrl+K Ctrl+Q", category: "Go" },
  { command: "Go to File (Quick Open)", keys: "Ctrl+P", category: "Go" },
  { command: "Go to Symbol in Editor", keys: "Ctrl+Shift+O", category: "Go" },
  { command: "Go to Symbol in Workspace", keys: "Ctrl+T", category: "Go" },
  { command: "Go to Definition", keys: "F12", category: "Go" },
  { command: "Go to References", keys: "Shift+F12", category: "Go" },
  { command: "Go to Line / Column", keys: "Ctrl+G", category: "Go" },
  { command: "Go to Matching Bracket", keys: "Ctrl+Shift+\\", category: "Go" },
  { command: "Next Problem", keys: "F8", category: "Go" },
  { command: "Previous Problem", keys: "Shift+F8", category: "Go" },
  { command: "Next Change", keys: "Alt+F3", category: "Go" },
  { command: "Previous Change", keys: "Shift+Alt+F3", category: "Go" },

  // Run
  { command: "Start Debugging", keys: "F5", category: "Run" },
  { command: "Run Without Debugging", keys: "Ctrl+F5", category: "Run" },
  { command: "Stop Debugging", keys: "Shift+F5", category: "Run" },
  { command: "Restart Debugging", keys: "Ctrl+Shift+F5", category: "Run" },
  { command: "Step Over", keys: "F10", category: "Run" },
  { command: "Step Into", keys: "F11", category: "Run" },
  { command: "Step Out", keys: "Shift+F11", category: "Run" },
  { command: "Toggle Breakpoint", keys: "F9", category: "Run" },

  // Terminal
  { command: "New Terminal", keys: "Ctrl+Shift+`", category: "Terminal" },
  { command: "Split Terminal", keys: "Ctrl+Shift+5", category: "Terminal" },
  { command: "Run Build Task", keys: "Ctrl+Shift+B", category: "Terminal" },

  // Help
  { command: "Keyboard Shortcuts Reference", keys: "Ctrl+K Ctrl+R", category: "Help" },
];

export function ShortcutsReferenceModal() {
  const isOpen = useIDEStore((s) => s.isShortcutsOpen);
  const setIsOpen = useIDEStore((s) => s.setShortcutsOpen);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = useMemo(() => {
    return ["All", "File", "Edit", "Selection", "View", "Go", "Run", "Terminal", "Help"];
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_SHORTCUTS.filter((s) => {
      const matchCat = activeCategory === "All" || s.category === activeCategory;
      const matchQuery =
        !q ||
        s.command.toLowerCase().includes(q) ||
        s.keys.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [query, activeCategory]);

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
        className="w-full max-w-3xl max-h-[80vh] bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1f1f23]">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-white">Keyboard Shortcuts Reference</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-white/10 bg-[#161618] flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72 flex items-center">
            <Search className="w-4 h-4 text-white/40 absolute left-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search shortcuts..."
              className="w-full bg-[#1e1e22] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full custom-scrollbar pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-white/40">
              No shortcuts found matching "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={`${item.command}-${idx}`}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/40 font-mono">
                    {item.category}
                  </span>
                  <span className="text-sm font-medium text-white/90">
                    {item.command}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.keys.split(" ").map((kGroup, gIdx) => (
                    <span key={gIdx} className="flex items-center gap-1">
                      {kGroup.split("+").map((key, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 text-xs font-mono bg-[#27272a] border border-white/10 text-white/80 rounded shadow-sm"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#141416] flex items-center justify-between text-xs text-white/40">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">ESC</kbd> to close</span>
          <span>{filtered.length} shortcut{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </motion.div>
    </div>
  );
}

export default ShortcutsReferenceModal;
