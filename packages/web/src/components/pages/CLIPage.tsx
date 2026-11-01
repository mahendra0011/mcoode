"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Terminal, Copy, Check, Sparkles, Play, Shield, ArrowRight,
  GitBranch, RefreshCw, Zap, Search, ChevronRight, CheckCircle2,
  Code2, Cpu, ExternalLink, Activity, Layers
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

interface CLICommand {
  cmd: string;
  desc: string;
  category: 'swarm' | 'watch' | 'vault' | 'git' | 'mcp';
  flags: string;
  example: string;
}

const COMMANDS: CLICommand[] = [
  { cmd: 'mcode god <prompt>', desc: 'Launch autonomous subagent swarm to plan and execute multi-file changes', category: 'swarm', flags: '--concurrency <N>, --budget <$>', example: 'mcode god "add stripe checkout and webhook handlers"' },
  { cmd: 'mcode plan <task>', desc: 'Generate dependency-sorted DAG execution plan without making changes', category: 'swarm', flags: '--depth <level>, --model <name>', example: 'mcode plan "migrate from REST to GraphQL"' },
  { cmd: 'mcode chat [query]', desc: 'Start interactive terminal pairing session with streaming tokens', category: 'swarm', flags: '-m <model>, --file <path>', example: 'mcode chat "why is my redis pool leaking memory?"' },
  { cmd: 'mcode watch', desc: 'Background daemon watching file saves, detecting errors, and auto-healing tests', category: 'watch', flags: '--heal, --test-runner <cmd>', example: 'mcode watch --heal' },
  { cmd: 'mcode review [ref]', desc: 'Analyze current git diff or PR for logic bugs, security flaws, and regressions', category: 'git', flags: '--staged, --strict', example: 'mcode review origin/main' },
  { cmd: 'mcode undo [steps]', desc: 'Cleanly revert the last transactional checkpoint applied by a subagent', category: 'git', flags: '--all, --dry-run', example: 'mcode undo --last' },
  { cmd: 'mcode checkpoint', desc: 'Snapshot current working directory state into an encrypted local checkpoint', category: 'git', flags: '-m "message"', example: 'mcode checkpoint -m "pre-refactor"' },
  { cmd: 'mcode vault set <key>', desc: 'Encrypt and store an API key into the hardware-backed AES-256 vault', category: 'vault', flags: '--global, --project', example: 'mcode vault set ANTHROPIC_API_KEY' },
  { cmd: 'mcode vault list', desc: 'List configured API keys, quotas, and status without exposing secrets', category: 'vault', flags: '--json', example: 'mcode vault list' },
  { cmd: 'mcode mcp list', desc: 'Inspect available Model Context Protocol servers and exposed tools', category: 'mcp', flags: '--schema', example: 'mcode mcp list --schema' },
  { cmd: 'mcode mcp add <url>', desc: 'Connect an external stdio or SSE Model Context Protocol server', category: 'mcp', flags: '--name <id>', example: 'mcode mcp add http://localhost:8080/sse' },
  { cmd: 'mcode tool exec <name>', desc: 'Directly invoke any of the 46+ built-in developer tools from CLI', category: 'mcp', flags: '--args <json>', example: 'mcode tool exec grep_search --args \'{"query":"AuthGuard"}\'' },
];

export function CLIPage() {
  const [activeInstallTab, setActiveInstallTab] = useState<'npm' | 'curl' | 'brew'>('npm');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeSim, setActiveSim] = useState<'god' | 'watch' | 'vault'>('god');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredCommands = COMMANDS.filter((c) => {
    const matchesSearch = c.cmd.toLowerCase().includes(searchQuery.toLowerCase()) || c.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = activeCategory === 'all' || c.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-emerald-200/40 via-teal-100/35 to-indigo-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

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

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Ultra-fast, keyboard-driven, and scriptable. Run multi-model swarms, auto-fix failing test suites, and orchestrate 46+ tools without leaving your shell.
          </p>

          {/* Quick Install Tabs */}
          <div className="max-w-xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-2 mb-3">
              {(['npm', 'curl', 'brew'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveInstallTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeInstallTab === tab ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-neutral-200 text-neutral-600 hover:text-black'
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
                  {activeInstallTab === 'npm' && 'npm install -g mcode'}
                  {activeInstallTab === 'curl' && 'curl -fsSL https://mcode.dev/install.sh | bash'}
                  {activeInstallTab === 'brew' && 'brew install mcode-ai/tap/mcode'}
                </span>
              </div>
              <button
                onClick={() => {
                  const cmd = activeInstallTab === 'npm' ? 'npm install -g mcode' : activeInstallTab === 'curl' ? 'curl -fsSL https://mcode.dev/install.sh | bash' : 'brew install mcode-ai/tap/mcode';
                  copy(cmd);
                }}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy command"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* ─────────────────── INTERACTIVE TERMINAL SIMULATOR ─────────────────── */}
          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-neutral-800 bg-[#0c0d15] shadow-2xl text-left mb-24">
            <div className="flex items-center justify-between px-4 py-3 bg-[#131420] border-b border-neutral-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="text-neutral-400 ml-2">mcode-terminal-demo — zsh</span>
              </div>

              {/* Simulation Selectors */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSim('god')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    activeSim === 'god' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  mcode god
                </button>
                <button
                  onClick={() => setActiveSim('watch')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    activeSim === 'watch' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  mcode watch
                </button>
                <button
                  onClick={() => setActiveSim('vault')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    activeSim === 'vault' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  mcode vault
                </button>
              </div>
            </div>

            <div className="p-6 font-mono text-[12px] leading-relaxed text-neutral-300 space-y-2 min-h-[220px]">
              {activeSim === 'god' && (
                <>
                  <p className="text-neutral-400"><span className="text-emerald-400 font-bold">$</span> mcode god "refactor auth to use jwt tokens and prisma"</p>
                  <p className="text-indigo-400 font-semibold">✦ mcode autonomous swarm initialized (planner: claude-3-5-sonnet)</p>
                  <p className="text-neutral-400">├── Wave 1: Schema migration [claude-3-5-sonnet] → <span className="text-emerald-400 font-bold">DONE (+42 lines)</span></p>
                  <p className="text-neutral-400">├── Wave 2: Auth middleware & guards [gpt-4o] → <span className="text-emerald-400 font-bold">DONE (+88 lines)</span></p>
                  <p className="text-neutral-400">└── Wave 3: Integration tests pass (12/12) → <span className="text-emerald-400 font-bold">VERIFIED</span></p>
                  <p className="text-emerald-300 pt-1">✓ All 3 subagent tasks succeeded. Checkpoint #18 created.</p>
                </>
              )}

              {activeSim === 'watch' && (
                <>
                  <p className="text-neutral-400"><span className="text-emerald-400 font-bold">$</span> mcode watch --heal</p>
                  <p className="text-cyan-400 font-semibold">✦ Watch daemon active on 1,420 files in project</p>
                  <p className="text-neutral-400">[11:02:14] File saved: packages/web/src/lib/axios.js</p>
                  <p className="text-amber-400">[11:02:15] Warning: detected broken import './config'</p>
                  <p className="text-emerald-400">[11:02:16] Auto-healing: replaced with 'import &#123; config &#125; from "./settings"'</p>
                  <p className="text-emerald-300 pt-1">✓ Vitest rerun passed: 24/24 tests green (0ms overhead)</p>
                </>
              )}

              {activeSim === 'vault' && (
                <>
                  <p className="text-neutral-400"><span className="text-emerald-400 font-bold">$</span> mcode vault list</p>
                  <p className="text-purple-400 font-semibold">✦ AES-256 Encrypted Credential Vault</p>
                  <p className="text-neutral-400">  • ANTHROPIC_API_KEY : sk-ant-... (active, quota: 92% remaining)</p>
                  <p className="text-neutral-400">  • OPENAI_API_KEY    : sk-proj-... (active, quota: 84% remaining)</p>
                  <p className="text-neutral-400">  • DEEPSEEK_API_KEY  : sk-... (active, unlimited)</p>
                  <p className="text-emerald-300 pt-1">✓ All keys hardware-bound to Windows DPAPI / Keychain.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── COMPLETE 25 COMMAND REFERENCE ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 mb-1">Complete Command Reference</h2>
              <p className="text-neutral-600 text-xs sm:text-sm">Search and explore CLI commands and available flags.</p>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-2xl px-3.5 py-2 w-full md:w-72 shadow-sm">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search commands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-neutral-900 placeholder-neutral-400 outline-none w-full font-mono"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { id: 'all', label: 'All Commands' },
              { id: 'swarm', label: 'Autonomous Swarms' },
              { id: 'watch', label: 'Watch & Heal' },
              { id: 'vault', label: 'Vault & Secrets' },
              { id: 'git', label: 'Git & Rollback' },
              { id: 'mcp', label: 'MCP & Tools' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Command Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCommands.map((cmd) => (
              <div
                key={cmd.cmd}
                className="p-5 rounded-2xl bg-neutral-50/60 border border-neutral-200 hover:border-emerald-300 hover:bg-white hover:shadow-md transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-sm font-bold text-emerald-700">{cmd.cmd}</span>
                    <button
                      onClick={() => copy(cmd.cmd)}
                      className="p-1 rounded-md hover:bg-neutral-200 text-neutral-400 hover:text-black transition-colors cursor-pointer"
                      title="Copy syntax"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-700 leading-relaxed mb-3">{cmd.desc}</p>
                  <p className="text-[11px] font-mono text-neutral-500 mb-2">Flags: {cmd.flags}</p>
                </div>
                <div className="pt-2.5 border-t border-neutral-200/80 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                  <span className="truncate text-emerald-800 font-medium">$ {cmd.example}</span>
                  <button
                    onClick={() => copy(cmd.example)}
                    className="text-[10px] text-neutral-500 hover:text-emerald-700 font-bold ml-2 shrink-0 cursor-pointer"
                  >
                    Copy example
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
