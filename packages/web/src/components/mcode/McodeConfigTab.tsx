import React from 'react';
import { motion } from 'framer-motion';
import { Database, Shield, Key, Settings, Layers, FileText, ChevronDown, Server, Cloud, ToggleLeft, Zap, Activity, Terminal, Wifi } from 'lucide-react';

/**
 * mcodeConfigTab — Section 2 (Configuration System).
 *
 * Shows v2 config files structure, model providers from config.json,
 * the 33 setting.json keys, CLI config schema with merge order, and
 * encrypted credential storage.
 */
export function McodeConfigTab() {
  const [openSection, setOpenSection] = useState('config-files');
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Configuration System</h2>
        <p className="text-sm text-white/40">v2 config files, setting.json keys, CLI config schema, and merge order</p>
      </div>

      {/* Config Files Structure */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">V2 Config Files (~/.mcode/v2/)</h3>
        <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-xs">
          <FileText className="w-4 h-4 text-blue-400" />
          <div>
            <code className="text-white/70">config.json</code>
            <span className="text-white/40 ml-2">— Model provider configurations (8 providers)</span>
          </div>
          <FileText className="w-4 h-4 text-purple-400" />
          <div>
            <code className="text-white/70">setting.json</code>
            <span className="text-white/40 ml-2">— User settings/preferences (33 keys)</span>
          </div>
          <Key className="w-4 h-4 text-amber-400" />
          <div>
            <code className="text-white/70">credentials.json</code>
            <span className="text-white/40 ml-2">— Encrypted OAuth credentials</span>
          </div>
          <Database className="w-4 h-4 text-emerald-400" />
          <div>
            <code className="text-white/70">tasks-index.sqlite</code>
            <span className="text-white/40 ml-2">— SQLite task database</span>
          </div>
          <Shield className="w-4 h-4 text-red-400" />
          <div>
            <code className="text-white/70">certs/</code>
            <span className="text-white/40 ml-2">— CA key/cert for TLS interception</span>
          </div>
          <Terminal className="w-4 h-4 text-white/40" />
          <div>
            <code className="text-white/70">crash/</code>
            <span className="text-white/40 ml-2">— Crash dumps (live + archive)</span>
          </div>
          <Activity className="w-4 h-4 text-white/40" />
          <div>
            <code className="text-white/70">logs/</code>
            <span className="text-white/40 ml-2">— Daily log files</span>
          </div>
        </div>
      </motion.div>

      {/* Model Providers Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">config.json — Model Providers</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/60 font-medium">Provider ID</th>
                <th className="text-left py-2 text-white/60 font-medium">Kind</th>
                <th className="text-left py-2 text-white/60 font-medium">Enabled</th>
                <th className="text-left py-2 text-white/60 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr><td className="py-1.5 text-white/80 font-mono">builtin:bigmodel-coding-plan</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-yellow-400">No</span></td><td className="py-1.5 text-white/50">oauth_provider_inactive</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">builtin:bigmodel-start-plan</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-yellow-400">No</span></td><td className="py-1.5 text-white/50">oauth_provider_inactive</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">builtin:zai-coding-plan</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-yellow-400">No</span></td><td className="py-1.5 text-white/50">coding_plan_not_entitled (API key present)</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">builtin:zai-start-plan</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-yellow-400">No</span></td><td className="py-1.5 text-white/50">coding_plan_not_entitled (JWT present)</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">builtin:bigmodel</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-yellow-400">No</span></td><td className="py-1.5 text-white/50">oauth_provider_inactive</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">builtin:zai</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-green-400">Yes</span></td><td className="py-1.5 text-white/50">Active, no API key</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">73b59c4c-...</td><td className="py-1.5">anthropic</td><td className="py-1.5"><span className="text-green-400">Yes</span></td><td className="py-1.5 text-white/50">Active (poolside/laguna-s-2.1)</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">8378c166-...</td><td className="py-1.5">openai-compatible</td><td className="py-1.5"><span className="text-green-400">Yes</span></td><td className="py-1.5 text-white/50">No models configured</td></tr>
              <tr><td className="py-1.5 text-white/80 font-mono">8655f5b1-...</td><td className="py-1.5">openai-compatible</td><td className="py-1.5"><span className="text-green-400">Yes</span></td><td className="py-1.5 text-white/50">Uses deepseek-v4-flash-free</td></tr>
            </tbody>
          </table>
          <p className="text-xs text-white/40 mt-2">Active provider: <code className="text-white/70">73b59c4c-eeda...</code> ("Poolside") with model <code className="text-white/70">poolside/laguna-s-2.1</code></p>
        </div>
      </motion.div>

      {/* setting.json Keys */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">setting.json — 33 Keys</h3>
        <div className="bg-[#0a0a0a] border border-white/5 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <code className="text-white/70">
{`{
  "locale": "en-US",
  "terminalInheritSystemProfile": true,
  "taskAutoArchiveEnabled": false,
  "closeToTrayOnWindows": true,
  "mcodeInteractionBehavior": "queue",
  "askUserQuestionAutoResolutionEnabled": true,
  "enabledBuiltinAgentCliProviders": ["glm"],
  "repoSnapshotIndexingEnabled": false,
  "instantGrepIndexingEnabled": false,
  "nativeSearchEnhancementsEnabled": true,
  "memoryEnabled": false,
  /* ... 23 additional keys ... */
}`}
          </code>
        </div>
      </motion.div>

      {/* CLI Config Schema */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">CLI Config Schema (Defaults)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <ConfigRow key_name="permission.mode" default_val="build" desc="plan | build | edit | yolo" />
          <ConfigRow key_name="permission.autoApproveHighRisk" default_val="false" desc="Auto-approve high-risk tools" />
          <ConfigRow key_name="storage.dir" default_val="~/.mcode" desc="Persistent storage directory" />
          <ConfigRow key_name="storage.sessionDbPath" default_val="~/.mcode/cli/db/db.sqlite" desc="Session database path" />
          <ConfigRow key_name="network.timeout" default_val="180000" desc="3-minute timeout" />
          <ConfigRow key_name="features.compact" default_val="true" desc="Conversation compaction" />
          <ConfigRow key_name="features.rewind" default_val="true" desc="Workspace checkpoints" />
          <ConfigRow key_name="features.subagent" default_val="true" desc="Subagent spawning" />
          <ConfigRow key_name="features.memory" default_val="true" desc="Project memory system" />
          <ConfigRow key_name="features.skill" default_val="true" desc="Skills loading" />
          <ConfigRow key_name="features.mcp" default_val="true" desc="MCP server support" />
          <ConfigRow key_name="hooks.enabled" default_val="false" desc="Hooks disabled by default" />
          <ConfigRow key_name="hooks.timeoutMs" default_val="60000" desc="60s hook timeout" />
          <ConfigRow key_name="hooks.maxOutputBytes" default_val="32768" desc="32KB max hook output" />
          <ConfigRow key_name="logging.level" default_val="info" desc="Log level" />
          <ConfigRow key_name="logging.format" default_val="text" desc="Log format" />
          <ConfigRow key_name="toolConcurrency.maxConcurrency" default_val="10" desc="Max concurrent tool calls" />
          <ConfigRow key_name="ui.locale" default_val="en-US" desc="Default locale" />
          <ConfigRow key_name="ui.theme" default_val="auto" desc="Default theme" />
        </div>
      </motion.div>

      {/* Config Merge Order */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-[#151515] border border-white/5 rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-4">Config Merge Order (Scope Priority)</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <ScopeBadge label="System" priority={0} color="bg-gray-500/20 text-gray-400 border-gray-500/30" />
          <ChevronDown className="w-3 h-3 text-white/30" />
          <ScopeBadge label="User" priority={10} color="bg-blue-500/20 text-blue-400 border-blue-500/30" />
          <ChevronDown className="w-3 h-3 text-white/30" />
          <ScopeBadge label="Project" priority={20} color="bg-emerald-500/20 text-emerald-400 border-emerald-500/30" />
          <ChevronDown className="w-3 h-3 text-white/30" />
          <ScopeBadge label="Session" priority={30} color="bg-purple-500/20 text-purple-400 border-purple-500/30" />
          <ChevronDown className="w-3 h-3 text-white/30" />
          <ScopeBadge label="Env" priority={40} color="bg-amber-500/20 text-amber-400 border-amber-500/30" />
          <ChevronDown className="w-3 h-3 text-white/30" />
          <ScopeBadge label="Cli" priority={50} color="bg-red-500/20 text-red-400 border-red-500/30" badge="Highest" />
        </div>
        <p className="text-xs text-white/30 mt-3">Higher priority overrides lower: Env vars {'>'} CLI flags {'>'} Session {'>'} Project {'>'} User {'>'} System.</p>
      </motion.div>
    </div>
  );
}

function ConfigRow({ key_name, default_val, desc }: { key_name: string; default_val: string; desc: string }) {
  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <code className="text-xs text-blue-400 font-mono">{key_name}</code>
        <span className="text-xs text-white/30 font-mono">= "{default_val}"</span>
      </div>
      <p className="text-[10px] text-white/40 mt-1">{desc}</p>
    </div>
  );
}

function ScopeBadge({ label, priority, color, badge }: { label: string; priority: number; color: string; badge?: string }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${color}`}>
      {label} <span className="text-white/30">· {priority}</span>
      {badge && <span className="ml-1 text-xs font-bold">⚉</span>}
    </div>
  );
}

// Need useState import
import { useState } from 'react';
