"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  Globe,
  Palette,
  ZoomIn,
  BarChart2,
  Rocket,
  LogOut,
  ChevronRight,
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import type { IDEActivitySidebarProps } from "../../types/chat";
import { useIDEStore } from "../../store/ideStore";
import api from "../../lib/axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
 * Portal-based dropdown that positions itself to the right of the trigger button.
 * Solves the overflow-hidden clipping issue.
 */
function PortalDropdown({
  open,
  onClose,
  triggerRef,
  children,
  width = 220,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | HTMLDivElement | null>;
  children: React.ReactNode;
  width?: number;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate position from trigger button
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    let top = rect.bottom - 8; // Slightly above the bottom edge of the button
    const left = rect.right + 8; // 8px gap to the right

    // Make sure the dropdown doesn't go off-screen at the bottom
    // We estimate a max dropdown height of 400px
    const maxHeight = 400;
    if (top + maxHeight > window.innerHeight) {
      top = Math.max(8, window.innerHeight - maxHeight - 8);
    }

    setPos({ top, left });
  }, [open, triggerRef]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl py-1.5 z-[9999] text-xs flex flex-col select-none animate-in fade-in slide-in-from-left-2 duration-150"
      style={{ top: pos.top, left: pos.left, width }}
    >
      {children}
    </div>,
    document.body
  );
}

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
  const openSettings = useIDEStore((s) => s.openSettings);

  const isSidebarOpen = useIDEStore((s) => s.isSidebarOpen);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [showZoomSubmenu, setShowZoomSubmenu] = useState(false);
  const [showLanguageSubmenu, setShowLanguageSubmenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [userProfile, setUserProfile] = useState<any>(null);

  const accountBtnRef = useRef<HTMLButtonElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem("mcode_tokens") || "{}");
      if (tokens.access) {
        api.get("/api/v1/auth/me", { timeout: 10000 })
          .then((res) => {
            if (res.data?.email) setUserProfile(res.data);
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem("mcode_tokens");
    window.dispatchEvent(new CustomEvent("mcode:auth:logout"));
    if (!window.mcodeElectron) {
      router.push("/login");
    }
  };

  const setZoom = (z: number) => {
    setZoomLevel(z);
    (document.body.style as any).zoom = String(z);
    toast.info(`Interface Zoom: ${Math.round(z * 100)}%`);
  };

  const closeAccountMenu = useCallback(() => {
    setAccountMenuOpen(false);
    setShowZoomSubmenu(false);
    setShowLanguageSubmenu(false);
  }, []);

  const closeSettingsMenu = useCallback(() => {
    setSettingsMenuOpen(false);
  }, []);

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
        <div className="flex flex-col items-center gap-1 py-2 border-t border-white/5 text-xs text-white/40 flex-shrink-0">
          
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={accountBtnRef}
                type="button"
                onClick={() => {
                  setAccountMenuOpen(!accountMenuOpen);
                  setSettingsMenuOpen(false);
                  setShowZoomSubmenu(false);
                  setShowLanguageSubmenu(false);
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg transition cursor-pointer ${
                  accountMenuOpen ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
                aria-label={userProfile?.name || userProfile?.email || "Accounts"}
                title={userProfile?.name || userProfile?.email || "Accounts"}
              >
                {userProfile ? (
                  <div className="w-7 h-7 rounded-full bg-[#8b5cf6] flex items-center justify-center text-white font-medium text-xs shadow-md">
                    {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : userProfile.email.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <User className="w-4.5 h-4.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="px-2.5 py-1 text-xs bg-[#1e1e1e] border border-white/10 text-white rounded shadow-xl z-50">
              {userProfile?.name || userProfile?.email || "Accounts"}
            </TooltipContent>
          </Tooltip>

          {/* Accounts Dropdown Menu — rendered via Portal */}
          <PortalDropdown
            open={accountMenuOpen}
            onClose={closeAccountMenu}
            triggerRef={accountBtnRef}
            width={220}
          >
            <div className="p-1 flex flex-col relative">
              {/* 1. Language */}
              <button
                type="button"
                onClick={() => {
                  setShowLanguageSubmenu(!showLanguageSubmenu);
                  setShowZoomSubmenu(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                  <span>Language</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Language Submenu */}
              {showLanguageSubmenu && (
                <div className="ml-2 w-full bg-[#252526] border border-white/10 rounded-lg shadow-2xl py-1 text-xs flex flex-col mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      closeAccountMenu();
                      if (onSelectTab) onSelectTab("languages");
                    }}
                    className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                  >
                    <span>Languages & Runtimes</span>
                    <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      closeAccountMenu();
                      toast.success("UI language: English (US)");
                    }}
                    className="px-3 py-1.5 text-left text-white hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                  >
                    <span>English (US)</span>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeAccountMenu();
                      toast.success("UI language: Hindi (हिंदी)");
                    }}
                    className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <span>Hindi (हिंदी)</span>
                  </button>
                </div>
              )}

              {/* 2. App theme */}
              <button
                type="button"
                onClick={() => {
                  closeAccountMenu();
                  openSettings("theme");
                }}
                className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                  <span>App theme</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* 3. Interface zoom */}
              <button
                type="button"
                onClick={() => {
                  setShowZoomSubmenu(!showZoomSubmenu);
                  setShowLanguageSubmenu(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ZoomIn className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                  <span>Interface zoom</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-white/40">{Math.round(zoomLevel * 100)}%</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              {/* Interface Zoom Submenu */}
              {showZoomSubmenu && (
                <div className="ml-2 w-full bg-[#252526] border border-white/10 rounded-lg shadow-2xl py-1 text-xs flex flex-col mt-1">
                  <button
                    type="button"
                    onClick={() => setZoom(1.2)}
                    className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                  >
                    <span>Zoom In (120%)</span>
                    {zoomLevel === 1.2 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1.1)}
                    className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                  >
                    <span>Zoom In (110%)</span>
                    {zoomLevel === 1.1 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1.0)}
                    className="px-3 py-1.5 text-left text-white hover:bg-white/10 transition flex items-center justify-between font-medium cursor-pointer"
                  >
                    <span>Reset (100%)</span>
                    {zoomLevel === 1.0 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(0.9)}
                    className="px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition flex items-center justify-between cursor-pointer"
                  >
                    <span>Zoom Out (90%)</span>
                    {zoomLevel === 0.9 && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 mx-2 my-1" />

            <div className="p-1 flex flex-col">
              {/* 4. Usage stats */}
              <button
                type="button"
                onClick={() => {
                  closeAccountMenu();
                  openSettings("usage");
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left group cursor-pointer"
              >
                <BarChart2 className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                <span>Usage stats</span>
              </button>

              {/* 5. Upgrade */}
              <button
                type="button"
                onClick={() => {
                  closeAccountMenu();
                  openSettings("account");
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors text-left group cursor-pointer"
              >
                <Rocket className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                <span>Upgrade</span>
              </button>
            </div>

            <div className="h-px bg-white/10 mx-2 my-1" />

            <div className="p-1">
              {/* 6. Disconnect */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </PortalDropdown>

          {/* Settings (Gear) Button - Sabse Neeche */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={settingsBtnRef}
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

          {/* Settings Dropdown Menu — rendered via Portal */}
          <PortalDropdown
            open={settingsMenuOpen}
            onClose={closeSettingsMenu}
            triggerRef={settingsBtnRef}
            width={260}
          >
            {/* User profile row */}
            <div className="px-3 py-2 text-[13px] text-white/80 border-b border-white/5">
              {userProfile?.name || userProfile?.email || "User"}{" "}
              <span className="text-white/40">(Google Auth)</span>
            </div>

            {/* Quick Settings Panel — highlighted */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                useIDEStore.getState().setQuickSettingsOpen(true);
              }}
              className="w-full flex items-center px-3 py-1.5 text-left text-[13px] text-white bg-[#0078d4] hover:bg-[#106ebe] transition font-medium cursor-pointer"
            >
              Quick Settings Panel
            </button>

            {/* Advanced Settings (Mcode Settings) */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                useIDEStore.getState().setAdvancedSettingsOpen(true);
              }}
              className="w-full flex items-center px-3 py-1.5 text-left text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Advanced Settings
            </button>

            {/* Mcode General Settings */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                useIDEStore.getState().setGeneralSettingsOpen(true);
              }}
              className="w-full flex items-center px-3 py-1.5 text-left text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Mcode Settings
            </button>

            <div className="h-px bg-white/5 my-0.5" />

            {/* Check for Updates */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                toast.info("You're on the latest version!");
              }}
              className="w-full px-3 py-1.5 text-left text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Check for Updates...
            </button>

            {/* Docs */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                window.open("https://docs.mcode.dev", "_blank");
              }}
              className="w-full px-3 py-1.5 text-left text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Docs
            </button>

            {/* Report Issue */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                toast.info("Report Issue feature coming soon!");
              }}
              className="w-full px-3 py-1.5 text-left text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Report Issue
            </button>

            {/* Changelog */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                useIDEStore.getState().setReleaseNotesOpen(true);
              }}
              className="w-full px-3 py-1.5 text-left text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Changelog
            </button>

            <div className="h-px bg-white/5 my-0.5" />

            {/* Themes — with chevron */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                openSettings("theme");
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <span>Themes</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-50" />
            </button>

            <div className="h-px bg-white/5 my-0.5" />

            {/* Settings */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                openSettings("permissions");
              }}
              className="flex items-center justify-between w-full px-3 py-1.5 text-left text-white hover:bg-white/10 transition font-medium cursor-pointer"
            >
              <span className="flex items-center gap-2 text-emerald-400">
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </span>
              <kbd className="text-[10px] text-white/40 font-mono">Ctrl+,</kbd>
            </button>

            {/* Command Palette */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                toggleCommandPalette();
              }}
              className="flex items-center justify-between w-full px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <span>Command Palette...</span>
              <kbd className="text-[10px] text-white/40 font-mono">Ctrl+Shift+P</kbd>
            </button>

            {/* Keyboard Shortcuts */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                setShortcutsOpen(true);
              }}
              className="flex items-center justify-between w-full px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <span>Keyboard Shortcuts</span>
              <kbd className="text-[10px] text-white/40 font-mono">Ctrl+K Ctrl+S</kbd>
            </button>

            <div className="h-px bg-white/5 my-0.5" />

            {/* Welcome Page */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                setWelcomeOpen(true);
                setActivePath(null);
              }}
              className="w-full px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              Welcome Page
            </button>

            {/* About mcode */}
            <button
              type="button"
              onClick={() => {
                closeSettingsMenu();
                setAboutOpen(true);
              }}
              className="w-full px-3 py-1.5 text-left text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              About mcode
            </button>
          </PortalDropdown>

        </div>
      </div>
    </TooltipProvider>
  );
}

export default IDEActivitySidebar;
