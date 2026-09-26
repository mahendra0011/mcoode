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
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Docs</h1>
      <p className="text-xs text-white/40 mb-6">Start here — quickstart and every reference page.</p>
      <h2 className="text-sm font-semibold text-white/60 mb-2">Quickstart</h2>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-8 font-mono text-sm space-y-1.5">
        {QUICKSTART.map((c) => <p key={c} className="text-emerald-300">{c}</p>)}
      </div>
      <h2 className="text-sm font-semibold text-white/60 mb-3">Reference</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-4 transition-colors">
            <p className="font-medium text-sm">{s.title}</p>
            <p className="mt-1 text-xs text-white/50">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DocsPage;
