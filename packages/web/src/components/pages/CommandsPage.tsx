"use client";
import React, { useState } from 'react';
import { WEB_SLASH_COMMANDS } from '../../lib/slashCommands';

const CLI_COMMANDS = [
  { cmd: 'mcode', desc: 'Interactive TUI session', ex: 'mcode' },
  { cmd: 'mcode init [name] -t <template>', desc: 'Scaffold express / fastify / react-vite / full-stack', ex: 'mcode init myapp -t react-vite' },
  { cmd: 'mcode god "<prompt>" [--yes]', desc: 'Plan → parallel subagents → integration pass', ex: 'mcode god "build …" --yes' },
  { cmd: 'mcode connect [--provider --key]', desc: 'Connect a provider (wizard or CI flags)', ex: 'mcode connect --provider openai --key sk-…' },
  { cmd: 'mcode run <script>', desc: 'Run a package.json script', ex: 'mcode run dev' },
  { cmd: 'mcode test [--types] [--target]', desc: 'Autonomous self-healing test agent', ex: 'mcode test --types unit,integration' },
  { cmd: 'mcode gen <thing> <name> [--dry-run]', desc: 'Generate component / route / controller / page / api / hook / test', ex: 'mcode gen hook Foo --dry-run' },
  { cmd: 'mcode env add|remove|list', desc: 'Encrypted vault (+ --plain for CI .env)', ex: 'mcode env add OPENAI_API_KEY sk-…' },
  { cmd: 'mcode model list|show|set|reset|modes', desc: 'Inspect / pin routing + quality modes', ex: 'mcode model set backend openai:gpt-4o' },
  { cmd: 'mcode watch [--background]', desc: 'Scan + auto-fix daemon', ex: 'mcode watch --background' },
  { cmd: 'mcode watch-stop / watch-status', desc: 'Stop / inspect the daemon', ex: 'mcode watch-status' },
  { cmd: 'mcode serve [-p 3100]', desc: 'Local backend for the dashboard', ex: 'mcode serve' },
  { cmd: 'mcode doctor', desc: 'Node + config + vault + provider diagnosis', ex: 'mcode doctor' },
  { cmd: 'mcode ship [--env prod] [-y]', desc: 'Build + verify + tag + deploy', ex: 'mcode ship -y' },
  { cmd: 'mcode plugin remove|disable|enable', desc: 'Manage installed plugins', ex: 'mcode plugin disable eslint' },
  { cmd: 'mcode login [--url] / logout', desc: 'Backend account session', ex: 'mcode login --url https://api…' },
  { cmd: 'mcode history [--clear]', desc: 'Session history files', ex: 'mcode history' },
  { cmd: 'mcode security-check [--category]', desc: '17-control security scan', ex: 'mcode security-check' },
  { cmd: 'mcode audit [--pdf]', desc: '360° repo health audit', ex: 'mcode audit --pdf' },
  { cmd: 'mcode review [target]', desc: 'Deep diff / PR review', ex: 'mcode review' },
  { cmd: 'mcode explain <path>', desc: 'Interactive code walkthrough', ex: 'mcode explain src/index.js' },
  { cmd: 'mcode migrate <target>', desc: 'Refactor / framework migration', ex: 'mcode migrate' },
  { cmd: 'mcode clean [--dry-run]', desc: 'Dead-code + bloat scan', ex: 'mcode clean' },
];

export function CommandsPage() {
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (t: string) => {
    try { await navigator.clipboard.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 1200); } catch {}
  };
  const cli = CLI_COMMANDS.filter((c) => !q || `${c.cmd} ${c.desc}`.toLowerCase().includes(q.toLowerCase()));
  const slash = (WEB_SLASH_COMMANDS as any[]).filter((c) => !q || `${c.cmd} ${c.name} ${c.desc}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Commands</h1>
      <p className="text-xs text-white/40 mb-4">CLI + TUI slash commands — click any example to copy.</p>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter… (e.g. watch, model, god)"
        className="mb-6 w-full max-w-sm rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50"
      />
      <h2 className="text-sm font-semibold text-white/60 mb-2">CLI ({cli.length})</h2>
      <div className="space-y-2 mb-8">
        {cli.map((c) => (
          <button key={c.cmd} type="button" onClick={() => copy(c.ex)}
            className="w-full text-left rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3 transition-colors">
            <code className="text-sm text-emerald-300 font-mono">{c.cmd}</code>
            <p className="text-xs text-white/50 mt-0.5">{c.desc} {copied === c.ex && <span className="text-emerald-300">· copied ✓</span>}</p>
          </button>
        ))}
      </div>
      <h2 className="text-sm font-semibold text-white/60 mb-2">TUI slash ({slash.length})</h2>
      <div className="grid gap-2 md:grid-cols-2">
        {slash.map((c: any) => (
          <button key={c.cmd} type="button" onClick={() => copy(`/${c.cmd}`)}
            className="text-left rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-4 py-3 transition-colors">
            <code className="text-sm text-sky-300 font-mono">/{c.cmd}</code>
            <p className="text-xs text-white/50 mt-0.5">{c.name} — {c.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CommandsPage;
