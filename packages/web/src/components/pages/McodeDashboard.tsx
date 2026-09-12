"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Component, Settings, Cpu, GitBranch,
  Shield, Plug, Workflow, Puzzle, BarChart3,
  Terminal, Activity, Layers, ChevronRight, Home,
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
import { AgentInputBar } from "../chat/mcodeUX";

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.FC;
  section: string;
}

const TAB_ITEMS: TabItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, component: DashboardOverview, section: "Overview" },
  { id: "architecture", label: "Architecture", icon: Layers, component: McodeArchitectureTab, section: "Overview" },
  { id: "animations", label: "Animation Systems", icon: Activity, component: McodeAnimationsTab, section: "Development" },
  { id: "config", label: "Configuration", icon: Settings, component: McodeConfigTab, section: "Development" },
  { id: "dependencies", label: "Dependencies & Tools", icon: Puzzle, component: McodeDependenciesTab, section: "Development" },
  { id: "git-tools", label: "Git Tools", icon: GitBranch, component: McodeGitToolsTab, section: "Development" },
  { id: "hooks", label: "Hooks", icon: Cpu, component: McodeHooksTab, section: "Development" },
  { id: "mcp", label: "MCP Servers", icon: Shield, component: McodeMcpTab, section: "AI Integration" },
  { id: "plugins", label: "Plugins", icon: Plug, component: McodePluginsTab, section: "AI Integration" },
  { id: "skills", label: "Skills", icon: Workflow, component: McodeSkillsTab, section: "AI Integration" },
  { id: "settings", label: "Settings Reference", icon: Settings, component: McodeSettingsTab, section: "AI Integration" },
  { id: "startup", label: "Startup", icon: Activity, component: McodeStartupTab, section: "App" },
  { id: "tests", label: "Tests", icon: BarChart3, component: McodeTestsTab, section: "App" },
  { id: "turn-machine", label: "Turn Machine", icon: Terminal, component: McodeTurnMachineTab, section: "App" },
];

function DashboardOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Mcode UI Management Dashboard</h2>
        <p className="text-sm text-white/40">
          Internal documentation and reference for all mcode UX patterns, animation systems, and CLI integrations.
          Use the sidebar to navigate between sections.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TAB_ITEMS.filter(t => t.id !== "dashboard").map((tab) => (
          <div
            key={tab.id}
            className="bg-[#151515] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <tab.icon className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-white">{tab.label}</span>
            </div>
            <p className="text-[11px] text-white/40">{tab.section}</p>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-white/5">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Agent Input Bar Preview</h3>
        <div className="max-w-2xl">
          <AgentInputBar model="Claude 3" onSend={(value) => console.log("Send:", value)} />
        </div>
      </div>
    </div>
  );
}

export function McodeDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const activeItem = TAB_ITEMS.find((t) => t.id === activeTab) ?? TAB_ITEMS[0];
  const ActiveComponent = activeItem.component;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-[#f4f4f5] font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-white/5 bg-[#0c0c0c] flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-white">
            <img src="/logo.png" alt="Mcode" className="w-5 h-5 rounded object-contain drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            Mcode Dashboard
          </div>
        </div>

        <nav className="flex-1 py-2">
          {Array.from(new Set(TAB_ITEMS.map((t) => t.section))).map((section) => (
            <div key={section} className="mb-4">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                {section}
              </div>
              {TAB_ITEMS.filter((t) => t.section === section).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-1.5 text-left transition-colors ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-300 border-r-2 border-emerald-500"
                        : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                    }`}
                    whileHover={{ x: isActive ? 0 : 2 }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : ""}`} />
                    <span className="text-sm">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <a
            href="/ai/chat"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <Home className="w-4 h-4" />
            Back to Chat
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="border-b border-white/5 px-6 py-3 flex items-center gap-2 text-xs text-white/40">
          <LayoutDashboard className="w-3 h-3" />
          <span>Mcode Dashboard</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/60">{activeItem.label}</span>
        </div>
        <div className="p-6">
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
