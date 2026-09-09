"use client";
import React, { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import {
  Folder,
  Search,
  GitBranch,
  Bug,
  Laptop,
  Beaker,
  Puzzle,
  Smartphone,
  Boxes,
  Settings,
  User,
  Check,
  Code2,
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import type { IDEActivitySidebarProps } from "../../types/chat";
import { useIDEStore } from "../../store/ideStore";

/** Lucide icon is a React component accepting SVG props. */
type LucideIcon = ComponentType<SVGProps<SVGSVGElement>>;

interface ActivityItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  shortcut: string;
}

const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: "explorer", label: "Explorer", Icon: Folder, shortcut: "Ctrl+Shift+E" },
  { id: "search", label: "Search", Icon: Search, shortcut: "Ctrl+Shift+F" },
  { id: "source-control", label: "Source Control", Icon: GitBranch, shortcut: "Ctrl+Shift+G" },
  { id: "run-debug", label: "Run and Debug", Icon: Bug, shortcut: "Ctrl+Shift+D" },
  { id: "languages", label: "Languages & Runtimes", Icon: Code2, shortcut: "Ctrl+Shift+L" },
  { id: "extensions", label: "Extensions", Icon: Puzzle, shortcut: "Ctrl+Shift+X" },
  { id: "remote", label: "Remote Explorer", Icon: Laptop, shortcut: "Ctrl+Shift+R" },
  { id: "containers", label: "Containers", Icon: Boxes, shortcut: "Ctrl+Shift+C" },
  { id: "testing", label: "Testing", Icon: Beaker, shortcut: "Ctrl+Shift+T" },
  { id: "android", label: "Android Emulators", Icon: Smartphone, shortcut: "Ctrl+Shift+A" },
];

/**
 * IDEActivitySidebar — VS Code-style icon-only activity bar on the left of
 * the AI Code Editor tab. Replaces the chat-history sidebar in that tab only.
 * Now strictly includes Accounts and Settings at the absolute bottom, matching VS Code desktop.
 */
export function IDEActivitySidebar({ active = "explorer", onSelectTab, onSourceControl, branch = "main" }: IDEActivitySidebarProps) {
  const toggleCommandPalette = useIDEStore((s) => s.toggleCommandPalette);
  const setShortcutsOpen = useIDEStore((s) => s.setShortcutsOpen);
  const setAboutOpen = useIDEStore((s) => s.setAboutOpen);
  const setWelcomeOpen = useIDEStore((s) => s.setWelcomeOpen);
  const setActivePath = useIDEStore((s) => s.setActivePath);

  const isSidebarOpen = useIDEStore((s) => s.isSidebarOpen);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={500}>
      <div className="flex flex-col h-full bg-[#121212] flex-shrink-0 w-full overflow-hidden justify-between select-none">
        
        {/* Top: Icon-only activity items */}
        <div
          className="flex-1 flex flex-col items-center gap-1 pt-2 pb-2 overflow-y-auto no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {ACTIVITY_ITEMS.map((item) => {
            const Icon = item.Icon;
            const isActive = isSidebarOpen && active === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id === "source-control" && onSourceControl) onSourceControl();
                      if (onSelectTab) onSelectTab(item.id);
                    }}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg text-lg transition-all duration-150 cursor-pointer ${
                      isActive
                        ? "bg-[#172036] text-white border border-[#3b82f6]/40 shadow-[0_0_10px_rgba(59,130,234,0.3)]"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                    aria-label={`${item.label} (${item.shortcut})`}
                    title={`${item.label} (${item.shortcut})`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  align="center"
                  className="px-2.5 py-1.5 text-xs text-white/80 bg-[#1e1e1e] border border-white/10 rounded shadow-xl z-50"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-1.5 opacity-50">·</span>
                  <kbd className="ml-1 opacity-50">{item.shortcut.replace("Ctrl", "⌃")}</kbd>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Bottom Section: Accounts, Branch & Settings (Sabse Neeche - Desktop VS Code Ergonomics) */}
        <div className="flex flex-col items-center gap-1 py-2 border-t border-white/5 text-xs text-white/40 flex-shrink-0 relative">
          
          {/* Branch status icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onSourceControl}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition cursor-pointer"
                title={`Branch: ${branch}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="px-2 py-1 text-[11px] bg-[#1e1e1e] border border-white/10 text-white rounded shadow-xl z-50">
              Git Branch: {branch}
            </TooltipContent>
          </Tooltip>

          {/* Accounts (User) Button */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(!accountMenuOpen);
                    setSettingsMenuOpen(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition cursor-pointer ${
                    accountMenuOpen ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                  aria-label="Accounts"
                  title="Accounts"
                >
                  <User className="w-4.5 h-4.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="px-2.5 py-1 text-xs bg-[#1e1e1e] border border-white/10 text-white rounded shadow-xl z-50">
                Accounts
              </TooltipContent>
            </Tooltip>

            {/* Accounts Dropdown Menu */}
            {accountMenuOpen && (
              <div
                className="absolute left-full bottom-0 ml-2 w-48 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs flex flex-col select-none"
                onMouseLeave={() => setAccountMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider border-b border-white/5">
                  Accounts
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    const tokens = JSON.parse(localStorage.getItem("mcode_tokens") || "{}");
                    window.location.href = `/api/v1/auth/github?token=${encodeURIComponent(tokens.access || "")}`;
                  }}
                  className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  Turn on Cloud Sync...
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    window.location.href = "/login";
                  }}
                  className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  Account Profile
                </button>
              </div>
            )}
          </div>

          {/* Settings (Gear) Button - Sabse Neeche */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsMenuOpen(!settingsMenuOpen);
                    setAccountMenuOpen(false);
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition cursor-pointer ${
                    settingsMenuOpen ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                  aria-label="Manage / Settings"
                  title="Manage / Settings"
                >
                  <Settings className="w-4.5 h-4.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="px-2.5 py-1 text-xs bg-[#1e1e1e] border border-white/10 text-white rounded shadow-xl z-50">
                Manage / Settings
              </TooltipContent>
            </Tooltip>

            {/* Settings Dropdown Menu */}
            {settingsMenuOpen && (
              <div
                className="absolute left-full bottom-0 ml-2 w-52 bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl py-1 z-50 text-xs flex flex-col select-none"
                onMouseLeave={() => setSettingsMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-white/50 uppercase tracking-wider border-b border-white/5">
                  Preferences
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    toggleCommandPalette();
                  }}
                  className="flex items-center justify-between px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  <span>Command Palette...</span>
                  <kbd className="text-[10px] text-white/40">Ctrl+Shift+P</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setShortcutsOpen(true);
                  }}
                  className="flex items-center justify-between px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  <span>Keyboard Shortcuts</span>
                  <kbd className="text-[10px] text-white/40">Ctrl+K Ctrl+S</kbd>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setWelcomeOpen(true);
                    setActivePath(null);
                  }}
                  className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  Welcome Page
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setSettingsMenuOpen(false);
                    setAboutOpen(true);
                  }}
                  className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition"
                >
                  About mcode
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}

export default IDEActivitySidebar;
