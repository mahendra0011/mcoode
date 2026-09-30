"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Shield, Zap, Search, Settings, Cpu, Layers } from 'lucide-react';

interface CommandItem {
  cmd: string;
  category: 'autonomous' | 'workflow' | 'security' | 'models' | 'quality';
  desc: string;
  example?: string;
}

const ALL_COMMANDS: CommandItem[] = [
  // Autonomous & Swarms
  { cmd: 'mcode god "<task>"', category: 'autonomous', desc: 'Autonomous DAG planning: dispatches parallel subagent swarms with shared undo stack and safety cap.', example: 'mcode god "Migrate auth to Lucia with passkeys"' },
  { cmd: 'mcode watch', category: 'autonomous', desc: 'Background daemon watching filesystem: auto-lint, auto-fix, and test-trigger on file change.', example: 'mcode watch --daemon' },
  { cmd: 'mcode agents', category: 'autonomous', desc: 'Inspect, attach to, or terminate active background agent swarms and running tasks.', example: 'mcode agents --list' },
  { cmd: 'mcode run "<prompt>"', category: 'autonomous', desc: 'Execute one-off prompt tasks or pipe terminal output directly into AI context.', example: 'cat error.log | mcode run "Diagnose root cause"' },

  // Workflow & Scaffolding
  { cmd: 'mcode init', category: 'workflow', desc: 'Interactive project scaffolding (Next.js, Vite, Fastify, Express, Rust, Python).', example: 'mcode init my-app' },
  { cmd: 'mcode ship', category: 'workflow', desc: 'Production release pipeline: lint, verify test suite, git tag version, and trigger deploy hooks.', example: 'mcode ship --patch' },
  { cmd: 'mcode gen <type>', category: 'workflow', desc: 'Synthesize boilerplate, unit tests, mock data, schema definitions, or documentation.', example: 'mcode gen test src/auth.ts' },
  { cmd: 'mcode migrate <target>', category: 'workflow', desc: 'Automate framework migrations and library upgrades across your entire repository.', example: 'mcode migrate next-15' },
  { cmd: 'mcode history', category: 'workflow', desc: 'Browse, inspect, and replay previous CLI sessions and turn transcripts.', example: 'mcode history --last 5' },
  { cmd: 'mcode onboarding', category: 'workflow', desc: 'Interactive guided setup wizard for keys, default model routing, and workspace preferences.', example: 'mcode onboarding' },

  // Security & Vault
  { cmd: 'mcode env add <KEY>', category: 'security', desc: 'Store secrets in local AES-256-GCM encrypted vault with OS keyring integration.', example: 'mcode env add STRIPE_SECRET' },
  { cmd: 'mcode api-key set <provider>', category: 'security', desc: 'Safely configure API keys for Anthropic, OpenAI, OpenRouter, Gemini, or Groq.', example: 'mcode api-key set anthropic' },
  { cmd: 'mcode security-check', category: 'security', desc: 'Audit repository for exposed secrets, API keys, risky dependencies, and CVEs.', example: 'mcode security-check --strict' },
  { cmd: 'mcode audit', category: 'security', desc: 'Inspect historical agent tool execution logs, file writes, and shell invocations.', example: 'mcode audit --since 24h' },

  // Models & Extensibility
  { cmd: 'mcode model set <provider>', category: 'models', desc: 'Pin preferred LLM model and configure fallback cascade when rate-limited.', example: 'mcode model set claude-3-5-sonnet' },
  { cmd: 'mcode models', category: 'models', desc: 'List all available local (Ollama / LM Studio) and cloud model providers.', example: 'mcode models --benchmark' },
  { cmd: 'mcode add <plugin>', category: 'models', desc: 'Install community plugins, MCP server bridges, or custom tool packages.', example: 'mcode add @mcode/git-flow' },
  { cmd: 'mcode uninstall <plugin>', category: 'models', desc: 'Cleanly remove installed plugins and deregister their custom tools.', example: 'mcode uninstall @mcode/git-flow' },
  { cmd: 'mcode connect <mcp-server>', category: 'models', desc: 'Establish connection to external Model Context Protocol (MCP) servers via stdio / SSE.', example: 'mcode connect figma-mcp' },
  { cmd: 'mcode config [get|set]', category: 'models', desc: 'Manage project-level (.mcode/config.json) and global CLI configuration values.', example: 'mcode config set telemetry false' },

  // Quality & Diagnostics
  { cmd: 'mcode test', category: 'quality', desc: 'Discover and execute project test suites with automated AI failure diagnostics and repair.', example: 'mcode test --heal' },
  { cmd: 'mcode review [branch]', category: 'quality', desc: 'Autonomous code review for uncommitted changes or branch diffs with security & style feedback.', example: 'mcode review origin/main' },
  { cmd: 'mcode explain <target>', category: 'quality', desc: 'Deep architectural walkthrough of complex files, AST nodes, or algorithms.', example: 'mcode explain src/orchestrator.ts' },
  { cmd: 'mcode doctor', category: 'quality', desc: 'Comprehensive environment diagnostics (Node version, git state, API keys, model latency).', example: 'mcode doctor' },
  { cmd: 'mcode clean', category: 'quality', desc: 'Prune stale agent cache directories, kill orphan watch daemons, and free temp storage.', example: 'mcode clean --all' }
];

const CATEGORIES = [
  { id: 'all', label: 'All 25 Commands' },
  { id: 'autonomous', label: 'Autonomous & Swarms' },
  { id: 'workflow', label: 'Workflow & Scaffolding' },
  { id: 'security', label: 'Security & Vault' },
  { id: 'models', label: 'Models & MCP' },
  { id: 'quality', label: 'Testing & Diagnostics' },
];

export function CommandShowcase() {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = ALL_COMMANDS.filter((c) => {
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    const matchesSearch = c.cmd.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.desc.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section className="w-full px-6 py-20 bg-background border-t border-foreground/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Terminal className="w-3.5 h-3.5" /> Full CLI Surface
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
            All 25 Commands at Your Fingertips
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            Complete autonomous execution, secret encryption, watch daemons, and test auto-healing right from your terminal.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-foreground/5 border border-foreground/10 w-full sm:w-auto">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search commands…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-foreground/5 border border-foreground/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Grid of Commands */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <motion.div
              key={c.cmd}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-foreground/10 bg-frame p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all hover:shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black text-emerald-400 font-mono text-xs font-bold border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                    <Terminal className="w-3 h-3" />
                    <span>{c.cmd}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {c.category}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed mb-4">
                  {c.desc}
                </p>
              </div>

              {c.example && (
                <div className="pt-3 border-t border-foreground/5 font-mono text-[11px] text-muted-foreground truncate">
                  <span className="text-emerald-500/70">$ </span>
                  <span>{c.example}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
