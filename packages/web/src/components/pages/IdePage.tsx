"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Monitor, Download, Shield, Cpu, Zap, ArrowRight,
  Check, Terminal, HardDrive, CheckCircle2,
  Sparkles, Copy, CheckCheck, Laptop, Command, Key,
  SplitSquareVertical, Boxes, FileCode, CheckCircle, ChevronRight
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function IDEPage() {
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac' | 'linux'>('windows');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (userAgent.includes('mac')) {
        setSelectedOS('mac');
      } else if (userAgent.includes('linux')) {
        setSelectedOS('linux');
      } else {
        setSelectedOS('windows');
      }
    }
  }, []);

  const triggerDownload = (os: string, fileName: string) => {
    toast.success(`Starting download: ${fileName}`);
    const link = document.createElement('a');
    link.href = `/downloads/${fileName}`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyCommand = (cmd: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      toast.success('Command copied to clipboard');
      setTimeout(() => setCopiedCmd(null), 2500);
    }
  };

  const packageCommands: Record<'windows' | 'mac' | 'linux', string> = {
    windows: 'winget install mcode-desktop',
    mac: 'brew install --cask mcode',
    linux: 'curl -fsSL https://mcode.dev/install.sh | bash',
  };

  const platformDetails = {
    windows: {
      name: 'Windows 10 / 11 (64-bit)',
      size: '84 MB',
      file: 'mcode-desktop-setup.exe',
      format: '.exe (Installer)',
      arch: 'x64 & ARM64',
      badge: 'Auto WSL2 & PowerShell 7',
      desc: 'Native installer with PowerShell 7 and WSL2 auto-detection, desktop shortcuts, and background daemon service.',
    },
    mac: {
      name: 'macOS (Apple Silicon & Intel)',
      size: '89 MB',
      file: 'mcode-desktop-universal.dmg',
      format: '.dmg (Universal)',
      arch: 'Universal Binary',
      badge: 'Metal GPU Acceleration',
      desc: 'Universal DMG signed with Apple Developer certificate. Native Metal GPU acceleration for local Ollama models.',
    },
    linux: {
      name: 'Linux (Debian / Arch / Fedora)',
      size: '79 MB',
      file: 'mcode-desktop-x86_64.AppImage',
      format: '.AppImage & .deb',
      arch: 'x86_64 & aarch64',
      badge: 'Systemd & Docker Ready',
      desc: 'Self-contained AppImage and .deb package. Full integration with system bash/zsh, Docker daemon, and systemd daemons.',
    },
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-white">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-purple-200/40 via-pink-100/35 to-emerald-200/40 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Version pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-sm text-purple-900 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <Monitor className="w-3.5 h-3.5 text-purple-600" />
            <span>Native Desktop Powerhouse • v2.4.6</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            The Standalone AI IDE{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-600 bg-clip-text text-transparent">
              Engineered for Speed
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-10 font-sans">
            Ditch bloated electron runtimes. mcode Desktop uses a lightweight native core, native C++ filesystem watchers, multi-split terminal layouts, and offline local LLM execution.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => triggerDownload(selectedOS, platformDetails[selectedOS].file)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(0,0,0,0.3)] hover:shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5 text-emerald-400" />
              <span>Download for {selectedOS === 'windows' ? 'Windows' : selectedOS === 'mac' ? 'macOS' : 'Linux'}</span>
              <span className="text-neutral-400 text-xs font-normal">({platformDetails[selectedOS].format})</span>
            </button>

            <Link
              href="/web-ide"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-sm border border-neutral-200/90 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <span>Launch Web IDE</span>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </Link>
          </div>

          {/* OS Selector Pills */}
          <div className="inline-flex items-center bg-neutral-100/80 border border-neutral-200 p-1 rounded-full text-xs mb-8 shadow-inner">
            {(['windows', 'mac', 'linux'] as const).map((os) => (
              <button
                key={os}
                type="button"
                onClick={() => setSelectedOS(os)}
                className={`px-4 py-2 rounded-full font-bold capitalize transition-all cursor-pointer ${
                  selectedOS === os
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-950'
                }`}
              >
                {os === 'mac' ? 'macOS' : os}
              </button>
            ))}
          </div>

          {/* Fast Package Manager 1-liner */}
          <div className="max-w-md mx-auto mb-16">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-left shadow-lg">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
                <code className="text-xs font-mono text-neutral-200 truncate">
                  $ {packageCommands[selectedOS]}
                </code>
              </div>
              <button
                type="button"
                onClick={() => copyCommand(packageCommands[selectedOS])}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy package command"
              >
                {copiedCmd === packageCommands[selectedOS] ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* ─────────────────── NATIVE APP WINDOW PREVIEW ─────────────────── */}
          <div className="relative max-w-5xl mx-auto rounded-3xl bg-neutral-950 p-2 sm:p-3 shadow-2xl border border-neutral-800/80 group">
            {/* Window Chrome Titlebar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 rounded-t-2xl border-b border-white/5 select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-neutral-400 ml-3 hidden sm:inline">
                  mcode Desktop — Workspace: autonomous-order-api
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Local GPU: DeepSeek-R1 (Ollama)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-neutral-300 border border-white/10 hidden md:inline">
                  Native 0.3s Startup
                </span>
              </div>
            </div>

            {/* Embedded Screenshot */}
            <div className="relative rounded-b-2xl overflow-hidden bg-neutral-950">
              <img
                src="/modes/preview-ai-editor.png"
                alt="mcode Standalone Desktop IDE Preview"
                className="w-full h-auto object-cover rounded-b-2xl transition duration-500 group-hover:scale-[1.005]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 sm:p-6 pointer-events-none">
                <span className="text-xs font-mono text-emerald-300 font-semibold bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/30 backdrop-blur-md">
                  Monaco Engine • Native C++ Watchers • Split Diffs
                </span>
                <button
                  type="button"
                  onClick={() => triggerDownload(selectedOS, platformDetails[selectedOS].file)}
                  className="pointer-events-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download mcode Desktop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── PLATFORM DOWNLOAD CARDS ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-neutral-50/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Cross-Platform Builds
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">Available for Every Workstation</h2>
            <p className="text-neutral-600 text-sm">Download signed native builds optimized for your specific operating system.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto">
            {/* Windows Card */}
            <div className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between ${
              selectedOS === 'windows' ? 'border-purple-500 shadow-xl ring-2 ring-purple-100' : 'border-neutral-200/90 shadow-sm hover:shadow-md'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-purple-600" />
                    Windows 10 / 11 (64-bit)
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">84 MB</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  Native installer with PowerShell 7 and WSL2 auto-detection, desktop shortcuts, and background daemon service.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Auto WSL2 Ubuntu bridge</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Windows DPAPI hardware vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>DirectX / CUDA GPU acceleration</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => triggerDownload('windows', 'mcode-setup-x64.exe')}
                  className="w-full py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .exe (Installer)</span>
                </button>
                <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100 text-[10px] font-mono text-neutral-600">
                  <span className="truncate">winget install mcode-desktop</span>
                  <button
                    type="button"
                    onClick={() => copyCommand('winget install mcode-desktop')}
                    className="hover:text-neutral-950 ml-1 shrink-0"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* macOS Card */}
            <div className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between ${
              selectedOS === 'mac' ? 'border-purple-500 shadow-xl ring-2 ring-purple-100' : 'border-neutral-200/90 shadow-sm hover:shadow-md'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                    <Command className="w-4 h-4 text-purple-600" />
                    macOS (Apple Silicon & Intel)
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">89 MB</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  Universal DMG signed with Apple Developer certificate. Native Metal GPU acceleration for local Ollama models.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Native Apple Silicon M1-M4 Metal</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>macOS Keychain hardware vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Zero Gatekeeper warning notarization</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => triggerDownload('mac', 'mcode-darwin-universal.dmg')}
                  className="w-full py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .dmg (Universal)</span>
                </button>
                <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100 text-[10px] font-mono text-neutral-600">
                  <span className="truncate">brew install --cask mcode</span>
                  <button
                    type="button"
                    onClick={() => copyCommand('brew install --cask mcode')}
                    className="hover:text-neutral-950 ml-1 shrink-0"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Linux Card */}
            <div className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between ${
              selectedOS === 'linux' ? 'border-purple-500 shadow-xl ring-2 ring-purple-100' : 'border-neutral-200/90 shadow-sm hover:shadow-md'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-600" />
                    Linux (Debian / Arch / Fedora)
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">79 MB</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  Self-contained AppImage and .deb package. Full integration with system bash/zsh, Docker daemon, and systemd daemons.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>AppImage, .deb & AUR packages</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Linux SecretService vault backend</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Native inotify file watchers</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => triggerDownload('linux', 'mcode-linux-x86_64.AppImage')}
                  className="w-full py-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .AppImage</span>
                </button>
                <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100 text-[10px] font-mono text-neutral-600">
                  <span className="truncate">curl -fsSL https://mcode.dev/install.sh | bash</span>
                  <button
                    type="button"
                    onClick={() => copyCommand('curl -fsSL https://mcode.dev/install.sh | bash')}
                    className="hover:text-neutral-950 ml-1 shrink-0"
                    title="Copy command"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── PERFORMANCE BENCHMARKS ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Zero Bloat Metrics
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">Engineered for Raw Speed</h2>
            <p className="text-neutral-600 text-sm">We obsess over millisecond latencies, lean memory consumption, and instant reaction times.</p>
          </div>

          {/* Benchmark 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center mb-12">
            <div className="p-8 rounded-3xl bg-neutral-50/70 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-mono font-bold text-neutral-500 mb-2">IDLE MEMORY FOOTPRINT</p>
              <p className="text-5xl font-black text-emerald-600 mb-3 font-sans tracking-tight">180 MB</p>
              <p className="text-xs text-neutral-600 font-medium">vs 1.4 GB (VS Code) &amp; 1.8 GB (Cursor)</p>
            </div>

            <div className="p-8 rounded-3xl bg-neutral-50/70 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-mono font-bold text-neutral-500 mb-2">COLD START TIME</p>
              <p className="text-5xl font-black text-purple-600 mb-3 font-sans tracking-tight">0.3s</p>
              <p className="text-xs text-neutral-600 font-medium">Instant launch without heavy extension churn</p>
            </div>

            <div className="p-8 rounded-3xl bg-neutral-50/70 border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-mono font-bold text-neutral-500 mb-2">FILE WATCHER CAPACITY</p>
              <p className="text-5xl font-black text-cyan-600 mb-3 font-sans tracking-tight">500k+</p>
              <p className="text-xs text-neutral-600 font-medium">Native C++ inotify / ReadDirectoryChangesW</p>
            </div>
          </div>

          {/* Visual Memory Comparison Bar */}
          <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 text-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Idle Memory Allocation Comparison (Clean Project Open)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">87% Less RAM</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {/* mcode */}
              <div>
                <div className="flex justify-between text-neutral-300 mb-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    mcode Desktop
                  </span>
                  <span className="text-emerald-400 font-bold">180 MB</span>
                </div>
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '10%' }} />
                </div>
              </div>

              {/* VS Code */}
              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>VS Code (Standard)</span>
                  <span>1,420 MB</span>
                </div>
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-neutral-600 h-full rounded-full" style={{ width: '77%' }} />
                </div>
              </div>

              {/* Cursor */}
              <div>
                <div className="flex justify-between text-neutral-400 mb-1">
                  <span>Cursor AI Editor</span>
                  <span>1,840 MB</span>
                </div>
                <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-neutral-700 h-full rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 6 DESKTOP EXCLUSIVE POWERS ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Desktop Native Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mt-3 mb-3">
              Desktop Exclusive Capabilities
            </h2>
            <p className="text-neutral-600 text-sm">
              Direct hardware, GPU, and kernel filesystem integration that browser runtimes cannot replicate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Offline Local LLMs */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Offline Local Ollama &amp; Llama.cpp Support
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Run DeepSeek-R1, Qwen 2.5 Coder, and Llama 3.3 locally on your GPU. Your proprietary source code never leaves your workstation.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-purple-700 font-semibold">
                <span>Metal &amp; CUDA Accelerated</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">100% Offline</span>
              </div>
            </div>

            {/* Card 2: Multi-Split Terminal Profiles */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Multi-Split Terminal Profiles
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Open parallel terminal panes across PowerShell 7, WSL2 Ubuntu, Zsh, and Docker exec simultaneously with zero latency.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-semibold">
                <span>Direct PTY Sockets</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">Zero Lag</span>
              </div>
            </div>

            {/* Card 3: Global Hotkey Command Palette */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Global Hotkey Command Palette
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Hit <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-neutral-800 text-[10px]">Ctrl+Shift+M</kbd> anywhere on your system to summon the AI assistant instantly over any application.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-blue-700 font-semibold">
                <span>System-Wide Overlay</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">Quick Summon</span>
              </div>
            </div>

            {/* Card 4: Hardware-Secured AES-256 Vault */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Hardware-Secured AES-256 Vault
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  API tokens are encrypted with Windows DPAPI / macOS Keychain / Linux SecretService. Keys are never transmitted over the cloud.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-amber-700 font-semibold">
                <span>Hardware Enclave</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">No Plaintext</span>
              </div>
            </div>

            {/* Card 5: Native C++ Filesystem Engine */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <HardDrive className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Native C++ Filesystem Engine
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Sub-millisecond event loop watching 500k+ files via ReadDirectoryChangesW and inotify without battery drain or memory spikes.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-cyan-700 font-semibold">
                <span>0ms Event Lag</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800">500k Files</span>
              </div>
            </div>

            {/* Card 6: Monaco Core & Split-Diff Reviews */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <SplitSquareVertical className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Monaco Core &amp; Split-Diff Reviews
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Full VS Code keybindings, multi-tab split editor, syntax highlighting for 120+ languages, and side-by-side agent diffs with 1-click apply.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-indigo-700 font-semibold">
                <span>100% Keymap Parity</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">120+ Langs</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── COMPARISON MATRIX ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
              Architecture Breakdown
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">
              Why Developers Switch to mcode Desktop
            </h2>
            <p className="text-neutral-600 text-sm">
              See how mcode Desktop compares directly against traditional editors and cloud-tethered alternatives.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-neutral-200 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/90 border-b border-neutral-200 text-neutral-950 font-bold">
                <tr>
                  <th className="p-4 sm:p-5">Feature / Metric</th>
                  <th className="p-4 sm:p-5 bg-purple-50/60 text-purple-900 border-x border-purple-200/50">mcode Desktop</th>
                  <th className="p-4 sm:p-5">VS Code</th>
                  <th className="p-4 sm:p-5">Cursor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Cold Start Startup Time</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">0.3s (Instant)</td>
                  <td className="p-4 sm:p-5 text-neutral-500">4.8s ~ 6.2s</td>
                  <td className="p-4 sm:p-5 text-neutral-500">5.5s ~ 7.0s</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Idle Memory Usage</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">180 MB</td>
                  <td className="p-4 sm:p-5 text-neutral-500">1,420 MB</td>
                  <td className="p-4 sm:p-5 text-neutral-500">1,840 MB</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">100% Offline Local LLMs (Ollama/Llama.cpp)</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Native GPU Metal/CUDA</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-500">Plugin Required (Slow)</td>
                  <td className="p-4 sm:p-5 text-neutral-400">Cloud Only</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">File Watcher Scale (Monorepos)</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">500,000+ files (C++)</td>
                  <td className="p-4 sm:p-5 text-neutral-500">50,000 limit (Node.js)</td>
                  <td className="p-4 sm:p-5 text-neutral-500">50,000 limit (Node.js)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Encrypted Hardware Vault</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> DPAPI / Keychain</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-400">Settings Sync Plaintext</td>
                  <td className="p-4 sm:p-5 text-neutral-400">Cloud Account Bound</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Multi-Agent Autonomous Swarms</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Built-in DAG Engine</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-400">None</td>
                  <td className="p-4 sm:p-5 text-neutral-500">Single Thread Only</td>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready for Production Engineering</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 font-sans">
            Ready to Experience True Native Speed?
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-10">
            Download mcode Desktop in under 10 seconds. Free, open, and fully synchronized with your CLI and Web IDE configurations.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => triggerDownload(selectedOS, platformDetails[selectedOS].file)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Download for {selectedOS === 'windows' ? 'Windows' : selectedOS === 'mac' ? 'macOS' : 'Linux'}</span>
            </button>

            <Link
              href="/cli"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm border border-neutral-800 transition-all hover:scale-105 cursor-pointer"
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Explore Terminal CLI</span>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
