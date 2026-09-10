"use client";
import React, { useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Search, ChevronRight, ChevronDown, User, Settings, Shield, Palette,
  BarChart2, Puzzle, Globe, Keyboard, Code2, Monitor, Bell, Volume2,
  ToggleLeft, ExternalLink, Crown, Mail, Eye, Terminal, FolderOpen,
  FileEdit, Cpu, History, Brain, Sparkles, Gauge, Lock, Zap,
} from "lucide-react";
import { useIDEStore } from "../../store/ideStore";

/* ═══════════════════════════════════════════════════════════════
   Toggle Switch — reusable iOS-style toggle
   ═══════════════════════════════════════════════════════════════ */

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
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

/* ═══════════════════════════════════════════════════════════════
   Dropdown — styled select
   ═══════════════════════════════════════════════════════════════ */

function Dropdown({
  value, onChange, options,
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
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Text Input  
   ═══════════════════════════════════════════════════════════════ */

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-[#3c3c3c] border border-white/10 text-white text-[13px] px-2.5 py-1 rounded focus:outline-none focus:border-[#0078d4] transition w-full max-w-[400px] placeholder:text-white/30"
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   Section header + setting row helpers
   ═══════════════════════════════════════════════════════════════ */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[14px] font-bold text-[#569cd6] mt-6 mb-3 first:mt-0">{children}</h3>;
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 px-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition rounded-sm">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-white">{label}</div>
        {description && <div className="text-[12px] text-white/45 mt-0.5 leading-relaxed">{description}</div>}
      </div>
      <div className="flex-shrink-0 mt-0.5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Sidebar categories — mcode-specific
   ═══════════════════════════════════════════════════════════════ */

interface SidebarItem {
  id: string;
  label: string;
  icon: any;
}

const SIDEBAR_CATEGORIES: SidebarItem[] = [
  { id: "account", label: "Account", icon: User },
  { id: "general", label: "General", icon: Settings },
  { id: "terminal", label: "Terminal", icon: Terminal },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "models", label: "Models & Usage", icon: BarChart2 },
  { id: "customizations", label: "Customizations", icon: Puzzle },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "tab", label: "Tab", icon: Keyboard },
  { id: "editor", label: "Editor", icon: Code2 },
];

/* ═══════════════════════════════════════════════════════════════
   Each panel's content — adapted for Mcode
   ═══════════════════════════════════════════════════════════════ */

function AccountPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Account</h2>
      <p className="text-[13px] text-white/40 mb-5">Manage your plan, credentials, and general preferences.</p>

      <SectionHeader>General</SectionHeader>
      <SettingRow label="Enable Telemetry" description="When toggled on, Mcode IDE collects usage data to help improve performance and features.">
        <Toggle checked={state.telemetry} onChange={(v) => set("telemetry", v)} />
      </SettingRow>
      <SettingRow label="Marketing Emails" description="Receive product updates, tips, and promotions from Mcode IDE via email.">
        <Toggle checked={state.marketingEmails} onChange={(v) => set("marketingEmails", v)} />
      </SettingRow>

      <SectionHeader>Account</SectionHeader>
      <div className="bg-[#252526] border border-white/5 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-white">Your Plan: Mcode Pro</div>
            <div className="text-[12px] text-white/40">You can upgrade to Mcode Ultra for higher rate limits.</div>
          </div>
          <button type="button" className="px-3 py-1 bg-[#0078d4] hover:bg-[#106ebe] text-white text-[12px] font-medium rounded transition cursor-pointer flex items-center gap-1">
            <Crown className="w-3 h-3" /> Upgrade
          </button>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-medium text-white">Email</div>
            <div className="text-[12px] text-white/40">kishorilalprajapati56@gmail.com</div>
          </div>
          <button type="button" className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white text-[12px] font-medium rounded transition cursor-pointer">
            Sign Out
          </button>
        </div>
      </div>

      <p className="text-[12px] text-white/30 mt-4">
        By using this app, you agree to its{" "}
        <a href="#" className="text-[#569cd6] hover:underline">Terms of Service</a>
      </p>
    </>
  );
}

function GeneralPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">General</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure agent execution, permissions, and automation.</p>

      <SectionHeader>Execution</SectionHeader>
      <SettingRow label="Agent Security Mode" description="Select one of the three options to control agent access level.">
        <Dropdown value={state.securityMode} onChange={(v) => set("securityMode", v)} options={[
          { value: "full", label: "Full Access" },
          { value: "sandboxed", label: "Sandboxed" },
          { value: "strict", label: "Strict" },
        ]} />
      </SettingRow>
      <div className="px-3 py-2 text-[11px] text-white/35 leading-relaxed space-y-1">
        <div><strong className="text-white/50">Full Access</strong> — Agents have full access to your machine and external resources.</div>
        <div><strong className="text-white/50">Sandboxed</strong> — Agents run in a secure sandbox restricting external resource access.</div>
        <div><strong className="text-white/50">Strict</strong> — Terminal commands always require review; no file access outside workspaces.</div>
      </div>

      <SectionHeader>Terminal</SectionHeader>
      <SettingRow label="Terminal Command Auto Execution" description="Controls whether terminal commands require your approval before running.">
        <Dropdown value={state.terminalAutoExec} onChange={(v) => set("terminalAutoExec", v)} options={[
          { value: "request-review", label: "Request Review" },
          { value: "auto", label: "Auto Execute" },
          { value: "always-ask", label: "Always Ask" },
        ]} />
      </SettingRow>
      <SettingRow label="Enable Shell Integration" description="When enabled, Mcode will use shell integration to detect and report terminal command execution.">
        <Toggle checked={state.shellIntegration} onChange={(v) => set("shellIntegration", v)} />
      </SettingRow>

      <SectionHeader>File Access</SectionHeader>
      <SettingRow label="Agent Non-Workspace File Access" description="Allows the agent to access files outside of your current workspace.">
        <Toggle checked={state.nonWorkspaceAccess} onChange={(v) => set("nonWorkspaceAccess", v)} />
      </SettingRow>
      <SettingRow label="Auto-Open Edited Files" description="Open files in the background if Agent creates or edits them.">
        <Toggle checked={state.autoOpenEdited} onChange={(v) => set("autoOpenEdited", v)} />
      </SettingRow>

      <SectionHeader>Planning</SectionHeader>
      <SettingRow label="Review Policy" description="Specifies Agent's behavior when asking for review on artifacts and plans.">
        <Dropdown value={state.reviewPolicy} onChange={(v) => set("reviewPolicy", v)} options={[
          { value: "always-ask", label: "Always Ask" },
          { value: "auto", label: "Auto Approve" },
          { value: "skip", label: "Skip Reviews" },
        ]} />
      </SettingRow>

      <SectionHeader>Automation</SectionHeader>
      <SettingRow label="Agent Auto-Fix Lints" description="When enabled, Agent is given awareness of lint errors and may fix them without explicit prompting.">
        <Toggle checked={state.autoFixLints} onChange={(v) => set("autoFixLints", v)} />
      </SettingRow>

      <SectionHeader>History & Knowledge</SectionHeader>
      <SettingRow label="Conversation History" description="When enabled, the agent can access past conversations to inform its responses.">
        <Toggle checked={state.conversationHistory} onChange={(v) => set("conversationHistory", v)} />
      </SettingRow>
      <SettingRow label="Knowledge Base" description="When enabled, the agent can access its knowledge base and auto-generate knowledge items.">
        <Toggle checked={state.knowledgeBase} onChange={(v) => set("knowledgeBase", v)} />
      </SettingRow>

      <SectionHeader>General</SectionHeader>
      <SettingRow label="Open Agent on Reload" description="Open Agent panel on window reload.">
        <Toggle checked={state.openOnReload} onChange={(v) => set("openOnReload", v)} />
      </SettingRow>
      <SettingRow label="Enable Sounds" description="Play a sound when Agent finishes generating a response.">
        <Toggle checked={state.enableSounds} onChange={(v) => set("enableSounds", v)} />
      </SettingRow>
      <SettingRow label="Enable Notifications" description="Show browser notifications when user action is needed or execution finishes.">
        <Toggle checked={state.enableNotifications} onChange={(v) => set("enableNotifications", v)} />
      </SettingRow>
    </>
  );
}

function TerminalPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Terminal</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure integrated terminal font, shell profiles, and behavior.</p>

      <SectionHeader>Integrated Terminal</SectionHeader>
      <SettingRow label="Font Size" description="Controls the font size in pixels of the terminal.">
        <Dropdown
          value={String(state.terminalFontSize || '13')}
          onChange={(v) => {
            set('terminalFontSize', v);
            localStorage.setItem('mcode.terminal.fontSize', v);
          }}
          options={[
            { value: '11', label: '11 px' },
            { value: '12', label: '12 px' },
            { value: '13', label: '13 px (Default)' },
            { value: '14', label: '14 px' },
            { value: '15', label: '15 px' },
            { value: '16', label: '16 px' },
            { value: '18', label: '18 px' },
            { value: '20', label: '20 px' },
          ]}
        />
      </SettingRow>

      <SettingRow label="Font Family" description="Controls the font family of the terminal.">
        <Dropdown
          value={state.terminalFontFamily || 'monospace'}
          onChange={(v) => {
            set('terminalFontFamily', v);
            localStorage.setItem('mcode.terminal.fontFamily', v);
          }}
          options={[
            { value: 'monospace', label: 'monospace (System Default)' },
            { value: 'Consolas, monospace', label: 'Consolas' },
            { value: 'Menlo, Monaco, monospace', label: 'Menlo / Monaco' },
            { value: '"Fira Code", monospace', label: 'Fira Code' },
            { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
          ]}
        />
      </SettingRow>

      <SettingRow label="Cursor Style" description="Controls the style of the terminal cursor.">
        <Dropdown
          value={state.terminalCursorStyle || 'block'}
          onChange={(v) => {
            set('terminalCursorStyle', v);
            localStorage.setItem('mcode.terminal.cursorStyle', v);
          }}
          options={[
            { value: 'block', label: 'Block' },
            { value: 'underline', label: 'Underline' },
            { value: 'bar', label: 'Bar' },
          ]}
        />
      </SettingRow>

      <SettingRow label="Cursor Blink" description="Controls whether the terminal cursor blinks.">
        <Toggle
          checked={state.terminalCursorBlink}
          onChange={(v) => {
            set('terminalCursorBlink', v);
            localStorage.setItem('mcode.terminal.cursorBlink', String(v));
          }}
        />
      </SettingRow>

      <SettingRow label="Scrollback Lines" description="Controls the maximum number of lines kept in the terminal buffer.">
        <Dropdown
          value={String(state.terminalScrollback || '5000')}
          onChange={(v) => {
            set('terminalScrollback', v);
            localStorage.setItem('mcode.terminal.scrollback', v);
          }}
          options={[
            { value: '1000', label: '1,000 lines' },
            { value: '2000', label: '2,000 lines' },
            { value: '5000', label: '5,000 lines (Default)' },
            { value: '10000', label: '10,000 lines' },
            { value: '20000', label: '20,000 lines' },
          ]}
        />
      </SettingRow>

      <SettingRow label="Copy On Selection" description="Controls whether text selected in the terminal is automatically copied to the clipboard.">
        <Toggle
          checked={state.terminalCopyOnSelection}
          onChange={(v) => {
            set('terminalCopyOnSelection', v);
            localStorage.setItem('mcode.terminal.copyOnSelection', String(v));
          }}
        />
      </SettingRow>
    </>
  );
}

function AppearancePanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Appearance</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure the agent's visual theme and display preferences.</p>

      <SectionHeader>Chat Settings</SectionHeader>
      <SettingRow label="Verbose Agent Chat" description="Display and preserve intermediate thinking steps.">
        <Toggle checked={state.verboseChat} onChange={(v) => set("verboseChat", v)} />
      </SettingRow>
      <SettingRow label="Auto-Expand Changes Overview" description="When enabled, the Changes Overview toolbar will automatically expand when Agent finishes.">
        <Toggle checked={state.autoExpandChanges} onChange={(v) => set("autoExpandChanges", v)} />
      </SettingRow>
      <SettingRow label="Chat Font Size" description="Controls font size in chat messages.">
        <Dropdown value={state.chatFontSize} onChange={(v) => set("chatFontSize", v)} options={[
          { value: "12", label: "12px" },
          { value: "13", label: "13px" },
          { value: "14", label: "14px (Default)" },
          { value: "15", label: "15px" },
          { value: "16", label: "16px" },
        ]} />
      </SettingRow>

      <SectionHeader>Theme</SectionHeader>
      <SettingRow label="Color Theme" description="Specifies the color theme used in the IDE.">
        <Dropdown value={state.colorTheme} onChange={(v) => set("colorTheme", v)} options={[
          { value: "mcode-dark", label: "Mcode Dark (Default)" },
          { value: "mcode-light", label: "Mcode Light" },
          { value: "monokai", label: "Monokai Pro" },
          { value: "one-dark", label: "One Dark Pro" },
          { value: "dracula", label: "Dracula" },
          { value: "github-dark", label: "GitHub Dark" },
        ]} />
      </SettingRow>
      <SettingRow label="Icon Theme" description="Specifies the file icon theme in the explorer.">
        <Dropdown value={state.iconTheme} onChange={(v) => set("iconTheme", v)} options={[
          { value: "seti", label: "Seti (Default)" },
          { value: "material", label: "Material Icons" },
          { value: "minimal", label: "Minimal" },
          { value: "none", label: "None" },
        ]} />
      </SettingRow>
    </>
  );
}

function ModelsPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Models & Usage</h2>
      <p className="text-[13px] text-white/40 mb-5">Manage your model quota and credits.</p>

      <SectionHeader>Plan</SectionHeader>
      <div className="bg-[#252526] border border-white/5 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold text-white">Your Plan: Mcode Pro</div>
            <div className="text-[12px] text-white/40">Upgrade to Mcode Ultra for higher rate limits.</div>
          </div>
          <button type="button" className="px-3 py-1 bg-[#0078d4] hover:bg-[#106ebe] text-white text-[12px] font-medium rounded transition cursor-pointer flex items-center gap-1">
            <Crown className="w-3 h-3" /> Upgrade
          </button>
        </div>
      </div>

      <SectionHeader>Model Credits</SectionHeader>
      <SettingRow label="Enable AI Credit Overages" description="Use your AI credits to fulfill model requests once you're out of quota. Mcode will use your model quota first.">
        <Toggle checked={state.creditOverages} onChange={(v) => set("creditOverages", v)} />
      </SettingRow>
      <div className="px-3 py-2 text-[12px] text-white/40">Available AI Credits: <span className="text-white font-semibold">0</span></div>

      <SectionHeader>Gemini Models</SectionHeader>
      <div className="bg-[#252526] border border-white/5 rounded-lg p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-white/60">Weekly Limit Remaining</span>
            <span className="text-[12px] text-emerald-400 font-semibold">100%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-white/60">Five Hour Limit Remaining</span>
            <span className="text-[12px] text-emerald-400 font-semibold">100%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
          </div>
        </div>
      </div>

      <SectionHeader>Claude & GPT Models</SectionHeader>
      <div className="bg-[#252526] border border-white/5 rounded-lg p-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-white/60">Weekly Limit Remaining</span>
            <span className="text-[12px] text-amber-400 font-semibold">94%</span>
          </div>
          <div className="text-[11px] text-white/30 mb-1.5">Refreshes in 6 days, 23 hours.</div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: "94%" }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-white/60">Five Hour Limit Remaining</span>
            <span className="text-[12px] text-amber-400 font-semibold">82%</span>
          </div>
          <div className="text-[11px] text-white/30 mb-1.5">Refreshes in 4 hours, 57 minutes.</div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: "82%" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function CustomizationsPanel() {
  const SAMPLE_SKILLS = [
    { name: "code-review", scope: "Workspace", desc: "Automated code review and quality analysis." },
    { name: "deploy-helper", scope: "Workspace", desc: "Streamlined deployment workflows for cloud platforms." },
    { name: "test-generator", scope: "Global", desc: "Auto-generate unit tests from function signatures." },
    { name: "refactor-assist", scope: "Global", desc: "Suggest and apply code refactoring patterns." },
    { name: "api-designer", scope: "Workspace", desc: "Design RESTful APIs from schema definitions." },
  ];
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Customizations</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure default behaviors, skills, and MCP servers.</p>

      <SectionHeader>Token Usage</SectionHeader>
      <div className="bg-[#252526] border border-white/5 rounded-lg p-4 mb-4">
        <div className="text-[12px] text-white/50 mb-2">Token usage from customizations like skills, rules, and MCP.</div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-white/60">Customization Budget Available</span>
          <span className="text-[12px] text-emerald-400 font-semibold">72.2%</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "72.2%" }} />
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-white/40">
          <span>Skills: <span className="text-white/60">27.3%</span> (5,451 tokens)</span>
          <span>MCP Tools: <span className="text-white/60">0.5%</span> (101 tokens)</span>
        </div>
      </div>

      <SectionHeader>Skills ({SAMPLE_SKILLS.length})</SectionHeader>
      <div className="space-y-1">
        {SAMPLE_SKILLS.map((s) => (
          <div key={s.name} className="flex items-start gap-3 py-2 px-3 rounded hover:bg-white/[0.03] transition">
            <Puzzle className="w-3.5 h-3.5 text-[#569cd6] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold text-white">{s.name}</div>
              <div className="text-[11px] text-white/40">{s.scope} — {s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <SectionHeader>Installed MCP Servers</SectionHeader>
      <div className="bg-[#252526] border border-white/5 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-[#569cd6]" />
          <span className="text-[12px] font-semibold text-white">StitchMCP</span>
          <span className="text-[11px] text-white/40 ml-auto">15 tools enabled</span>
        </div>
      </div>
    </>
  );
}

function BrowserPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Browser Settings</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure the browser agent's behavior and permissions.</p>

      <SectionHeader>General</SectionHeader>
      <SettingRow label="Enable Browser Tools" description="When enabled, Agent can open URLs, read web pages, and interact with browser content.">
        <Toggle checked={state.browserTools} onChange={(v) => set("browserTools", v)} />
      </SettingRow>
      <SettingRow label="Browser JavaScript Execution Policy" description="Controls whether the agent can run custom JavaScript to automate complex browser actions.">
        <Dropdown value={state.browserJsPolicy} onChange={(v) => set("browserJsPolicy", v)} options={[
          { value: "disabled", label: "Disabled" },
          { value: "ask", label: "Ask Before Running" },
          { value: "enabled", label: "Enabled" },
        ]} />
      </SettingRow>
      <SettingRow label="Enable Browser Notifications" description="Show browser notifications when user action is needed.">
        <Toggle checked={state.browserNotifications} onChange={(v) => set("browserNotifications", v)} />
      </SettingRow>

      <SectionHeader>Actuation Permissions</SectionHeader>
      <SettingRow label="Browser Actuation Rules" description="Configure allowed and denied URLs for browser actuation.">
        <button type="button" className="text-[12px] text-[#569cd6] hover:text-[#7cb8f0] transition cursor-pointer">
          Configure →
        </button>
      </SettingRow>
    </>
  );
}

function TabPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Tab</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure tab completion, suggestions, and navigation behavior.</p>

      <SectionHeader>Suggestions</SectionHeader>
      <SettingRow label="Suggestions in Editor" description="Show AI suggestions when typing in the editor.">
        <Dropdown value={state.suggestionsInEditor} onChange={(v) => set("suggestionsInEditor", v)} options={[
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ]} />
      </SettingRow>
      <SettingRow label="Tab Speed" description="Set the speed of tab suggestions.">
        <Dropdown value={state.tabSpeed} onChange={(v) => set("tabSpeed", v)} options={[
          { value: "fast", label: "Fast" },
          { value: "normal", label: "Normal" },
          { value: "slow", label: "Slow" },
        ]} />
      </SettingRow>
      <SettingRow label="Highlight After Accept" description="Highlight newly inserted text after accepting a Tab completion.">
        <Toggle checked={state.highlightAfterAccept} onChange={(v) => set("highlightAfterAccept", v)} />
      </SettingRow>
      <SettingRow label="Tab to Import" description="Quickly add and update imports with a tab keypress.">
        <Toggle checked={state.tabToImport} onChange={(v) => set("tabToImport", v)} />
      </SettingRow>

      <SectionHeader>Navigation</SectionHeader>
      <SettingRow label="Tab to Jump" description="Predict the location of your next edit and navigate there with a tab keypress.">
        <Toggle checked={state.tabToJump} onChange={(v) => set("tabToJump", v)} />
      </SettingRow>

      <SectionHeader>Context</SectionHeader>
      <SettingRow label="Tab Gitignore Access" description="Allow Tab to view and edit files in .gitignore. Use with caution if those files contain credentials.">
        <Dropdown value={state.tabGitignoreAccess} onChange={(v) => set("tabGitignoreAccess", v)} options={[
          { value: "off", label: "Off" },
          { value: "on", label: "On" },
        ]} />
      </SettingRow>
    </>
  );
}

function EditorPanel({ state, set }: { state: any; set: (k: string, v: any) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold text-white mb-1">Editor Settings</h2>
      <p className="text-[13px] text-white/40 mb-5">Configure editor-specific behaviors and extensions.</p>

      <SectionHeader>Marketplace</SectionHeader>
      <SettingRow label="Marketplace Item URL" description="Base URL for extension pages. Restart Mcode IDE to apply changes.">
        <TextInput value={state.marketplaceItemUrl} onChange={(v) => set("marketplaceItemUrl", v)} />
      </SettingRow>
      <SettingRow label="Marketplace Gallery URL" description="Base URL for marketplace search results. Restart Mcode IDE to apply changes.">
        <TextInput value={state.marketplaceGalleryUrl} onChange={(v) => set("marketplaceGalleryUrl", v)} />
      </SettingRow>

      <SectionHeader>Selection Actions</SectionHeader>
      <SettingRow label="Show Selection Actions" description="Show 'Edit' and 'Chat' buttons when selecting text in the editor.">
        <Toggle checked={state.showSelectionActions} onChange={(v) => set("showSelectionActions", v)} />
      </SettingRow>

      <SectionHeader>General</SectionHeader>
      <SettingRow label="Editor Settings" description="To modify detailed editor settings (font, theme, minimap, etc.), use the Advanced Settings panel.">
        <button
          type="button"
          onClick={() => {
            useIDEStore.getState().setGeneralSettingsOpen(false);
            useIDEStore.getState().setAdvancedSettingsOpen(true);
          }}
          className="text-[12px] text-[#569cd6] hover:text-[#7cb8f0] transition cursor-pointer flex items-center gap-1"
        >
          Open Advanced Settings <ExternalLink className="w-3 h-3" />
        </button>
      </SettingRow>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main Modal
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_STATE = {
  // Account
  telemetry: true,
  marketingEmails: false,
  // General
  securityMode: "full",
  terminalAutoExec: "request-review",
  shellIntegration: true,
  nonWorkspaceAccess: false,
  autoOpenEdited: true,
  reviewPolicy: "always-ask",
  autoFixLints: true,
  conversationHistory: true,
  knowledgeBase: true,
  openOnReload: false,
  enableSounds: false,
  enableNotifications: false,
  // Appearance
  verboseChat: false,
  autoExpandChanges: true,
  chatFontSize: "14",
  colorTheme: "mcode-dark",
  iconTheme: "seti",
  // Models
  creditOverages: false,
  // Browser
  browserTools: true,
  browserJsPolicy: "disabled",
  browserNotifications: true,
  // Tab
  suggestionsInEditor: "on",
  tabSpeed: "fast",
  highlightAfterAccept: true,
  tabToImport: true,
  tabToJump: true,
  tabGitignoreAccess: "off",
  // Editor
  marketplaceItemUrl: "https://open-vsx.org/vscode/item",
  marketplaceGalleryUrl: "https://open-vsx.org/vscode/gallery",
  showSelectionActions: true,
};

export function GeneralSettingsModal() {
  const isOpen = useIDEStore((s) => s.isGeneralSettingsOpen);
  const setOpen = useIDEStore((s) => s.setGeneralSettingsOpen);

  const [activeCategory, setActiveCategory] = useState("account");
  const [settingValues, setSettingValues] = useState<Record<string, any>>(DEFAULT_STATE);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSet = useCallback((key: string, val: any) => {
    setSettingValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const renderPanel = () => {
    const props = { state: settingValues, set: handleSet };
    switch (activeCategory) {
      case "account": return <AccountPanel {...props} />;
      case "general": return <GeneralPanel {...props} />;
      case "terminal": return <TerminalPanel {...props} />;
      case "appearance": return <AppearancePanel {...props} />;
      case "models": return <ModelsPanel {...props} />;
      case "customizations": return <CustomizationsPanel />;
      case "browser": return <BrowserPanel {...props} />;
      case "tab": return <TabPanel {...props} />;
      case "editor": return <EditorPanel {...props} />;
      default: return <AccountPanel {...props} />;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
      <div
        className="w-[880px] max-w-[95vw] h-[85vh] bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "gsModalIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-[#252526] flex-shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-white/50" />
            <span className="text-[14px] font-semibold text-white">Mcode Settings</span>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded transition cursor-pointer text-white/40 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-[180px] border-r border-white/5 flex flex-col flex-shrink-0 bg-[#1e1e1e]">
            {/* Sidebar Header */}
            <div className="px-3 pt-3 pb-1">
              <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Settings</span>
            </div>
            {/* Sidebar Items */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
              {SIDEBAR_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition cursor-pointer ${
                      isActive
                        ? "bg-[#04395e] text-white font-semibold"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Workspace list */}
            <div className="border-t border-white/5 px-3 py-2">
              <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">Workspaces</span>
              <div className="mt-1.5 space-y-0.5">
                {["mcoode", "mfrontend", "mdesign"].map((ws) => (
                  <div key={ws} className="text-[12px] text-[#569cd6] hover:text-[#7cb8f0] transition cursor-pointer py-0.5 px-1 rounded hover:bg-white/5">
                    {ws}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
            {renderPanel()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gsModalIn {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

export default GeneralSettingsModal;
