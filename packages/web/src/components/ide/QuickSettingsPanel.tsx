"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Info, ChevronDown, ExternalLink, Zap, Shield, Sparkles, Command,
  Terminal, FileCheck, Wrench, Gauge, BrainCircuit, GitFork, ShieldCheck
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { useSettingsStore } from "../../store/settingsStore";

type DropdownOption = { value: string; label: string };

function SettingRow({
  icon: Icon,
  label,
  tooltip,
  options,
  value,
  onChange,
  linkLabel,
  onLinkClick,
}: {
  icon?: React.ElementType;
  label: string;
  tooltip?: string;
  options?: DropdownOption[];
  value?: string;
  onChange?: (val: string) => void;
  linkLabel?: string;
  onLinkClick?: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center justify-between py-2.5 px-2 group hover:bg-white/[0.03] rounded-lg transition">
      <div className="flex items-center gap-2.5 text-[13px] text-white/85">
        {Icon && (
          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition flex-shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <span>{label}</span>
        {tooltip && (
          <div className="relative">
            <button
              type="button"
              className="text-white/30 hover:text-white/60 transition cursor-pointer"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-2.5 py-2 text-[11px] bg-[#252526] border border-white/10 text-white/70 rounded-lg shadow-xl z-50 pointer-events-none">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
      {options && (
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="appearance-none bg-[#2a2a2a] border border-white/10 text-white/80 text-[12px] px-2 py-1 pr-6 rounded-md cursor-pointer hover:border-white/20 transition focus:outline-none focus:border-blue-500/50"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-white/40 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      )}
      {linkLabel && (
        <button
          type="button"
          onClick={onLinkClick}
          className="text-[12px] text-blue-400 hover:text-blue-300 transition cursor-pointer font-medium"
        >
          {linkLabel}
        </button>
      )}
    </div>
  );
}

export function QuickSettingsPanel() {
  const isOpen = useIDEStore((s) => s.isQuickSettingsOpen);
  const setOpen = useIDEStore((s) => s.setQuickSettingsOpen);

  // Unified settings store
  const ai = useSettingsStore((s) => s.ai);
  const updateAISetting = useSettingsStore((s) => s.updateAISetting);

  // Bottom tab
  const [activeBottomTab, setActiveBottomTab] = useState<"settings" | "shortcuts">("settings");

  if (!isOpen) return null;

  const onOffOptions: DropdownOption[] = [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
  ];

  const executionOptions: DropdownOption[] = [
    { value: "request-review", label: "Request Review" },
    { value: "auto", label: "Auto Execute" },
    { value: "strict", label: "Strict Approval" },
  ];

  const reviewPolicyOptions: DropdownOption[] = [
    { value: "always-ask", label: "Always Ask" },
    { value: "auto", label: "Auto Approve" },
    { value: "skip", label: "Skip Reviews" },
  ];

  const speedOptions: DropdownOption[] = [
    { value: "fast", label: "Fast (Instant deltas)" },
    { value: "normal", label: "Normal (Batched 60fps)" },
    { value: "balanced", label: "Balanced (Low CPU)" },
  ];

  const contextOptions: DropdownOption[] = [
    { value: "high", label: "High (Whole Workspace)" },
    { value: "medium", label: "Medium (Active Tabs)" },
    { value: "low", label: "Low (Active File Only)" },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[380px] z-[9999] bg-[#1e1e1e] border-l border-white/10 shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-[14px] font-semibold text-white">AI Quick Settings</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {activeBottomTab === "settings" ? (
            <>
              {/* Runtime AI Execution Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <h3 className="text-[13px] font-bold text-white tracking-wide">Agent Execution Policy</h3>
                </div>
                <div className="flex flex-col">
                  <SettingRow
                    icon={Terminal}
                    label="Command Execution"
                    tooltip="Controls whether agent terminal commands execute automatically or require user review."
                    options={executionOptions}
                    value={ai.autoExecution}
                    onChange={(v) => updateAISetting("autoExecution", v as any)}
                  />
                  <SettingRow
                    icon={FileCheck}
                    label="Plan & File Review"
                    tooltip="Controls review behavior when the agent produces plan changes or multi-file edits."
                    options={reviewPolicyOptions}
                    value={ai.reviewPolicy}
                    onChange={(v) => updateAISetting("reviewPolicy", v as any)}
                  />
                  <SettingRow
                    icon={Wrench}
                    label="Auto-Fix Lints"
                    tooltip="When enabled, Agent automatically inspects lint diagnostics and fixes syntax errors."
                    options={onOffOptions}
                    value={ai.autoFixLints ? "on" : "off"}
                    onChange={(v) => updateAISetting("autoFixLints", v === "on")}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 mb-6" />

              {/* Copilot & Stream Controls */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <h3 className="text-[13px] font-bold text-white tracking-wide">Copilot & Generation</h3>
                </div>
                <div className="flex flex-col">
                  <SettingRow
                    icon={Sparkles}
                    label="Inline Ghost Suggestions"
                    tooltip="Show inline AI autocomplete suggestions while typing in Monaco editor."
                    options={onOffOptions}
                    value={ai.inlineAssist ? "on" : "off"}
                    onChange={(v) => updateAISetting("inlineAssist", v === "on")}
                  />
                  <SettingRow
                    icon={Gauge}
                    label="Streaming Speed"
                    tooltip="Pacing and chunk batching rate of streamed model responses."
                    options={speedOptions}
                    value={ai.streamSpeed}
                    onChange={(v) => updateAISetting("streamSpeed", v as any)}
                  />
                  <SettingRow
                    icon={BrainCircuit}
                    label="Context Sensitivity"
                    tooltip="Scope of project files automatically attached to prompts."
                    options={contextOptions}
                    value={ai.contextSensitivity}
                    onChange={(v) => updateAISetting("contextSensitivity", v as any)}
                  />
                  <SettingRow
                    icon={GitFork}
                    label="Respect .gitignore"
                    tooltip="Exclude files matching .gitignore from being indexed by AI."
                    options={onOffOptions}
                    value={ai.tabGitignoreAccess ? "on" : "off"}
                    onChange={(v) => updateAISetting("tabGitignoreAccess", v === "on")}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/5 mb-4" />

              {/* Advanced Settings Link */}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  useIDEStore.getState().setAdvancedSettingsOpen(true);
                }}
                className="text-[13px] text-blue-400 hover:text-blue-300 transition cursor-pointer mb-4 flex items-center gap-1.5"
              >
                Open Advanced Monaco Engine Settings
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* AI Shortcuts Cheatsheet */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Command className="w-4 h-4 text-purple-400" />
                <h3 className="text-[13px] font-bold text-white">AI Keybindings & Commands</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">Send Message / Submit</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">Enter</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">New Line in Chat</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">Shift+Enter</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">Open Slash Commands</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">/</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">Toggle Integrated Terminal</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">Ctrl+`</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">Toggle File Explorer</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">Ctrl+B</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">Open Quick Settings</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">Ctrl+Shift+,</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-white/5">
                  <span className="text-white/80">Open Mcode Settings</span>
                  <kbd className="px-2 py-0.5 bg-[#2a2a2a] rounded text-white/60 font-mono">Ctrl+,</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Tabs */}
        <div className="border-t border-white/5 flex">
          <button
            type="button"
            onClick={() => setActiveBottomTab("settings")}
            className={`flex-1 py-2.5 text-[12px] font-medium transition cursor-pointer ${
              activeBottomTab === "settings"
                ? "text-white border-b-2 border-emerald-400 bg-white/5"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            Quick Switches
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab("shortcuts")}
            className={`flex-1 py-2.5 text-[12px] font-medium transition cursor-pointer ${
              activeBottomTab === "shortcuts"
                ? "text-white border-b-2 border-emerald-400 bg-white/5"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            AI Shortcuts
          </button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  );
}

export default QuickSettingsPanel;
