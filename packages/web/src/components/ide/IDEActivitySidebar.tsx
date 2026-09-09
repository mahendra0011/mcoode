"use client";
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
  Github,
  Upload,
  RefreshCw,
} from "lucide-react";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@radix-ui/react-tooltip";
import type { IDEActivitySidebarProps } from "../../types/chat";

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
  { id: "remote", label: "Remote Explorer", Icon: Laptop, shortcut: "Ctrl+Shift+R" },
  { id: "containers", label: "Containers", Icon: Boxes, shortcut: "Ctrl+Shift+C" },
  { id: "testing", label: "Testing", Icon: Beaker, shortcut: "Ctrl+Shift+T" },
  { id: "android", label: "Android Emulators", Icon: Smartphone, shortcut: "Ctrl+Shift+A" },
  { id: "extensions", label: "Extensions", Icon: Puzzle, shortcut: "Ctrl+Shift+X" },
];

/**
 * IDEActivitySidebar — VS Code-style icon-only activity bar on the left of
 * the AI Code Editor tab. Replaces the chat-history sidebar in that tab only.
 */
export function IDEActivitySidebar({ active = "explorer", onSelectTab, onSourceControl, branch = "main" }: IDEActivitySidebarProps) {
  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={500}>
      <div className="flex flex-col h-full bg-[#121212] flex-shrink-0 w-full overflow-hidden">
        {/* Icon-only activity items without visible scrollbars */}
        <div
          className="flex-1 flex flex-col items-center gap-1.5 pt-2 pb-2 overflow-y-auto no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {ACTIVITY_ITEMS.map((item) => {
            const Icon = item.Icon;
            const isActive = active === item.id;
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id === "source-control" && onSourceControl) onSourceControl();
                      if (onSelectTab) onSelectTab(item.id);
                    }}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg text-lg transition-all duration-150 ${
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
                  className="px-2.5 py-1.5 text-xs text-white/80 bg-[#1e1e1e] border border-white/10"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-1.5 opacity-50">·</span>
                  <kbd className="ml-1 opacity-50">{item.shortcut.replace("Ctrl", "⌃")}</kbd>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Footer status icon */}
        <div className="flex flex-col items-center gap-1 py-2 border-t border-white/5 text-xs text-white/40 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onSourceControl}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/5 text-white/40 hover:text-white transition"
                title={`Branch: ${branch}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="px-2 py-1 text-[11px] bg-[#1e1e1e] border border-white/10 text-white">
              Branch: {branch}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default IDEActivitySidebar;
