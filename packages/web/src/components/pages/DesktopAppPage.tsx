"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Monitor, Download, Shield, Cpu, Zap, ArrowRight,
  Terminal, HardDrive, CheckCircle2,
  Sparkles, Copy, CheckCheck, Laptop, Command,
  SplitSquareVertical, CheckCircle, ChevronRight,
  Bell, Box, Radio, RefreshCw, Layers
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function DesktopAppPage() {
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
    windows: 'winget install mcode-app',
    mac: 'brew install --cask mcode-app',
    linux: 'curl -fsSL https://mcode.dev/install-app.sh | bash',
  };

  const platformDetails = {
    windows: {
      name: 'Windows 10 / 11 (64-bit)',
      size: '54 MB',
      file: 'mcode-app-setup-x64.exe',
      format: '.exe (NSIS Installer & Portable)',
      arch: 'x64 & ARM64',
      badge: 'Auto WSL2 & Tray Daemon',
      desc: 'Signed native installer with system tray background runner, desktop shortcuts, and Windows DPAPI vault.',
    },
    mac: {
      name: 'macOS (Apple Silicon & Intel)',
      size: '58 MB',
      file: 'mcode-app-darwin-universal.dmg',
      format: '.dmg (Universal)',
      arch: 'Universal Binary (M1-M4 & Intel)',
      badge: 'Metal GPU & Menu Bar Tray',
      desc: 'Universal macOS build signed with Apple Developer certificate. Direct Metal GPU acceleration and native menu bar icon.',
    },
    linux: {
      name: 'Linux (Debian / Arch / Fedora)',
      size: '49 MB',
      file: 'mcode-app-x86_64.AppImage',
      format: '.AppImage & .deb',
      arch: 'x86_64 & aarch64',
      badge: 'Systemd & Desktop Integration',
      desc: 'Self-contained AppImage with freedesktop.org integration, inotify watchers, and SecretService keyring encryption.',
    },
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-white">
        {/* Soft background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-purple-200/40 via-indigo-100/40 to-emerald-200/40 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Version badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-sm text-purple-900 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <Monitor className="w-3.5 h-3.5 text-purple-600" />
            <span>Dedicated Desktop Client • v2.4.6</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Your Autonomous AI Swarm,{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              Packaged as a Native App
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-10 font-sans">
            Ditch browser tab throttling and WebSocket dropouts. The mcode Desktop App gives you an unthrottled background daemon, system tray integration, direct hardware PTY terminals, and 100% offline local GPU execution.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => triggerDownload(selectedOS, platformDetails[selectedOS].file)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(147,51,234,0.4)] hover:shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Download Desktop App</span>
              <span className="text-purple-200 text-xs font-normal">({platformDetails[selectedOS].format})</span>
            </button>

            <Link
              href="/web-ide"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-bold text-sm border border-neutral-200/90 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <span>Launch Web IDE Instead</span>
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
                    ? 'bg-purple-600 text-white shadow-sm'
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
                <Terminal className="w-4 h-4 text-purple-400 shrink-0" />
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

          {/* ─────────────────── NATIVE APP CLIENT SHOWCASE ─────────────────── */}
          <div className="relative max-w-5xl mx-auto rounded-3xl bg-neutral-950 p-2 sm:p-3 shadow-2xl border border-neutral-800/80 group">
            {/* Window Chrome Titlebar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 rounded-t-2xl border-b border-white/5 select-none">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] font-mono text-neutral-400 ml-3 hidden sm:inline">
                  mcode Client — God Mode Swarms Active — [System Tray: Armed]
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Background Daemon Running
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-neutral-300 border border-white/10 hidden md:inline">
                  Zero Tab Suspension
                </span>
              </div>
            </div>

            {/* Embedded App Interface Screenshot */}
            <div className="relative rounded-b-2xl overflow-hidden bg-neutral-950">
              <img
                src="/modes/preview-ai-assistant.png"
                alt="mcode Standalone Desktop App Interface"
                className="w-full h-auto object-cover rounded-b-2xl transition duration-500 group-hover:scale-[1.005]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 sm:p-6 pointer-events-none">
                <span className="text-xs font-mono text-purple-300 font-semibold bg-black/80 px-3 py-1.5 rounded-lg border border-purple-500/30 backdrop-blur-md">
                  System Tray • OS Push Alerts • Hardware Vault • 24/7 Swarms
                </span>
                <button
                  type="button"
                  onClick={() => triggerDownload(selectedOS, platformDetails[selectedOS].file)}
                  className="pointer-events-auto px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download mcode App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── PLATFORM DISTRIBUTION CARDS ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-neutral-50/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Native Distribution
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">Available for Your Workstation</h2>
            <p className="text-neutral-600 text-sm">Download digitally signed desktop client binaries with auto-update support.</p>
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
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">54 MB</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  Signed NSIS installer + portable single-file executable with automatic background daemon startup and system tray controls.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>System tray icon &amp; quick summon</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Windows DPAPI master vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>PowerShell 7 &amp; WSL2 native PTY</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => triggerDownload('windows', 'mcode-app-setup-x64.exe')}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .exe (Installer)</span>
                </button>
                <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100 text-[10px] font-mono text-neutral-600">
                  <span className="truncate">winget install mcode-app</span>
                  <button
                    type="button"
                    onClick={() => copyCommand('winget install mcode-app')}
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
                    macOS (Apple Silicon &amp; Intel)
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">58 MB</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  Universal DMG signed with Apple Developer ID. Native menu bar status widget and Metal GPU acceleration for local Ollama.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Apple Silicon M1-M4 Metal GPU</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>macOS Keychain hardware encryption</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Menu bar widget with quick prompt</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => triggerDownload('mac', 'mcode-app-darwin-universal.dmg')}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .dmg (Universal)</span>
                </button>
                <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100 text-[10px] font-mono text-neutral-600">
                  <span className="truncate">brew install --cask mcode-app</span>
                  <button
                    type="button"
                    onClick={() => copyCommand('brew install --cask mcode-app')}
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
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">49 MB</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-4">
                  Self-contained AppImage and Debian package. Native systemd service management and desktop notification daemon integration.
                </p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>AppImage &amp; .deb distribution</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Linux SecretService keyring vault</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-700 font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Docker daemon bridge with 0 setup</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => triggerDownload('linux', 'mcode-app-x86_64.AppImage')}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .AppImage</span>
                </button>
                <div className="mt-3 flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-100 text-[10px] font-mono text-neutral-600">
                  <span className="truncate">curl -fsSL https://mcode.dev/install-app.sh | bash</span>
                  <button
                    type="button"
                    onClick={() => copyCommand('curl -fsSL https://mcode.dev/install-app.sh | bash')}
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

      {/* ─────────────────── 6 APP SUPERPOWER CARDS ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Desktop Native Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mt-3 mb-3">
              Why Run the Native Desktop App?
            </h2>
            <p className="text-neutral-600 text-sm">
              Features engineered exclusively for continuous development workflows that cannot live inside a sandboxed browser tab.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: Unthrottled Swarms */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Unthrottled Background Swarms
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Web browsers freeze inactive tabs and kill WebSockets. The native client keeps autonomous God Mode swarms and test runners running 24/7 without sleep.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono text-purple-700 font-semibold">
                <span>24/7 Execution</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Zero Throttling</span>
              </div>
            </div>

            {/* Card 2: System Tray & Push Alerts */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  System Tray &amp; Native Push Alerts
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Minimize mcode to your OS system tray or menu bar. Receive instant native push banners when autonomous task waves complete or tests verify.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-semibold">
                <span>OS Native Notifications</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Tray Armed</span>
              </div>
            </div>

            {/* Card 3: Host PTY Terminals */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Terminal className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Direct Host PTY &amp; Low-Latency Shells
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Bypass browser proxy layers. Open zero-lag native pseudo-terminals connecting directly to Bash, Zsh, PowerShell 7, or WSL2 on your machine.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono text-blue-700 font-semibold">
                <span>Direct Kernel PTY</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">&lt; 1ms Latency</span>
              </div>
            </div>

            {/* Card 4: Docker Auto-Orchestration */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Box className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Docker Sandbox Auto-Orchestration
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Automatically detects your Docker socket, spins up isolated backend and Redis worker containers, and handles health checks without manual CLI commands.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono text-amber-700 font-semibold">
                <span>Docker Socket Bridge</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Auto Spinup</span>
              </div>
            </div>

            {/* Card 5: Hardware Master Vault */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Hardware-Backed Master Vault
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  API tokens and secrets are protected with Windows DPAPI, macOS Keychain, and Linux SecretService. Zero plain text in repo files or git.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono text-indigo-700 font-semibold">
                <span>OS Credential Enclave</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">Hardware AES</span>
              </div>
            </div>

            {/* Card 6: 100% Offline Local GPU Engine */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  100% Offline Local GPU Engine
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Seamless bridge to Ollama and Llama.cpp. Execute DeepSeek-R1, Qwen 2.5 Coder, and Llama 3.3 locally on your GPU with zero cloud egress.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-200/60 flex items-center justify-between text-[11px] font-mono text-rose-700 font-semibold">
                <span>CUDA &amp; Metal Ready</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Air-Gapped</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── APP VS BROWSER COMPARISON ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200">
              Environment Showdown
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">
              Desktop App vs Web Browser
            </h2>
            <p className="text-neutral-600 text-sm">
              Why demanding multi-file refactoring runs significantly smoother inside the native desktop application.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/90 border-b border-neutral-200 text-neutral-950 font-bold">
                <tr>
                  <th className="p-4 sm:p-5">Capability</th>
                  <th className="p-4 sm:p-5 bg-purple-50/60 text-purple-900 border-x border-purple-200/50">mcode Desktop App</th>
                  <th className="p-4 sm:p-5">Web Browser Tab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Background Swarm Persistence</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> 24/7 Uninterrupted</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-500">Frozen on Tab Inactivity</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">System Tray &amp; Native Push Alerts</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Native OS Banners &amp; Tray</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-500">Browser Permissions Required</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Terminal Shell Execution</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Direct Kernel PTY (/dev/pts)</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-500">Proxied WebSocket Relay</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Local Docker Container Auto-Start</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Automatic Docker Socket Check</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-500">Manual Terminal Commands</td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-bold text-neutral-900">Vault Hardware Key Security</td>
                  <td className="p-4 sm:p-5 bg-purple-50/30 text-emerald-600 font-bold border-x border-purple-200/30">
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Windows DPAPI / macOS Keychain</span>
                  </td>
                  <td className="p-4 sm:p-5 text-neutral-500">LocalStorage / Session Cookie</td>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built for High-Velocity Engineering</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 font-sans">
            Ready to Supercharge Your Coding Swarms?
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-10">
            Download the mcode Desktop App in under 10 seconds. Free, open, and fully synchronized across your CLI, Web IDE, and Desktop environments.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => triggerDownload(selectedOS, platformDetails[selectedOS].file)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(147,51,234,0.5)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Download Desktop App</span>
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

