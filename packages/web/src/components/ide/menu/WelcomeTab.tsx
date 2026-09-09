"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  FilePlus,
  FolderOpen,
  Folder,
  GitBranch,
  Terminal,
  Sparkles,
  Lightbulb,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
import { useIDEStore } from "../../../store/ideStore";
import { ALL_LANGUAGES } from "../../../lib/languagesData";
import { LanguageIcon } from "../LanguageIcon";
import api from "../../../lib/axios";
import { toast } from "sonner";

interface WelcomeTabProps {
  workspaces?: any[];
  onSelectWorkspace?: (id: string) => void;
  onOpenFile?: () => void;
  onOpenFolder?: () => void;
  onCloneRepo?: () => void;
}

export function WelcomeTab({
  workspaces = [],
  onSelectWorkspace,
  onOpenFile,
  onOpenFolder,
  onCloneRepo,
}: WelcomeTabProps) {
  const createUntitledFile = useIDEStore((s) => s.createUntitledFile);
  const recentFiles = useIDEStore((s) => s.recentFiles);
  const addOpenFile = useIDEStore((s) => s.addOpenFile);
  const setActivePath = useIDEStore((s) => s.setActivePath);
  const toggleCommandPalette = useIDEStore((s) => s.toggleCommandPalette);
  const setShortcutsOpen = useIDEStore((s) => s.setShortcutsOpen);
  const setReleaseNotesOpen = useIDEStore((s) => s.setReleaseNotesOpen);
  const selectedLanguages = useIDEStore((s) => s.selectedLanguages);
  const toggleLanguage = useIDEStore((s) => s.toggleLanguage);
  const setSelectedLanguages = useIDEStore((s) => s.setSelectedLanguages);
  const createLanguageFile = useIDEStore((s) => s.createLanguageFile);
  const toggleSecondarySideBar = useIDEStore((s) => s.toggleSecondarySideBar);
  const setActiveActivityBar = useIDEStore((s) => s.setActiveActivityBar);
  const setSidebarOpen = useIDEStore((s) => s.setSidebarOpen);
  const setWelcomeOpen = useIDEStore((s) => s.setWelcomeOpen);

  const [showOnStartup, setShowOnStartup] = useState(true);
  const langScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mcode_show_welcome_startup");
      if (stored !== null) setShowOnStartup(stored === "true");
    } catch {
      // ignore
    }
  }, []);

  const handleToggleStartup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setShowOnStartup(next);
    try {
      localStorage.setItem("mcode_show_welcome_startup", String(next));
    } catch {
      // ignore
    }
  };

  const handleScrollLang = (direction: "left" | "right") => {
    if (langScrollRef.current) {
      const scrollAmount = direction === "left" ? -380 : 380;
      langScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleGenerateWorkspace = async () => {
    try {
      toast.loading("Creating new workspace...", { id: "create-ws" });
      const formData = new FormData();
      formData.append("name", `Project-${Date.now().toString().slice(-4)}`);
      formData.append("source", "blank");
      const res = await api.post("/api/v1/workspaces", formData, { timeout: 15000 });
      if (res.data?.workspace) {
        toast.success(`Created workspace: ${res.data.workspace.name}`, { id: "create-ws" });
        if (onSelectWorkspace) onSelectWorkspace(res.data.workspace._id);
      } else {
        toast.error("Failed to create workspace", { id: "create-ws" });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || "Failed to create workspace", { id: "create-ws" });
    }
  };

  return (
    <div className="flex-1 h-full bg-[#181818] text-[#cccccc] overflow-y-auto custom-scrollbar px-6 md:px-14 py-8 select-none flex flex-col justify-between relative">
      {/* Top-Right Close Button */}
      <button
        type="button"
        onClick={() => {
          setWelcomeOpen(false);
          const cur = useIDEStore.getState().openFiles;
          if (cur.length > 0) {
            setActivePath(cur[0]);
          } else {
            createUntitledFile();
          }
        }}
        className="absolute top-4 right-6 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white text-white/50 flex items-center justify-center transition cursor-pointer border border-white/10 z-30 group"
        title="Close Welcome Page"
      >
        <X className="w-4 h-4 group-hover:scale-110 transition-transform" />
      </button>

      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Header: mcode Brand */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-shrink-0">
            M
          </div>
          <div>
            <h1 className="text-[34px] font-normal tracking-tight text-[#e8e8e8] leading-tight font-sans">
              mcode
            </h1>
            <p className="text-[14px] text-[#858585] mt-0.5 font-sans">Editing evolved</p>
          </div>
        </div>

        {/* 2-line Horizontal Scrollable Languages Selector (Centrally Framed) */}
        <div className="w-full max-w-3xl space-y-2 pt-1 pb-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
                Languages & Technologies
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0078d4]/20 text-[#4fc1ff] border border-[#0078d4]/30">
                {selectedLanguages.length} selected
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveActivityBar("languages");
                  setSidebarOpen(true);
                }}
                className="text-[11px] text-[#4fc1ff] hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                title="Open Languages Panel in Left Sidebar (Ctrl+Shift+L)"
              >
                <span>Open in Sidebar</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Scroll Navigation Controls (< and >) + Clear */}
            <div className="flex items-center gap-2">
              {selectedLanguages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedLanguages([])}
                  className="text-[11px] text-[#858585] hover:text-white transition hover:underline mr-1 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <span className="text-[11px] text-[#858585] hidden sm:inline mr-1">
                (54+ languages)
              </span>
              <button
                type="button"
                onClick={() => handleScrollLang("left")}
                className="w-6 h-6 rounded bg-[#252526] hover:bg-[#333336] text-[#cccccc] hover:text-white flex items-center justify-center transition border border-white/5 cursor-pointer shadow-sm"
                title="Scroll Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleScrollLang("right")}
                className="w-6 h-6 rounded bg-[#252526] hover:bg-[#333336] text-[#cccccc] hover:text-white flex items-center justify-center transition border border-white/5 cursor-pointer shadow-sm"
                title="Scroll Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Scroll container with mousewheel horizontal support */}
          <div className="relative">
            <div
              ref={langScrollRef}
              onWheel={(e) => {
                if (e.deltaY !== 0 && langScrollRef.current) {
                  langScrollRef.current.scrollLeft += e.deltaY;
                }
              }}
              className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-2 pt-1 select-none auto-cols-max custom-scrollbar"
              style={{ scrollBehavior: "smooth" }}
            >
              {ALL_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguages.includes(lang.name);
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => toggleLanguage(lang.name)}
                    onDoubleClick={() => createLanguageFile(lang.name)}
                    className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs border transition-all duration-150 flex-shrink-0 cursor-pointer shadow-sm ${
                      isSelected
                        ? "bg-[#094771] text-white border-[#0078d4]"
                        : "bg-[#252526] text-[#cccccc] border-[#2d2d2d] hover:bg-[#2e2e30] hover:text-white"
                    }`}
                    title={`${lang.name} (${lang.category}) · Double-click to create new ${lang.extension} file`}
                  >
                    {/* Authentic Language Vector Logo from Library */}
                    <LanguageIcon
                      id={lang.id}
                      name={lang.name}
                      color={lang.color}
                      className="w-6 h-6 flex-shrink-0 rounded shadow-sm"
                    />
                    <span className="font-semibold tracking-tight text-[13px]">{lang.name}</span>
                    <span className="text-[10px] text-[#858585] font-mono px-1.5 py-0.5 rounded bg-black/30 border border-white/5">
                      {lang.extension}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-[#4fc1ff] ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Two-Column Grid: Start & Recent (Left) | Walkthroughs (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-1">
          
          {/* LEFT COLUMN: Start & Recent */}
          <div className="space-y-7">
            
            {/* Start Section */}
            <div>
              <h2 className="text-[13px] font-semibold text-[#cccccc] mb-3">
                Start
              </h2>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => createUntitledFile()}
                  className="flex items-center gap-2.5 text-[13px] text-[#3794ff] hover:underline text-left group transition cursor-pointer"
                >
                  <FilePlus className="w-4 h-4 text-[#4fc1ff] flex-shrink-0" />
                  <span>New File...</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenFile}
                  className="flex items-center gap-2.5 text-[13px] text-[#3794ff] hover:underline text-left group transition cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-[#4fc1ff] flex-shrink-0" />
                  <span>Open File...</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenFolder}
                  className="flex items-center gap-2.5 text-[13px] text-[#3794ff] hover:underline text-left group transition cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-[#4fc1ff] flex-shrink-0" />
                  <span>Open Folder...</span>
                </button>

                <button
                  type="button"
                  onClick={onCloneRepo}
                  className="flex items-center gap-2.5 text-[13px] text-[#3794ff] hover:underline text-left group transition cursor-pointer"
                >
                  <GitBranch className="w-4 h-4 text-[#4fc1ff] flex-shrink-0" />
                  <span>Clone Git Repository...</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleCommandPalette()}
                  className="flex items-center gap-2.5 text-[13px] text-[#3794ff] hover:underline text-left group transition cursor-pointer"
                >
                  <Terminal className="w-4 h-4 text-[#4fc1ff] flex-shrink-0" />
                  <span>Connect to...</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateWorkspace}
                  className="flex items-center gap-2.5 text-[13px] text-[#3794ff] hover:underline text-left group transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#4fc1ff] flex-shrink-0" />
                  <span>Generate New Workspace...</span>
                </button>
              </div>
            </div>

            {/* Recent Section - Connected to REAL Backend Workspaces */}
            <div>
              <h2 className="text-[13px] font-semibold text-[#cccccc] mb-3">
                Recent
              </h2>

              <div className="flex flex-col gap-2">
                {workspaces && workspaces.length > 0 ? (
                  workspaces.slice(0, 6).map((ws: any) => {
                    const name = ws.name || "Untitled Project";
                    const pathInfo = ws.source === "git" && ws.repoUrl ? ws.repoUrl : "Local Workspace";
                    return (
                      <div
                        key={ws._id}
                        onClick={() => {
                          if (onSelectWorkspace) onSelectWorkspace(ws._id);
                          toast.success(`Switched to workspace: ${name}`);
                        }}
                        className="flex items-baseline gap-3 text-left cursor-pointer group py-0.5"
                        title={`Open workspace: ${name}`}
                      >
                        <span className="text-[13px] text-[#3794ff] hover:underline flex-shrink-0">
                          {name}
                        </span>
                        <span className="text-[12px] text-[#858585] truncate font-sans">
                          {pathInfo}
                        </span>
                      </div>
                    );
                  })
                ) : recentFiles.length > 0 ? (
                  recentFiles.slice(0, 6).map((file) => {
                    const name = file.split("/").pop() || file;
                    return (
                      <div
                        key={file}
                        onClick={() => {
                          addOpenFile(file);
                          setActivePath(file);
                        }}
                        className="flex items-baseline gap-3 text-left cursor-pointer group py-0.5"
                      >
                        <span className="text-[13px] text-[#3794ff] hover:underline flex-shrink-0">
                          {name}
                        </span>
                        <span className="text-[12px] text-[#858585] truncate font-sans">
                          {file}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[12px] text-[#858585] italic py-1">
                    No recent workspaces. Click <span className="text-[#3794ff] cursor-pointer hover:underline" onClick={onOpenFolder}>Open Folder</span> or <span className="text-[#3794ff] cursor-pointer hover:underline" onClick={handleGenerateWorkspace}>New Workspace</span> to start.
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => toggleCommandPalette()}
                  className="text-[13px] text-[#3794ff] hover:underline text-left mt-1 cursor-pointer"
                >
                  More...
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Walkthroughs (Bigger Cards & Icons) */}
          <div>
            <h2 className="text-[13px] font-semibold text-[#cccccc] mb-3">
              Walkthroughs
            </h2>

            <div className="space-y-2.5">
              {/* Card 1: Get started with mcode */}
              <div
                onClick={() => setReleaseNotesOpen(true)}
                className="p-3.5 rounded-lg bg-[#252526] hover:bg-[#2a2d2e] border border-transparent hover:border-[#3e3e42] transition cursor-pointer group relative overflow-hidden shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0078d4] text-white flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-sm font-bold">★</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-white group-hover:text-[#4fc1ff] transition">
                      Get started with mcode
                    </h3>
                    <p className="text-[12px] text-[#858585] mt-0.5 leading-snug">
                      Customize your editor, learn the basics, and start coding
                    </p>
                  </div>
                </div>
                {/* Blue progress bar across bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0078d4]" />
              </div>

              {/* Card 2: Learn the Fundamentals */}
              <div
                onClick={() => setShortcutsOpen(true)}
                className="p-3.5 rounded-lg bg-[#252526] hover:bg-[#2a2d2e] border border-transparent hover:border-[#3e3e42] transition cursor-pointer group flex items-center gap-3 shadow-sm"
              >
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4.5 h-4.5 text-[#4fc1ff]" />
                </div>
                <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition">
                  Learn the Fundamentals
                </span>
              </div>

              {/* Card 3: Get started with mcode AI Agent */}
              <div
                onClick={() => toggleCommandPalette()}
                className="p-3.5 rounded-lg bg-[#252526] hover:bg-[#2a2d2e] border border-transparent hover:border-[#3e3e42] transition cursor-pointer group flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 text-white text-xs shadow-md">
                    ✦
                  </div>
                  <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition">
                    Get started with mcode AI Agent
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#4fc1ff] bg-[#0078d4]/20 border border-[#0078d4]/30 px-2 py-0.5 rounded">
                  Updated
                </span>
              </div>

              {/* Card 4: Get Started with Python Development */}
              <div
                onClick={() => createLanguageFile("Python")}
                className="p-3.5 rounded-lg bg-[#252526] hover:bg-[#2a2d2e] border border-transparent hover:border-[#3e3e42] transition cursor-pointer group flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.91 0C5.77 0 6.13 2.67 6.13 2.67L6.14 5.43H12.02V6.26H3.77S0 5.83 0 12.01C0 18.19 3.29 17.88 3.29 17.88H5.24V15.14S5.06 11.91 8.3 11.91H14.15S17.06 12.02 17.06 9.17V2.85S17.48 0 11.91 0ZM8.93 1.71C9.53 1.71 10.02 2.2 10.02 2.8C10.02 3.4 9.53 3.89 8.93 3.89C8.33 3.89 7.84 3.4 7.84 2.8C7.84 2.2 8.33 1.71 8.93 1.71Z" fill="#387EB8"/>
                      <path d="M12.09 24C18.23 24 17.87 21.33 17.87 21.33L17.86 18.57H11.98V17.74H20.23S24 18.17 24 11.99C24 5.81 20.71 6.12 20.71 6.12H18.76V8.86S18.94 12.09 15.7 12.09H9.85S6.94 11.98 6.94 14.83V21.15S6.52 24 12.09 24ZM15.07 22.29C14.47 22.29 13.98 21.8 13.98 21.2C13.98 20.6 14.47 20.11 15.07 20.11C15.67 20.11 16.16 20.6 16.16 21.2C16.16 21.8 15.67 22.29 15.07 22.29Z" fill="#FFE052"/>
                    </svg>
                  </div>
                  <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition">
                    Get Started with Python Development
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#4fc1ff] bg-[#0078d4]/20 border border-[#0078d4]/30 px-2 py-0.5 rounded">
                  Updated
                </span>
              </div>

              {/* Card 5: Get Started with PowerShell */}
              <div
                onClick={() => createLanguageFile("Shell Script (Bash)")}
                className="p-3.5 rounded-lg bg-[#252526] hover:bg-[#2a2d2e] border border-transparent hover:border-[#3e3e42] transition cursor-pointer group flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-[#0078d4]/20 border border-[#0078d4]/40 flex items-center justify-center text-[#4fc1ff] text-xs font-mono font-bold flex-shrink-0">
                    &gt;_
                  </div>
                  <span className="text-[13px] font-medium text-white/90 group-hover:text-white transition">
                    Get Started with PowerShell &amp; Shell
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#4fc1ff] bg-[#0078d4]/20 border border-[#0078d4]/30 px-2 py-0.5 rounded">
                  Updated
                </span>
              </div>

              <button
                type="button"
                onClick={() => setReleaseNotesOpen(true)}
                className="text-[13px] text-[#3794ff] hover:underline text-left mt-2 block cursor-pointer"
              >
                More...
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Section Matching Desktop VS Code */}
      <div className="flex flex-col items-center justify-center pt-8 pb-3 gap-2.5 max-w-4xl mx-auto w-full">
        <button
          type="button"
          onClick={() => toggleSecondarySideBar()}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#252526] hover:bg-[#2d2d30] border border-[#3e3e42] text-xs text-white/90 transition shadow-sm cursor-pointer"
        >
          <div className="w-4 h-4 rounded-full border border-blue-400 flex items-center justify-center text-[9px] text-blue-400">
            /
          </div>
          <span>Try out the new Agents window</span>
        </button>

        <label className="flex items-center gap-2 text-xs text-[#858585] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnStartup}
            onChange={handleToggleStartup}
            className="w-3.5 h-3.5 rounded border-[#3e3e42] bg-[#252526] text-blue-500 focus:ring-0 cursor-pointer"
          />
          <span>Show welcome page on startup</span>
        </label>
      </div>

    </div>
  );
}

export default WelcomeTab;
