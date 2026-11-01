"use client";
import React from 'react';
import Link from 'next/link';

const SECTIONS = [
  { title: 'Commands reference', href: '/commands', desc: 'Every CLI command and TUI slash command with flags and examples.' },
  { title: 'Live monitor', href: '/live', desc: 'Watch subagent waves and watch-daemon fixes stream in real time.' },
  { title: 'Sessions', href: '/sessions', desc: 'Past runs with transcripts, diffs and replay entry points.' },
  { title: 'Plugins', href: '/plugins', desc: 'Registry with one-liner install commands.' },
  { title: 'Changelog', href: '/changelog', desc: 'What changed, per release.' },
  { title: 'AI chat', href: '/ai/chat', desc: 'Interactive assistant, slash commands included.' },
  { title: 'CLI reference', href: '/cli', desc: 'Terminal-first workflow overview.' },
];

const QUICKSTART = [
  'mcode doctor',
  'mcode connect',
  'mcode god "build …" --yes',
  'mcode watch --background',
];

export function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-neutral-900 py-10 px-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1">Documentation</h1>
      <p className="text-sm text-neutral-500 mb-8">Start here — quickstart commands and comprehensive reference guides.</p>
      
      <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Quickstart</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-8 font-mono text-sm space-y-2 shadow-xs">
        {QUICKSTART.map((c) => (
          <div key={c} className="flex items-center gap-2 text-emerald-800 bg-emerald-50/70 border border-emerald-200/60 px-3 py-2 rounded-xl">
            <span className="text-emerald-500 select-none">$</span>
            <span className="font-semibold">{c}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Reference</h2>
      <div className="grid gap-3.5 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs p-5 transition-all group"
          >
            <p className="font-bold text-sm text-neutral-900 group-hover:text-emerald-700 transition">{s.title}</p>
            <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DocsPage;
