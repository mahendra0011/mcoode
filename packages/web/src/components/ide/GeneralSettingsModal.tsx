"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Search, User, Settings, Palette, Terminal, Shield, Code2,
  Crown, LogOut, ExternalLink, ChevronDown, Check,
  Type, FileCode, Indent, WrapText, ListOrdered, Map, FileCheck, Save,
  MousePointer, Sparkles, Scroll, Copy, Cpu, Layers, MessageSquare,
  Eye, ZoomIn, ShieldAlert, FolderLock, FilePlus, Activity, Mail
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";
import { useSettingsStore } from "../../store/settingsStore";
import { toast } from "sonner";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
        checked ? "bg-[#0078d4]" : "bg-white/20"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[#3c3c3c] border border-white/10 text-white text-[13px] px-2.5 py-1 pr-7 rounded cursor-pointer hover:border-white/20 focus:outline-none focus:border-[#0078d4] transition min-w-[160px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[13px] font-bold text-[#569cd6] mt-6 mb-3 first:mt-0 tracking-wide">{children}</h3>;
}

function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon?: React.ElementType;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 px-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition rounded-sm group">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 group-hover:text-[#569cd6] transition flex-shrink-0 mt-0.5">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-white">{label}</div>
          {description && <div className="text-[12px] text-white/45 mt-0.5 leading-relaxed">{description}</div>}
        </div>
      </div>
      <div className="flex-shrink-0 mt-0.5">{children}</div>
    </div>
  );
}

interface CategoryTab {
  id: string;
  label: string;
  icon: any;
}

const CATEGORIES: CategoryTab[] = [
  { id: "editor", label: "Editor Layout", icon: Code2 },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "appearance", label: "Appearance & Themes", icon: Palette },
  { id: "security", label: "Security & Sandbox", icon: Shield },
  { id: "account", label: "Account & Preferences", icon: User },
];

export function GeneralSettingsModal() {
  const isOpen = useIDEStore((s) => s.isGeneralSettingsOpen);
  const setOpen = useIDEStore((s) => s.setGeneralSettingsOpen);

  const [activeTab, setActiveTab] = useState<string>("editor");
  const [searchQuery, setSearchQuery] = useState("");

  const editor = useSettingsStore((s) => s.editor);
  const updateEditor = useSettingsStore((s) => s.updateEditorSetting);

  const terminal = useSettingsStore((s) => s.terminal);
  const updateTerminal = useSettingsStore((s) => s.updateTerminalSetting);

  const appearance = useSettingsStore((s) => s.appearance);
  const updateAppearance = useSettingsStore((s) => s.updateAppearanceSetting);

  const security = useSettingsStore((s) => s.security);
  const updateSecurity = useSettingsStore((s) => s.updateSecuritySetting);

  const account = useSettingsStore((s) => s.account);
  const updateAccount = useSettingsStore((s) => s.updateAccountSetting);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-[#1e1e1e] border border-white/10 rounded-xl w-full max-w-4xl h-[82vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#252526]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-[15px] font-semibold text-white">Mcode IDE Settings</h2>
              <p className="text-[11px] text-white/40">Manage primary editor preferences, terminal, and workspace configuration</p>
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

        {/* Search */}
        <div className="px-6 py-3 border-b border-white/5 bg-[#1e1e1e]">
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings (e.g. font, theme, terminal, autosave)..."
              className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-60 bg-[#252526] border-r border-white/5 p-2 space-y-1 overflow-y-auto custom-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Panel Content */}
          <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            {activeTab === "editor" && (
              <>
                <h2 className="text-[18px] font-bold text-white mb-1">Editor Layout & Behavior</h2>
                <p className="text-[12px] text-white/40 mb-6">Core code editor presentation, typography, and file saving mechanics.</p>

                <SectionHeader>Typography & Sizing</SectionHeader>
                <SettingRow icon={Type} label="Font Size" description="Controls the font size in pixels for the code editor pane.">
                  <Dropdown
                    value={String(editor.fontSize)}
                    onChange={(v) => updateEditor("fontSize", Number(v))}
                    options={[
                      { value: "11", label: "11 px" },
                      { value: "12", label: "12 px" },
                      { value: "13", label: "13 px (Default)" },
                      { value: "14", label: "14 px" },
                      { value: "15", label: "15 px" },
                      { value: "16", label: "16 px" },
                      { value: "18", label: "18 px" },
                      { value: "20", label: "20 px" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={FileCode} label="Font Family" description="Font family applied to all Monaco code editors.">
                  <Dropdown
                    value={editor.fontFamily}
                    onChange={(v) => updateEditor("fontFamily", v)}
                    options={[
                      { value: "'JetBrains Mono', 'Fira Code', monospace", label: "JetBrains Mono / Fira Code" },
                      { value: "Consolas, 'Courier New', monospace", label: "Consolas" },
                      { value: "'Fira Code', monospace", label: "Fira Code" },
                      { value: "Menlo, Monaco, monospace", label: "Menlo / Monaco" },
                      { value: "monospace", label: "System Monospace" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={Indent} label="Tab Size" description="Number of spaces inserted per indentation level.">
                  <Dropdown
                    value={String(editor.tabSize)}
                    onChange={(v) => updateEditor("tabSize", Number(v))}
                    options={[
                      { value: "2", label: "2 Spaces" },
                      { value: "4", label: "4 Spaces" },
                      { value: "8", label: "8 Spaces" },
                    ]}
                  />
                </SettingRow>

                <SectionHeader>Display & Formatting</SectionHeader>
                <SettingRow icon={WrapText} label="Word Wrap" description="Wrap long lines to fit within editor width without horizontal scrolling.">
                  <Toggle checked={editor.wordWrap} onChange={(v) => updateEditor("wordWrap", v)} />
                </SettingRow>

                <SettingRow icon={ListOrdered} label="Show Line Numbers" description="Display line numbering in the left gutter.">
                  <Toggle checked={editor.lineNumbers} onChange={(v) => updateEditor("lineNumbers", v)} />
                </SettingRow>

                <SettingRow icon={Map} label="Show Minimap" description="Render code overview thumbnail on the right side of the editor.">
                  <Toggle checked={editor.minimap} onChange={(v) => updateEditor("minimap", v)} />
                </SettingRow>

                <SettingRow icon={FileCheck} label="Format on Save" description="Automatically format code file whenever you hit Save (Ctrl+S).">
                  <Toggle checked={editor.formatOnSave} onChange={(v) => updateEditor("formatOnSave", v)} />
                </SettingRow>

                <SettingRow icon={Save} label="Auto Save" description="Automatically save file changes in the background after edits.">
                  <Toggle checked={editor.autoSave} onChange={(v) => updateEditor("autoSave", v)} />
                </SettingRow>
              </>
            )}

            {activeTab === "terminal" && (
              <>
                <h2 className="text-[18px] font-bold text-white mb-1">Integrated Terminal</h2>
                <p className="text-[12px] text-white/40 mb-6">Configure integrated xterm shell font, cursor, and scrollback.</p>

                <SectionHeader>Terminal Display</SectionHeader>
                <SettingRow icon={Type} label="Font Size" description="Font size in pixels for integrated terminal sessions.">
                  <Dropdown
                    value={String(terminal.fontSize)}
                    onChange={(v) => updateTerminal("fontSize", Number(v))}
                    options={[
                      { value: "11", label: "11 px" },
                      { value: "12", label: "12 px" },
                      { value: "13", label: "13 px (Default)" },
                      { value: "14", label: "14 px" },
                      { value: "15", label: "15 px" },
                      { value: "16", label: "16 px" },
                      { value: "18", label: "18 px" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={Terminal} label="Font Family" description="Font family for the terminal buffer.">
                  <Dropdown
                    value={terminal.fontFamily}
                    onChange={(v) => updateTerminal("fontFamily", v)}
                    options={[
                      { value: "monospace", label: "System Monospace" },
                      { value: "Consolas, monospace", label: "Consolas" },
                      { value: "'Fira Code', monospace", label: "Fira Code" },
                      { value: "'JetBrains Mono', monospace", label: "JetBrains Mono" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={MousePointer} label="Cursor Style" description="Visual style of the terminal prompt cursor.">
                  <Dropdown
                    value={terminal.cursorStyle}
                    onChange={(v) => updateTerminal("cursorStyle", v as any)}
                    options={[
                      { value: "block", label: "Block" },
                      { value: "underline", label: "Underline" },
                      { value: "bar", label: "Vertical Bar" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={Sparkles} label="Cursor Blink" description="Blink terminal cursor when inactive.">
                  <Toggle checked={terminal.cursorBlink} onChange={(v) => updateTerminal("cursorBlink", v)} />
                </SettingRow>

                <SectionHeader>Terminal Buffer</SectionHeader>
                <SettingRow icon={Scroll} label="Scrollback Lines" description="Maximum number of historical lines retained in the terminal buffer.">
                  <Dropdown
                    value={String(terminal.scrollback)}
                    onChange={(v) => updateTerminal("scrollback", Number(v))}
                    options={[
                      { value: "1000", label: "1,000 lines" },
                      { value: "2000", label: "2,000 lines" },
                      { value: "5000", label: "5,000 lines (Default)" },
                      { value: "10000", label: "10,000 lines" },
                      { value: "20000", label: "20,000 lines" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={Copy} label="Copy on Selection" description="Automatically copy selected terminal text to clipboard.">
                  <Toggle checked={terminal.copyOnSelection} onChange={(v) => updateTerminal("copyOnSelection", v)} />
                </SettingRow>

                <SettingRow icon={Cpu} label="Shell Integration" description="Enable shell integration hooks to monitor exit codes and working directory changes.">
                  <Toggle checked={terminal.shellIntegration} onChange={(v) => updateTerminal("shellIntegration", v)} />
                </SettingRow>
              </>
            )}

            {activeTab === "appearance" && (
              <>
                <h2 className="text-[18px] font-bold text-white mb-1">Appearance & Themes</h2>
                <p className="text-[12px] text-white/40 mb-6">Select your preferred color schemes, icon packs, and chat appearance.</p>

                <SectionHeader>Theme Scheme</SectionHeader>
                <SettingRow icon={Palette} label="Color Theme" description="Visual theme applied to the entire IDE and code editor.">
                  <Dropdown
                    value={appearance.colorTheme}
                    onChange={(v) => updateAppearance("colorTheme", v)}
                    options={[
                      { value: "mcode-dark", label: "Mcode Dark (Default)" },
                      { value: "mcode-light", label: "Mcode Light" },
                      { value: "one-dark", label: "One Dark Pro" },
                      { value: "monokai", label: "Monokai Pro" },
                      { value: "dracula", label: "Dracula" },
                      { value: "github-dark", label: "GitHub Dark" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={Layers} label="File Icon Theme" description="Icon set used in the workspace File Explorer.">
                  <Dropdown
                    value={appearance.iconTheme}
                    onChange={(v) => updateAppearance("iconTheme", v as any)}
                    options={[
                      { value: "seti", label: "Seti Icons (Default)" },
                      { value: "material", label: "Material Icons" },
                      { value: "minimal", label: "Minimal" },
                      { value: "none", label: "None" },
                    ]}
                  />
                </SettingRow>

                <SectionHeader>AI Chat UI</SectionHeader>
                <SettingRow icon={MessageSquare} label="Chat Font Size" description="Text size inside message bubbles.">
                  <Dropdown
                    value={String(appearance.chatFontSize)}
                    onChange={(v) => updateAppearance("chatFontSize", Number(v))}
                    options={[
                      { value: "12", label: "12 px" },
                      { value: "13", label: "13 px" },
                      { value: "14", label: "14 px (Default)" },
                      { value: "15", label: "15 px" },
                      { value: "16", label: "16 px" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={Eye} label="Verbose Agent Chat" description="Display intermediate thinking steps and subagent trace logs in message feed.">
                  <Toggle checked={appearance.verboseChat} onChange={(v) => updateAppearance("verboseChat", v)} />
                </SettingRow>

                <SettingRow icon={ZoomIn} label="Interface Scale" description="Scale overall UI zoom ratio.">
                  <Dropdown
                    value={appearance.uiScale}
                    onChange={(v) => updateAppearance("uiScale", v as any)}
                    options={[
                      { value: "100%", label: "100% (Standard)" },
                      { value: "110%", label: "110%" },
                      { value: "120%", label: "120%" },
                    ]}
                  />
                </SettingRow>
              </>
            )}

            {activeTab === "security" && (
              <>
                <h2 className="text-[18px] font-bold text-white mb-1">Security & Workspace Isolation</h2>
                <p className="text-[12px] text-white/40 mb-6">Control how AI agents interact with your local machine and file system.</p>

                <SectionHeader>Execution Sandbox</SectionHeader>
                <SettingRow icon={ShieldAlert} label="Agent Security Level" description="Choose boundary restrictions for agent tool executions.">
                  <Dropdown
                    value={security.agentSecurityMode}
                    onChange={(v) => updateSecurity("agentSecurityMode", v as any)}
                    options={[
                      { value: "full", label: "Full Access (Host Machine)" },
                      { value: "sandboxed", label: "Sandboxed (Restricted Filesystem)" },
                      { value: "strict", label: "Strict (Require Approval for All)" },
                    ]}
                  />
                </SettingRow>

                <SettingRow icon={FolderLock} label="Allow Non-Workspace File Access" description="Allow agent to read and modify files outside current project folder.">
                  <Toggle checked={security.nonWorkspaceAccess} onChange={(v) => updateSecurity("nonWorkspaceAccess", v)} />
                </SettingRow>

                <SettingRow icon={FilePlus} label="Auto-Open Created Files" description="Automatically open new files created by the agent in editor tabs.">
                  <Toggle checked={security.autoOpenEdited} onChange={(v) => updateSecurity("autoOpenEdited", v)} />
                </SettingRow>
              </>
            )}

            {activeTab === "account" && (
              <>
                <h2 className="text-[18px] font-bold text-white mb-1">Account & Preferences</h2>
                <p className="text-[12px] text-white/40 mb-6">Manage user subscription, telemetry, and communications.</p>

                <SectionHeader>Plan Status</SectionHeader>
                <div className="bg-[#252526] border border-white/5 rounded-lg p-4 mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[14px] font-semibold text-white flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Mcode Pro
                    </div>
                    <div className="text-[12px] text-white/40 mt-0.5">High-speed model inference & parallel subagent support.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success("You are on Mcode Pro plan!")}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium rounded transition cursor-pointer"
                  >
                    Active Plan
                  </button>
                </div>

                <SectionHeader>Privacy & Diagnostics</SectionHeader>
                <SettingRow icon={Activity} label="Anonymous Usage Telemetry" description="Send anonymous crash reports and performance metrics to help improve Mcode.">
                  <Toggle checked={account.telemetry} onChange={(v) => updateAccount("telemetry", v)} />
                </SettingRow>

                <SettingRow icon={Mail} label="Product Update Emails" description="Receive occasional product updates, new model releases, and tips.">
                  <Toggle checked={account.marketingEmails} onChange={(v) => updateAccount("marketingEmails", v)} />
                </SettingRow>
              </>
            )}
          </main>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default GeneralSettingsModal;
