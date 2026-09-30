"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Wrench, Plug, Workflow, Terminal, Globe, Lock, CheckCircle2, ChevronRight, Layers, FileCode } from 'lucide-react';
import Link from 'next/link';

const CAPABILITIES = [
  {
    title: '46+ Built-in Agent Tools',
    category: 'Core Tooling',
    icon: Wrench,
    desc: 'Autonomous subagents can inspect files, write atomic multi-chunks, grep AST tokens, run shell commands, and execute sandbox tests.',
    items: ['read_file & write_file', 'grep_search & ripgrep AST', 'run_command (with background daemon)', 'browser_subagent web automation', 'git_diff, stage, commit & branch']
  },
  {
    title: 'Model Context Protocol (MCP)',
    category: 'Open Interoperability',
    icon: Shield,
    desc: 'Native client support for Anthropic Model Context Protocol. Connect external databases, GitHub APIs, Figma models, or internal servers.',
    items: ['3 Built-in MCP Servers (Stitch, Filesystem, Memory)', 'Dynamic Lazy-load MCP tool schemas', 'Side-effect scoping & high-risk gate', 'JSON-RPC over stdio / SSE transport', 'Custom server registration via config']
  },
  {
    title: 'Plugins & Extension System',
    category: 'Modular Extensibility',
    icon: Plug,
    desc: 'Install community plugins or package repository-specific workflows. Plugins expose custom tools, prompt directives, and agent roles.',
    items: ['7 Curated Built-in Plugins', 'mcode add <plugin> instant install', 'Lifecycle hooks (pre/post command execution)', 'Isolated sandbox execution', 'Local registry caching (~/.mcode/cache)']
  },
  {
    title: 'Curated Workflow Skills',
    category: 'Agent Knowledge',
    icon: Workflow,
    desc: 'Domain-specific SKILL.md playbooks loaded on-demand. Agents read instructions and execute complex multi-step protocols with 0 hallucination.',
    items: ['15 Curated Production Skills', 'Custom workspace skill discovery (.agents/skills)', 'Full Markdown instructions with frontmatter', 'Script helpers & reference guides', 'Automatic context activation']
  }
];

export function McpAndToolsShowcase() {
  return (
    <section className="w-full px-6 py-24 bg-background border-t border-foreground/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Layers className="w-3.5 h-3.5" /> Extensibility & Security
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            MCP, Tools, Plugins & Skills
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            mcode is not just another LLM wrapper. It is a full agentic operating system with standard protocol interfaces and high-risk safety gates.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {CAPABILITIES.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-foreground/10 bg-frame p-8 hover:border-foreground/20 transition-all shadow-md"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                      {cap.category}
                    </span>
                    <h3 className="text-xl font-bold text-foreground">
                      {cap.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {cap.desc}
                </p>

                <div className="space-y-2.5 border-t border-foreground/5 pt-4">
                  {cap.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-foreground/80 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Security & Vault Callout Bar */}
        <div className="mt-8 rounded-2xl border border-foreground/10 bg-frame/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Zero-Trust AES-256-GCM Vault</h4>
              <p className="text-xs text-muted-foreground">All provider keys and secret tokens are encrypted in your local machine keyring.</p>
            </div>
          </div>
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-semibold border border-foreground/10 transition-colors whitespace-nowrap"
          >
            <span>View All 46+ Tools</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
