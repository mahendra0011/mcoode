"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Info, ChevronDown, ExternalLink } from "lucide-react";
import { useIDEStore } from "../../store/ideStore";

/**
 * QuickSettingsPanel — A slide-out panel on the right side (like VS Code's
 * Copilot Quick Settings) showing Agent and Tab/Editor quick toggles.
 */

type DropdownOption = { value: string; label: string };

function SettingRow({
  label,
  tooltip,
  options,
  value,
  onChange,
  linkLabel,
  onLinkClick,
}: {
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
    <div className="flex items-center justify-between py-2 px-1 group">
      <div className="flex items-center gap-1.5 text-[13px] text-white/80">
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
  const openSettings = useIDEStore((s) => s.openSettings);

  // Agent settings state
  const [agentAutoFixLints, setAgentAutoFixLints] = useState("on");
  const [autoExecution, setAutoExecution] = useState("request-review");
  const [reviewPolicy, setReviewPolicy] = useState("request-review");

  // Tab settings state
  const [suggestionsInEditor, setSuggestionsInEditor] = useState("on");
  const [tabGitignoreAccess, setTabGitignoreAccess] = useState("off");
  const [tabSpeed, setTabSpeed] = useState("fast");
  const [tabToImport, setTabToImport] = useState("on");
  const [tabToJump, setTabToJump] = useState("on");

  // Bottom tab
  const [activeBottomTab, setActiveBottomTab] = useState<"settings" | "shortcuts">("settings");

  if (!isOpen) return null;

  const onOffOptions: DropdownOption[] = [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
  ];

  const executionOptions: DropdownOption[] = [
    { value: "request-review", label: "Request Review" },
    { value: "auto", label: "Auto" },
    { value: "off", label: "Off" },
  ];

  const speedOptions: DropdownOption[] = [
    { value: "fast", label: "Fast" },
    { value: "normal", label: "Normal" },
    { value: "slow", label: "Slow" },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/40"
        onClick={() => setOpen(false)}
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[380px] z-[9999] bg-[#1e1e1e] border-l border-white/10 shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <span className="text-[14px] font-semibold text-white">Quick Settings</span>
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
          {/* Agent Section */}
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-white mb-2 tracking-wide">Agent</h3>
            <div className="flex flex-col">
              <SettingRow
                label="Agent Auto-Fix Lints"
                tooltip="Automatically fix lint errors when the agent makes changes"
                options={onOffOptions}
                value={agentAutoFixLints}
                onChange={setAgentAutoFixLints}
              />
              <SettingRow
                label="Auto Execution"
                tooltip="Controls whether agent commands run automatically or require approval"
                options={executionOptions}
                value={autoExecution}
                onChange={setAutoExecution}
              />
              <SettingRow
                label="Review Policy"
                tooltip="Whether changes require your review before being applied"
                options={executionOptions}
                value={reviewPolicy}
                onChange={setReviewPolicy}
              />
              <SettingRow
                label="Customizations"
                linkLabel="Manage"
                onLinkClick={() => {
                  setOpen(false);
                  openSettings("permissions");
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/5 mb-6" />

          {/* Tab Section */}
          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-white mb-2 tracking-wide">Tab</h3>
            <div className="flex flex-col">
              <SettingRow
                label="Suggestions in Editor"
                tooltip="Show inline AI completions while you type"
                options={onOffOptions}
                value={suggestionsInEditor}
                onChange={setSuggestionsInEditor}
              />
              <SettingRow
                label="Tab Gitignore Access"
                tooltip="Allow AI to read .gitignore files for context"
                options={onOffOptions}
                value={tabGitignoreAccess}
                onChange={setTabGitignoreAccess}
              />
              <SettingRow
                label="Tab Speed"
                tooltip="Speed of inline AI completions"
                options={speedOptions}
                value={tabSpeed}
                onChange={setTabSpeed}
              />
              <SettingRow
                label="Tab to Import"
                tooltip="Automatically add missing imports when accepting completions"
                options={onOffOptions}
                value={tabToImport}
                onChange={setTabToImport}
              />
              <SettingRow
                label="Tab to Jump"
                tooltip="Press Tab to jump to the next relevant code location"
                options={onOffOptions}
                value={tabToJump}
                onChange={setTabToJump}
              />
              <SettingRow
                label="Snooze"
                linkLabel="Start"
                onLinkClick={() => {
                  setOpen(false);
                }}
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
            className="text-[13px] text-blue-400 hover:text-blue-300 transition cursor-pointer mb-4 flex items-center gap-1"
          >
            Advanced Settings
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom Tabs */}
        <div className="border-t border-white/5 flex">
          <button
            type="button"
            onClick={() => setActiveBottomTab("settings")}
            className={`flex-1 py-2.5 text-[12px] font-medium transition cursor-pointer ${
              activeBottomTab === "settings"
                ? "text-white border-b-2 border-white bg-white/5"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            }`}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab("shortcuts")}
            className={`flex-1 py-2.5 text-[12px] font-medium transition cursor-pointer ${
              activeBottomTab === "shortcuts"
                ? "text-white border-b-2 border-white bg-white/5"
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
