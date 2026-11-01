"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
import { reportError } from '../../lib/logger';
import { useSettingsStore } from '../../store/settingsStore';
import { toast } from 'sonner';
import { changePasswordSchema } from '../../lib/validation';
import { useProviderCatalog } from '../../hooks/useProviderCatalog';
import { CATALOG_STALE_NOTICE, DEFAULT_PROVIDER_ID } from '../../lib/providerCatalog';

const MotionLink = motion.create(Link);

/* WEB-018: backend version chip — single-sourced from GET /api/v1/version
 * (`mcode version`), so UI/CLI provenance can be correlated in bug reports. */
function VersionChip({ fallback }: { fallback: string }) {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    api.get('/api/v1/version', { timeout: 5000 })
      .then((r) => { if (live && r.data?.version) setVersion(String(r.data.version)); })
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return (
    <span
      className="text-[10px] text-[var(--mcode-text-dim,#8b8d98)]"
      title={version ? `backend v${version} — correlate with \`mcode version\`` : fallback}
    >
      {version ? `mcode v${version}` : fallback}
    </span>
  );
}

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
      { id: 'models', label: 'API Keys & Models', icon: Key },
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
    <div className="flex items-start justify-between gap-4 py-3.5 px-4 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 hover:shadow-xs transition group">
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center flex-shrink-0 mt-0.5 text-neutral-600 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-neutral-900">{label}</span>
          {description && (
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
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
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        initial={{ opacity: 0.99 }}
        animate={{ opacity: 1 }}
        style={{ opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
          checked ? 'bg-emerald-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </motion.button>
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
        <h2 className="text-base font-bold text-neutral-900">General & System Settings</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure application behavior, hardware acceleration, background execution, and update channels.
        </p>
      </div>

      {/* Application Behavior */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Application Behavior</h3>
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
          description="Prevents the operating system from going to sleep while mcode agent builds and tasks are executing."
          checked={system.keepAwake}
          onChange={(v) => updateSystem('keepAwake', v)}
        />
      </div>

      {/* Backup & restore */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Backup &amp; Restore</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const raw = localStorage.getItem('mcode_unified_settings');
              const blob = new Blob([raw || '{}'], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'mcode-settings.json';
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-100 text-neutral-700 border border-slate-200 shadow-xs transition"
          >
            Export settings JSON
          </button>
          <label className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white hover:bg-slate-100 text-neutral-700 border border-slate-200 shadow-xs cursor-pointer transition">
            Import settings JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const text = await f.text();
                  const parsed = JSON.parse(text);
                  // BUG-19-05: schema-gate the import — a corrupt/partial blob
                  // (e.g. {"system": null}) must never brick the dashboard.
                  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                    throw new Error('Settings file must be a JSON object');
                  }
                  for (const [k, v] of Object.entries(parsed)) {
                    if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
                      throw new Error(`Settings file contains forbidden key "${k}"`);
                    }
                    if (v === undefined) throw new Error(`Settings key "${k}" is undefined`);
                  }
                  if ('system' in parsed && (parsed.system === null || typeof parsed.system !== 'object')) {
                    throw new Error('Settings "system" section must be an object');
                  }
                  localStorage.setItem('mcode_unified_settings', JSON.stringify(parsed));
                  window.location.reload();
                } catch {
                  alert('Invalid settings file — import aborted, nothing changed.');
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Notifications</h3>
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Updates & Releases</h3>
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Localization & CLI Logging</h3>
        <SettingRowItem
          icon={Globe}
          label="Display Language (Locale)"
          description="Display language for the mcode UI and generated system logs."
        >
          <select
            value={system.locale}
            onChange={(e) => updateSystem('locale', e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
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
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
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
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
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

/** Loose server-persisted settings map shared by the tab components below. */
type SettingsMap = Record<string, unknown>;
interface SettingsTabProps {
  settings: SettingsMap;
  onUpdate: (patch: SettingsMap) => void;
}

function AppearanceTab({ settings, onUpdate }: SettingsTabProps) {
  const currentAccent: string = typeof settings.accentColor === 'string' ? settings.accentColor : 'emerald';
  const appearance = useSettingsStore((s) => s.appearance);
  const updateAppearance = useSettingsStore((s) => s.updateAppearanceSetting);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-neutral-900">Appearance & Themes</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Customize UI color themes, editor font scaling, and visual accents.
        </p>
      </div>

      {/* Theme selector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">App Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((th) => (
            <button
              key={th.id}
              type="button"
              onClick={() => updateAppearance('colorTheme', th.id)}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-medium transition cursor-pointer ${
                appearance.colorTheme === th.id
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-semibold shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 text-neutral-700 hover:text-neutral-950 hover:bg-slate-100'
              }`}
            >
              <th.icon className="w-4 h-4" />
              <span>{th.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color Palette */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Accent Color <span className="normal-case font-normal text-neutral-400">(dashboard only)</span></h3>
        <div className="grid grid-cols-3 gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onUpdate({ accentColor: c.id })}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                currentAccent === c.id
                  ? 'border-emerald-500/60 bg-emerald-50/60 shadow-xs'
                  : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/70'
              }`}
            >
              <div className="w-5 h-5 rounded-full shadow" style={{ background: c.color }} />
              <span className="text-xs text-neutral-800 font-medium">{c.label}</span>
              {currentAccent === c.id && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto" />}
            </button>
          ))}
        </div>
      </div>

      {/* Font & Preview */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Preview</h3>
        <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100 border border-slate-200/60">
          <div
            className="h-full rounded-full w-2/3 transition-all duration-500"
            style={{ background: ACCENT_COLORS.find((c) => c.id === currentAccent)?.color || '#10b981' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs text-white font-medium transition shadow-sm cursor-pointer"
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
        <h2 className="text-base font-bold text-neutral-900">Terminal & Browser Automation</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure shell environment inheritance, default terminal emulator, and autonomous browser runtime.
        </p>
      </div>

      {/* Terminal Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Terminal Environment</h3>
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
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Browser Use Automation</h3>
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
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
          >
            <option value="normal">Normal (Native desktop)</option>
            <option value="mobile">Mobile (393 × 852 iPhone)</option>
            <option value="custom">Custom (User-defined)</option>
          </select>
        </SettingRowItem>
      </div>

      {/* Desktop Automation & Window Dimensions */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Desktop Automation & Window</h3>
        <SettingToggle
          icon={Cpu}
          label="Enable Computer Use (Desktop Automation)"
          description="Allows authorized subagents to interact with host desktop software, terminal windows, and UI elements via mouse/keyboard."
          checked={agent.computerUse}
          onChange={(v) => updateAgent('computerUse', v)}
        />

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center flex-shrink-0 mt-0.5 text-neutral-600">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-neutral-900">Desktop Window Startup Dimensions</div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Default geometry applied on application launch: 1200 × 800 (Maximized: true).
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg font-mono border border-emerald-200">
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
        <h2 className="text-base font-bold text-neutral-900">Agent Behavior & Stream Rendering</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure chain-of-thought reasoning, tool grouping, interaction queue modes, and payload retention.
        </p>
      </div>

      {/* Stream Display */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Stream & Output Display</h3>
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tool Grouping Collapsibles</h3>
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Turn Machine & Experience</h3>
        <SettingRowItem
          icon={MessageSquare}
          label="Interaction Behavior"
          description="How follow-up prompts and questions are handled while turn machine is active."
        >
          <select
            value={agent.interactionBehavior}
            onChange={(e) => updateAgent('interactionBehavior', e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
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
        <h2 className="text-base font-bold text-neutral-900">Memory & Session Retention</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure cross-session workspace memory, conversation compaction, checkpoints, and task archiving.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Project Memory & Checkpoints</h3>
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
          checked={Boolean(agent.checkpointsEnabled ?? true)}
          onChange={(v) => {
            updateAgent('checkpointsEnabled', v);
            api.put('/api/v1/settings', { rewindCheckpointing: v }).catch((err) => reportError('Checkpoints setting not saved', err));
          }}
        />

        <SettingToggle
          icon={Sliders}
          label="Conversation Compaction"
          description="Enable conversation compaction (automatically summarizes older turn history to reduce context window usage)."
          checked={Boolean(agent.conversationCompaction ?? true)}
          onChange={(v) => {
            updateAgent('conversationCompaction', v);
            api.put('/api/v1/settings', { conversationCompaction: v }).catch((err) => reportError('Compaction setting not saved', err));
          }}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Task Archiving</h3>
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
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-neutral-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer shadow-xs"
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

  // BUG-19-06: mcode paths (was: legacy ZCode + a hardcoded personal dir).
  const FILE_LOCATIONS = [
    { file: 'config.json', path: '~/.mcode/config.json', desc: 'User-level settings/preferences + model provider configuration' },
    { file: 'vault.json.enc', path: '~/.mcode/vault.json.enc', desc: 'Encrypted secrets vault (AES-256-GCM)' },
    { file: 'history/', path: '~/.mcode/history/', desc: 'Session history entries' },
    { file: 'projects/', path: '~/.mcode/projects/', desc: 'Per-project state (undo stacks, watch state)' },
    { file: 'ledger.json', path: '~/.mcode/ledger.json', desc: 'Provider usage ledger (rate-limit tracking)' },
    { file: 'watch/', path: '~/.mcode/watch/', desc: 'Watch daemon state files' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-neutral-900">Workspace Indexing & Storage</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Local file index caching for sub-second file search, instant grep, and persistent file locations.
        </p>
      </div>

      {/* Indexing Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Indexing Options</h3>
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">CLI Storage Schema</h3>
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center flex-shrink-0 mt-0.5 text-neutral-600">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-neutral-900">Persistent Storage Directory (storage.dir)</div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Persistent storage directory for all mcode data: <code className="text-neutral-800 font-mono">~/.mcode</code>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs text-neutral-800 bg-slate-50 px-3 py-1.5 rounded-lg font-mono border border-slate-200 flex-1">
                  ~/.mcode
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('~/.mcode');
                    toast.success('Copied data path');
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-neutral-600 hover:text-neutral-900 transition border border-slate-200 shadow-xs cursor-pointer"
                  title="Copy path"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center flex-shrink-0 mt-0.5 text-neutral-600">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-neutral-900">Session Database (storage.sessionDbPath)</div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Path to the session SQLite database storing conversation turns: <code className="text-neutral-800 font-mono">~/.mcode/cli/db/db.sqlite</code>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="text-xs text-neutral-800 bg-slate-50 px-3 py-1.5 rounded-lg font-mono border border-slate-200 flex-1">
                  ~/.mcode/cli/db/db.sqlite
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('~/.mcode/cli/db/db.sqlite');
                    toast.success('Copied db path');
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-neutral-600 hover:text-neutral-900 transition border border-slate-200 shadow-xs cursor-pointer"
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
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Official mcode File Locations</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-neutral-500 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-2.5">File</th>
                <th className="px-4 py-2.5">Path</th>
                <th className="px-4 py-2.5">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-neutral-700">
              {FILE_LOCATIONS.map((loc) => (
                <tr key={loc.file} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-emerald-700 font-semibold whitespace-nowrap">{loc.file}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-neutral-500">{loc.path}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{loc.desc}</td>
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
  const [permMode, setPermMode] = useState<'plan' | 'build' | 'edit' | 'yolo'>(settings.permissionMode || 'build');
  const [autoApproveHighRisk, setAutoApproveHighRisk] = useState(Boolean(settings.autoApproveHighRisk));
  const [networkTimeout, setNetworkTimeout] = useState(settings.networkTimeout || 180000);

  useEffect(() => {
    if (settings.permissionMode) setPermMode(settings.permissionMode);
    if (settings.autoApproveHighRisk !== undefined) setAutoApproveHighRisk(Boolean(settings.autoApproveHighRisk));
    if (settings.networkTimeout !== undefined) setNetworkTimeout(settings.networkTimeout);
  }, [settings.permissionMode, settings.autoApproveHighRisk, settings.networkTimeout]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-bold text-neutral-900 mb-1">Permissions & CLI Governance</h2>
        <p className="text-xs text-neutral-500">
          Control permission modes, auto-approval thresholds, shell execution policies, and file edit guards.
        </p>
      </div>

      {/* CLI Permission Mode Selector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">CLI Permission Mode</h3>
        </div>
        <p className="text-xs text-neutral-500">
          Corresponds to <code className="text-neutral-800 font-mono">permission.mode</code> in mcode CLI config schema.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'plan', label: 'Plan', icon: Eye, color: 'text-cyan-600', desc: 'Ask for everything — strict confirmation before any action' },
            { id: 'build', label: 'Build (Recommended)', icon: Wrench, color: 'text-emerald-600', desc: 'Ask for risky actions, allow safe reads and standard commands' },
            { id: 'edit', label: 'Edit', icon: Edit2, color: 'text-blue-600', desc: 'Auto-edit files with undo checkpoint, ask for dangerous commands' },
            { id: 'yolo', label: 'YOLO', icon: Zap, color: 'text-amber-600', desc: 'Full automation — approve all tools and commands without prompting' },
          ].map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setPermMode(mode.id as any);
                  onUpdate({ permissionMode: mode.id });
                  toast.success(`Permission mode set to ${mode.label}`);
                }}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  permMode === mode.id
                    ? 'bg-emerald-50/80 border-emerald-500/70 text-emerald-950 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 text-neutral-700 hover:text-neutral-950 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ModeIcon className={`w-4 h-4 ${mode.color}`} />
                    <span className="text-sm font-semibold text-neutral-900">{mode.label}</span>
                  </div>
                  {permMode === mode.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-xs text-neutral-500 mt-1.5 leading-snug">{mode.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* High-risk auto approve */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-600 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm text-neutral-900 font-semibold">Auto-Approve High-Risk Tools</span>
              <p className="text-xs text-neutral-500 mt-0.5">
                Auto-approve high-risk tools (file deletes, system commands) without prompting.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoApproveHighRisk}
            onClick={() => {
              const next = !autoApproveHighRisk;
              setAutoApproveHighRisk(next);
              onUpdate({ autoApproveHighRisk: next });
              toast.info(`Auto-approve high risk tools: ${next}`);
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
              autoApproveHighRisk ? 'bg-amber-500' : 'bg-slate-300'
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
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-900">
              High-risk actions can delete files and execute privileged scripts without review.
            </p>
          </div>
        )}
      </div>

      {/* Shell execution */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Shell Command Execution</h3>
        </div>
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-100/70 transition group">
          <input
            type="radio"
            name="shell"
            checked={!settings.allowShellAll}
            onChange={() => onUpdate({ allowShellAll: false })}
            className="mt-1 accent-emerald-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-neutral-900 font-semibold">Ask before every command</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">RECOMMENDED</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Each shell command will require your approval before running.</p>
          </div>
        </label>
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-100/70 transition group">
          <input
            type="radio"
            name="shell"
            checked={settings.allowShellAll}
            onChange={() => onUpdate({ allowShellAll: true })}
            className="mt-1 accent-emerald-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-neutral-900 font-semibold">Full access — run without asking</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Commands execute immediately without confirmation prompts.</p>
          </div>
        </label>
        {settings.allowShellAll && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3.5 mt-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-900">Full access lets the AI run any command including installs, deletes, and git operations without confirmation. Only enable if you trust the project.</p>
          </div>
        )}
      </div>

      {/* File edit approval */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">File Edit Approval</h3>
        </div>
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-100/70 transition">
          <input
            type="radio"
            name="edit"
            checked={!settings.requireEditApproval}
            onChange={() => onUpdate({ requireEditApproval: false })}
            className="mt-1 accent-emerald-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-neutral-900 font-semibold">Auto-apply edits</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">File changes are applied automatically (you can always undo with checkpoints).</p>
          </div>
        </label>
        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50/60 border border-slate-200 cursor-pointer hover:border-slate-300 hover:bg-slate-100/70 transition">
          <input
            type="radio"
            name="edit"
            checked={settings.requireEditApproval}
            onChange={() => onUpdate({ requireEditApproval: true })}
            className="mt-1 accent-emerald-600"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm text-neutral-900 font-semibold">Review before applying</span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">Each file edit shows a diff for your approval before writing to disk.</p>
          </div>
        </label>
      </div>

      {/* Network Timeout */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-sm text-neutral-900 font-semibold">Default Network Timeout</span>
              <p className="text-xs text-neutral-500 mt-0.5">
                CLI network timeout in milliseconds (default: 180,000ms / 3 minutes).
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            {networkTimeout / 1000}s ({networkTimeout}ms)
          </span>
        </div>
        <input
          type="range"
          min={30000}
          max={600000}
          step={15000}
          value={networkTimeout}
          onChange={(e) => {
            const val = Number(e.target.value);
            setNetworkTimeout(val);
            onUpdate({ networkTimeout: val });
          }}
          className="w-full accent-emerald-600 cursor-pointer"
        />
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving permissions...
        </div>
      )}
    </div>
  );
}

/* ─────────────────── TAB 11: MODEL SETTINGS & API KEYS TAB ─────────────────── */

/*
 * WEB-029: `DEFAULT_SETTINGS_PROVIDERS` (this file) and `FALLBACK_PROVIDERS`
 * (`ModelSelector.tsx`) were two independent hard-coded catalogs, each swapped in
 * silently when `GET /api/v1/settings/providers` failed or timed out after 3 s —
 * so the UI could offer models the mcode CLI cannot route, with nothing saying
 * so. Both now come from `lib/providerCatalog.ts` via `useProviderCatalog()`, and
 * both label the list as stale when the live fetch fails.
 */

function ApiKeysTab() {
  const { providers, isStale, loading: catalogLoading, refresh: reloadCatalog } = useProviderCatalog();
  const [keys, setKeys] = useState<any[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeProviderId, setActiveProviderId] = useState(DEFAULT_PROVIDER_ID);
  const [newKey, setNewKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelByProvider, setSelectedModelByProvider] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState('');

  // Add Model Modal state
  const [showAddModelModal, setShowAddModelModal] = useState(false);
  const [addForm, setAddForm] = useState({
    providerId: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    displayName: '',
    baseUrl: ''
  });
  const [testState, setTestState] = useState<{ status: 'idle' | 'testing' | 'valid' | 'invalid'; message?: string }>({ status: 'idle' });
  const [addingModel, setAddingModel] = useState(false);
  const [showAddApiKey, setShowAddApiKey] = useState(false);

  const POPULAR_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'], defaultModel: 'gpt-4o', keyPrefix: 'sk-...' },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'], defaultModel: 'claude-3-7-sonnet-latest', keyPrefix: 'sk-ant-...' },
    { id: 'openrouter', name: 'OpenRouter (Custom Key)', models: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-chat', 'openai/gpt-4o'], defaultModel: 'meta-llama/llama-3.3-70b-instruct', keyPrefix: 'sk-or-...' },
    { id: 'groq', name: 'Groq', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b'], defaultModel: 'llama-3.3-70b-versatile', keyPrefix: 'gsk_...' },
    { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'], defaultModel: 'deepseek-chat', keyPrefix: 'sk-...' },
    { id: 'gemini', name: 'Google Gemini', models: ['gemini-2.5-flash', 'gemini-2.5-pro'], defaultModel: 'gemini-2.5-flash', keyPrefix: 'AIza...' },
    { id: 'mistral', name: 'Mistral', models: ['mistral-large-latest', 'codestral-latest'], defaultModel: 'mistral-large-latest', keyPrefix: 'sk-...' },
    { id: 'ollama', name: 'Ollama (Local)', models: ['llama3.2', 'deepseek-r1', 'qwen2.5-coder'], defaultModel: 'llama3.2', baseUrl: 'http://localhost:11434/v1', keyPrefix: 'ollama' },
    { id: 'custom', name: 'Custom OpenAI-Compatible', models: ['custom-model'], defaultModel: 'custom-model', keyPrefix: 'sk-...' }
  ];

  const fetchData = useCallback(async () => {
    try {
      const [keysRes, modelsRes] = await Promise.allSettled([
        api.get('/api/v1/keys', { timeout: 3000 }),
        api.get('/api/v1/keys/models', { timeout: 3000 }),
      ]);
      if (keysRes.status === 'fulfilled' && keysRes.value.data?.keys) {
        setKeys(keysRes.value.data.keys || []);
      }
      if (modelsRes.status === 'fulfilled' && modelsRes.value.data?.models) {
        setAvailableModels(modelsRes.value.data.models || []);
      }
    } catch (e) {
      console.error('Failed to fetch provider settings:', e);
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

  const handleTestCustomKey = async () => {
    if (!addForm.apiKey.trim()) {
      toast.error('Please enter an API key to test');
      return;
    }
    setTestState({ status: 'testing' });
    try {
      const res = await api.post('/api/v1/keys/test', {
        providerId: addForm.providerId,
        apiKey: addForm.apiKey.trim()
      });
      if (res.data?.valid) {
        setTestState({ status: 'valid', message: 'API key verified and connected successfully!' });
      } else {
        setTestState({ status: 'invalid', message: 'Provider rejected this API key.' });
      }
    } catch (e: any) {
      setTestState({ status: 'invalid', message: e?.response?.data?.error?.message || 'Connection test failed' });
    }
  };

  const handleCreateCustomModel = async () => {
    if (!addForm.apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    setAddingModel(true);
    try {
      const prov = providers.find((p) => p.id === addForm.providerId);
      const res = await api.post('/api/v1/keys', {
        providerId: addForm.providerId,
        envVar: prov?.envVar || `${addForm.providerId.toUpperCase()}_API_KEY`,
        displayName: addForm.displayName.trim() || prov?.displayName || addForm.providerId,
        apiKey: addForm.apiKey.trim(),
        model: addForm.model.trim() || undefined,
        baseUrl: addForm.baseUrl.trim() || undefined,
      });
      if (res.data?.ok) {
        toast.success(`Added ${addForm.displayName || addForm.model || addForm.providerId} to your models!`);
        setShowAddModelModal(false);
        setAddForm({ providerId: 'openai', apiKey: '', model: 'gpt-4o', displayName: '', baseUrl: '' });
        setTestState({ status: 'idle' });
        await fetchData();
        window.dispatchEvent(new CustomEvent('mcode:reload-models'));
        setActiveProviderId(addForm.providerId);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to add model');
    } finally {
      setAddingModel(false);
    }
  };

  const activeProvider = providers.find((p) => p.id === activeProviderId);
  const existingKey = keys.find((k) => k.providerId === activeProviderId);

  useEffect(() => {
    const saved = existingKey?.model;
    const cached = selectedModelByProvider[activeProviderId];
    setSelectedModelId(cached || saved || null);
  }, [activeProviderId, existingKey?.model, selectedModelByProvider]);

  const verifiedOpenRouterMap: Record<string, { working: boolean; latency: string; name: string }> = {
    'meta-llama/llama-3.3-70b-instruct': { working: true, latency: '~525ms', name: 'Llama 3.3 70B' },
    'openai/gpt-4o': { working: true, latency: '~730ms', name: 'GPT-4o' },
    'openai/gpt-4o-mini': { working: true, latency: '~880ms', name: 'GPT-4o Mini' },
    'qwen/qwen-2.5-coder-32b-instruct': { working: true, latency: '~1400ms', name: 'Qwen 2.5 Coder 32B' },
    'google/gemini-2.5-flash': { working: true, latency: '~2000ms', name: 'Gemini 2.5 Flash' },
    'deepseek/deepseek-chat': { working: true, latency: '~3600ms', name: 'DeepSeek V3' },
  };

  const rawLive = availableModels.filter((m) => m.provider === activeProviderId);
  const liveModels = activeProviderId === 'openrouter'
    ? rawLive.filter((m) => !m.model?.startsWith('gpt-5.') && !m.model?.includes('claude-fable') && !m.model?.includes('grok-4.5') && !m.model?.includes('codestral'))
    : rawLive;

  const staticModels = (activeProvider?.models || []).map((m: any) => ({
    ref: `${activeProviderId}:${m.id}`,
    provider: activeProviderId,
    name: m.name,
    model: m.id,
    free: m.free,
    latency: m.latency,
    working: m.working,
    scores: m.scores,
    isDefault: activeProviderId === 'openrouter' && Boolean(m.isDefault)
  }));

  const displayModels = (liveModels.length > 0 ? liveModels : staticModels).map((m: any) => {
    const id = m.model || m.id || (m.ref?.includes(':') ? m.ref.split(':').slice(1).join(':') : m.ref);
    const meta = activeProviderId === 'openrouter' ? (verifiedOpenRouterMap[id] || verifiedOpenRouterMap[m.model] || verifiedOpenRouterMap[m.id]) : null;
    return {
      ...m,
      name: meta?.name || m.name,
      latency: meta?.latency || m.latency,
      working: meta ? meta.working : m.working,
      isDefault: m.isDefault ?? (activeProviderId === 'openrouter')
    };
  });

  return (
    <div className="flex flex-col h-[80vh] min-h-[600px] max-w-[1000px] mx-auto w-full relative">
      {/* Header */}
      <div className="mb-6 flex-shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight">Model settings</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">Active</span>
          </div>
          <p className="text-[13px] text-neutral-600">
            System default models are ready out-of-the-box. Add your own provider API keys below to unlock custom models.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddModelModal(true);
            setTestState({ status: 'idle' });
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      {isStale && (
        <div
          role="status"
          className="mb-4 flex-shrink-0 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 shadow-xs"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-amber-900 font-semibold">Provider catalog is not live</p>
            <p className="text-[12px] text-amber-700 mt-0.5">{CATALOG_STALE_NOTICE}</p>
          </div>
          <button
            type="button"
            onClick={reloadCatalog}
            disabled={catalogLoading}
            className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-medium px-3 py-1 rounded-lg border border-amber-300 bg-white text-amber-800 hover:bg-amber-100/70 transition shadow-xs disabled:opacity-50"
          >
            {catalogLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-slate-200 flex flex-col py-4 overflow-y-auto custom-scrollbar flex-shrink-0 bg-slate-50/60">
          <div className="px-4 mb-3">
            <button
              type="button"
              onClick={() => {
                setShowAddModelModal(true);
                setTestState({ status: 'idle' });
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-600/20 mb-3 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Model
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-xs"
              />
            </div>
          </div>
          <div className="px-4 text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">Providers</div>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />
            </div>
          ) : (
            (() => {
              const q = searchQuery.toLowerCase();
              const configured = providers
                .filter((p) => keys.some((k) => k.providerId === p.id) || p.id === 'openrouter')
                .filter((p) => (p.displayName || p.id).toLowerCase().includes(q))
                .sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));

              const unconfigured = providers
                .filter((p) => !keys.some((k) => k.providerId === p.id) && p.id !== 'openrouter')
                .filter((p) => (p.displayName || p.id).toLowerCase().includes(q))
                .sort((a, b) => (a.displayName || a.id).localeCompare(b.displayName || b.id));

              const renderProvider = (provider: any) => {
                const isActive = activeProviderId === provider.id;
                const isConfigured = keys.some((k) => k.providerId === provider.id) || provider.id === 'openrouter';
                const keyForProvider = keys.find((k) => k.providerId === provider.id);
                const isDefaultProvider = provider.id === 'openrouter';

                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setActiveProviderId(provider.id);
                      setNewKey('');
                      setShowApiKey(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 transition text-left cursor-pointer ${
                      isActive ? 'bg-white shadow-xs border-y border-slate-200/80 font-medium' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isDefaultProvider ? (
                          <Sparkles className="w-[18px] h-[18px] flex-shrink-0 text-amber-500" />
                        ) : isConfigured ? (
                          <Cpu className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-emerald-500'}`} />
                        ) : (
                          <Server className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`} />
                        )}
                        <span className={`text-[13px] truncate ${isActive ? 'text-neutral-900 font-semibold' : 'text-neutral-700'}`}>
                          {provider.displayName || provider.id}
                        </span>
                      </div>
                      {isDefaultProvider ? (
                        <span className="text-[10px] text-amber-600 font-medium ml-7 truncate flex items-center gap-1 mt-0.5">
                          🌟 System Default Included
                        </span>
                      ) : isConfigured && keyForProvider?.model ? (
                        <span className="text-[11px] text-neutral-500 font-mono ml-7 truncate flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" />
                          {keyForProvider.model.split(':').pop() || keyForProvider.model}
                        </span>
                      ) : null}
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ml-2 ${isConfigured ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </button>
                );
              };

              return (
                <>
                  <div className="px-4 text-[11px] text-neutral-400 mt-2 mb-1.5 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Configured providers</span>
                  </div>
                  {configured.length > 0 ? (
                    configured.map(renderProvider)
                  ) : (
                    <div className="px-4 py-2 text-[12px] text-neutral-400 italic">None configured</div>
                  )}

                  <div className="px-4 text-[11px] text-neutral-400 mt-5 mb-1.5 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-neutral-400" />
                    <span>Available providers</span>
                  </div>
                  {unconfigured.length > 0 ? (
                    unconfigured.map(renderProvider)
                  ) : (
                    <div className="px-4 py-2 text-[12px] text-neutral-400 italic">None available</div>
                  )}
                </>
              );
            })()
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
            </div>
          ) : activeProvider ? (
            <div className="max-w-3xl">
              {/* Header */}
              <div className="flex items-center mb-8">
                <h3 className="text-[22px] font-bold text-neutral-900 mr-3">{activeProvider.displayName || activeProvider.id}</h3>
                {activeProviderId === 'openrouter' ? (
                  <div className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>System Default Provider (Ready to Use)</span>
                  </div>
                ) : existingKey ? (
                  <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-medium ml-4 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Configured</span>
                  </div>
                ) : (
                  <div className="px-3 py-1 rounded-full bg-slate-100 text-neutral-600 border border-slate-200 text-[11px] font-medium ml-4 flex items-center gap-1.5">
                    <CircleDashed className="w-3 h-3 text-neutral-400" />
                    <span>Not Configured</span>
                  </div>
                )}
                {existingKey && (
                  <button
                    onClick={() => handleRemove(existingKey.id)}
                    className="ml-auto text-red-500 hover:text-red-700 text-sm font-medium transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Key</span>
                  </button>
                )}
              </div>

              {/* System default provider notice */}
              {activeProviderId === 'openrouter' && (
                <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-900">
                    <p className="font-semibold mb-0.5">🌟 System Default Models Are Pre-Configured</p>
                    <p className="text-amber-800/90 leading-relaxed">
                      These 6 verified models (Llama 3.3 70B, GPT-4o, GPT-4o Mini, Qwen 2.5 Coder, Gemini 2.5 Flash, DeepSeek V3) are ready to use across the entire IDE and Chat. No API key or OpenRouter account is needed. If you want to use your personal OpenRouter account balance instead, enter your personal key below.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-8">
                {/* API Key */}
                <div>
                  <label className="block text-[13px] text-neutral-700 font-semibold mb-2.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{activeProviderId === 'openrouter' ? 'Custom API key (Optional)' : 'API key'}</span>
                    </span>
                    {activeProviderId === 'openrouter' && (
                      <span className="text-[11px] text-neutral-400 font-normal">Optional: Leave blank to use server default</span>
                    )}
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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[13px] text-neutral-900 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition font-mono pr-10 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={saving || (!existingKey && !newKey)}
                      className="px-6 py-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[13px] rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-1.5 min-w-[90px] shadow-sm shadow-emerald-600/20 cursor-pointer"
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
                    <label className="block text-[13px] text-neutral-700 font-semibold flex items-center gap-1.5">
                      <BrainCircuit className="w-4 h-4 text-blue-600" />
                      <span>Available models</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={fetchData}
                        disabled={refreshing}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 transition flex items-center gap-1 font-medium cursor-pointer"
                        title="Refresh models"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                      </motion.button>
                      {existingKey && selectedModelId && (
                        <span className="text-[11px] text-neutral-500 font-mono truncate max-w-[180px]">
                          {selectedModelId.split(':').pop() || selectedModelId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {displayModels.length === 0 ? (
                      <div className="text-[13px] text-neutral-400 py-4 text-center">
                        No models available for this provider. Add an API key to load models.
                      </div>
                    ) : (
                      displayModels.map((model: any) => {
                        const modelId = model.model || model.ref;
                        const isSelected = selectedModelId === modelId;
                        const isDefault = Boolean(model.isDefault);

                        return (
                          <motion.div
                            key={model.ref || modelId}
                            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? 'bg-blue-50/40 shadow-xs border border-blue-400'
                                : 'bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300'
                            }`}
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
                                {isDefault ? (
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                ) : (
                                  <Key className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                                )}
                                <span className="text-[13px] text-neutral-900 font-semibold">{model.name || modelId}</span>
                                {model.latency && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80">
                                    {model.latency}
                                  </span>
                                )}
                                {isDefault ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    🌟 System Default
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    🔑 Custom
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-neutral-500 font-mono ml-5.5">{modelId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {model.working ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1.5 shadow-xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Working</span>
                                </span>
                              ) : model.working === false ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-neutral-500 border border-slate-200 text-[10px] font-semibold flex items-center gap-1">
                                  <span>Offline</span>
                                </span>
                              ) : null}
                              {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
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
            <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
              Select a provider to configure
            </div>
          )}
        </div>
      </div>

      {/* ─── ADD MODEL MODAL ─── */}
      <AnimatePresence>
        {showAddModelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Add Custom Model / Key</h3>
                    <p className="text-xs text-neutral-500">Connect your provider API key and specify model</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModelModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                {/* 1. Choose Provider */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    1. Select Provider
                  </label>
                  <select
                    value={addForm.providerId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const matched = POPULAR_PROVIDERS.find((p) => p.id === pid);
                      setAddForm((prev) => ({
                        ...prev,
                        providerId: pid,
                        model: matched ? matched.defaultModel : prev.model,
                        baseUrl: (matched as any)?.baseUrl || ''
                      }));
                      setTestState({ status: 'idle' });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    {POPULAR_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                      2. Provider API Key
                    </label>
                    <span className="text-[11px] text-neutral-400">Encrypted at rest</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAddApiKey ? 'text' : 'password'}
                      value={addForm.apiKey}
                      onChange={(e) => {
                        setAddForm((prev) => ({ ...prev, apiKey: e.target.value }));
                        setTestState({ status: 'idle' });
                      }}
                      placeholder={POPULAR_PROVIDERS.find((p) => p.id === addForm.providerId)?.keyPrefix || 'sk-...'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 font-mono pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddApiKey(!showAddApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showAddApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Model ID */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    3. Model ID / Name
                  </label>
                  <input
                    type="text"
                    value={addForm.model}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g. gpt-4o, claude-3-7-sonnet-latest, deepseek-chat"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {/* Quick Select Chips */}
                  {(() => {
                    const matched = POPULAR_PROVIDERS.find((p) => p.id === addForm.providerId);
                    if (!matched || !matched.models.length) return null;
                    return (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-neutral-400 self-center mr-1">Popular:</span>
                        {matched.models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setAddForm((prev) => ({ ...prev, model: m }))}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                              addForm.model === m
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                                : 'bg-slate-100 hover:bg-slate-200 text-neutral-700 border-slate-200'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Optional Display Name */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={addForm.displayName}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g. My Personal Claude, DeepSeek Pro"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Optional Base URL (for Ollama or Local) */}
                {(addForm.providerId === 'ollama' || addForm.providerId === 'custom') && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={addForm.baseUrl}
                      onChange={(e) => setAddForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder="http://localhost:11434/v1"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-neutral-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                )}

                {/* Test Connection Button & Result */}
                <div className="pt-1">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestCustomKey}
                      disabled={testState.status === 'testing' || !addForm.apiKey.trim()}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-neutral-700 border border-slate-200 text-xs font-medium rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {testState.status === 'testing' ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                          <span>Test Connection</span>
                        </>
                      )}
                    </button>
                    {testState.status === 'valid' && (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Valid &amp; Connected!
                      </span>
                    )}
                    {testState.status === 'invalid' && (
                      <span className="text-xs font-medium text-red-500 truncate max-w-[240px]">
                        {testState.message || 'Key test failed'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowAddModelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomModel}
                  disabled={addingModel || !addForm.apiKey.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {addingModel ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Model</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
        <h2 className="text-base font-bold text-neutral-900 mb-1">God-Mode Build Defaults</h2>
        <p className="text-xs text-neutral-500">Configure defaults for multi-subagent parallel builds and autonomous deployments.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        {/* Concurrency */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <label className="text-sm font-medium text-neutral-900 block">Subagent Concurrency</label>
          </div>
          <div className="flex items-center gap-3">
            {[1, 2, 3, 4, 5, 6, 8].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => updateGod({ concurrency: n })}
                className={`w-10 h-10 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  god.concurrency === n
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold shadow-xs'
                    : 'bg-slate-100/70 text-neutral-600 border border-slate-200 hover:bg-slate-100 hover:text-neutral-900'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-2">Number of parallel subagents spawned simultaneously during god-mode waves.</p>
        </div>

        {/* Deploy target */}
        <div className="border-t border-slate-200/80 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-4 h-4 text-blue-600" />
            <label className="text-sm font-medium text-neutral-900 block">Default Deploy Target</label>
          </div>
          <div className="relative">
            <select
              value={god.deployTarget}
              onChange={(e) => updateGod({ deployTarget: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-emerald-500 appearance-none cursor-pointer shadow-xs"
            >
              <option value="">None (Local only)</option>
              <option value="vercel">▲ Vercel</option>
              <option value="netlify">◆ Netlify</option>
              <option value="cloudflare">☁ Cloudflare Pages</option>
              <option value="fly">✈ Fly.io</option>
              <option value="railway">🚂 Railway</option>
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Skip tests */}
        <div className="border-t border-slate-200/80 pt-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => updateGod({ skipTests: !god.skipTests })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                updateGod({ skipTests: !god.skipTests });
              }
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0 ${
                god.skipTests ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                  god.skipTests ? 'left-5' : 'left-1'
                }`}
              />
            </div>
            <div className="flex items-start gap-2.5">
              <TestTube className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-neutral-900 font-medium group-hover:text-neutral-950 transition">Skip tests by default</span>
                <p className="text-xs text-neutral-500">God-mode builds will skip the test phase unless explicitly requested.</p>
              </div>
            </div>
          </div>
          {god.skipTests && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
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
        <h2 className="text-base font-bold text-neutral-900 mb-1">Watch Mode Defaults</h2>
        <p className="text-xs text-neutral-500">Configure the background watch daemon — continuous auto-scan and auto-fix loop.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radar className="w-4 h-4 text-emerald-600" />
            <label className="text-sm font-medium text-neutral-900 block">Background Scan Interval</label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5000}
              max={120000}
              step={5000}
              value={watch.intervalMs}
              onChange={(e) => updateWatch({ intervalMs: Number(e.target.value) })}
              className="flex-1 accent-emerald-600 cursor-pointer"
            />
            <span className="text-xs text-emerald-700 font-mono font-medium px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-1 shadow-xs">
              <Clock className="w-3 h-3" />
              {(watch.intervalMs / 1000).toFixed(0)}s
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1.5">How often the watch daemon scans for file modifications and errors (5s - 120s).</p>
        </div>

        <div className="border-t border-slate-200/80 pt-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => updateWatch({ autoFix: !watch.autoFix })}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                updateWatch({ autoFix: !watch.autoFix });
              }
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div
              className={`w-10 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0 ${
                watch.autoFix ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${
                  watch.autoFix ? 'left-5' : 'left-1'
                }`}
              />
            </div>
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-sm text-neutral-900 font-medium group-hover:text-neutral-950 transition">Auto-fix on detection loop</span>
                <p className="text-xs text-neutral-500">Automatically attempt to fix syntax errors and linter issues detected by the watch daemon.</p>
              </div>
            </div>
          </div>
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
        <h2 className="text-base font-bold text-neutral-900 mb-1">Network & Proxy Configuration</h2>
        <p className="text-xs text-neutral-500">
          Route AI requests and restrict which external domains the AI agent can access via web fetch and search.
        </p>
      </div>

      {/* Domain Whitelist */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Allowed Domains for AI Web Access</h3>
        </div>

        {whitelist.length === 0 && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
            <Globe className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              Empty list = all domains allowed. Add domains to strictly restrict the AI's web access.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {whitelist.map((d: any) => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-neutral-800 font-mono shadow-xs"
            >
              {d}
              <button
                type="button"
                onClick={() => removeDomain(d)}
                className="text-neutral-400 hover:text-red-500 transition cursor-pointer"
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
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 outline-none focus:border-emerald-500 font-mono shadow-xs"
          />
          <button
            type="button"
            onClick={addDomain}
            disabled={!newDomain.trim()}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-neutral-700 px-3 py-2 rounded-xl transition border border-slate-200 disabled:opacity-40 flex items-center gap-1 cursor-pointer font-medium shadow-xs"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {/* Enterprise Proxy & Certificates */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Enterprise Proxy & SSL</h3>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-neutral-500" />
            <span>HTTP / HTTPS Proxy</span>
          </label>
          <input
            type="text"
            value={network.httpProxy}
            onChange={(e) => updateNetwork('httpProxy', e.target.value)}
            placeholder="e.g. http://127.0.0.1:7890"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-500 transition font-mono shadow-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-500" />
            <span>No Proxy Hosts (Bypass List)</span>
          </label>
          <input
            type="text"
            value={network.noProxy}
            onChange={(e) => updateNetwork('noProxy', e.target.value)}
            placeholder="e.g. localhost,127.0.0.1,::1,.corp.internal"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-500 transition font-mono shadow-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1.5">
            <FileKey className="w-3.5 h-3.5 text-neutral-500" />
            <span>Custom Root Certificate (PEM)</span>
          </label>
          <input
            type="text"
            value={network.customCert}
            onChange={(e) => updateNetwork('customCert', e.target.value)}
            placeholder="e.g. C:\certs\corporate-ca.pem"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-emerald-500 transition font-mono shadow-xs"
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

const DONUT_COLORS = ['#3b82f6', '#10b981', '#a854f7', '#f97316', '#06b6d4', '#ef4444', '#eab308', '#8b5cf6'];

function UsageTab() {
  const [timeRange, setTimeRange] = useState('Last 30 days');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drillDay, setDrillDay] = useState<string | null>(null);
  const [drillItems, setDrillItems] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const drill = async (dateStr: string) => {
    if (drillDay === dateStr) {
      setDrillDay(null);
      return;
    }
    setDrillDay(dateStr);
    setDrillLoading(true);
    try {
      const res = await api.get('/api/v1/sessions?limit=100', { timeout: 3000 });
      setDrillItems((res.data.items || []).filter((s: any) => new Date(s.createdAt || 0).toISOString().slice(0, 10) === dateStr));
    } catch {
      setDrillItems([]);
    } finally {
      setDrillLoading(false);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const days = timeRange === 'Last 7 days' ? 7 : 30;
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      const res = await api.get(`/api/v1/usage/stats?from=${from.toISOString()}&to=${to.toISOString()}`, {
        timeout: 3000,
      });
      if (res.data?.ok && res.data.stats) {
        setStats(res.data.stats);
      } else {
        setStats({
          totalSessions: 0,
          totalMessages: 0,
          activeDays: 0,
          currentStreak: 0,
          favoriteModel: 'None',
          tokenQuota: { used: 0, limit: 1000000 },
          dailyActivity: {},
          dailyTokens: {},
          modelUsage: {},
        });
      }
    } catch (e) {
      console.error('Failed to fetch usage stats:', e);
      setStats({
        totalSessions: 0,
        totalMessages: 0,
        activeDays: 0,
        currentStreak: 0,
        favoriteModel: 'None',
        tokenQuota: { used: 0, limit: 1000000 },
        dailyActivity: {},
        dailyTokens: {},
        modelUsage: {},
      });
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

  const barDates = heatmapDates.slice(-30);
  const barData = barDates.map((dateStr) => ({ date: dateStr, tokens: dailyTokens[dateStr] || 0 }));
  const maxTokens = Math.max(...barData.map((d) => d.tokens), 1);

  const modelUsageEntries = stats?.modelUsage
    ? (Object.entries(stats.modelUsage) as [string, number][]).sort(([, a], [, b]) => b - a)
    : [];
  const totalModelSessions = modelUsageEntries.reduce((sum, [, count]) => sum + count, 0);

  let offset = 0;
  const circumference = Math.PI * 2 * 37;
  const donutSegments = modelUsageEntries.map(([model, count], i) => {
    const pct = totalModelSessions > 0 ? count / totalModelSessions : 0;
    const dashArray = circumference * pct;
    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    offset -= dashArray;
    return { model, count, pct, color, dashArray, offset };
  });

  const tokenDisplay = stats?.tokenQuota
    ? `${formatCount(stats.tokenQuota.used)} / ${formatCount(stats.tokenQuota.limit)}`
    : '—';

  const favoriteModel = stats?.favoriteModel || '—';
  const favoriteModelCount = stats?.modelUsage ? stats.modelUsage[favoriteModel] || 0 : 0;
  const favoriteModelPct = totalModelSessions > 0
    ? Math.round((favoriteModelCount / totalModelSessions) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
          <h2 className="text-xl font-bold text-neutral-900">Usage stats</h2>
          <span className="text-sm font-semibold text-emerald-600 border-b-2 border-emerald-600 pb-2 translate-y-[9px]">App usage</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/v1/usage/export.csv"
            download
            className="px-3 py-1.5 rounded-xl text-[13px] font-medium bg-white hover:bg-slate-50 text-neutral-700 border border-slate-200 shadow-xs transition"
          >
            Export CSV
          </a>
          <a
            href="/api/v1/usage/report.pdf"
            download
            className="px-3 py-1.5 rounded-xl text-[13px] font-medium bg-white hover:bg-slate-50 text-neutral-700 border border-slate-200 shadow-xs transition"
          >
            Export PDF
          </a>
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
            {['Last 7 days', 'Last 30 days'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                  timeRange === range ? 'bg-white text-neutral-900 shadow-xs font-semibold' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>
      {stats?.tokensEstimated && (
        <p className="text-xs text-neutral-500">Daily token figures are estimates (per-day session volume), not metered counts.</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-neutral-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
          Loading usage stats...
        </div>
      ) : (
        <>
          {/* METRICS GRID */}
          <div className="grid grid-cols-3 gap-4">
            {/* Token Usage */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-neutral-600">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">Token usage</span>
                </div>
                <span className="text-xs font-mono text-neutral-400">{tokenDisplay}</span>
              </div>
              <div className="text-3xl font-bold text-neutral-900">{stats?.tokenQuota ? formatCount(stats.tokenQuota.used) : '—'}</div>
            </div>

            {/* Sessions */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-neutral-600">
                <Activity className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Sessions</span>
              </div>
              <div className="text-3xl font-bold text-neutral-900">{stats?.totalSessions || 0}</div>
            </div>

            {/* Messages */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-neutral-600">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Messages</span>
              </div>
              <div className="text-3xl font-bold text-neutral-900">{stats?.totalMessages || 0}</div>
            </div>

            {/* Active Days */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-neutral-600">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium">Active days</span>
              </div>
              <div className="text-3xl font-bold text-neutral-900">{stats?.activeDays || 0}</div>
            </div>

            {/* Current Streak */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-neutral-600">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Current streak</span>
              </div>
              <div className="text-3xl font-bold text-neutral-900">{stats?.currentStreak || 0} days</div>
            </div>

            {/* Favorite Model */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 text-neutral-600">
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span className="text-sm font-medium">Favorite model</span>
              </div>
              <div className="text-xl font-bold text-neutral-900 truncate">{favoriteModel}</div>
              {favoriteModelPct > 0 && <div className="text-xs text-neutral-500">{favoriteModelPct}% share</div>}
            </div>
          </div>

          {/* HEATMAP */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-neutral-900">Activity heatmap</h3>
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <span>Less</span>
                <div className="w-3 h-3 rounded-[3px] bg-slate-100 ml-1"></div>
                <div className="w-3 h-3 rounded-[3px] bg-emerald-100"></div>
                <div className="w-3 h-3 rounded-[3px] bg-emerald-300"></div>
                <div className="w-3 h-3 rounded-[3px] bg-emerald-500"></div>
                <span className="ml-1">More</span>
              </div>
            </div>
            <div className="flex gap-1.5 overflow-hidden">
              {Array.from({ length: 5 }).map((_, weekIndex) => {
                const weekSlice = heatmapData.slice(weekIndex * 7, weekIndex * 7 + 7);
                return (
                  <div key={weekIndex} className="flex flex-col gap-1.5">
                    {weekSlice.map((day, j) => {
                      const dateKey = heatmapDates[weekIndex * 7 + j];
                      return (
                        <div
                          key={j}
                          onClick={() => dateKey && drill(dateKey)}
                          className={`w-3.5 h-3.5 rounded-[3px] cursor-pointer transition-all ${
                            drillDay === dateKey ? 'ring-2 ring-emerald-600' : ''
                          } ${
                            day === 0
                              ? 'bg-slate-100 hover:bg-slate-200'
                              : day === 1
                              ? 'bg-emerald-200 hover:bg-emerald-300'
                              : day === 2
                              ? 'bg-emerald-400 hover:bg-emerald-500'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                          title={`${dateKey}: ${dailyActivity[dateKey] || 0} sessions, ~${dailyTokens[dateKey] || 0} tokens`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
            {drillDay && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 mt-3">
                <p className="text-xs font-bold text-neutral-700 mb-2">
                  {drillDay} — {drillLoading ? 'loading…' : `${drillItems.length} session(s)`}
                </p>
                {!drillLoading && drillItems.length > 0 && (
                  <ul className="space-y-1">
                    {drillItems.map((s: any) => (
                      <li key={s._id} className="text-xs text-neutral-600">
                        <span className="text-neutral-900 font-medium">{s.projectName || 'Untitled'}</span>
                        <span className="text-neutral-400"> · {s.mode || ''} · {s.status || ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* TOKENS PER DAY BAR CHART */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mt-4 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-6">Tokens per day</h3>
            <div className="relative h-48 border-b border-slate-200 flex items-end justify-between px-2 pb-6">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
                <div className="border-t border-slate-100 w-full h-0"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-400 px-2 translate-y-full pt-2">
                {barDates.map((d, i) => i % 5 === 0 && <span key={d}>{d.slice(5)}</span>)}
              </div>
              <div className="relative w-full h-full flex items-end justify-between gap-0.5 pb-1 z-10">
                {barData.map((d) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center">
                    <motion.div
                      className="w-full bg-emerald-500 rounded-t-sm"
                      style={{ height: `${(d.tokens / maxTokens) * 100}%` }}
                      initial={{ height: 0 }}
                      animate={{ height: `${(d.tokens / maxTokens) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
            {modelUsageEntries.length > 0 && (
              <div className="grid grid-cols-3 gap-y-3 mt-10">
                {modelUsageEntries.slice(0, 6).map(([model], i) => (
                  <div key={model} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}></div>
                    <span className="text-xs text-neutral-600 font-mono truncate">{model}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MODEL USAGE DONUT CHART */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 mt-4 shadow-xs">
            <h3 className="text-sm font-bold text-neutral-900 mb-6">Model usage</h3>
            <div className="flex gap-10">
              <div className="relative w-48 h-48 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
                  {donutSegments.map((seg, i) => (
                    <motion.circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="20"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={-seg.offset}
                      className="drop-shadow-xs"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: -seg.offset }}
                      transition={{ duration: 0.8 }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-neutral-900">
                    {modelUsageEntries.length > 0 ? formatCount(modelUsageEntries[0][1]) : '0'}
                  </span>
                  <span className="text-[11px] text-neutral-400">sessions</span>
                </div>
              </div>
              <div className="flex flex-col justify-center flex-1 space-y-4">
                {modelUsageEntries.length === 0 ? (
                  <div className="text-xs text-neutral-400 italic">No model usage recorded yet</div>
                ) : (
                  modelUsageEntries.map(([model, count], i) => (
                    <div key={model} className="flex items-center justify-between">
                      <div className="flex gap-3">
                        <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}></div>
                        <div className="flex flex-col">
                          <span className="text-sm text-neutral-800 font-mono truncate">{model}</span>
                          <span className="text-xs text-neutral-400">{count} sessions</span>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-500 font-medium">
                        {totalModelSessions > 0 ? Math.round((count / totalModelSessions) * 100) : 0}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────── CHANGE PASSWORD MODAL ─────────────────── */

function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-neutral-900">Change Password</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Current Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-emerald-500 transition shadow-xs"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">New Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-emerald-500 transition shadow-xs"
              placeholder="Enter new password (min 6 chars)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Confirm New Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 placeholder-neutral-400 outline-none focus:border-emerald-500 transition shadow-xs"
              placeholder="Confirm new password"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1.5 transition"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPass ? 'Hide passwords' : 'Show passwords'}</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 text-neutral-700 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs rounded-xl font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition disabled:opacity-50 shadow-xs"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────── TAB 18: ACCOUNT TAB ─────────────────── */

function AccountTab() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

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
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      <div>
        <h2 className="text-base font-bold text-neutral-900 mb-1">Account & Security</h2>
        <p className="text-xs text-neutral-500">Manage your profile credentials, authentication tokens, and preferences.</p>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Profile</h3>
          </div>
          {profile ? (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-md">
                {profile.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[14px] text-neutral-900 font-semibold">{profile.email}</p>
                <p className="text-[12px] text-neutral-500">{profile.name || 'Developer Workspace'}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Pro Plan</span>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-neutral-500">Local Developer Account active.</p>
          )}
        </div>

        <div className="border-t border-slate-200/80 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Security</h3>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-neutral-800 hover:bg-slate-100 transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-neutral-500" />
                <span className="font-medium">Change password</span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>
            <button
              type="button"
              onClick={() => toast.info('Two-Factor Authentication is managed by your organization identity provider (OAuth / SSO).')}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-neutral-800 hover:bg-slate-100 transition cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Two-factor authentication</span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200/80 pt-6 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <FileKey className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Credential Security & Storage</h3>
          </div>
          <p className="text-xs text-neutral-500">
            Per-installation token encryption and local certificate management.
          </p>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FileKey className="w-4 h-4 text-emerald-600" />
                <span className="text-neutral-900 font-semibold font-mono">credentials.json</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-semibold">
                AES-256-GCM Encrypted
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              OAuth access tokens and user profile state are encrypted with a per-machine key. Tokens are never stored in plaintext.
            </p>
            <div className="divide-y divide-slate-200 text-[11px] font-mono text-neutral-700">
              <div className="py-2 flex justify-between">
                <span>oauth:zai:access_token</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Encrypted</span>
              </div>
              <div className="py-2 flex justify-between">
                <span>oauth:zai:user_info</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Encrypted</span>
              </div>
              <div className="py-2 flex justify-between">
                <span>oauth:active_provider</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> Encrypted</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-neutral-900">Certificate Interception Store</div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Local Desktop CA certificates stored in <code className="text-neutral-800 font-mono bg-slate-200/60 px-1 py-0.5 rounded">certs/</code> for inspection and secure TLS routing.
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
    // WEB-027: the Electron `openOAuthPopup` bridge is gone (no packages/desktop
    // in this repo), so OAuth is always a standard full-page redirect.
    window.location.href = url;
  };

  const handleDisconnectGithub = async () => {
    try {
      await api.post('/api/v1/github/disconnect');
      setGithubStatus({ connected: false });
      toast.success('Disconnected from GitHub');
    } catch (e) {
      toast.error('Failed to disconnect GitHub');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-base font-bold text-neutral-900 mb-1">Connections</h2>
        <p className="text-xs text-neutral-500">Manage your third-party integrations and source control providers.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-neutral-900 shadow-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-neutral-900 flex items-center gap-2">
                <span>GitHub</span>
                {githubStatus.connected && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Connected
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {githubStatus.connected ? 'Connected to GitHub repositories' : 'Not connected'}
              </p>
            </div>
          </div>
          {githubStatus.connected ? (
            <button
              type="button"
              onClick={handleDisconnectGithub}
              className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-red-50 text-emerald-700 hover:text-red-700 text-[13px] border border-emerald-200 hover:border-red-200 transition cursor-pointer flex items-center gap-1.5 font-medium shadow-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnectGithub}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-[13px] text-white transition border border-neutral-900 cursor-pointer flex items-center gap-1.5 font-medium shadow-xs"
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
  const normalizeTab = (t: string | null | undefined) => (t === 'keys' ? 'models' : t || 'general');
  const [activeTab, setActiveTab] = useState(normalizeTab(initialTab || searchParams?.get('tab')));
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
      setActiveTab(normalizeTab(initialTab));
    } else {
      const q = searchParams?.get('tab');
      if (q) setActiveTab(normalizeTab(q));
    }
  }, [initialTab, searchParams]);

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
        if (res.data?.settings) {
          setSettings(res.data.settings);
          if (res.data.settings.rewindCheckpointing !== undefined) {
            useSettingsStore.getState().updateAgentSetting('checkpointsEnabled', res.data.settings.rewindCheckpointing);
          }
          if (res.data.settings.conversationCompaction !== undefined) {
            useSettingsStore.getState().updateAgentSetting('conversationCompaction', res.data.settings.conversationCompaction);
          }
        }
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
        permissionMode: updated.permissionMode,
        autoApproveHighRisk: updated.autoApproveHighRisk,
        networkTimeout: updated.networkTimeout,
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
      reportError('Settings not saved', e);
    }
  };

  const activeSection = SIDEBAR_SECTIONS.find((s) => s.children.some((c) => c.id === activeTab));
  const activeLabel = activeSection?.children.find((c) => c.id === activeTab)?.label || 'Settings';

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-neutral-900 font-sans overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-xs">
        <div className="p-5 border-b border-slate-200">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition text-xs group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to workspace
            </button>
          ) : (
            <MotionLink
              href="/ai/chat"
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition text-xs group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              Back to workspace
            </MotionLink>
          )}
          <h1 className="text-base font-bold text-neutral-900 mt-3 tracking-tight">Settings</h1>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
          {SIDEBAR_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.id} className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  <SectionIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{section.label}</span>
                </div>
                <div className="space-y-0.5">
                  {section.children.map((child) => {
                    const isActive = activeTab === child.id;
                    const ItemIcon = child.icon;
                    return (
                      <motion.button
                        key={child.id}
                        type="button"
                        onClick={() => setActiveTab(child.id)}
                        initial={{ opacity: 0.99 }}
                        animate={{ opacity: 1 }}
                        style={{ opacity: 1 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/80 shadow-xs'
                            : 'text-neutral-600 hover:text-neutral-950 hover:bg-slate-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <ItemIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-neutral-400'}`} />
                          <span className="truncate">{child.label}</span>
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 text-center">
          <VersionChip fallback="mcode platform v2.4.6" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 px-3 py-1.5 rounded-xl text-neutral-500 hover:text-neutral-900 hover:bg-slate-200/60 transition z-50 flex items-center gap-1.5 text-xs border border-slate-200 bg-white shadow-xs"
            title="Close (Esc)"
          >
            <span className="text-[10px] font-mono text-neutral-400">Esc</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className={`mx-auto px-8 py-10 ${activeTab === 'models' ? 'max-w-5xl' : 'max-w-3xl'}`}>
          {activeTab !== 'models' && (
            <div className="mb-6 pb-4 border-b border-slate-200">
              <h1 className="text-xl font-bold text-neutral-900">{activeLabel}</h1>
              <p className="text-xs text-neutral-500 mt-1">{activeSection?.label}</p>
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
