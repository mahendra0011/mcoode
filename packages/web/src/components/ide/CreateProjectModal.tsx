"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, X, Loader2, Sparkles, Check, ChevronDown, FileCode2 } from "lucide-react";
import { ALL_LANGUAGES, LanguageItem } from "../../lib/languagesData";
import { LanguageIcon } from "./LanguageIcon";
import api from "../../lib/axios";
import { toast } from "sonner";

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLanguage?: LanguageItem | null;
  onWorkspaceCreated: (workspaceId: string, initialFile: { path: string; content: string }) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  initialLanguage,
  onWorkspaceCreated,
}: CreateProjectModalProps) {
  const [selectedLang, setSelectedLang] = useState<LanguageItem>(() => {
    return initialLanguage || ALL_LANGUAGES.find((l) => l.name === "Python") || ALL_LANGUAGES[0];
  });
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial language when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultLang = initialLanguage || ALL_LANGUAGES.find((l) => l.name === "Python") || ALL_LANGUAGES[0];
      setSelectedLang(defaultLang);
      const cleanSlug = (defaultLang.name || "app")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setProjectName(`${cleanSlug}-project`);
      setShowAllLanguages(false);
      setLangSearch("");

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, initialLanguage]);

  // When user picks a different language, suggest an updated folder name if untouched or standard
  const handleSelectLang = (lang: LanguageItem) => {
    setSelectedLang(lang);
    setShowAllLanguages(false);
    const cleanSlug = (lang.name || "app")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setProjectName(`${cleanSlug}-project`);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const getStarterFileName = (lang: LanguageItem) => {
    const ext = lang.extension || ".txt";
    if (ext === ".py") return "main.py";
    if (ext === ".js" || ext === ".jsx") return "index.js";
    if (ext === ".ts" || ext === ".tsx") return "index.ts";
    if (ext === ".java") return "Main.java";
    if (ext === ".cpp" || ext === ".cc") return "main.cpp";
    if (ext === ".c") return "main.c";
    if (ext === ".go") return "main.go";
    if (ext === ".rs") return "main.rs";
    if (ext === ".html") return "index.html";
    if (ext === ".php") return "index.php";
    if (ext === ".rb") return "main.rb";
    if (ext === ".sh") return "script.sh";
    return ext.startsWith(".") ? `main${ext}` : ext;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = projectName.trim();
    if (!trimmed) {
      toast.error("Please enter a project folder name");
      return;
    }

    const starterFileName = getStarterFileName(selectedLang);
    const boilerplate = (selectedLang.defaultBoilerplate || "").replace(/\r\n/g, "\n");

    setIsSubmitting(true);
    try {
      const res = await api.post("/api/v1/workspaces", {
        name: trimmed,
        source: "duplicate",
        files: [
          {
            path: starterFileName,
            content: boilerplate,
          },
        ],
      });

      if (res.data?.workspace) {
        const ws = res.data.workspace;
        toast.success(`Project "${trimmed}" created!`);
        onClose();
        try {
          onWorkspaceCreated(ws._id, { path: starterFileName, content: boilerplate });
        } catch (e) {
          console.error("Workspace activation callback error:", e);
        }
      } else {
        toast.error("Failed to create workspace on server");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to create project folder";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const popularLanguages = ALL_LANGUAGES.filter((l) =>
    ["Python", "JavaScript", "TypeScript", "Go", "Rust", "C++", "Java", "HTML", "Shell Script (Bash)"].includes(
      l.name
    )
  );

  const filteredLanguages = ALL_LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    l.extension.toLowerCase().includes(langSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
        {/* Backdrop click to dismiss */}
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }}
          className="relative bg-[#181820] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border border-white/10"
                style={{ backgroundColor: `${selectedLang.color}20` }}
              >
                <LanguageIcon
                  id={selectedLang.id}
                  name={selectedLang.name}
                  color={selectedLang.color}
                  className="w-6 h-6"
                />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
                  <span>Create {selectedLang.name} Project</span>
                  <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    {selectedLang.extension}
                  </span>
                </h2>
                <p className="text-xs text-white/50">
                  Set up a project workspace folder with starter template files
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Folder / Project Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block">
                Project / Folder Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. my-python-app"
                  required
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/15 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-mono"
                />
              </div>
              <p className="text-[11px] text-white/40">
                A dedicated folder will be created on the disk and in your workspaces explorer.
              </p>
            </div>

            {/* Quick Language Switcher */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Selected Language
                </label>
                <button
                  type="button"
                  onClick={() => setShowAllLanguages(!showAllLanguages)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>{showAllLanguages ? "Hide language list" : "Browse 54+ languages"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllLanguages ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Popular Language Pills */}
              {!showAllLanguages && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {popularLanguages.map((lang) => {
                    const isSelected = selectedLang.id === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleSelectLang(lang)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition border cursor-pointer ${
                          isSelected
                            ? "bg-blue-600/30 border-blue-500 text-white font-medium shadow-sm"
                            : "bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <LanguageIcon
                          id={lang.id}
                          name={lang.name}
                          color={lang.color}
                          className="w-3.5 h-3.5 flex-shrink-0"
                        />
                        <span>{lang.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Expandable 54+ Languages Filter */}
              {showAllLanguages && (
                <div className="bg-black/30 border border-white/10 rounded-xl p-2.5 space-y-2">
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder="Search all languages..."
                    className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-blue-500"
                  />
                  <div className="max-h-40 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-1">
                    {filteredLanguages.map((lang) => {
                      const isSelected = selectedLang.id === lang.id;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => handleSelectLang(lang)}
                          className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-blue-600/40 text-white font-medium"
                              : "hover:bg-white/5 text-white/70 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <LanguageIcon
                              id={lang.id}
                              name={lang.name}
                              color={lang.color}
                              className="w-4 h-4 flex-shrink-0"
                            />
                            <span className="truncate">{lang.name}</span>
                          </div>
                          <span className="text-[10px] text-white/30 font-mono">{lang.extension}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Starter File Preview Info Box */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white/70">
                <FileCode2 className="w-4 h-4 text-blue-400" />
                <span>Initial entry file:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-black/40 text-emerald-400 border border-emerald-500/20 font-semibold">
                  {getStarterFileName(selectedLang)}
                </span>
              </div>
              <span className="text-[11px] text-white/40">Includes starter boilerplate</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !projectName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Folder...</span>
                  </>
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    <span>Create Project Folder</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
