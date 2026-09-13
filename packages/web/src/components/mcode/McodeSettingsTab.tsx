import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, ToggleLeft, ToggleRight, Sliders, Globe,
  Shield, Clock, Database, Terminal, Save, RefreshCw,
  Info, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { toast } from 'sonner';

/**
 * mcodeSettingsTab — Reference for all mcode setting.json keys
 * and CLI config schema defaults, organized in an editable card layout.
 *
 * Mirrors the `setting.json` (33 keys) and CLI `config` default schema
 * from the mcode Knowledge Base, Section 2.
 */
export function McodeSettingsTab() {
  const system = useSettingsStore((s) => s.system);
  const updateSystem = useSettingsStore((s) => s.updateSystemSetting);
  const agent = useSettingsStore((s) => s.agent);
  const updateAgent = useSettingsStore((s) => s.updateAgentSetting);
  const data = useSettingsStore((s) => s.data);
  const updateData = useSettingsStore((s) => s.updateDataSetting);

  const [cliProviders, setCliProviders] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mcode_cli_providers') || 'glm,anthropic,openai';
    }
    return 'glm,anthropic,openai';
  });

  const handleCliProvidersChange = (val: string) => {
    setCliProviders(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mcode_cli_providers', val);
    }
    toast.success('Updated CLI providers');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">mcode Settings</h2>
        <p className="text-sm text-white/40">Live interactive preferences synchronized with ZCode & Mcode unified configuration.</p>
      </div>

      {/* Setting.json Keys */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">setting.json — User Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SettingToggle
            name="closeToTrayOnWindows"
            checked={system.closeToTrayOnWindows}
            onChange={(v) => {
              updateSystem('closeToTrayOnWindows', v);
              toast.info(`closeToTrayOnWindows: ${v}`);
            }}
            desc="Keep app in system tray on Windows"
          />
          <SettingToggle
            name="taskAutoArchiveEnabled"
            checked={agent.autoArchive}
            onChange={(v) => {
              updateAgent('autoArchive', v);
              toast.info(`taskAutoArchiveEnabled: ${v}`);
            }}
            desc="Auto-archive completed tasks"
          />
          <SettingToggle
            name="terminalInheritSystemProfile"
            checked={system.terminalInheritProfile}
            onChange={(v) => {
              updateSystem('terminalInheritProfile', v);
              toast.info(`terminalInheritSystemProfile: ${v}`);
            }}
            desc="Terminal inherits system profile"
          />
          <SettingToggle
            name="askUserQuestionAutoResolutionEnabled"
            checked={agent.askUserQuestionAutoResolution}
            onChange={(v) => {
              updateAgent('askUserQuestionAutoResolution', v);
              toast.info(`askUserQuestionAutoResolutionEnabled: ${v}`);
            }}
            desc="Auto-resolve user question prompts"
          />
          <SettingToggle
            name="repoSnapshotIndexingEnabled"
            checked={data.repoSnapshotIndexing}
            onChange={(v) => {
              updateData('repoSnapshotIndexing', v);
              toast.info(`repoSnapshotIndexingEnabled: ${v}`);
            }}
            desc="Snapshot full repo for indexing"
          />
          <SettingToggle
            name="instantGrepIndexingEnabled"
            checked={data.instantGrepIndexing}
            onChange={(v) => {
              updateData('instantGrepIndexing', v);
              toast.info(`instantGrepIndexingEnabled: ${v}`);
            }}
            desc="Instant grep file indexing"
          />
          <SettingToggle
            name="nativeSearchEnhancementsEnabled"
            checked={data.nativeSearchEnhancements}
            onChange={(v) => {
              updateData('nativeSearchEnhancements', v);
              toast.info(`nativeSearchEnhancementsEnabled: ${v}`);
            }}
            desc="Native search enhancements"
          />
          <SettingToggle
            name="memoryEnabled"
            checked={agent.workspaceMemory}
            onChange={(v) => {
              updateAgent('workspaceMemory', v);
              toast.info(`memoryEnabled: ${v}`);
            }}
            desc="Project memory system"
          />
        </div>

        <div className="mt-4 space-y-3">
          <SettingSelect
            name="locale"
            value={system.locale}
            onChange={(v) => {
              updateSystem('locale', v);
              toast.success(`UI locale set to ${v}`);
            }}
            options={['en-US', 'en-GB', 'ja', 'ko', 'zh-CN', 'zh-TW']}
            desc="UI locale"
          />
          <SettingSelect
            name="mcodeInteractionBehavior"
            value={agent.interactionBehavior.toLowerCase()}
            onChange={(v) => {
              const formatted = (v.charAt(0).toUpperCase() + v.slice(1)) as any;
              updateAgent('interactionBehavior', formatted);
              toast.success(`Interaction behavior: ${formatted}`);
            }}
            options={['queue', 'inline', 'modal']}
            desc="User interaction behavior mode"
          />
          <SettingInput
            name="enabledBuiltinAgentCliProviders"
            value={cliProviders}
            onChange={handleCliProvidersChange}
            desc="Enabled built-in agent CLI providers (comma-separated)"
          />
        </div>
      </motion.div>

      {/* CLI Config Schema */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">CLI Config Schema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <ConfigCard group="permission" items={[
            { key: 'mode', default: '"build"', desc: 'plan | build | edit | yolo' },
            { key: 'autoApproveHighRisk', default: 'false', desc: 'Auto-approve high-risk tools' },
          ]} />
          <ConfigCard group="storage" items={[
            { key: 'dir', default: '"~/.mcode"', desc: 'Persistent storage directory' },
            { key: 'sessionDbPath', default: '"~/.mcode/cli/db/db.sqlite"', desc: 'Session database path' },
          ]} />
          <ConfigCard group="network" items={[
            { key: 'timeout', default: '180000', desc: '3-minute timeout (ms)' },
          ]} />
          <ConfigCard group="features" items={[
            { key: 'compact', default: 'true', desc: 'Conversation compaction' },
            { key: 'rewind', default: 'true', desc: 'Workspace checkpoints' },
            { key: 'subagent', default: 'true', desc: 'Subagent spawning' },
            { key: 'memory', default: 'true', desc: 'Project memory system' },
            { key: 'skill', default: 'true', desc: 'Skills loading' },
            { key: 'mcp', default: 'true', desc: 'MCP server support' },
          ]} />
          <ConfigCard group="hooks" items={[
            { key: 'enabled', default: 'false', desc: 'Hooks disabled by default' },
            { key: 'timeoutMs', default: '60000', desc: '60s hook timeout' },
            { key: 'maxOutputBytes', default: '32768', desc: '32KB max hook output' },
          ]} />
          <ConfigCard group="logging" items={[
            { key: 'level', default: '"info"', desc: 'Log level' },
            { key: 'format', default: '"text"', desc: 'Log format' },
          ]} />
          <ConfigCard group="toolConcurrency" items={[
            { key: 'maxConcurrency', default: '10', desc: 'Max concurrent tool calls' },
          ]} />
          <ConfigCard group="ui" items={[
            { key: 'locale', default: '"en-US"', desc: 'Default locale' },
            { key: 'theme', default: '"auto"', desc: 'auto | light | dark' },
          ]} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 bg-[#0a0a0a] border border-white/5 rounded-lg p-4"
        >
          <h4 className="text-xs font-semibold text-white/70 mb-2 uppercase tracking-wider">Config Merge Order (scope priority)</h4>
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <ScopeBadge label="System" priority={0} />
            <MergeArrow />
            <ScopeBadge label="User" priority={10} />
            <MergeArrow />
            <ScopeBadge label="Project" priority={20} />
            <MergeArrow />
            <ScopeBadge label="Session" priority={30} />
            <MergeArrow />
            <ScopeBadge label="Env" priority={40} />
            <MergeArrow />
            <ScopeBadge label="Cli" priority={50} badge="Highest" badgeColor="text-red-400" />
          </div>
        </motion.div>
      </motion.div>

      {/* Credential Security */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Credential Security</h3>
        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-green-400 mt-0.5" />
            <div>
              <span className="text-white/80 font-medium">credentials.json — Encrypted OAuth tokens</span>
              <p className="text-white/40 mt-0.5">AES-256-GCM encrypted with per-install key. Never stored in plaintext.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Database className="w-4 h-4 text-blue-400 mt-0.5" />
            <div>
              <span className="text-white/80 font-medium">certs/ — CA key/cert for TLS interception</span>
              <p className="text-white/40 mt-0.5">Desktop CA certificate for inspecting HTTPS traffic. Managed by the host process.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
            <div>
              <span className="text-white/80 font-medium">JWT_SECRET validation</span>
              <p className="text-white/40 mt-0.5">Weak secrets ({'<'} 32 chars) trigger warnings. Default dev secret triggers a startup warning.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SettingToggle({
  name,
  checked,
  onChange,
  desc,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  desc: string;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 hover:border-white/15 rounded-lg px-3 py-2.5 cursor-pointer group transition"
    >
      <div className="flex-1 min-w-0">
        <code className="text-xs text-white/70 group-hover:text-white font-mono transition">{name}</code>
        <p className="text-xs text-white/40 mt-0.5 truncate">{desc}</p>
      </div>
      <div
        className={`relative w-10 h-6 rounded-full flex-shrink-0 ml-3 transition-colors duration-200 ${
          checked ? 'bg-[#10b981]' : 'bg-[#374151]'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </div>
    </div>
  );
}

function SettingSelect({
  name,
  value,
  onChange,
  options,
  desc,
}: {
  name: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  desc: string;
}) {
  return (
    <div className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <code className="text-xs text-white/70 font-mono">{name}</code>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-3 px-2 py-1 bg-[#121212] border border-white/10 rounded-lg text-xs text-white/80 outline-none focus:border-emerald-500 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingInput({
  name,
  value,
  onChange,
  desc,
}: {
  name: string;
  value: string;
  onChange: (val: string) => void;
  desc: string;
}) {
  return (
    <div className="flex items-center justify-between bg-[#0e0e0e] border border-white/5 rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <code className="text-xs text-white/70 font-mono">{name}</code>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ml-3 px-2 py-1 bg-[#121212] border border-white/10 rounded-lg text-xs text-white/80 font-mono outline-none focus:border-emerald-500 w-48"
      />
    </div>
  );
}

function ConfigCard({ group, items }: {
  group: string;
  items: Array<{ key: string; default: string; desc: string }>;
}) {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Settings className="w-3 h-3 text-white/40" />
        <span className="text-xs font-medium text-white/70">{group}</span>
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.key}>
            <div className="flex items-center gap-2">
              <code className="text-xs text-white/50 font-mono">.{item.key}</code>
              <span className="text-xs text-white/60 font-mono">= {item.default}</span>
            </div>
            <p className="text-[10px] text-white/30 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScopeBadge({ label, priority, badge, badgeColor }: {
  label: string; priority: number; badge?: string; badgeColor?: string;
}) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-mono ${
      priority === 0 ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' :
      priority === 50 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
      'bg-white/5 text-white/50 border border-white/5'
    }`}>
      {label} ({priority})
      {badge && <span className={`ml-1 ${badgeColor || 'text-white/30'}`}>★</span>}
    </span>
  );
}

function MergeArrow() {
  return <ChevronRight2 className="w-3 h-3 text-white/20" />;
}

function ChevronRight2(props: any) {
  return <ChevronRight {...props} />;
}

import { ChevronRight } from 'lucide-react';
