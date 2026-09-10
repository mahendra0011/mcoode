"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Check,
  Code2,
  X,
  FileCode,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { ALL_LANGUAGES, LanguageItem } from "../../lib/languagesData";
import { LanguageIcon } from "./LanguageIcon";
import { toast } from "sonner";
import api from "../../lib/axios";
import { useEffect } from "react";

const CATEGORIES = [
  "All",
  "Mainstream",
  "Web / Frontend",
  "Scripting / Shell",
  "Mobile / System",
  "Infra / DevOps",
  "Functional / Academic",
  "Blockchain",
  "Data Science",
  "Database",
  "Esoteric",
];

export function LanguagesPanel() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  const selectedLanguages = useIDEStore((s) => s.selectedLanguages);
  const toggleLanguage = useIDEStore((s) => s.toggleLanguage);
  const setSelectedLanguages = useIDEStore((s) => s.setSelectedLanguages);
  const createLanguageFile = useIDEStore((s) => s.createLanguageFile);

  const [runnableLanguages, setRunnableLanguages] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get("/api/v1/languages").then((res) => {
      if (res.data.runtimes) {
        const runnable = new Set<string>(res.data.runtimes.map((r: any) => r.language));
        setRunnableLanguages(runnable);
      }
    }).catch(console.error);
  }, []);

  const filteredLanguages = useMemo(() => {
    return ALL_LANGUAGES.filter((lang) => {
      // Category filter
      if (activeCategory !== "All" && lang.category !== activeCategory) {
        return false;
      }
      // Selected-only filter
      if (showSelectedOnly && !selectedLanguages.includes(lang.name)) {
        return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = lang.name.toLowerCase().includes(q);
        const matchesExt = lang.extension.toLowerCase().includes(q);
        const matchesCat = lang.category.toLowerCase().includes(q);
        return matchesName || matchesExt || matchesCat;
      }
      return true;
    });
  }, [search, activeCategory, showSelectedOnly, selectedLanguages]);

  const handleSelectPopular = () => {
    const popular = [
      "Python",
      "JavaScript",
      "TypeScript",
      "HTML",
      "CSS",
      "Rust",
      "Go",
      "C++",
      "Java",
      "Shell Script (Bash)",
      "Dockerfile",
      "SQL",
    ];
    setSelectedLanguages(popular);
    toast.success("Selected popular languages");
  };

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white/80 select-none text-xs w-full min-w-0 overflow-hidden">
      
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#4fc1ff]" />
          <span className="font-semibold uppercase tracking-wider text-white/70 text-[11px]">
            Languages &amp; Runtimes
          </span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0078d4]/20 text-[#4fc1ff] border border-[#0078d4]/30">
          {selectedLanguages.length} active
        </span>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-white/5 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search 54+ languages, .ext..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder-white/30 outline-none focus:border-[#0078d4] transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center justify-between text-[11px] text-white/40 pt-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSelectedOnly(!showSelectedOnly)}
              className={`hover:text-white transition ${showSelectedOnly ? "text-[#4fc1ff] font-medium" : ""}`}
            >
              {showSelectedOnly ? "Show all" : "Show selected only"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectPopular}
              className="text-[#4fc1ff] hover:underline"
              title="Select top 12 popular languages"
            >
              Select Popular
            </button>
            {selectedLanguages.length > 0 && (
              <>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setSelectedLanguages([])}
                  className="hover:text-white transition hover:underline"
                >
                  Clear all
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter Pills */}
      <div className="px-2.5 py-1.5 border-b border-white/5 overflow-x-auto custom-scrollbar flex items-center gap-1.5 flex-shrink-0">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "bg-[#094771] text-white font-medium border border-[#0078d4]"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-transparent"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Languages List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
        {filteredLanguages.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-xs">
            No languages matching &ldquo;{search}&rdquo;
          </div>
        ) : (
          filteredLanguages.map((lang) => {
            const isSelected = selectedLanguages.includes(lang.name);
            return (
              <div
                key={lang.id}
                onDoubleClick={() => {
                  createLanguageFile(lang.name);
                  toast.success(`Created new ${lang.name} file`);
                }}
                className={`flex items-center justify-between p-2 rounded-lg border transition group cursor-pointer ${
                  isSelected
                    ? "bg-[#094771]/30 border-[#0078d4]/40 text-white"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-white/80"
                }`}
                title={`Click checkbox to toggle, double-click to create ${lang.extension} file`}
              >
                {/* Left: Real Library Logo + Name + Extension */}
                <div
                  onClick={() => toggleLanguage(lang.name)}
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                >
                  <LanguageIcon
                    id={lang.id}
                    name={lang.name}
                    color={lang.color}
                    className="w-5 h-5 flex-shrink-0 rounded shadow-sm"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs truncate">
                        {lang.name}
                      </span>
                      <span className="text-[10px] font-mono text-white/40 px-1 py-0.2 rounded bg-black/20">
                        {lang.extension}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-white/30 truncate">
                        {lang.category}
                      </span>
                      {runnableLanguages.has(lang.id) ? (
                        <span className="text-green-400 text-[10px]">● Run</span>
                      ) : (
                        <span className="text-white/30 text-[10px]">Highlighting</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Toggle Button & New File Button */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Create New File Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      createLanguageFile(lang.name);
                      toast.success(`Created new ${lang.name} file`);
                    }}
                    className="p-1 rounded bg-white/5 hover:bg-[#0078d4] text-white/60 hover:text-white transition opacity-80 group-hover:opacity-100"
                    title={`Create new ${lang.extension} file`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Checkbox Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLanguage(lang.name);
                    }}
                    className={`w-5 h-5 rounded flex items-center justify-center transition border ${
                      isSelected
                        ? "bg-[#0078d4] border-[#0078d4] text-white"
                        : "border-white/20 hover:border-white/40 text-transparent"
                    }`}
                    title={isSelected ? "Unselect language" : "Select language"}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-white/5 text-[10px] text-white/40 text-center flex-shrink-0">
        54+ languages supported · Double-click to create file
      </div>

    </div>
  );
}

export default LanguagesPanel;
