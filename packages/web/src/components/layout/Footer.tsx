"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Terminal, Globe, Puzzle, Monitor, Sparkles, Shield, Zap,
  Cpu, Github, ExternalLink, Heart, CheckCircle2, ChevronRight,
  Laptop, ArrowUpRight, Copy, CheckCheck, Code2, Smartphone
} from 'lucide-react';
import { toast } from 'sonner';

export function Footer() {
  const [copiedInstall, setCopiedInstall] = useState(false);

  const copyInstall = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('npm install -g mcode');
      setCopiedInstall(true);
      toast.success('Copied: npm install -g mcode');
      setTimeout(() => setCopiedInstall(false), 2000);
    }
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-neutral-950 text-neutral-300 border-t border-neutral-800/80 pt-16 pb-12 overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background ambient mesh and glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[250px] bg-gradient-to-r from-purple-500/10 via-emerald-500/10 to-blue-500/10 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-6">
        {/* Top Header Row with Brand & Fast Quick-Install */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-12 border-b border-neutral-800/80">
          <div className="space-y-2 max-w-xl">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-700 shadow-md p-0.5 flex items-center justify-center group-hover:border-emerald-500 transition-colors">
                <img src="/logo.png" alt="mcode" className="w-full h-full object-cover rounded-lg" />
              </div>
              <span className="text-xl font-black tracking-tight text-white font-sans group-hover:text-emerald-400 transition-colors">
                mcode
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                Swarm Engine v2.4.6
              </span>
            </Link>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans">
              Next-generation autonomous AI swarm engine. Plan architectures, dispatch parallel subagents, and auto-heal test suites seamlessly across your terminal, browser, and native desktop.
            </p>
          </div>

          {/* Quick Install Pill Box */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs font-mono shadow-inner">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-neutral-300 font-semibold">$ npm install -g mcode</span>
              <button
                type="button"
                onClick={copyInstall}
                aria-label="Copy install command"
                className="ml-2 p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {copiedInstall ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* 4 Multi-Column Navigation Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-b border-neutral-800/80 text-xs">
          {/* Column 1: Products */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-2">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Products &amp; Clients</span>
            </h3>
            <ul className="space-y-2.5 text-neutral-400 font-medium">
              <li>
                <Link href="/cli" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Terminal CLI (OpenTUI)</span>
                </Link>
              </li>
              <li>
                <Link href="/web-ide" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Cloud Web IDE (Monaco)</span>
                </Link>
              </li>
              <li>
                <Link href="/vscode" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5 text-neutral-500" />
                  <span>VS Code &amp; Cursor Plugin</span>
                </Link>
              </li>
              <li>
                <Link href="/ide" className="hover:text-rose-400 transition-colors flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Standalone Desktop IDE</span>
                </Link>
              </li>
              <li>
                <Link href="/mcode" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Mobile App (Android &amp; iOS)</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Autonomous Features */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Swarm Capabilities</span>
            </h3>
            <ul className="space-y-2.5 text-neutral-400 font-medium">
              <li>
                <Link href="/cli" className="hover:text-white transition-colors">
                  God Mode Multi-Wave DAG
                </Link>
              </li>
              <li>
                <Link href="/cli" className="hover:text-white transition-colors">
                  Watch Daemon &amp; Auto-Heal
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  Hardware-Secured AES-256 Vault
                </Link>
              </li>
              <li>
                <Link href="/ide" className="hover:text-white transition-colors">
                  Offline GPU Engine (Ollama/Llama.cpp)
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-white transition-colors">
                  46+ Developer Tools &amp; MCP Servers
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  40+ Frontier AI Model Routing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Developer Resources */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Developer Hub</span>
            </h3>
            <ul className="space-y-2.5 text-neutral-400 font-medium">
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  Interactive Documentation
                </Link>
              </li>
              <li>
                <Link href="/commands" className="hover:text-white transition-colors">
                  Command &amp; Flag Reference
                </Link>
              </li>
              <li>
                <Link href="/live" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Live Swarm Telemetry</span>
                </Link>
              </li>
              <li>
                <Link href="/plugins" className="hover:text-white transition-colors">
                  Plugin &amp; Skill Ecosystem
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="hover:text-white transition-colors">
                  Release Changelog (v2.4.6)
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-white transition-colors">
                  MCP Tool Registry
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Platform & Connect */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Security &amp; Links</span>
            </h3>
            <ul className="space-y-2.5 text-neutral-400 font-medium">
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing &amp; Token Quotas
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-white transition-colors">
                  API Key &amp; Vault Management
                </Link>
              </li>
              <li>
                <Link href="/sessions" className="hover:text-white transition-colors">
                  Chat &amp; Session History
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/mahendra0011/mcoode"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repository</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://marketplace.visualstudio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Puzzle className="w-3.5 h-3.5" />
                  <span>VS Code Marketplace</span>
                  <ArrowUpRight className="w-3 h-3 text-neutral-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-xs text-neutral-500">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p>&copy; {new Date().getFullYear()} mcode Inc. All rights reserved.</p>
            <span className="hidden sm:inline text-neutral-700">•</span>
            <span className="text-neutral-400">Zero telemetry on local offline models</span>
            <span className="hidden sm:inline text-neutral-700">•</span>
            <span className="text-neutral-400">AES-256 GCM master encryption</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={scrollToTop}
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Back to top</span>
              <ChevronRight className="w-3.5 h-3.5 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

