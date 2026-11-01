"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Component, Settings, Cpu, GitBranch,
  Shield, Plug, Workflow, Puzzle, BarChart3,
  Terminal, Activity, Layers, ChevronRight, Home, Info, Download,
} from "lucide-react";
import { McodeAnimationsTab } from "../mcode/McodeAnimationsTab";
import { McodeArchitectureTab } from "../mcode/McodeArchitectureTab";
import { McodeConfigTab } from "../mcode/McodeConfigTab";
import { McodeDependenciesTab } from "../mcode/McodeDependenciesTab";
import { McodeGitToolsTab } from "../mcode/McodeGitToolsTab";
import { McodeHooksTab } from "../mcode/McodeHooksTab";
import { McodeMcpTab } from "../mcode/McodeMcpTab";
import { McodePluginsTab } from "../mcode/McodePluginsTab";
import { McodeSettingsTab } from "../mcode/McodeSettingsTab";
import { McodeSkillsTab } from "../mcode/McodeSkillsTab";
import { McodeStartupTab } from "../mcode/McodeStartupTab";
import { McodeTestsTab } from "../mcode/McodeTestsTab";
import { McodeTurnMachineTab } from "../mcode/McodeTurnMachineTab";

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.FC;
  section: string;
  /**
   * WEB-028: the file on disk that actually governs this section. The tabs are
   * read-only reference, so naming the source of truth is what stops them from
   * reading as live configuration. `null` = the tab is pure UI documentation with
   * no on-disk counterpart.
   */
  configPath: string | null;
}

/**
 * Every tab's backing config path, verified against the CLI source:
 *   - `~/.mcode/config.json`  — `CONFIG_PATH` in `packages/cli/src/core/store.js`
 *   - `<project>/.mcode/hooks.js` — `packages/cli/src/core/hooks.js` (`loadHooks`)
 *   - `~/.mcode/cache/registry.json` — `plugin-registry.js` (installed plugins)
 *
 * Skills and MCP have **no implementation in this repository's CLI** (0 matches
 * across all 104 CLI source files), so those two tabs are pure product
 * reference and say so explicitly rather than implying a working feature.
 */
const TAB_ITEMS: TabItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: DashboardOverview, section: "Overview", configPath: null },
  { id: "architecture", label: "Architecture", icon: Layers, component: McodeArchitectureTab, section: "Overview", configPath: "~/.mcode/ (CLI storage layout)" },
  { id: "animations", label: "Animation Systems", icon: Activity, component: McodeAnimationsTab, section: "Development", configPath: "packages/web/src/styles/index.css" },
  { id: "config", label: "Configuration", icon: Settings, component: McodeConfigTab, section: "Development", configPath: "~/.mcode/config.json" },
  { id: "dependencies", label: "Dependencies & Tools", icon: Puzzle, component: McodeDependenciesTab, section: "Development", configPath: "package.json" },
  { id: "git-tools", label: "Git Tools", icon: GitBranch, component: McodeGitToolsTab, section: "Development", configPath: "mcode git commands (CLI)" },
  { id: "hooks", label: "Hooks", icon: Cpu, component: McodeHooksTab, section: "Development", configPath: "<project>/.mcode/hooks.js" },
  { id: "mcp", label: "MCP Servers", icon: Shield, component: McodeMcpTab, section: "AI Integration", configPath: null },
  { id: "plugins", label: "Plugins", icon: Plug, component: McodePluginsTab, section: "AI Integration", configPath: "~/.mcode/cache/registry.json" },
  { id: "skills", label: "Skills", icon: Workflow, component: McodeSkillsTab, section: "AI Integration", configPath: null },
  { id: "settings", label: "Settings Reference", icon: Settings, component: McodeSettingsTab, section: "AI Integration", configPath: "~/.mcode/config.json" },
  { id: "startup", label: "Startup", icon: Activity, component: McodeStartupTab, section: "App", configPath: "packages/web/src/components/mcode/McodeStartupOverlay.tsx" },
  { id: "tests", label: "Tests", icon: BarChart3, component: McodeTestsTab, section: "App", configPath: "mcode test commands (CLI)" },
  { id: "turn-machine", label: "Turn Machine", icon: Terminal, component: McodeTurnMachineTab, section: "App", configPath: null },
];

/**
 * WEB-028: the `/mcode` tabs present hard-coded CLI reference material with the
 * same card styling as the real settings screens, and nothing told the user they
 * were not live configuration. A user opening "Hooks" reasonably concluded their
 * workspace had those hooks configured. This banner is rendered above *every*
 * tab (see `McodeDashboard`) and names the file that actually governs the
 * section, so the page can no longer be mistaken for state.
 */
function ReferenceBanner({ path }: { path: string | null }) {
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-xs"
    >
      <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="text-[12px] leading-relaxed min-w-0">
        <p className="text-amber-900 font-bold">
          Read-only CLI reference — this page does not read or change your configuration.
        </p>
        <p className="text-neutral-600 mt-1">
          Edit it in <code className="text-neutral-900 font-mono bg-amber-100/70 px-1 py-0.5 rounded">~/.mcode/config.json</code> (or run{' '}
          <code className="text-neutral-900 font-mono bg-amber-100/70 px-1 py-0.5 rounded">mcode config</code>), then restart the CLI.
        </p>
        {path ? (
          <p className="text-neutral-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <Terminal className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
            <span>Governed by:</span>
            <code className="text-neutral-700 font-mono font-semibold">{path}</code>
          </p>
        ) : (
          <p className="text-neutral-500 mt-1">
            No on-disk configuration backs this section — it documents product behaviour, not
            machine state.
          </p>
        )}
      </div>
    </div>
  );
}

function DashboardOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-neutral-900 mb-1">Mcode UI Management Dashboard</h2>
        <p className="text-sm text-neutral-500">
          Internal documentation and reference for all mcode UX patterns, animation systems, and CLI integrations.
          Use the sidebar to navigate between sections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TAB_ITEMS.filter(t => t.id !== "dashboard").map((tab) => (
          <div
            key={tab.id}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-slate-300 hover:shadow-xs transition-all shadow-xs"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shadow-xs">
                <tab.icon className="w-4 h-4 text-emerald-700" />
              </div>
              <span className="text-sm font-bold text-neutral-900">{tab.label}</span>
            </div>
            <p className="text-xs text-neutral-500">{tab.section}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function McodeDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const activeItem = TAB_ITEMS.find((t) => t.id === activeTab) ?? TAB_ITEMS[0];
  const ActiveComponent = activeItem.component;

  return (
    <div className="flex h-screen bg-slate-50 text-neutral-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto shadow-xs">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5 text-sm font-bold text-neutral-900">
            <div className="relative group flex items-center justify-center flex-shrink-0">
              <div className="relative w-7 h-7 rounded-lg overflow-hidden bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/logo.png" alt="Mcode" className="w-full h-full object-cover rounded" />
              </div>
            </div>
            Mcode Dashboard
          </div>
        </div>

        <nav className="flex-1 py-3">
          {Array.from(new Set(TAB_ITEMS.map((t) => t.section))).map((section) => (
            <div key={section} className="mb-4">
              <div className="px-4 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                {section}
              </div>
              {TAB_ITEMS.filter((t) => t.section === section).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 font-semibold border-r-2 border-emerald-600"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-slate-50"
                    }`}
                    whileHover={{ x: isActive ? 0 : 2 }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-700" : "text-neutral-500"}`} />
                    <span className="text-sm">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-1.5 bg-slate-50/50">
          {/* Desktop installer is published to /downloads/mcode-setup.exe by
              scripts/publish-ide.js (stable path across versions). */}
          <a
            href="/downloads/mcode-setup.exe"
            download
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            Download App
          </a>
          <a
            href="/ai/chat"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-600 hover:text-neutral-900 hover:bg-slate-100 transition font-medium"
          >
            <Home className="w-4 h-4" />
            Back to Chat
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between text-xs text-neutral-500 shadow-xs">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5 text-neutral-400" />
            <span>Mcode Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-neutral-900 font-semibold">{activeItem.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/downloads/mcode-setup.exe"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Desktop App (.exe)</span>
            </a>
            <a
              href="/"
              className="hover:text-neutral-900 transition flex items-center gap-1 font-medium"
            >
              <Home className="w-3.5 h-3.5" /> Home
            </a>
          </div>
        </div>
        <div className="p-6">
          {/* WEB-028: every /mcode tab is read-only reference — say so on each one. */}
          {activeItem.id !== "dashboard" && <ReferenceBanner path={activeItem.configPath} />}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <ActiveComponent />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default McodeDashboard;
