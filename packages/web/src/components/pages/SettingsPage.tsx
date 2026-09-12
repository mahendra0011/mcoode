"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Key, User, Github, ArrowLeft, Loader2,
  Plus, Trash2, Check, AlertTriangle, Eye, EyeOff, ChevronDown,
  Palette, Globe, Radar, Zap, X, Box, Plug, RefreshCw, Edit2, BarChart2,
  Calendar, Clock, Flame, Activity, MessageSquare, Search,
  Server, Settings, Settings2, Rocket, Workflow, Package, Terminal, BookOpen, Sparkles, TestTube, GitBranch,
  CircleDashed, Monitor, MoreHorizontal, Download, Info, Upload, Network, FileKey, Copy,
  Brain, Cpu, Command, Sun, Moon, Sliders, FolderSearch, ShieldAlert, CheckSquare, Layers,
  Code2, ShieldCheck, FileCode, Gauge, BrainCircuit, GitFork, MousePointer, WrapText, ListOrdered, Map, Save,
  Bell, RotateCcw, Database, Users, Wrench, Type, Indent
} from 'lucide-react';
import api from '../../lib/axios';
import { connectOAuth } from '../../lib/electron-nav';
import { useSettingsStore } from '../../store/settingsStore';
import { toast } from 'sonner';

const MotionLink = motion.create(Link);

/* ─────────────────── THEME CONSTANTS ─────────────────── */

const ACCENT_COLORS = [
  { id: 'emerald', label: 'Emerald', color: '#10b981', gradient: 'from-emerald-500 to-teal-400' },
  { id: 'blue', label: 'Blue', color: '#3b82f6', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'purple', label: 'Purple', color: '#8b5cf6', gradient: 'from-purple-500 to-violet-400' },
  { id: 'amber', label: 'Amber', color: '#f59e0b', gradient: 'from-amber-500 to-yellow-400' },
  { id: 'red', label: 'Red', color: '#ef4444', gradient: 'from-red-500 to-rose-400' },
  { id: 'teal', label: 'Teal', color: '#14b8a6', gradient: 'from-teal-500 to-cyan-400' },
];

/* ─────────────────── COMPLETE SIDEBAR SECTIONS ─────────────────── */

const SIDEBAR_SECTIONS = [
  {
    id: 'basics',
    label: 'Basics & System',
    icon: Settings,
    children: [
      { id: 'general', label: 'General & System', icon: Settings },
      { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
      { id: 'models', label: 'Model Settings & Keys', icon: Key },
      { id: 'browser', label: 'Terminal & Browser Use', icon: Globe },
    ],
  },
  {
    id: 'agent',
    label: 'Agent & Governance',
    icon: Shield,
    children: [
      { id: 'agent-behavior', label: 'Agent Behavior', icon: Sparkles },
      { id: 'memory', label: 'Memory & Sessions', icon: Brain },
      { id: 'permissions', label: 'Permissions & CLI', icon: Shield },
      { id: 'godmode', label: 'God-Mode Defaults', icon: Zap },
      { id: 'watch', label: 'Watch Mode Defaults', icon: Radar },
    ],
  },
  {
    id: 'network-indexing',
    label: 'Network & Indexing',
    icon: Network,
    children: [
      { id: 'network', label: 'Network & Proxy', icon: Network },
      { id: 'indexing', label: 'Indexing & Storage', icon: FolderSearch },
    ],
  },
  {
    id: 'analytics-account',
    label: 'Analytics & Account',
    icon: Database,
    children: [
      { id: 'usage', label: 'Usage Stats', icon: BarChart2 },
      { id: 'account', label: 'Account Profile & Security', icon: User },
      { id: 'connections', label: 'Connections', icon: Github },
    ],
  },
];

/* ─────────────────── REUSABLE SETTING ROW WITH ICON ─────────────────── */

function SettingRowItem({
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
    <div className="flex items-start justify-between gap-4 py-3.5 px-3.5 bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)] rounded-xl hover:border-white/10 transition group">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[#1f2029] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400 group-hover:text-[#3ecf8e] transition">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-[var(--mcode-text,#e6e6ea)]">{label}</span>
          {description && (
            <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 mt-0.5">{children}</div>
    </div>
  );
}

function SettingToggle({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon?: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <SettingRowItem icon={icon} label={label} description={description}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
          checked ? 'bg-[#3ecf8e]' : 'bg-[#3a3a3f]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
    </SettingRowItem>
  );
}

/* ─────────────────── TAB 1: GENERAL TAB ─────────────────── */

function GeneralTab() {
  const system = useSettingsStore((s) => s.system);
  const updateSystem = useSettingsStore((s) => s.updateSystemSetting);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">General & System Settings</h2>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
          Configure application behavior, hardware acceleration, background execution, and update channels.
        </p>
      </div>

      {/* Application Behavior */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Application Behavior</h3>
        <SettingToggle
          icon={Monitor}
          label="Close to Tray on Windows"
          description="When true, closes to system tray on Windows instead of exiting. Window closes but process keeps running in background."
          checked={system.closeToTrayOnWindows}
          onChange={(v) => updateSystem('closeToTrayOnWindows', v)}
        />

        <SettingToggle
          icon={Cpu}
          label="Chromium GPU Hardware Acceleration"
          description="Enables GPU hardware acceleration for Chromium. Disable if you encounter blank windows or rendering glitches."
          checked={system.desktopChromiumHardwareAcceleration}
          onChange={(v) => updateSystem('desktopChromiumHardwareAcceleration', v)}
        />

        <SettingToggle
          icon={Sun}
          label="Keep Computer Awake While Running"
          description="Prevents the operating system from going to sleep while ZCode agent builds and tasks are executing."
          checked={system.keepAwake}
          onChange={(v) => updateSystem('keepAwake', v)}
        />
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Notifications</h3>
        <SettingToggle
          icon={Bell}
          label="Desktop Task Notifications"
          description="Sends desktop notifications when a task completes, fails, or needs your manual approval."
          checked={system.taskNotifications}
          onChange={(v) => updateSystem('taskNotifications', v)}
        />

        <SettingToggle
          icon={Sparkles}
          label="Notification Sound"
          description="Plays an auditory chime for desktop notifications (can be muted separately)."
          checked={system.notificationSound}
          onChange={(v) => updateSystem('notificationSound', v)}
        />
      </div>

      {/* Updates & Release Channel */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Updates & Releases</h3>
        <SettingToggle
          icon={Rocket}
          label="Receive Preview Updates"
          description="Opt in to receive preview/early-access updates before general production releases."
          checked={system.receivePreviewUpdates}
          onChange={(v) => updateSystem('receivePreviewUpdates', v)}
        />

        <SettingToggle
          icon={Download}
          label="Auto Download & Install Updates"
          description="Automatically downloads and installs background updates when found without prompting."
          checked={system.autoDownloadAndInstallUpdates}
          onChange={(v) => updateSystem('autoDownloadAndInstallUpdates', v)}
        />
      </div>

      {/* Localization & Logging */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Localization & CLI Logging</h3>
        <SettingRowItem
          icon={Globe}
          label="Display Language (Locale)"
          description="Display language for the ZCode UI and generated system logs."
        >
          <select
            value={system.locale}
            onChange={(e) => updateSystem('locale', e.target.value)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="ja">Japanese (日本語)</option>
            <option value="ko">Korean (한국어)</option>
            <option value="zh-CN">Simplified Chinese (简体中文)</option>
            <option value="zh-TW">Traditional Chinese (繁體中文)</option>
          </select>
        </SettingRowItem>

        <SettingRowItem
          icon={Terminal}
          label="CLI Logging Level"
          description="Controls terminal logger verbosity for daemon and CLI processes."
        >
          <select
            value={system.loggingLevel}
            onChange={(e) => updateSystem('loggingLevel', e.target.value as any)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="info">Info (Default)</option>
            <option value="debug">Debug (Verbose)</option>
            <option value="warn">Warn (Warnings only)</option>
            <option value="error">Error (Errors only)</option>
          </select>
        </SettingRowItem>

        <SettingRowItem
          icon={FileCode}
          label="CLI Logging Format"
          description="Output format for CLI system streams and persistent log files."
        >
          <select
            value={system.loggingFormat}
            onChange={(e) => updateSystem('loggingFormat', e.target.value as any)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="text">Text (Human readable)</option>
            <option value="json">JSON (Structured)</option>
            <option value="jsonl">JSONL (Lines)</option>
          </select>
        </SettingRowItem>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 2: APPEARANCE & THEME TAB ─────────────────── */

function AppearanceTab({ settings, onUpdate }: { settings: any; onUpdate: (patch: any) => void }) {
  const currentAccent = settings.accentColor || 'emerald';
  const appearance = useSettingsStore((s) => s.appearance);
  const updateAppearance = useSettingsStore((s) => s.updateAppearanceSetting);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Appearance & Themes</h2>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
          Customize UI color themes, editor font scaling, and visual accents.
        </p>
      </div>

      {/* Theme selector */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">App Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => updateAppearance('colorTheme', th.id as any)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                appearance.colorTheme === th.id
                  ? 'bg-white/10 border-white/30 text-white shadow-sm'
                  : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <th.icon className="w-4 h-4" />
              <span>{th.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color Palette */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Accent Color</h3>
        <div className="grid grid-cols-3 gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onUpdate({ accentColor: c.id })}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                currentAccent === c.id
                  ? 'border-white/20 bg-white/5 shadow-sm'
                  : 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              <div className="w-5 h-5 rounded-full shadow" style={{ background: c.color }} />
              <span className="text-xs text-white/80">{c.label}</span>
              {currentAccent === c.id && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Font & Preview */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Preview</h3>
        <div className="w-full h-2 rounded-full overflow-hidden bg-white/5">
          <div
            className="h-full rounded-full w-2/3 transition-all duration-500"
            style={{ background: ACCENT_COLORS.find((c) => c.id === currentAccent)?.color || '#10b981' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-lg text-xs text-white font-medium transition shadow-sm cursor-pointer"
            style={{ background: ACCENT_COLORS.find((c) => c.id === currentAccent)?.color }}
          >
            Sample Accent Button
          </button>
          <span className="text-xs font-semibold" style={{ color: ACCENT_COLORS.find((c) => c.id === currentAccent)?.color }}>
            Accent text preview
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 3: TERMINAL & BROWSER USE TAB ─────────────────── */

function BrowserUseTab() {
  const system = useSettingsStore((s) => s.system);
  const updateSystem = useSettingsStore((s) => s.updateSystemSetting);
  const agent = useSettingsStore((s) => s.agent);
  const updateAgent = useSettingsStore((s) => s.updateAgentSetting);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Terminal & Browser Automation</h2>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
          Configure shell environment inheritance, default terminal emulator, and autonomous browser runtime.
        </p>
      </div>

      {/* Terminal Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Terminal Environment</h3>
        <SettingToggle
          icon={Sliders}
          label="Inherit System Terminal Profile"
          description="When launching the built-in terminal, inherits login shell environment, proxy, Kubernetes variables, and local terminal font."
          checked={system.terminalInheritProfile}
          onChange={(v) => updateSystem('terminalInheritProfile', v)}
        />

        <SettingRowItem
          icon={Terminal}
          label="Default Terminal Shell"
          description="Primary shell spawned when opening terminal panes in IDE workspace."
        >
          <select
            value={system.integratedTerminalShell}
            onChange={(e) => updateSystem('integratedTerminalShell', e.target.value as any)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="Auto">Auto (Recommended)</option>
            <option value="PowerShell">PowerShell</option>
            <option value="Git Bash">Git Bash</option>
            <option value="Command Prompt">Command Prompt</option>
          </select>
        </SettingRowItem>
      </div>

      {/* Browser Use Automation */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Browser Use Automation</h3>
        <SettingToggle
          icon={Globe}
          label="Enable Built-in Browser Control"
          description="Allows AI agents to launch an automated browser session to test web apps, inspect DOM elements, and record WebP sessions."
          checked={agent.browserUse}
          onChange={(v) => updateAgent('browserUse', v)}
        />

        <SettingToggle
          icon={ShieldAlert}
          label="Allow Insecure TLS/SSL Certificates"
          description="Allows invalid, expired, or self-signed TLS certificates in the embedded browser used for Browser Use automation."
          checked={agent.embeddedBrowserAllowInsecureCertificates}
          onChange={(v) => updateAgent('embeddedBrowserAllowInsecureCertificates', v)}
        />

        <SettingRowItem
          icon={Monitor}
          label="Embedded Browser Viewport Preference"
          description="Controls the embedded browser viewport resolution and device emulation preference."
        >
          <select
            value={agent.embeddedBrowserViewportMode}
            onChange={(e) => updateAgent('embeddedBrowserViewportMode', e.target.value as any)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="normal">Normal (Native desktop)</option>
            <option value="mobile">Mobile (393 × 852 iPhone)</option>
            <option value="custom">Custom (User-defined)</option>
          </select>
        </SettingRowItem>
      </div>

      {/* Desktop Automation & Window Dimensions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Desktop Automation & Window</h3>
        <SettingToggle
          icon={Cpu}
          label="Enable Computer Use (Desktop Automation)"
          description="Allows authorized subagents to interact with host desktop software, terminal windows, and UI elements via mouse/keyboard."
          checked={agent.computerUse}
          onChange={(v) => updateAgent('computerUse', v)}
        />

        <div className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1f2029] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">Desktop Window Startup Dimensions</div>
              <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
                Default geometry applied on application launch: 1200 × 800 (Maximized: true).
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs text-[#3ecf8e] bg-[#0d0e12] px-3 py-1.5 rounded font-mono border border-white/5">
                  &#123; width: 1200, height: 800, maximized: true &#125;
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 4: AGENT BEHAVIOR TAB ─────────────────── */

function AgentBehaviorTab() {
  const agent = useSettingsStore((s) => s.agent);
  const updateAgent = useSettingsStore((s) => s.updateAgentSetting);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Agent Behavior & Stream Rendering</h2>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
          Configure chain-of-thought reasoning, tool grouping, interaction queue modes, and payload retention.
        </p>
      </div>

      {/* Stream Display */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Stream & Output Display</h3>
        <SettingToggle
          icon={Sparkles}
          label="Show Model Reasoning Blocks"
          description="Shows full reasoning and thinking blocks from the model directly in the chat stream."
          checked={agent.showReasoning}
          onChange={(v) => updateAgent('showReasoning', v)}
        />

        <SettingToggle
          icon={CheckSquare}
          label="Render Interactive Todo Cards"
          description="Renders interactive TodoWrite tool cards with task status checkmarks inside the message stream."
          checked={agent.showTodos}
          onChange={(v) => updateAgent('showTodos', v)}
        />

        <SettingToggle
          icon={Database}
          label="Retain Full Model I/O Payloads"
          description="Keeps complete model requests and tool responses without compression (higher memory & token usage)."
          checked={agent.keepModelIO}
          onChange={(v) => updateAgent('keepModelIO', v)}
        />
      </div>

      {/* Tool Grouping */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Tool Grouping Collapsibles</h3>
        <SettingToggle
          icon={FolderSearch}
          label="Group Explore Tools"
          description="Groups consecutive file reads, directory listings, and ripgrep searches into a compact 'Explore' section."
          checked={agent.toolGroupingExplore}
          onChange={(v) => updateAgent('toolGroupingExplore', v)}
        />

        <SettingToggle
          icon={Terminal}
          label="Group Terminal Tools"
          description="Groups consecutive shell commands and terminal script runs into a compact 'Terminal' section."
          checked={agent.toolGroupingTerminal}
          onChange={(v) => updateAgent('toolGroupingTerminal', v)}
        />

        <SettingToggle
          icon={Code2}
          label="Group Changes Tools"
          description="Groups consecutive write_to_file, replace_file_content, and apply_patch calls into a 'Changes' section."
          checked={agent.toolGroupingChanges}
          onChange={(v) => updateAgent('toolGroupingChanges', v)}
        />
      </div>

      {/* Interaction & Experience */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Turn Machine & Experience</h3>
        <SettingRowItem
          icon={MessageSquare}
          label="Interaction Behavior"
          description="How follow-up prompts and questions are handled while turn machine is active."
        >
          <select
            value={agent.interactionBehavior}
            onChange={(e) => updateAgent('interactionBehavior', e.target.value as any)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="Queue">Queue (Append to queue)</option>
            <option value="Inline">Inline (Allow immediate reply)</option>
            <option value="Modal">Modal (Display modal dialog)</option>
          </select>
        </SettingRowItem>

        <SettingToggle
          icon={Clock}
          label="Auto-Resolve User Questions on Timeout"
          description="Automatically resolves user question prompts after a timeout without hanging indefinitely for input."
          checked={agent.askUserQuestionAutoResolution}
          onChange={(v) => updateAgent('askUserQuestionAutoResolution', v)}
        />

        <SettingToggle
          icon={Zap}
          label="Optimize Agent Experience (Experimental)"
          description="Enables speculative tool preloading and agent experience latency optimizations."
          checked={agent.optimizeAgentExperience}
          onChange={(v) => updateAgent('optimizeAgentExperience', v)}
        />
      </div>
    </div>
  );
}

/* ─────────────────── TAB 5: MEMORY & SESSIONS TAB ─────────────────── */

function MemoryTab() {
  const agent = useSettingsStore((s) => s.agent);
  const updateAgent = useSettingsStore((s) => s.updateAgentSetting);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Memory & Session Retention</h2>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
          Configure cross-session workspace memory, conversation compaction, checkpoints, and task archiving.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Project Memory & Checkpoints</h3>
        <SettingToggle
          icon={Brain}
          label="Workspace Long-term Memory"
          description="Enables the project memory system — saves long-term context to workspaces for recall in future sessions."
          checked={agent.workspaceMemory}
          onChange={(v) => updateAgent('workspaceMemory', v)}
        />

        <SettingToggle
          icon={RotateCcw}
          label="Workspace Checkpoints & Rewind"
          description="Enable workspace checkpoints (undo/redo file changes, restore workspace state across turn steps)."
          checked={true}
          onChange={() => toast.info('Workspace rewind checkpointing is active in CLI config')}
        />

        <SettingToggle
          icon={Sliders}
          label="Conversation Compaction"
          description="Enable conversation compaction (automatically summarizes older turn history to reduce context window usage)."
          checked={true}
          onChange={() => toast.info('Conversation compaction is active in CLI config')}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Task Archiving</h3>
        <SettingToggle
          icon={RotateCcw}
          label="Auto-Archive Completed Tasks"
          description="Automatically archives completed tasks after the retention window has expired."
          checked={agent.autoArchive}
          onChange={(v) => updateAgent('autoArchive', v)}
        />

        <SettingRowItem
          icon={Clock}
          label="Task Archive Retention Window"
          description="Task age threshold (in days) for auto-archiving completed sessions."
        >
          <select
            value={agent.archiveRetention}
            onChange={(e) => updateAgent('archiveRetention', e.target.value as any)}
            className="bg-[#26272f] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] transition cursor-pointer"
          >
            <option value="7 days">7 Days (Default)</option>
            <option value="14 days">14 Days</option>
            <option value="30 days">30 Days</option>
            <option value="90 days">90 Days</option>
          </select>
        </SettingRowItem>
      </div>
    </div>
  );
}


/* ─────────────────── TAB 8: INDEXING & STORAGE TAB ─────────────────── */

function IndexingTab() {
  const data = useSettingsStore((s) => s.data);
  const updateData = useSettingsStore((s) => s.updateDataSetting);

  const FILE_LOCATIONS = [
    { file: 'setting.json', path: 'C:\\Users\\mahen\\.zcode\\v2\\setting.json', desc: 'User-level settings/preferences (~33 keys)' },
    { file: 'config.json', path: 'C:\\Users\\mahen\\.zcode\\v2\\config.json', desc: 'Model provider configuration (API keys, base URLs, model metadata)' },
    { file: 'credentials.json', path: 'C:\\Users\\mahen\\.zcode\\v2\\credentials.json', desc: 'Encrypted OAuth tokens (AES-256-GCM)' },
    { file: 'bot-state.v2.json', path: 'C:\\Users\\mahen\\.zcode\\v2\\bot-state.v2.json', desc: 'Bot state (conversations, memory)' },
    { file: 'telemetry-state.json', path: 'C:\\Users\\mahen\\.zcode\\v2\\telemetry-state.json', desc: 'Telemetry opt-in/opt-out state' },
    { file: 'tasks-index.sqlite', path: 'C:\\Users\\mahen\\.zcode\\v2\\tasks-index.sqlite', desc: 'Tasks database' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white">Workspace Indexing & Storage</h2>
        <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
          Local file index caching for sub-second file search, instant grep, and persistent file locations.
        </p>
      </div>

      {/* Indexing Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Indexing Options</h3>
        <SettingToggle
          icon={FolderSearch}
          label="Repository Snapshot Indexing"
          description="Takes a full snapshot of the repository for indexing (memory-intensive but enables instant search across entire repo)."
          checked={data.repoSnapshotIndexing}
          onChange={(v) => updateData('repoSnapshotIndexing', v)}
        />

        <SettingToggle
          icon={Search}
          label="Instant Grep File Indexing"
          description="Enables instant grep file indexing — fast regex and text search within active workspaces."
          checked={data.instantGrepIndexing}
          onChange={(v) => updateData('instantGrepIndexing', v)}
        />

        <SettingToggle
          icon={Sliders}
          label="Native Search Enhancements"
          description="Uses native OS search APIs (Spotlight on macOS, Windows Search, etc.) for enhanced file indexing."
          checked={data.nativeSearchEnhancements}
          onChange={(v) => updateData('nativeSearchEnhancements', v)}
        />
      </div>

      {/* Storage Paths */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">CLI Storage Schema</h3>
        <div className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1f2029] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">Persistent Storage Directory (storage.dir)</div>
              <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
                Persistent storage directory for all ZCode and Mcode data: <code className="text-zinc-300 font-mono">~/.mcode</code>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs text-[var(--mcode-text-dim,#8b8d98)] bg-[#0d0e12] px-3 py-1.5 rounded font-mono border border-white/5 flex-1">
                  ~/.mcode
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('~/.mcode');
                    toast.success('Copied data path');
                  }}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                  title="Copy path"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--mcode-panel,#16171d)] border border-[var(--mcode-border,#26272f)]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1f2029] border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">Session Database (storage.sessionDbPath)</div>
              <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-0.5">
                Path to the session SQLite database storing conversation turns: <code className="text-zinc-300 font-mono">~/.mcode/cli/db/db.sqlite</code>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs text-[var(--mcode-text-dim,#8b8d98)] bg-[#0d0e12] px-3 py-1.5 rounded font-mono border border-white/5 flex-1">
                  ~/.mcode/cli/db/db.sqlite
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('~/.mcode/cli/db/db.sqlite');
                    toast.success('Copied db path');
                  }}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
                  title="Copy path"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Locations Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Official ZCode File Locations</h3>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#151515]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/70 border-b border-white/10 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2.5">File</th>
                <th className="px-4 py-2.5">Path</th>
                <th className="px-4 py-2.5">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {FILE_LOCATIONS.map((loc) => (
                <tr key={loc.file} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-semibold whitespace-nowrap">{loc.file}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-white/60">{loc.path}</td>
                  <td className="px-4 py-2.5 text-zinc-300">{loc.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* ─────────────────── TAB 10: PERMISSIONS TAB ─────────────────── */

function PermissionsTab({
  settings,
  onUpdate,
  saving,
}: {
  settings: any;
  onUpdate: (patch: any) => void;
  saving: boolean;
}) {
  const [permMode, setPermMode] = useState<'plan' | 'build' | 'edit' | 'yolo'>('build');
  const [autoApproveHighRisk, setAutoApproveHighRisk] = useState(false);
  const [networkTimeout, setNetworkTimeout] = useState(180000);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Permissions & CLI Governance</h2>
        <p className="text-sm text-white/40">
          Control permission modes, auto-approval thresholds, shell execution policies, and file edit guards.
        </p>
      </div>

      {/* CLI Permission Mode Selector */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#3ecf8e]" />
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">CLI Permission Mode</h3>
        </div>
        <p className="text-xs text-white/40">
          Corresponds to <code className="text-zinc-300 font-mono">permission.mode</code> in ZCode CLI config schema.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'plan', label: 'Plan', icon: Eye, color: 'text-cyan-400', desc: 'Ask for everything — strict confirmation before any action' },
            { id: 'build', label: 'Build (Recommended)', icon: Wrench, color: 'text-[#3ecf8e]', desc: 'Ask for risky actions, allow safe reads and standard commands' },
            { id: 'edit', label: 'Edit', icon: Edit2, color: 'text-blue-400', desc: 'Auto-edit files with undo checkpoint, ask for dangerous commands' },
            { id: 'yolo', label: 'YOLO', icon: Zap, color: 'text-amber-400', desc: 'Full automation — approve all tools and commands without prompting' },
          ].map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setPermMode(mode.id as any);
                  toast.success(`Permission mode set to ${mode.label}`);
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  permMode === mode.id
                    ? 'bg-white/10 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ModeIcon className={`w-4 h-4 ${mode.color}`} />
                    <span className="text-sm font-semibold text-white">{mode.label}</span>
                  </div>
                  {permMode === mode.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-xs text-white/50 mt-1.5 leading-snug">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* High-risk auto approve */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm text-white font-medium">Auto-Approve High-Risk Tools</span>
              <p className="text-xs text-white/40 mt-0.5">
                Auto-approve high-risk tools (file deletes, system commands) without prompting.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoApproveHighRisk}
            onClick={() => {
              setAutoApproveHighRisk(!autoApproveHighRisk);
              toast.info(`Auto-approve high risk tools: ${!autoApproveHighRisk}`);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              autoApproveHighRisk ? 'bg-amber-500' : 'bg-[#3a3a3f]'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                autoApproveHighRisk ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
        </div>
        {autoApproveHighRisk && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300/80">
              High-risk actions can delete files and execute privileged scripts without review.
            </p>
          </div>
        )}
      </div>

      {/* Shell execution */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#3ecf8e]" />
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Shell Command Execution</h3>
        </div>
        <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111] border border-white/5 cursor-pointer hover:border-white/10 transition group">
          <input
            type="radio"
            name="shell"
            checked={!settings.allowShellAll}
            onChange={() => onUpdate({ allowShellAll: false })}
            className="mt-1 accent-emerald-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-white font-medium">Ask before every command</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">RECOMMENDED</span>
            </div>
            <p className="text-xs text-white/40 mt-1">Each shell command will require your approval before running.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111] border border-white/5 cursor-pointer hover:border-white/10 transition group">
          <input
            type="radio"
            name="shell"
            checked={settings.allowShellAll}
            onChange={() => onUpdate({ allowShellAll: true })}
            className="mt-1 accent-emerald-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-sm text-white font-medium">Full access — run without asking</span>
            </div>
            <p className="text-xs text-white/40 mt-1">Commands execute immediately without confirmation prompts.</p>
          </div>
        </label>
        {settings.allowShellAll && (
          <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-300/80">Full access lets the AI run any command including installs, deletes, and git operations without confirmation. Only enable if you trust the project.</p>
          </div>
        )}
      </div>

      {/* File edit approval */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#3ecf8e]" />
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">File Edit Approval</h3>
        </div>
        <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111] border border-white/5 cursor-pointer hover:border-white/10 transition">
          <input
            type="radio"
            name="edit"
            checked={!settings.requireEditApproval}
            onChange={() => onUpdate({ requireEditApproval: false })}
            className="mt-1 accent-emerald-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3ecf8e] flex-shrink-0" />
              <span className="text-sm text-white font-medium">Auto-apply edits</span>
            </div>
            <p className="text-xs text-white/40 mt-1">File changes are applied automatically (you can always undo with checkpoints).</p>
          </div>
        </label>
        <label className="flex items-start gap-3 p-3 rounded-xl bg-[#111] border border-white/5 cursor-pointer hover:border-white/10 transition">
          <input
            type="radio"
            name="edit"
            checked={settings.requireEditApproval}
            onChange={() => onUpdate({ requireEditApproval: true })}
            className="mt-1 accent-emerald-500"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-sm text-white font-medium">Review before applying</span>
            </div>
            <p className="text-xs text-white/40 mt-1">Each file edit shows a diff for your approval before writing to disk.</p>
          </div>
        </label>
      </div>

      {/* Network Timeout */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#3ecf8e]" />
            <div>
              <span className="text-sm text-white font-medium">Default Network Timeout</span>
              <p className="text-xs text-white/40 mt-0.5">
                CLI network timeout in milliseconds (default: 180,000ms / 3 minutes).
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded">
            {networkTimeout / 1000}s ({networkTimeout}ms)
          </span>
        </div>
        <input
          type="range"
          min={30000}
          max={600000}
          step={15000}
          value={networkTimeout}
          onChange={(e) => setNetworkTimeout(Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving permissions...
        </div>
      )}
    </div>
  );
}

/* ─────────────────── TAB 11: MODEL SETTINGS & API KEYS TAB ─────────────────── */

function ApiKeysTab() {
  const [providers, setProviders] = useState<any[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProviderId, setActiveProviderId] = useState('openrouter');
  const [newKey, setNewKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelByProvider, setSelectedModelByProvider] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const provRes = await api.get('/api/v1/settings/providers', { timeout: 5000 });
      if (provRes.data?.ok) setProviders(provRes.data.providers || []);
    } catch (e) {
      console.error('Failed to fetch providers:', e);
    }
    try {
      const keysRes = await api.get('/api/v1/keys', { timeout: 10000 });
      if (keysRes.data?.keys) setKeys(keysRes.data.keys || []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        console.error('Failed to fetch keys:', e);
      }
    }
    try {
      const modelsRes = await api.get('/api/v1/keys/models', { timeout: 15000 });
      if (modelsRes.data?.models) setAvailableModels(modelsRes.data.models || []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        console.error('Failed to fetch models:', e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!newKey && !existingKey) return;
    setSaving(true);
    try {
      const provider = providers.find((p) => p.id === activeProviderId);
      const res = await api.post('/api/v1/keys', {
        providerId: activeProviderId,
        envVar: provider?.envVar || `${activeProviderId.toUpperCase()}_API_KEY`,
        displayName: provider?.displayName || activeProviderId,
        apiKey: newKey || 'existing-key',
        model: selectedModelId || undefined,
      });
      if (res.data?.ok) {
        toast.success(`Saved credentials for ${provider?.displayName || activeProviderId}`);
        setNewKey('');
        setShowApiKey(false);
        await fetchData();
        window.dispatchEvent(new CustomEvent('mcode:reload-models'));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (keyId: string) => {
    try {
      await api.delete(`/api/v1/keys/${keyId}`);
      toast.success('Removed API key');
      await fetchData();
      window.dispatchEvent(new CustomEvent('mcode:reload-models'));
    } catch (e) {
      toast.error('Failed to remove key');
    }
  };

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const existingKey = keys.find((k) => k.providerId === activeProviderId);

  useEffect(() => {
    const saved = existingKey?.model;
    const cached = selectedModelByProvider[activeProviderId];
    setSelectedModelId(cached || saved || null);
  }, [activeProviderId, existingKey?.model, selectedModelByProvider]);

  const liveModels = availableModels.filter((m) => m.provider === activeProviderId);
  const staticModels = (activeProvider?.models || []).map((m: any) => ({
    ref: `${activeProviderId}:${m.id}`,
    provider: activeProviderId,
    name: m.name,
    model: m.id,
    free: m.free,
    scores: m.scores,
  }));
  const displayModels = liveModels.length > 0 ? liveModels : staticModels;

  return (
    <div className="flex flex-col h-[80vh] min-h-[600px] max-w-[1000px] mx-auto w-full">
      <div className="mb-6 flex-shrink-0">
        <div className="inline-block bg-blue-600 text-white font-bold text-2xl px-1.5 py-0.5 rounded mb-2 leading-tight">
          Model settings
        </div>
        <p className="text-[13px] text-white/50">
          Manage custom model providers. Once configured, they can be selected during chat and agent execution.
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-xl bg-[#181818] border border-[#222]">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-[#222] flex flex-col py-4 overflow-y-auto custom-scrollbar flex-shrink-0">
          <div className="px-4 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#888] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#222] border border-[#333] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#444] transition-colors"
              />
            </div>
          </div>
          <div className="px-4 text-[11px] text-[#888] mb-3">Providers</div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
            </div>
          ) : (
            (() => {
              const q = searchQuery.toLowerCase();
              const configured = providers
                .filter((p) => keys.some((k) => k.providerId === p.id))
                .filter((p) => (p.displayName || p.id).toLowerCase().includes(q))
                .sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));

              const unconfigured = providers
                .filter((p) => !keys.some((k) => k.providerId === p.id))
                .filter((p) => (p.displayName || p.id).toLowerCase().includes(q))
                .sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));

              const renderProvider = (provider: any) => {
                const isActive = activeProviderId === provider.id;
                const isConfigured = keys.some((k) => k.providerId === provider.id);
                const keyForProvider = keys.find((k) => k.providerId === provider.id);
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setActiveProviderId(provider.id);
                      setNewKey('');
                      setShowApiKey(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2 transition ${
                      isActive ? 'bg-[#252525]' : 'hover:bg-[#1f1f1f]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-3 min-w-0">
                        {isConfigured ? (
                          <Cpu className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#3ecf8e]' : 'text-emerald-500/70'}`} />
                        ) : (
                          <Server className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-white' : 'text-[#777]'}`} />
                        )}
                        <span className={`text-[13px] text-left truncate ${isActive ? 'text-white font-medium' : 'text-[#aaa]'}`}>
                          {provider.displayName || provider.id}
                        </span>
                      </div>
                      {isConfigured && keyForProvider?.model && (
                        <span className="text-[11px] text-[#888] font-mono ml-7 truncate flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                          {keyForProvider.model.split(':').pop() || keyForProvider.model}
                        </span>
                      )}
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2 ${isConfigured ? 'bg-[#1b7145]' : 'bg-[#444]'}`} />
                  </button>
                );
              };

              return (
                <>
                  <div className="px-4 text-[11px] text-[#888] mt-2 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#3ecf8e]" />
                    <span>Configured providers</span>
                  </div>
                  {configured.length > 0 ? (
                    configured.map(renderProvider)
                  ) : (
                    <div className="px-4 py-2 text-[12px] text-[#555] italic">None configured</div>
                  )}

                  <div className="px-4 text-[11px] text-[#888] mt-6 mb-2 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-zinc-400" />
                    <span>Available providers</span>
                  </div>
                  {unconfigured.length > 0 ? (
                    unconfigured.map(renderProvider)
                  ) : (
                    <div className="px-4 py-2 text-[12px] text-[#555] italic">None available</div>
                  )}
                </>
              );
            })()
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
            </div>
          ) : activeProvider ? (
            <div className="max-w-3xl">
              {/* Header */}
              <div className="flex items-center mb-8">
                <h3 className="text-[22px] font-bold text-white mr-3">{activeProvider.displayName || activeProvider.id}</h3>
                <button className="text-[#666] hover:text-white transition" title="Edit provider">
                  <Edit2 className="w-4 h-4" />
                </button>
                {existingKey ? (
                  <div className="px-3 py-1 rounded-full bg-[#181818] text-[#3ecf8e] border border-[#3ecf8e]/30 text-[11px] font-medium ml-4 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#3ecf8e]" />
                    <span>Configured</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-[#181818] text-[#888] border border-[#333] text-[11px] font-medium ml-4 flex items-center gap-1.5">
                    <CircleDashed className="w-3 h-3 text-zinc-500" />
                    <span>Not Configured</span>
                  </div>
                )}
                {existingKey && (
                  <button
                    onClick={() => handleRemove(existingKey.id)}
                    className="ml-auto text-red-400/70 hover:text-red-400 text-sm font-medium transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-8">
                {/* API Key */}
                <div>
                  <label className="block text-[13px] text-[#aaa] font-medium mb-2.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#3ecf8e]" />
                    <span>API key</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={
                          existingKey && !newKey
                            ? existingKey.masked || '••••••••••••••••••••••••'
                            : newKey
                        }
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-[#202020] border border-[#2a2a2a] rounded-[8px] px-4 py-2.5 text-[13px] text-white focus:outline-none focus:border-[#444] transition font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={saving || (!existingKey && !newKey)}
                      className="px-6 py-[11px] bg-[#1d764a] hover:bg-[#155d38] text-white font-medium text-[13px] rounded-[8px] transition disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[90px] cursor-pointer shadow-sm"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Model list */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[13px] text-[#aaa] font-medium flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-blue-400" />
                      <span>Available models</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchData}
                        disabled={refreshing}
                        className="text-[11px] text-[#666] hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="Refresh models"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </motion.button>
                      {existingKey && selectedModelId && (
                        <span className="text-[11px] text-[#666] font-mono truncate max-w-[180px]">
                          {selectedModelId.split(':').pop() || selectedModelId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {displayModels.length === 0 ? (
                      <div className="text-[13px] text-[#666] py-4 text-center">
                        No models available for this provider. Add an API key to load models.
                      </div>
                    ) : (
                      displayModels.map((model: any) => {
                        const modelId = model.model || model.ref;
                        const isSelected = selectedModelId === modelId;
                        return (
                          <motion.div
                            key={model.ref || modelId}
                            className={`flex items-center justify-between p-4 rounded-[8px] cursor-pointer transition-all duration-200 ${
                              isSelected ? 'bg-[#1a1a1a]' : 'bg-[#1c1c1c] hover:border-[#333]'
                            }`}
                            style={
                              isSelected
                                ? {
                                    borderImage: 'linear-gradient(90deg, #3b82f6, #a854f7, #ec4899, #f97316)',
                                    borderImageSlice: 1,
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                  }
                                : {
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: '#2a2a2a',
                                  }
                            }
                            onClick={() => {
                              setSelectedModelId(modelId);
                              setSelectedModelByProvider((prev) => ({ ...prev, [activeProviderId]: modelId }));
                            }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                <span className="text-[13px] text-white font-medium">{model.name || modelId}</span>
                              </div>
                              <span className="text-[11px] text-[#888] font-mono ml-5.5">{modelId}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {model.free && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Free</span>
                                </span>
                              )}
                              {model.scores && model.scores.coding && (
                                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-medium flex items-center gap-1">
                                  <Code2 className="w-2.5 h-2.5" />
                                  <span>Coding</span>
                                </span>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              Select a provider to configure
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 12: GOD-MODE TAB ─────────────────── */

function GodModeTab({ settings, onUpdate }: { settings: any; onUpdate: (patch: any) => void }) {
  const god = settings.godModeDefaults || { concurrency: 3, deployTarget: '', skipTests: false };

  const updateGod = (patch: any) => {
    onUpdate({ godModeDefaults: { ...god, ...patch } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">God-Mode Build Defaults</h2>
        <p className="text-sm text-white/40">Configure defaults for multi-subagent parallel builds and autonomous deployments.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-5">
        {/* Concurrency */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#3ecf8e]" />
            <label className="text-sm font-medium text-white block">Subagent Concurrency</label>
          </div>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => updateGod({ concurrency: n })}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  god.concurrency === n
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold shadow-sm'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/30 mt-2">Number of parallel subagents spawned simultaneously during god-mode waves.</p>
        </div>

        {/* Deploy target */}
        <div className="border-t border-white/5 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-4 h-4 text-blue-400" />
            <label className="text-sm font-medium text-white block">Default Deploy Target</label>
          </div>
          <div className="relative">
            <select
              value={god.deployTarget}
              onChange={(e) => updateGod({ deployTarget: e.target.value })}
              className="w-full bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
            >
              <option value="">None (Local only)</option>
              <option value="vercel">▲ Vercel</option>
              <option value="netlify">◆ Netlify</option>
              <option value="cloudflare">☁ Cloudflare Pages</option>
              <option value="fly">✈ Fly.io</option>
              <option value="railway">🚂 Railway</option>
            </select>
            <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Skip tests */}
        <div className="border-t border-white/5 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${
                god.skipTests ? 'bg-amber-500' : 'bg-white/10'
              }`}
              onClick={() => updateGod({ skipTests: !god.skipTests })}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                  god.skipTests ? 'left-5' : 'left-1'
                }`}
              />
            </div>
            <div className="flex items-start gap-2.5">
              <TestTube className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-white font-medium">Skip tests by default</span>
                <p className="text-xs text-white/40">God-mode builds will skip the test phase unless explicitly requested.</p>
              </div>
            </div>
          </label>
          {god.skipTests && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300/80">
                Skipping tests can speed up builds but may deploy broken code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 13: WATCH MODE TAB ─────────────────── */

function WatchTab({ settings, onUpdate }: { settings: any; onUpdate: (patch: any) => void }) {
  const watch = settings.watchDefaults || { intervalMs: 30000, autoFix: false };

  const updateWatch = (patch: any) => {
    onUpdate({ watchDefaults: { ...watch, ...patch } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Watch Mode Defaults</h2>
        <p className="text-sm text-white/40">Configure the background watch daemon — continuous auto-scan and auto-fix loop.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radar className="w-4 h-4 text-[#3ecf8e]" />
            <label className="text-sm font-medium text-white block">Background Scan Interval</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5000}
              max={120000}
              step={5000}
              value={watch.intervalMs}
              onChange={(e) => updateWatch({ intervalMs: Number(e.target.value) })}
              className="flex-1 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-emerald-400 font-mono px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {(watch.intervalMs / 1000).toFixed(0)}s
            </span>
          </div>
          <p className="text-xs text-white/30 mt-1.5">How often the watch daemon scans for file modifications and errors (5s - 120s).</p>
        </div>

        <div className="border-t border-white/5 pt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${
                watch.autoFix ? 'bg-emerald-500' : 'bg-white/10'
              }`}
              onClick={() => updateWatch({ autoFix: !watch.autoFix })}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                  watch.autoFix ? 'left-5' : 'left-1'
                }`}
              />
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-white font-medium">Auto-fix on detection loop</span>
                <p className="text-xs text-white/40">Automatically attempt to fix syntax errors and linter issues detected by the watch daemon.</p>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────── TAB 16: NETWORK TAB ─────────────────── */

function NetworkTab({ settings, onUpdate }: { settings: any; onUpdate: (patch: any) => void }) {
  const whitelist = settings.networkWhitelist || [];
  const [newDomain, setNewDomain] = useState('');

  const network = useSettingsStore((s) => s.network);
  const updateNetwork = useSettingsStore((s) => s.updateNetworkSetting);

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (d && !whitelist.includes(d)) {
      onUpdate({ networkWhitelist: [...whitelist, d] });
    }
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    onUpdate({ networkWhitelist: whitelist.filter((d: any) => d !== domain) });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Network & Proxy Configuration</h2>
        <p className="text-sm text-white/40">
          Route AI requests and restrict which external domains the AI agent can access via web fetch and search.
        </p>
      </div>

      {/* Domain Whitelist */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#3ecf8e]" />
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Allowed Domains for AI Web Access</h3>
        </div>

        {whitelist.length === 0 && (
          <div className="flex items-start gap-2 bg-blue-500/5 border border-blue-500/10 rounded-lg p-3">
            <Globe className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300/70">
              Empty list = all domains allowed. Add domains to strictly restrict the AI's web access.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {whitelist.map((d: any) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 font-mono"
            >
              {d}
              <button
                type="button"
                onClick={() => removeDomain(d)}
                className="text-white/30 hover:text-red-400 transition cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addDomain();
            }}
            placeholder="github.com"
            className="flex-1 bg-[#0e0e0e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 font-mono"
          />
          <button
            type="button"
            onClick={addDomain}
            disabled={!newDomain.trim()}
            className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-2 rounded-lg transition border border-white/10 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Enterprise Proxy & Certificates */}
      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-[#3ecf8e]" />
          <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Enterprise Proxy & SSL</h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-zinc-400" />
            <span>HTTP / HTTPS Proxy</span>
          </label>
          <input
            type="text"
            value={network.httpProxy}
            onChange={(e) => updateNetwork('httpProxy', e.target.value)}
            placeholder="e.g. http://127.0.0.1:7890"
            className="w-full bg-[#0d0e12] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#3ecf8e] transition font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
            <span>No Proxy Hosts (Bypass List)</span>
          </label>
          <input
            type="text"
            value={network.noProxy}
            onChange={(e) => updateNetwork('noProxy', e.target.value)}
            placeholder="e.g. localhost,127.0.0.1,::1,.corp.internal"
            className="w-full bg-[#0d0e12] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#3ecf8e] transition font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5 flex items-center gap-1.5">
            <FileKey className="w-3.5 h-3.5 text-zinc-400" />
            <span>Custom Root Certificate (PEM)</span>
          </label>
          <input
            type="text"
            value={network.customCert}
            onChange={(e) => updateNetwork('customCert', e.target.value)}
            placeholder="e.g. C:\certs\corporate-ca.pem"
            className="w-full bg-[#0d0e12] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#3ecf8e] transition font-mono"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 17: USAGE STATS TAB ─────────────────── */

function formatCount(n: any) {
  if (!n) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

function UsageTab() {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const days = timeRange === 'Last 7 days' ? 7 : 30;
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      const res = await api.get(`/api/v1/usage/stats?from=${from.toISOString()}&href=${to.toISOString()}`, {
        timeout: 10000,
      });
      if (res.data?.ok) setStats(res.data.stats);
    } catch (e) {
      console.error('Failed to fetch usage stats:', e);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]);

  const dailyActivity = stats?.dailyActivity || {};
  const dailyTokens = stats?.dailyTokens || {};

  const today = new Date();
  const heatmapDates: string[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    heatmapDates.push(d.toISOString().slice(0, 10));
  }
  const heatmapData = heatmapDates.map((dateStr) => {
    const count = dailyActivity[dateStr] || 0;
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    return 3;
  });

  const tokenDisplay = stats?.tokenQuota
    ? `${formatCount(stats.tokenQuota.used)} / ${formatCount(stats.tokenQuota.limit)}`
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 border-b border-white/10 pb-2">
          <h2 className="text-xl font-semibold text-white">Usage stats</h2>
          <span className="text-sm font-medium text-white border-b-2 border-white pb-2 translate-y-[9px]">App usage</span>
        </div>
        <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-white/5">
          {['Last 7 days', 'Last 30 days'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                timeRange === range ? 'bg-[#2a2a2a] text-white' : 'text-[#888] hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-[#666]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading usage stats...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#888]">
                  <Zap className="w-4 h-4 opacity-70 text-[#3ecf8e]" />
                  <span className="text-sm">Token usage</span>
                </div>
                <span className="text-xs text-[#666]">{tokenDisplay}</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats?.tokenQuota ? formatCount(stats.tokenQuota.used) : '—'}</div>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#888]">
                <Activity className="w-4 h-4 opacity-70 text-blue-400" />
                <span className="text-sm">Sessions</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalSessions || 0}</div>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#888]">
                <MessageSquare className="w-4 h-4 opacity-70 text-purple-400" />
                <span className="text-sm">Messages</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats?.totalMessages || 0}</div>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#888]">
                <Calendar className="w-4 h-4 opacity-70 text-emerald-400" />
                <span className="text-sm">Active days</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats?.activeDays || 0}</div>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#888]">
                <Flame className="w-4 h-4 opacity-70 text-amber-500" />
                <span className="text-sm">Current streak</span>
              </div>
              <div className="text-3xl font-bold text-white">{stats?.currentStreak || 0} days</div>
            </div>

            <div className="bg-[#151515] border border-white/5 rounded-xl p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#888]">
                <Sparkles className="w-4 h-4 opacity-70 text-pink-400" />
                <span className="text-sm">Favorite model</span>
              </div>
              <div className="text-xl font-bold text-white truncate">{stats?.favoriteModel || 'Claude 3.5 Sonnet'}</div>
            </div>
          </div>

          <div className="bg-[#151515] border border-white/5 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">35-Day Activity Heatmap</h3>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
              {heatmapData.map((val, idx) => (
                <div
                  key={idx}
                  title={`${heatmapDates[idx]}: ${val} actions`}
                  className={`w-4 h-4 rounded-sm flex-shrink-0 transition-all ${
                    val === 0
                      ? 'bg-zinc-800'
                      : val === 1
                      ? 'bg-emerald-900'
                      : val === 2
                      ? 'bg-emerald-600'
                      : 'bg-[#3ecf8e]'
                  }`}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────── TAB 18: ACCOUNT TAB ─────────────────── */

function AccountTab() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/v1/auth/me', { timeout: 5000 })
      .then((res) => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Account & Security</h2>
        <p className="text-sm text-white/40">Manage your profile credentials, authentication tokens, and preferences.</p>
      </div>

      <div className="bg-[#151515] border border-white/5 rounded-xl p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#3ecf8e]" />
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Profile</h3>
          </div>
          {profile ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {profile.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[14px] text-white font-medium">{profile.email}</p>
                <p className="text-[12px] text-[#888]">{profile.name || 'Developer Workspace'}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20">
                  <Sparkles className="w-3 h-3 text-[#3ecf8e]" />
                  <span>Pro Plan</span>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-[#666]">Local Developer Account active.</p>
          )}
        </div>

        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#3ecf8e]" />
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Security</h3>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => toast.info('Password management available in Cloud Console')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#0e0e0e] border border-white/5 text-[13px] text-white/80 hover:bg-white/5 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-zinc-400" />
                <span>Change password</span>
              </div>
              <ChevronDown className="w-4 h-4 text-white/30" />
            </button>
            <button
              type="button"
              onClick={() => toast.info('Two-Factor Authentication is active for this workspace')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#0e0e0e] border border-white/5 text-[13px] text-white/80 hover:bg-white/5 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Two-factor authentication</span>
              </div>
              <ChevronDown className="w-4 h-4 text-white/30" />
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileKey className="w-4 h-4 text-[#3ecf8e]" />
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Credential Security & Storage</h3>
          </div>
          <p className="text-xs text-white/40">
            Per-installation token encryption and local certificate management.
          </p>

          <div className="p-4 rounded-xl bg-[#111] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileKey className="w-4 h-4 text-emerald-400" />
                <span className="text-white/70 font-medium font-mono">credentials.json</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                AES-256-GCM Encrypted
              </span>
            </div>
            <p className="text-xs text-white/40">
              OAuth access tokens and user profile state are encrypted with a per-machine key. Tokens are never stored in plaintext.
            </p>
            <div className="divide-y divide-white/5 text-[11px] font-mono text-white/60">
              <div className="py-1.5 flex justify-between">
                <span>oauth:zai:access_token</span>
                <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Encrypted</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span>oauth:zai:user_info</span>
                <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Encrypted</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span>oauth:active_provider</span>
                <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Encrypted</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111] border border-white/5 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#3ecf8e] mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-white">Certificate Interception Store</div>
              <p className="text-xs text-white/40 mt-0.5">
                Local Desktop CA certificates stored in <code className="text-zinc-300 font-mono">certs/</code> for inspection and secure TLS routing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 19: CONNECTIONS TAB ─────────────────── */

function ConnectionsTab() {
  const [githubStatus, setGithubStatus] = useState({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/v1/github/status', { timeout: 5000 })
      .then((res) => {
        setGithubStatus(res.data);
        setLoading(false);
      })
      .catch(() => {
        setGithubStatus({ connected: false });
        setLoading(false);
      });
  }, []);

  const handleConnectGithub = () => {
    const tokens = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
    const url = `/api/v1/auth/github?token=${tokens.access || ''}`;
    connectOAuth(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Connections</h2>
        <p className="text-sm text-white/40">Manage your third-party integrations and source control providers.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between bg-[#151515] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-white flex items-center gap-2">
                <span>GitHub</span>
                {githubStatus.connected && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Connected
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#888] mt-0.5">
                {githubStatus.connected ? 'Connected to GitHub repositories' : 'Not connected'}
              </p>
            </div>
          </div>
          {githubStatus.connected ? (
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-[13px] border border-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectGithub}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[13px] text-white transition border border-white/10 cursor-pointer flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── MAIN FULL-PAGE SETTINGS COMPONENT ─────────────────── */

export function SettingsPage({
  onClose,
  initialTab,
}: {
  onClose?: () => void;
  initialTab?: string;
} = {}) {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(initialTab || searchParams?.get('tab') || 'general');
  const [settings, setSettings] = useState<Record<string, any>>({
    allowShellAll: false,
    requireEditApproval: false,
    modelOverrides: {},
    watchDefaults: { intervalMs: 30000, autoFix: false },
    godModeDefaults: { concurrency: 3, deployTarget: '', skipTests: false },
    networkWhitelist: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    api
      .get('/api/v1/settings', { timeout: 5000 })
      .then((res) => {
        if (res.data?.settings) setSettings(res.data.settings);
      })
      .catch(console.error);
  }, []);

  const updatePermissions = async (patch: any) => {
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setSaving(true);
    try {
      await api.put('/api/v1/settings/permissions', {
        allowShellAll: updated.allowShellAll,
        requireEditApproval: updated.requireEditApproval,
      });
      toast.success('Permissions updated');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update permissions');
    }
    setSaving(false);
  };

  const updateGeneric = async (patch: any) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (patch.accentColor) {
      const c = ACCENT_COLORS.find((x) => x.id === patch.accentColor);
      if (c) document.documentElement.style.setProperty('--theme-accent', c.color);
    }
    try {
      await api.put('/api/v1/settings', patch);
      toast.success('Settings saved');
    } catch (e) {
      console.error(e);
    }
  };

  const activeSection = SIDEBAR_SECTIONS.find((s) => s.children.some((c) => c.id === activeTab));
  const activeLabel = activeSection?.children.find((c) => c.id === activeTab)?.label || 'Settings';

  return (
    <div className="flex h-screen w-screen bg-[var(--mcode-bg,#0d0e12)] text-[var(--mcode-text,#e6e6ea)] font-sans overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[var(--mcode-panel,#16171d)] border-r border-[var(--mcode-border,#26272f)] flex flex-col">
        <div className="p-5 border-b border-[var(--mcode-border,#26272f)]">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 text-[var(--mcode-text-dim,#8b8d98)] hover:text-white transition text-xs group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to workspace
            </button>
          ) : (
            <MotionLink
              href="/ai/chat"
              className="flex items-center gap-2 text-[var(--mcode-text-dim,#8b8d98)] hover:text-white transition text-xs group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to workspace
            </MotionLink>
          )}
          <h1 className="text-base font-semibold text-white mt-3 tracking-tight">Platform Settings</h1>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
          {SIDEBAR_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.id} className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--mcode-text-dim,#8b8d98)]">
                  <SectionIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{section.label}</span>
                </div>
                <div className="space-y-0.5">
                  {section.children.map((child) => {
                    const isActive = activeTab === child.id;
                    const ItemIcon = child.icon;
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setActiveTab(child.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                          isActive
                            ? 'bg-[#3ecf8e]/10 text-[#3ecf8e]'
                            : 'text-[var(--mcode-text-dim,#8b8d98)] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ItemIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#3ecf8e]' : 'text-white/40'}`} />
                          <span className="truncate">{child.label}</span>
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--mcode-border,#26272f)] text-center">
          <span className="text-[10px] text-[var(--mcode-text-dim,#8b8d98)]">mcode platform v2.4.6</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 px-3 py-1.5 rounded-lg text-[var(--mcode-text-dim,#8b8d98)] hover:text-white hover:bg-white/5 transition z-50 flex items-center gap-1.5 text-xs border border-[var(--mcode-border,#26272f)] cursor-pointer"
            title="Close (Esc)"
          >
            <span className="text-[10px] font-mono text-white/40">Esc</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className={`mx-auto px-8 py-10 ${activeTab === 'models' ? 'max-w-5xl' : 'max-w-3xl'}`}>
          {activeTab !== 'models' && (
            <div className="mb-6 pb-4 border-b border-[var(--mcode-border,#26272f)]">
              <h1 className="text-xl font-bold text-white">{activeLabel}</h1>
              <p className="text-xs text-[var(--mcode-text-dim,#8b8d98)] mt-1">{activeSection?.label}</p>
            </div>
          )}

          {/* Basics & System */}
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'appearance' && <AppearanceTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'models' && <ApiKeysTab />}
          {activeTab === 'browser' && <BrowserUseTab />}

          {/* Agent & Governance */}
          {activeTab === 'agent-behavior' && <AgentBehaviorTab />}
          {activeTab === 'memory' && <MemoryTab />}
          {activeTab === 'permissions' && <PermissionsTab settings={settings} onUpdate={updatePermissions} saving={saving} />}
          {activeTab === 'godmode' && <GodModeTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'watch' && <WatchTab settings={settings} onUpdate={updateGeneric} />}

          {/* Network & Indexing */}
          {activeTab === 'network' && <NetworkTab settings={settings} onUpdate={updateGeneric} />}
          {activeTab === 'indexing' && <IndexingTab />}

          {/* Analytics & Account */}
          {activeTab === 'usage' && <UsageTab />}
          {activeTab === 'account' && <AccountTab />}
          {activeTab === 'connections' && <ConnectionsTab />}
        </div>
      </main>
    </div>
  );
}

export default SettingsPage;
