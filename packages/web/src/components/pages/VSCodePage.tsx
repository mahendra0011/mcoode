"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Puzzle, Download, Copy, Check, Terminal, ExternalLink,
  Code2, Sparkles, CheckCircle2, ArrowRight, Shield, Zap,
  Keyboard, Star, Layers, CheckCheck, SplitSquareVertical,
  Cpu, Laptop, FileCode, CheckCircle, ChevronRight, Boxes
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function VSCodePage() {
  const [selectedEditor, setSelectedEditor] = useState<'vscode' | 'cursor' | 'codium'>('vscode');
  const [copiedCode, setCopiedCode] = useState(false);
  const [diffAccepted, setDiffAccepted] = useState(false);

  const installCommands = {
    vscode: 'code --install-extension mcode',
    cursor: 'cursor --install-extension mcode',
    codium: 'codium --install-extension mcode',
  };

  const copyCmd = (cmd: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedCode(true);
      toast.success(`Copied: ${cmd}`);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const downloadVsix = () => {
    toast.success('Starting download: mcode-v2.4.6.vsix');
    const a = document.createElement('a');
    a.href = '/downloads/mcode-v2.4.6.vsix';
    a.setAttribute('download', 'mcode-v2.4.6.vsix');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-white">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-blue-200/40 via-indigo-100/40 to-cyan-200/40 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Extension badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-sm text-blue-900 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <Puzzle className="w-3.5 h-3.5 text-blue-600" />
            <span>Official Extension for VS Code &amp; Cursor • v2.4.6</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Supercharge Your Daily Editor with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              mcode AI
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-10 font-sans">
            Stay in your favorite editor while unlocking autonomous multi-agent coding swarms, real-time split diff reviews, and context-aware repository chat.
          </p>

          {/* Action & Download Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <a
              href="https://marketplace.visualstudio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Install from Marketplace</span>
            </a>

            <button
              type="button"
              onClick={downloadVsix}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm border border-neutral-200/90 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Download .VSIX (Offline)</span>
            </button>
          </div>

          {/* Editor Switcher Pills */}
          <div className="inline-flex items-center bg-neutral-100/80 border border-neutral-200 p-1 rounded-full text-xs mb-8 shadow-inner">
            {(['vscode', 'cursor', 'codium'] as const).map((editor) => (
              <button
                key={editor}
                type="button"
                onClick={() => setSelectedEditor(editor)}
                className={`px-4 py-2 rounded-full font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedEditor === editor
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {editor === 'vscode' ? 'VS Code' : editor === 'cursor' ? 'Cursor AI' : 'VSCodium'}
              </button>
            ))}
          </div>

          {/* One-click install command */}
          <div className="max-w-md mx-auto mb-16">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-left shadow-lg">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Terminal className="w-4 h-4 text-blue-400 shrink-0" />
                <code className="text-xs font-mono text-neutral-200 truncate">
                  $ {installCommands[selectedEditor]}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyCmd(installCommands[selectedEditor])}
                aria-label="Copy install command"
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy command"
              >
                {copiedCode ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* ─────────────────── VS CODE MOCKUP ─────────────────── */}
          <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden border border-neutral-800 bg-[#0d0e15] shadow-2xl text-left group">
            {/* Titlebar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#141522] border-b border-neutral-800 text-xs font-mono text-neutral-400 select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-white ml-2">VS Code — workspace: my-saas-app</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-bold bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>mcode Agent v2.4 Active</span>
                </div>
              </div>
            </div>

            {/* Editor Workspace Split View */}
            <div className="grid grid-cols-12 min-h-[420px] divide-y md:divide-y-0 md:divide-x divide-neutral-800 font-mono text-xs">
              {/* Left Sidebar: mcode Extension Chat */}
              <div className="col-span-12 md:col-span-5 p-5 bg-[#090a10] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4 text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Puzzle className="w-4 h-4 text-blue-400" />
                      mcode Assistant
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                      claude-3-5-sonnet
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {/* User Prompt */}
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-neutral-300">
                      <p className="text-neutral-400 mb-1 font-semibold flex items-center gap-1">
                        <span>User prompt:</span>
                      </p>
                      <p className="text-white font-medium">
                        <span className="text-blue-400 font-bold">@file:auth.ts</span> refactor login to support GitHub OAuth
                      </p>
                    </div>

                    {/* Subagent Output */}
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-neutral-300">
                      <p className="text-blue-300 font-semibold mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Subagent Output:</span>
                      </p>
                      <p className="text-neutral-300 leading-relaxed">
                        Generated GitHub provider configuration and callback route in <code className="text-emerald-400 bg-black/40 px-1 py-0.5 rounded">src/auth.ts</code>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prompt Input Box */}
                <div className="pt-4 border-t border-neutral-800/80 mt-4">
                  <div className="flex items-center gap-2 bg-[#12131d] rounded-xl px-3.5 py-2.5 border border-white/10 text-[11px]">
                    <span className="text-blue-400 font-bold">&gt;</span>
                    <input
                      type="text"
                      placeholder="Ask or summon with Ctrl+Shift+M..."
                      className="bg-transparent outline-none text-white placeholder-neutral-500 w-full font-mono"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Right: Code Diff View */}
              <div className="col-span-12 md:col-span-7 p-5 bg-[#0c0d14] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4 text-[11px] text-neutral-400">
                    <span className="text-white font-bold flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-blue-400" />
                      src/auth.ts • Diff Preview
                    </span>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      +18 lines / -4 lines
                    </span>
                  </div>

                  {/* Diff Lines */}
                  <div className="space-y-1.5 text-[11.5px] leading-relaxed font-mono">
                    <p className="text-neutral-500">export const authOptions = &#123;</p>
                    <p className="text-neutral-500">&nbsp;&nbsp;providers: [</p>
                    {!diffAccepted ? (
                      <>
                        <p className="bg-red-500/15 text-red-300 px-2.5 py-1 rounded -mx-1 flex items-center gap-2 border-l-2 border-red-500">
                          <span>-</span>
                          <span>CredentialsProvider(&#123; ... &#125;),</span>
                        </p>
                        <p className="bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded -mx-1 flex items-center gap-2 border-l-2 border-emerald-500">
                          <span>+</span>
                          <span>GitHubProvider(&#123; clientId: process.env.GITHUB_ID, clientSecret: ... &#125;),</span>
                        </p>
                        <p className="bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded -mx-1 flex items-center gap-2 border-l-2 border-emerald-500">
                          <span>+</span>
                          <span>GoogleProvider(&#123; clientId: process.env.GOOGLE_ID, clientSecret: ... &#125;),</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-emerald-400 px-2.5 py-1 rounded -mx-1 flex items-center gap-2">
                          <span>&nbsp;&nbsp;</span>
                          <span>GitHubProvider(&#123; clientId: process.env.GITHUB_ID, clientSecret: ... &#125;),</span>
                        </p>
                        <p className="text-emerald-400 px-2.5 py-1 rounded -mx-1 flex items-center gap-2">
                          <span>&nbsp;&nbsp;</span>
                          <span>GoogleProvider(&#123; clientId: process.env.GOOGLE_ID, clientSecret: ... &#125;),</span>
                        </p>
                      </>
                    )}
                    <p className="text-neutral-500">&nbsp;&nbsp;],</p>
                    <p className="text-neutral-500">&#125;;</p>
                  </div>
                </div>

                {/* Diff Acceptance Bottom Bar */}
                <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 mt-4">
                  <span className="text-[11px] text-neutral-400">
                    Press <kbd className="px-2 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/10">Ctrl+Enter</kbd> to accept
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDiffAccepted(false);
                        toast.info('Diff discarded');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDiffAccepted(true);
                        toast.success('Diff merged into src/auth.ts!');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      Accept Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 6 WORKFLOW SUPERPOWER CARDS ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-neutral-50/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Integrated Native Experience
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mt-3 mb-3">
              Engineered for Your Daily Workflow
            </h2>
            <p className="text-neutral-600 text-sm">
              Everything you love about mcode CLI, built natively into the VS Code &amp; Cursor extension host.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Contextual @tagging */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Contextual @tagging
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Tag <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">@file</code>, <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">@folder</code>, or <code className="text-blue-700 font-bold bg-blue-50 px-1 py-0.5 rounded">@git</code> in chat. mcode parses the AST and feeds exact relevant tokens without bloating context windows.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-blue-700 font-semibold">
                <span>AST Pruning</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">Token Efficient</span>
              </div>
            </div>

            {/* Card 2: Inline Quick-Fix */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Inline Quick-Fix
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Hover over compiler or ESLint errors to trigger instant AI healing. One click generates verified repairs directly into your active editor buffer.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-semibold">
                <span>1-Click Fix</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">Auto-Heal</span>
              </div>
            </div>

            {/* Card 3: Full Keyboard Bindings */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Keyboard className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Full Keyboard Bindings
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Never take your hands off the keyboard. Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-neutral-800 text-[10px]">Ctrl+Shift+M</kbd> to summon the assistant, <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-neutral-800 text-[10px]">Ctrl+Enter</kbd> to accept diffs, and <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-neutral-800 text-[10px]">Alt+K</kbd> for inline editing.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-purple-700 font-semibold">
                <span>Vim &amp; Emacs Friendly</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">Keyboard First</span>
              </div>
            </div>

            {/* Card 4: Real-time Split Diff Reviews */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <SplitSquareVertical className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Real-time Split Diff Reviews
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Inspect proposed multi-file patches side-by-side. Review hunk-by-hunk before committing changes, with instant rollback to any prior checkpoint.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-cyan-700 font-semibold">
                <span>Monaco Split Diff</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800">Atomic Rollback</span>
              </div>
            </div>

            {/* Card 5: Autonomous God Mode in Sidebar */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Boxes className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Autonomous God Mode in Sidebar
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Formulate multi-wave subagent plans directly inside your VS Code activity bar. Watch agents write frontend, backend, and migrations concurrently.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-amber-700 font-semibold">
                <span>Parallel DAG Swarms</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">Multi-File</span>
              </div>
            </div>

            {/* Card 6: Local & Cloud Model Freedom */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Local &amp; Cloud Model Freedom
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Bring your own keys or connect directly to local Ollama on <code className="text-indigo-700 font-bold bg-indigo-50 px-1 py-0.5 rounded">localhost:11434</code>. Switch between Claude 3.7 Sonnet, GPT-4o, and DeepSeek-R1 seamlessly.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-indigo-700 font-semibold">
                <span>40+ Models &amp; Local</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">Zero Lock-In</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── KEYBOARD SHORTCUTS CHEAT SHEET ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
              Productivity Acceleration
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">
              Keyboard Shortcuts Cheat Sheet
            </h2>
            <p className="text-neutral-600 text-sm">
              Keep your fingers on home row. Every mcode capability is bound to rapid key combinations.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-950 font-bold">
                <tr>
                  <th className="p-4 sm:p-5">Action</th>
                  <th className="p-4 sm:p-5">Windows &amp; Linux</th>
                  <th className="p-4 sm:p-5">macOS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Toggle Sidebar AI Assistant</td>
                  <td className="p-4 sm:p-5 font-mono text-blue-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Ctrl + Shift + M</kbd></td>
                  <td className="p-4 sm:p-5 font-mono text-blue-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Cmd + Shift + M</kbd></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Accept Proposed Code Diff</td>
                  <td className="p-4 sm:p-5 font-mono text-emerald-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Ctrl + Enter</kbd></td>
                  <td className="p-4 sm:p-5 font-mono text-emerald-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Cmd + Enter</kbd></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Inline Edit Selection</td>
                  <td className="p-4 sm:p-5 font-mono text-purple-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Alt + K</kbd></td>
                  <td className="p-4 sm:p-5 font-mono text-purple-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Option + K</kbd></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Dismiss Diff / Cancel Stream</td>
                  <td className="p-4 sm:p-5 font-mono text-neutral-600"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Escape</kbd></td>
                  <td className="p-4 sm:p-5 font-mono text-neutral-600"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Escape</kbd></td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Launch Autonomous God Mode Swarm</td>
                  <td className="p-4 sm:p-5 font-mono text-amber-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Ctrl + Shift + P</kbd> &rarr; <span className="font-sans text-[11px] font-semibold text-neutral-800">mcode: God Mode</span></td>
                  <td className="p-4 sm:p-5 font-mono text-amber-700"><kbd className="px-2 py-1 rounded bg-neutral-100 border border-neutral-200">Cmd + Shift + P</kbd> &rarr; <span className="font-sans text-[11px] font-semibold text-neutral-800">mcode: God Mode</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────────────────── FINAL CTA BANNER ─────────────────── */}
      <section className="py-20 bg-neutral-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready in Seconds</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 font-sans">
            Ready to Supercharge Your Daily Editor?
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-10">
            Install the mcode extension from the Visual Studio Marketplace or download the offline .VSIX package for enterprise air-gapped setups.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://marketplace.visualstudio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Install from Marketplace</span>
            </a>

            <button
              type="button"
              onClick={downloadVsix}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm border border-neutral-800 transition-all hover:scale-105 cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Download .VSIX Package</span>
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
