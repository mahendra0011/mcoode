"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Terminal, Copy, Check, Sparkles, Shield, ArrowRight,
  GitBranch, RefreshCw, Zap, Search, ChevronRight, CheckCircle2,
  Code2, Cpu, Activity, Lock, Boxes, Globe, Monitor,
  ShieldAlert, FileText, CheckCircle, Laptop, Rocket
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

interface CLICommand {
  cmd: string;
  desc: string;
  category: 'build' | 'watch' | 'audit' | 'vault' | 'git';
  flags: string;
  example: string;
}

const COMMAND_WORKFLOWS: Record<string, { label: string; icon: any; commands: CLICommand[] }> = {
  build: {
    label: 'Build & Swarms',
    icon: Zap,
    commands: [
      {
        cmd: 'mcode god "<prompt>"',
        desc: 'Launch autonomous subagent swarm to formulate DAG task waves and generate full-stack code in one go.',
        category: 'build',
        flags: '--concurrency <N>, --budget <$>',
        example: 'mcode god "add stripe checkout and webhook handlers"'
      },
      {
        cmd: 'mcode plan "<task>"',
        desc: 'Generate dependency-sorted DAG execution plan without making any filesystem modifications.',
        category: 'build',
        flags: '--depth <level>, --model <name>',
        example: 'mcode plan "migrate authentication from REST to GraphQL"'
      },
      {
        cmd: 'mcode chat [query]',
        desc: 'Start interactive terminal pairing session with streaming tokens, inline diffs, and context tags.',
        category: 'build',
        flags: '-m <model>, --file <path>',
        example: 'mcode chat "why is my redis connection pool leaking memory?"'
      }
    ]
  },
  watch: {
    label: 'Watch & Heal',
    icon: Activity,
    commands: [
      {
        cmd: 'mcode watch',
        desc: 'Background daemon watching file saves, detecting syntax errors, and auto-healing broken test suites.',
        category: 'watch',
        flags: '--auto-fix, --runner <vitest|jest>',
        example: 'mcode watch --auto-fix'
      },
      {
        cmd: 'mcode review [ref]',
        desc: 'Analyze git diff or branch for logic bugs, security flaws, performance regressions, and style issues.',
        category: 'watch',
        flags: '--staged, --strict, --branch <name>',
        example: 'mcode review origin/main'
      }
    ]
  },
  audit: {
    label: 'Security & Audit',
    icon: ShieldAlert,
    commands: [
      {
        cmd: 'mcode audit',
        desc: 'Run comprehensive static and LLM security audits for OWASP vulnerabilities, secrets, and bloat.',
        category: 'audit',
        flags: '--scope <security|perf|quality|all>, --pdf',
        example: 'mcode audit --scope all --pdf'
      },
      {
        cmd: 'mcode clean',
        desc: 'Detect and safely eliminate dead code, unused dependencies, and orphaned assets across the repository.',
        category: 'audit',
        flags: '--dry-run, --interactive',
        example: 'mcode clean --dry-run'
      }
    ]
  },
  vault: {
    label: 'Vault & Secrets',
    icon: Lock,
    commands: [
      {
        cmd: 'mcode env add <KEY>',
        desc: 'Encrypt and store an API key into the hardware-backed AES-256-GCM master vault (zero plaintext in git).',
        category: 'vault',
        flags: '--global, --project',
        example: 'mcode env add ANTHROPIC_API_KEY sk-ant-...'
      },
      {
        cmd: 'mcode vault list',
        desc: 'List configured API keys, quotas, model assignments, and status without exposing raw secrets.',
        category: 'vault',
        flags: '--json, --status',
        example: 'mcode vault list'
      },
      {
        cmd: 'mcode mcp list',
        desc: 'Discover and inspect available Model Context Protocol servers and their exposed tool schemas.',
        category: 'vault',
        flags: '--schema, --json',
        example: 'mcode mcp list --schema'
      }
    ]
  },
  git: {
    label: 'Git & Rollback',
    icon: GitBranch,
    commands: [
      {
        cmd: 'mcode checkpoint',
        desc: 'Snapshot current working directory state into an encrypted local transactional checkpoint.',
        category: 'git',
        flags: '-m "message"',
        example: 'mcode checkpoint -m "pre-refactor"'
      },
      {
        cmd: 'mcode undo',
        desc: 'Cleanly revert the last transactional changes applied by an autonomous subagent or prompt.',
        category: 'git',
        flags: '--last, --all, --dry-run',
        example: 'mcode undo --last'
      },
      {
        cmd: 'mcode ship',
        desc: 'Run automated build, verify test suites, stage clean files, commit, and push branch to remote.',
        category: 'git',
        flags: '-m "commit message", --env <prod|staging>',
        example: 'mcode ship -m "feat: complete checkout integration"'
      }
    ]
  }
};

export function CLIPage() {
  const [activeInstallTab, setActiveInstallTab] = useState<'npm' | 'curl' | 'brew'>('npm');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<string>('build');

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-emerald-200/40 via-teal-100/35 to-indigo-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-emerald-800 text-xs font-bold uppercase tracking-wider mb-6">
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>Terminal-First AI Coding • v2.4.6</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Your Terminal, Supercharged by{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Autonomous AI
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            Ultra-fast, keyboard-driven, and scriptable. Run multi-model swarms, auto-fix failing test suites, and orchestrate 46+ developer tools without ever leaving your shell.
          </p>

          {/* Quick Install Bar */}
          <div className="max-w-xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-2 mb-3">
              {(['npm', 'curl', 'brew'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveInstallTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeInstallTab === tab
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:text-black'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-neutral-200 font-mono text-xs text-neutral-800 shadow-md">
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-emerald-600 font-bold">$</span>
                <span className="truncate">
                  {activeInstallTab === 'npm' && 'npm install -g mcode && mcode'}
                  {activeInstallTab === 'curl' && 'curl -fsSL https://mcode.dev/install.sh | bash'}
                  {activeInstallTab === 'brew' && 'brew install mcode-ai/tap/mcode'}
                </span>
              </div>
              <button
                onClick={() => {
                  const cmd =
                    activeInstallTab === 'npm'
                      ? 'npm install -g mcode && mcode'
                      : activeInstallTab === 'curl'
                      ? 'curl -fsSL https://mcode.dev/install.sh | bash'
                      : 'brew install mcode-ai/tap/mcode';
                  copy(cmd);
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy command"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ─────────────────── ACTUAL MCODE CLI TERMINAL SHOWCASE ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto rounded-3xl overflow-hidden border border-neutral-800 bg-[#090d12] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] text-left mb-24 relative p-3 sm:p-5 group"
          >
            {/* Terminal Window Top Bar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-[#111620] border border-white/5 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[12px] font-mono text-neutral-400 ml-2 hidden sm:inline">
                  mcode-cli — zsh (tmux session: swarm-01)
                </span>
                <span className="text-[12px] font-mono text-neutral-400 ml-2 sm:hidden">
                  mcode cli
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  meta-llama/llama-3.3-70b-instruct
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-neutral-300 border border-white/10 hidden md:inline">
                  God Mode
                </span>
              </div>
            </div>

            {/* The Actual Terminal Screenshot Image */}
            <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-white/10 shadow-2xl">
              <img
                src="/mcode-cli-terminal.png"
                alt="MCODE CLI Terminal Interface"
                className="w-full h-auto object-cover rounded-2xl transition duration-500 group-hover:scale-[1.008]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 sm:p-6 pointer-events-none">
                <span className="text-xs font-mono text-emerald-300 font-semibold bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/30 backdrop-blur-md">
                  mcode --god &quot;build a rest api for orders&quot;
                </span>
                <button
                  type="button"
                  onClick={() => copy('mcode --god "build a rest api for orders"')}
                  className="pointer-events-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-sans flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Run Command</span>
                </button>
              </div>
            </div>

            {/* Quick Copy Bottom Bar */}
            <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-[#0f151d] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-emerald-400 font-bold select-none">$</span>
                <span className="text-neutral-200">
                  npm install -g mcode &amp;&amp; mcode
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy('npm install -g mcode && mcode')}
                className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-sans text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-emerald-400" />
                <span>Copy</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────── 6 POWERFUL CORE CAPABILITY CARDS ─────────────────── */}
      <section className="py-24 bg-white border-t border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-4 tracking-tight">
              Six Core Architectural Superpowers
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              Built from the ground up for high-velocity engineers who prefer terminal efficiency over browser latency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Autonomous God Mode */}
            <div className="p-7 rounded-3xl bg-emerald-50/50 border border-emerald-300/80 shadow-sm hover:shadow-xl hover:border-emerald-400 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                    FLAGSHIP
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">1. Autonomous God Mode Swarms</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Formulates a Directed Acyclic Graph (DAG) of architectural task waves, dispatches parallel subagents, and generates full-stack code in one go.
                </p>
              </div>
              <ul className="text-xs text-neutral-700 space-y-2 font-mono pt-4 border-t border-emerald-200/70">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Parallel multi-agent waves</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Sub-task dependency planner</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Live terminal wave visualizer</span>
                </li>
              </ul>
            </div>

            {/* Card 2: Watch & Auto-Heal */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    DAEMON
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">2. Continuous Watch & Auto-Heal</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Background filesystem daemon monitors saves, detects broken imports or failing test suites, and automatically generates self-healing patches.
                </p>
              </div>
              <ul className="text-xs text-neutral-700 space-y-2 font-mono pt-4 border-t border-neutral-200/70">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Auto-runs vitest, jest, or pytest</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Instant broken import repair</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>0ms manual feedback overhead</span>
                </li>
              </ul>
            </div>

            {/* Card 3: Encrypted Vault */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Lock className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    AES-256
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">3. Hardware-Backed Vault</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Zero plaintext credentials in repository files or git history. All API keys and secrets are encrypted in an isolated PBKDF2/AES-GCM master vault.
                </p>
              </div>
              <ul className="text-xs text-neutral-700 space-y-2 font-mono pt-4 border-t border-neutral-200/70">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>OS Keychain & DPAPI backed</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>Zero git secrets leakage risk</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>Key quota & health analytics</span>
                </li>
              </ul>
            </div>

            {/* Card 4: Multi-Model Dynamic Router */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    40+ MODELS
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">4. Multi-Model Dynamic Router</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Switch instantly between 40+ frontier models (Claude 3.7, GPT-4o, DeepSeek R1, Llama 3.3) or run 100% locally offline with Ollama & LM Studio.
                </p>
              </div>
              <ul className="text-xs text-neutral-700 space-y-2 font-mono pt-4 border-t border-neutral-200/70">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Domain-aware model dispatching</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>100% offline local inference support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Auto-switch on rate-limit/credits</span>
                </li>
              </ul>
            </div>

            {/* Card 5: Atomic Git Checkpoints */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <GitBranch className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    ROLLBACK
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">5. Atomic Checkpoints & Undo</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Transactional undo journal created before subagent edits. Revert any accidental changes or bad code with a single zero-loss rollback command.
                </p>
              </div>
              <ul className="text-xs text-neutral-700 space-y-2 font-mono pt-4 border-t border-neutral-200/70">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                  <span>Single command rollback: mcode undo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                  <span>Pre-wave transactional snapshots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                  <span>Zero git working tree corruption</span>
                </li>
              </ul>
            </div>

            {/* Card 6: Model Context Protocol */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Boxes className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    MCP EXTENSIBLE
                  </span>
                </div>
                <h3 className="text-lg font-bold text-neutral-950 mb-2">6. Model Context Protocol (MCP)</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Connect any external stdio or SSE MCP server. Let agents query internal databases, inspect GitHub pull requests, or control headless browsers.
                </p>
              </div>
              <ul className="text-xs text-neutral-700 space-y-2 font-mono pt-4 border-t border-neutral-200/70">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>Industry-standard stdio & SSE transport</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>46+ built-in developer tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>Live tool discovery & introspection</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── CURATED COMMAND WORKFLOWS ─────────────────── */}
      <section className="py-24 bg-[#f8fafc] border-t border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
              Curated Developer Workflows
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              Explore essential commands categorized by production engineering workflows.
            </p>
          </div>

          {/* Workflow Tab Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {Object.entries(COMMAND_WORKFLOWS).map(([key, item]) => {
              const Icon = item.icon;
              const isActive = activeWorkflow === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveWorkflow(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-neutral-950 text-white shadow-md'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Workflow Command Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {COMMAND_WORKFLOWS[activeWorkflow].commands.map((cmd) => (
              <div
                key={cmd.cmd}
                className="p-6 rounded-2xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col justify-between text-left group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/80">
                      {cmd.cmd}
                    </span>
                    <button
                      onClick={() => copy(cmd.cmd)}
                      className="p-1 rounded-md hover:bg-neutral-100 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                      title="Copy command"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed mb-4">{cmd.desc}</p>
                  <p className="text-[11px] font-mono text-neutral-500 mb-4 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                    <span className="font-bold text-neutral-700">Flags:</span> {cmd.flags}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono">
                  <span className="truncate text-neutral-800 font-medium">$ {cmd.example}</span>
                  <button
                    onClick={() => copy(cmd.example)}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold ml-2 shrink-0 cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── WHY TERMINAL-FIRST ARCHITECTURE ─────────────────── */}
      <section className="py-24 bg-white border-t border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-3 tracking-tight">
              Why Terminal-First?
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              No Electron bloat. No background memory leaks. Just pure Unix speed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-950 mb-1.5">~15MB Memory Footprint</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Starts in 30ms with almost zero RAM usage, unlike heavy web-wrapper AI IDEs taking 1.5GB+.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-950 mb-1.5">Vim & Tmux Native</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Works seamlessly in terminal multiplexers, ssh sessions, splits, and custom shell pipelines.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-950 mb-1.5">100% Offline Capable</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Connects directly to local Ollama or LM Studio models with zero telemetry leaving your computer.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/80">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-4">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-neutral-950 mb-1.5">Scriptable & CI Ready</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Pipe to `jq`, use in GitHub Actions, and run batch refactors across repositories programmatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── FINAL CALL TO ACTION ─────────────────── */}
      <section className="py-24 bg-gradient-to-b from-[#f8fafc] to-emerald-50/40 relative overflow-hidden border-t border-neutral-200/80">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-6 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-950 mb-6 tracking-tight font-sans">
            Ready to Build at the Speed of Thought?
          </h2>
          <p className="text-base sm:text-lg text-neutral-600 mb-10 max-w-xl mx-auto font-normal">
            Install mcode in seconds. Free for individual developers with bring-your-own-keys support and local Ollama execution.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => copy('npm install -g mcode && mcode')}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer font-mono"
            >
              <span>$ npm install -g mcode</span>
              {copiedText ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4 text-white/80" />}
            </button>
            <Link
              href="/web-ide"
              className="px-7 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-sm border border-neutral-200 shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>Launch Web IDE</span>
              <ArrowRight className="w-4 h-4 text-neutral-500" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
