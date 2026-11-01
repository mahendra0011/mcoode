"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Puzzle, Download, Copy, Check, Terminal, ExternalLink,
  Code2, Sparkles, CheckCircle2, ArrowRight, Shield, Zap,
  Keyboard, Star, Layers
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function VSCodePage() {
  const [copiedCode, setCopiedCode] = useState(false);

  const copyCmd = () => {
    navigator.clipboard.writeText('code --install-extension mcode');
    setCopiedCode(true);
    toast.success('Copied: code --install-extension mcode');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const downloadVsix = () => {
    toast.success('Starting download: mcode-v2.4.6.vsix');
    const a = document.createElement('a');
    a.href = '#download-vsix';
    a.click();
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-blue-200/40 via-indigo-100/35 to-cyan-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-blue-800 text-xs font-bold uppercase tracking-wider mb-6">
            <Puzzle className="w-3.5 h-3.5 text-blue-600" />
            <span>Official Extension for VS Code & Cursor • v2.4.6</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Supercharge Your Daily Editor with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              mcode AI
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Stay in your favorite editor while unlocking autonomous multi-agent coding swarms, real-time split diff reviews, and context-aware repository chat.
          </p>

          {/* Action & Download Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <button
              onClick={downloadVsix}
              className="inline-flex items-center gap-2.5 px-7 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Extension (.VSIX)</span>
            </button>

            <a
              href="https://marketplace.visualstudio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm border border-neutral-200 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span>Install from Marketplace</span>
            </a>
          </div>

          {/* One-click install command */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-neutral-200 font-mono text-xs text-neutral-800 shadow-sm mb-16">
            <span className="text-blue-600 font-bold">$</span>
            <span className="font-medium">code --install-extension mcode</span>
            <button
              onClick={copyCmd}
              type="button"
              aria-label="Copy install command"
              className="p-1 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-black transition-colors cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-blue-600 font-bold" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* ─────────────────── VS CODE MOCKUP ─────────────────── */}
          <div className="max-w-5xl mx-auto rounded-3xl overflow-hidden border border-neutral-800 bg-[#0d0e15] shadow-2xl text-left">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#141522] border-b border-neutral-800 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="text-white ml-2">VS Code — workspace: my-saas-app</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-blue-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>mcode Agent v2.4 Active</span>
              </div>
            </div>

            <div className="grid grid-cols-12 min-h-[380px] divide-x divide-neutral-800 font-mono text-xs">
              {/* Left Sidebar: mcode Extension Chat */}
              <div className="col-span-12 md:col-span-4 p-4 bg-[#090a10] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3 text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Puzzle className="w-4 h-4 text-blue-400" />
                      mcode Assistant
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                      claude-3-5-sonnet
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-white/5 text-[11px] text-neutral-300">
                      <p className="text-neutral-400 mb-1">User prompt:</p>
                      <p className="text-white">@file:auth.ts refactor login to support GitHub OAuth</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-neutral-300">
                      <p className="text-blue-300 font-semibold mb-1">Subagent Output:</p>
                      <p className="text-neutral-400">Generated GitHub provider configuration and callback route in src/auth.ts.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800">
                  <div className="flex items-center gap-2 bg-[#12131d] rounded-xl px-3 py-2 border border-white/10 text-[11px]">
                    <span className="text-blue-400 font-bold">&gt;</span>
                    <input
                      type="text"
                      placeholder="Ask or summon with Ctrl+Shift+M..."
                      className="bg-transparent outline-none text-white placeholder-neutral-500 w-full"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Right: Code Diff View */}
              <div className="col-span-12 md:col-span-8 p-4 bg-[#0c0d14] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-3 text-[11px] text-neutral-400">
                    <span>src/auth.ts • Diff Preview</span>
                    <span className="text-emerald-400 font-bold">+18 lines / -4 lines</span>
                  </div>

                  <div className="space-y-1 text-[11.5px] leading-relaxed">
                    <p className="text-neutral-500"> export const authOptions = &#123;</p>
                    <p className="text-neutral-500">   providers: [</p>
                    <p className="bg-red-500/15 text-red-300 px-2 py-0.5 rounded -mx-1">-    CredentialsProvider(&#123; ... &#125;),</p>
                    <p className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded -mx-1">+    GitHubProvider(&#123; clientId: process.env.GITHUB_ID, clientSecret: ... &#125;),</p>
                    <p className="bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded -mx-1">+    GoogleProvider(&#123; clientId: process.env.GOOGLE_ID, clientSecret: ... &#125;),</p>
                    <p className="text-neutral-500">   ],</p>
                    <p className="text-neutral-500"> &#125;;</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">Ctrl+Enter</kbd> to accept</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toast.info('Diff discarded')}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-xs transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => toast.success('Diff merged into auth.ts')}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors cursor-pointer"
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

      {/* ─────────────────── KEY FEATURES ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-neutral-950 mb-3">Engineered for Your Daily Workflow</h2>
            <p className="text-neutral-600 text-sm">Everything you love about mcode CLI, built natively into the VS Code extension host.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-3xl bg-neutral-50/70 border border-neutral-200">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-950 mb-2">Contextual @tagging</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Tag <code className="text-blue-700 font-bold">@file</code>, <code className="text-blue-700 font-bold">@folder</code>, or <code className="text-blue-700 font-bold">@git</code> in chat. mcode parses the AST and feeds exact relevant tokens without bloating context windows.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-50/70 border border-neutral-200">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-950 mb-2">Inline Quick-Fix</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Hover over compiler or ESLint errors to trigger instant AI healing. One click generates verified repairs directly into your active buffer.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-50/70 border border-neutral-200">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <Keyboard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-950 mb-2">Full Keyboard Bindings</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Never take your hands off the keyboard. Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[10px]">Ctrl+Shift+M</kbd> to summon and <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[10px]">Alt+K</kbd> to inline-edit.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
