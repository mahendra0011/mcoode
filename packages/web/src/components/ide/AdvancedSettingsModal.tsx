"use client";
import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X, Search, ChevronRight, ChevronDown, Sliders, RotateCcw,
  Sparkles, Code, CheckSquare, Layers, Cpu, MousePointer, Move, Space,
  Braces, Scroll, Brackets, Quote, ClipboardCheck, Keyboard, Wrench,
  Indent, SearchCode, Maximize2, Columns, Scissors, Eye, Clock,
  CornerDownLeft, Binary
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { useSettingsStore, type AdvancedEditorSettings } from "../../store/settingsStore";

interface SettingItem {
  key: keyof AdvancedEditorSettings;
  label: string;
  description: string;
  type: "boolean" | "enum" | "number";
  options?: { value: string; label: string }[];
  defaultVal: any;
  icon?: React.ElementType;
}

interface SectionCategory {
  id: string;
  label: string;
  icon: any;
  settings: SettingItem[];
}

const ADVANCED_CATEGORIES: SectionCategory[] = [
  {
    id: "cursor-rendering",
    label: "Cursor & Rendering",
    icon: Sliders,
    settings: [
      {
        key: "cursorBlinking",
        label: "Cursor Blinking",
        description: "Controls cursor animation style when idle.",
        type: "enum",
        defaultVal: "blink",
        icon: Sparkles,
        options: [
          { value: "blink", label: "Blink (Standard)" },
          { value: "smooth", label: "Smooth Fade" },
          { value: "phase", label: "Phase Transition" },
          { value: "expand", label: "Expand" },
          { value: "solid", label: "Solid (No Blink)" },
        ],
      },
      {
        key: "cursorStyle",
        label: "Cursor Style",
        description: "Controls the visual appearance of the editor cursor.",
        type: "enum",
        defaultVal: "line",
        icon: MousePointer,
        options: [
          { value: "line", label: "Line (Default)" },
          { value: "block", label: "Block" },
          { value: "underline", label: "Underline" },
          { value: "line-thin", label: "Thin Line" },
          { value: "block-outline", label: "Block Outline" },
        ],
      },
      {
        key: "cursorSmoothCaretAnimation",
        label: "Smooth Caret Animation",
        description: "Controls whether the smooth caret animation should be enabled when moving the cursor.",
        type: "enum",
        defaultVal: "off",
        icon: Move,
        options: [
          { value: "off", label: "Off (Instant Jump)" },
          { value: "on", label: "On (Fluid Gliding)" },
          { value: "explicit", label: "Explicit (Only on Click)" },
        ],
      },
      {
        key: "renderWhitespace",
        label: "Render Whitespace",
        description: "Controls how whitespace characters (spaces, tabs) are shown in the code editor.",
        type: "enum",
        defaultVal: "selection",
        icon: Space,
        options: [
          { value: "none", label: "None" },
          { value: "boundary", label: "Boundary (Except Single Spaces)" },
          { value: "selection", label: "Selection (Only Highlighted Text)" },
          { value: "trailing", label: "Trailing Only" },
          { value: "all", label: "All Characters" },
        ],
      },
      {
        key: "bracketPairColorization",
        label: "Bracket Pair Colorization",
        description: "Colorizes matching bracket pairs with distinct hues for easier visual parsing.",
        type: "boolean",
        defaultVal: true,
        icon: Braces,
      },
      {
        key: "smoothScrolling",
        label: "Smooth Scrolling",
        description: "Enables smooth inertia animation when scrolling large source files.",
        type: "boolean",
        defaultVal: true,
        icon: Scroll,
      },
    ],
  },
  {
    id: "editing-automation",
    label: "Editing & Formatting",
    icon: Code,
    settings: [
      {
        key: "autoClosingBrackets",
        label: "Auto Closing Brackets",
        description: "Automatically inserts matching closing brackets (), {}, [].",
        type: "enum",
        defaultVal: "always",
        icon: Brackets,
        options: [
          { value: "always", label: "Always" },
          { value: "languageDefined", label: "Language Defined" },
          { value: "beforeWhitespace", label: "Only Before Whitespace" },
          { value: "never", label: "Never" },
        ],
      },
      {
        key: "autoClosingQuotes",
        label: "Auto Closing Quotes",
        description: "Automatically inserts matching single, double, or backtick quotes.",
        type: "enum",
        defaultVal: "always",
        icon: Quote,
        options: [
          { value: "always", label: "Always" },
          { value: "languageDefined", label: "Language Defined" },
          { value: "beforeWhitespace", label: "Only Before Whitespace" },
          { value: "never", label: "Never" },
        ],
      },
      {
        key: "formatOnPaste",
        label: "Format on Paste",
        description: "Automatically format pasted code snippet according to document rules.",
        type: "boolean",
        defaultVal: false,
        icon: ClipboardCheck,
      },
      {
        key: "formatOnType",
        label: "Format on Type",
        description: "Automatically format lines upon entering triggering characters (e.g. semicolon, closing brace).",
        type: "boolean",
        defaultVal: false,
        icon: Keyboard,
      },
      {
        key: "defaultFormatter",
        label: "Default Formatter",
        description: "Engine used for running code formatting commands.",
        type: "enum",
        defaultVal: "prettier",
        icon: Wrench,
        options: [
          { value: "prettier", label: "Prettier (Built-in)" },
          { value: "eslint", label: "ESLint Auto-Fix" },
          { value: "none", label: "None (Raw Indentation)" },
        ],
      },
      {
        key: "autoIndent",
        label: "Auto Indentation Mode",
        description: "Controls how indentation is calculated when typing new lines.",
        type: "enum",
        defaultVal: "full",
        icon: Indent,
        options: [
          { value: "full", label: "Full (Syntax & Language Aware)" },
          { value: "advanced", label: "Advanced" },
          { value: "brackets", label: "Brackets Only" },
          { value: "keep", label: "Keep Previous Line Indent" },
          { value: "none", label: "None" },
        ],
      },
    ],
  },
  {
    id: "find-diff",
    label: "Find Widget & Diff",
    icon: Layers,
    settings: [
      {
        key: "findSeedSelection",
        label: "Seed Search from Selection",
        description: "Seed the search string in the Find widget from the active editor selection.",
        type: "boolean",
        defaultVal: true,
        icon: Search,
      },
      {
        key: "findAutoInSelection",
        label: "Auto Find in Selection",
        description: "Automatically restrict search to selection when multiline code is selected.",
        type: "enum",
        defaultVal: "never",
        icon: SearchCode,
        options: [
          { value: "never", label: "Never" },
          { value: "always", label: "Always" },
          { value: "multiline", label: "Only for Multi-line Selections" },
        ],
      },
      {
        key: "findAddExtraSpace",
        label: "Find: Extra Space on Top",
        description: "Controls whether the Find widget allows scrolling extra lines beyond top.",
        type: "boolean",
        defaultVal: true,
        icon: Maximize2,
      },
      {
        key: "diffSideBySide",
        label: "Diff Editor: Side by Side",
        description: "Controls whether the Diff editor displays original and modified files side-by-side or inline.",
        type: "boolean",
        defaultVal: true,
        icon: Columns,
      },
      {
        key: "diffIgnoreTrimWhitespace",
        label: "Diff: Ignore Trim Whitespace",
        description: "When enabled, changes in leading or trailing whitespace are ignored in diff comparisons.",
        type: "boolean",
        defaultVal: true,
        icon: Scissors,
      },
      {
        key: "diffRenderIndicators",
        label: "Diff: Render +/- Indicators",
        description: "Display explicit +/- gutter marks for added and deleted lines.",
        type: "boolean",
        defaultVal: true,
        icon: Eye,
      },
    ],
  },
  {
    id: "buffers-encoding",
    label: "File Buffers & Encoding",
    icon: Cpu,
    settings: [
      {
        key: "autoSaveDelay",
        label: "Auto Save Delay (ms)",
        description: "Delay in milliseconds before modified documents are flushed when Auto Save is enabled.",
        type: "enum",
        defaultVal: "1000",
        icon: Clock,
        options: [
          { value: "500", label: "500 ms (Fast)" },
          { value: "1000", label: "1,000 ms (1 second - Default)" },
          { value: "2000", label: "2,000 ms (2 seconds)" },
          { value: "5000", label: "5,000 ms (5 seconds)" },
        ],
      },
      {
        key: "eol",
        label: "Default End of Line (EOL)",
        description: "Character sequence used for line breaks in newly created files.",
        type: "enum",
        defaultVal: "auto",
        icon: CornerDownLeft,
        options: [
          { value: "auto", label: "Auto (OS Native)" },
          { value: "\n", label: "LF (Unix / macOS - \\n)" },
          { value: "\r\n", label: "CRLF (Windows - \\r\\n)" },
        ],
      },
      {
        key: "encoding",
        label: "File Character Encoding",
        description: "Character set encoding applied when saving or reading buffer contents.",
        type: "enum",
        defaultVal: "utf8",
        icon: Binary,
        options: [
          { value: "utf8", label: "UTF-8" },
          { value: "utf8bom", label: "UTF-8 with BOM" },
          { value: "utf16le", label: "UTF-16 Little Endian" },
          { value: "utf16be", label: "UTF-16 Big Endian" },
        ],
      },
    ],
  },
];

export function AdvancedSettingsModal() {
  const isOpen = useIDEStore((s) => s.isAdvancedSettingsOpen);
  const setOpen = useIDEStore((s) => s.setAdvancedSettingsOpen);

  const advanced = useSettingsStore((s) => s.advancedEditor);
  const updateSetting = useSettingsStore((s) => s.updateAdvancedEditorSetting);

  const [activeCategory, setActiveCategory] = useState<string>("cursor-rendering");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return ADVANCED_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return ADVANCED_CATEGORIES.map((cat) => ({
      ...cat,
      settings: cat.settings.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.key.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.settings.length > 0);
  }, [searchQuery]);

  if (!isOpen) return null;

  const currentSection =
    filteredCategories.find((c) => c.id === activeCategory) || filteredCategories[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#1e1e1e] border border-white/10 rounded-xl w-full max-w-4xl h-[78vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#252526]">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#569cd6]" />
            <div>
              <h2 className="text-[15px] font-semibold text-white">Advanced Monaco & Diff Settings</h2>
              <p className="text-[11px] text-white/40">Granular engine, formatting, and buffer configurations</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-[#1e1e1e]">
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search advanced editor settings (e.g. cursor, whitespace, diff, encoding)..."
              className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#569cd6] transition"
            />
          </div>
        </div>

        {/* Main Content (Sidebar + Settings List) */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Categories Sidebar */}
          <aside className="w-56 bg-[#252526] border-r border-white/5 p-2 space-y-1 overflow-y-auto custom-scrollbar">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = (currentSection?.id === cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition cursor-pointer ${
                    isActive
                      ? "bg-[#0078d4] text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Settings Panel */}
          <main className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
            {currentSection ? (
              <>
                <div className="mb-4">
                  <h3 className="text-[16px] font-semibold text-white">{currentSection.label}</h3>
                  <p className="text-[12px] text-white/40">Configuration parameters for {currentSection.label.toLowerCase()}</p>
                </div>

                <div className="space-y-4">
                  {currentSection.settings.map((s) => {
                    const currentVal = advanced[s.key];
                    const isDefault = String(currentVal) === String(s.defaultVal);

                    return (
                      <div
                        key={s.key}
                        className="bg-[#252526] border border-white/5 rounded-lg p-3.5 flex items-start justify-between gap-4 hover:border-white/10 transition group"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {s.icon && (
                            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-[#569cd6] transition flex-shrink-0 mt-0.5">
                              <s.icon className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-white">{s.label}</span>
                              <code className="text-[10px] text-white/30 font-mono">editor.{s.key}</code>
                            </div>
                            <p className="text-[12px] text-white/50 mt-1 leading-relaxed">{s.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          {s.type === "boolean" ? (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={Boolean(currentVal)}
                              onClick={() => updateSetting(s.key, !currentVal as any)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                currentVal ? "bg-[#0078d4]" : "bg-white/20"
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                                  currentVal ? "translate-x-[18px]" : "translate-x-[3px]"
                                }`}
                              />
                            </button>
                          ) : s.type === "enum" && s.options ? (
                            <select
                              value={String(currentVal)}
                              onChange={(e) => {
                                const val = s.key === 'autoSaveDelay' ? Number(e.target.value) : e.target.value;
                                updateSetting(s.key, val as any);
                              }}
                              className="bg-[#3c3c3c] border border-white/10 text-white text-[12px] px-2.5 py-1 rounded cursor-pointer hover:border-white/20 focus:outline-none focus:border-[#0078d4] transition min-w-[160px]"
                            >
                              {s.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : null}

                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => updateSetting(s.key, s.defaultVal)}
                              className="p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/10 transition"
                              title="Reset to default"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-white/40 text-[13px]">
                No advanced settings matching &quot;{searchQuery}&quot;
              </div>
            )}
          </main>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AdvancedSettingsModal;
