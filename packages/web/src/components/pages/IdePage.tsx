"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Monitor, Download, Shield, Cpu, Zap, ArrowRight,
  Check, Terminal, HardDrive, CheckCircle2, ChevronDown,
  Layers, ExternalLink, Sparkles, RefreshCw
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function IDEPage() {
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac' | 'linux'>('windows');

  const triggerDownload = (os: string, fileName: string) => {
    toast.success(`Starting download: ${fileName}`);
    const link = document.createElement('a');
    link.href = `#download-${os}`;
    link.click();
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-36 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[400px] bg-gradient-to-tr from-purple-200/40 via-pink-100/35 to-emerald-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200 shadow-sm text-purple-800 text-xs font-bold uppercase tracking-wider mb-6">
            <Monitor className="w-3.5 h-3.5 text-purple-600" />
            <span>Native Desktop Powerhouse • v2.4.6</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            The Standalone AI IDE{' '}
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-600 bg-clip-text text-transparent">
              Engineered for Speed
            </span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            Ditch bloated electron runtimes. mcode Desktop uses a lightweight native core, native C++ filesystem watchers, multi-split terminal layouts, and offline local LLM execution.
          </p>

          {/* Primary Download Button */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <button
              onClick={() => triggerDownload(selectedOS, `mcode-desktop-${selectedOS}.exe`)}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(147,51,234,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Download for {selectedOS === 'windows' ? 'Windows (.exe)' : selectedOS === 'mac' ? 'macOS (.dmg)' : 'Linux (.AppImage)'}</span>
            </button>

            {/* OS Picker */}
            <div className="flex items-center bg-white border border-neutral-200 rounded-full p-1 text-xs shadow-sm">
              {(['windows', 'mac', 'linux'] as const).map((os) => (
                <button
                  key={os}
                  onClick={() => setSelectedOS(os)}
                  className={`px-3.5 py-1.5 rounded-full font-bold capitalize transition-all cursor-pointer ${
                    selectedOS === os ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {os}
                </button>
              ))}
            </div>
          </div>

          {/* ─────────────────── PLATFORM DOWNLOAD CARDS ─────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-5xl mx-auto mb-20">
            {/* Windows Card */}
            <div className="p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  Windows 10 / 11 (64-bit)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">84 MB</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                Native installer with PowerShell 7 and WSL2 auto-detection, desktop shortcuts, and background daemon service.
              </p>
              <button
                onClick={() => triggerDownload('windows', 'mcode-setup-x64.exe')}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-purple-600 text-neutral-800 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .exe (Installer)</span>
              </button>
            </div>

            {/* macOS Card */}
            <div className="p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  macOS (Apple Silicon & Intel)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">89 MB</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                Universal DMG signed with Apple Developer certificate. Native Metal GPU acceleration for local Ollama models.
              </p>
              <button
                onClick={() => triggerDownload('mac', 'mcode-darwin-arm64.dmg')}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-purple-600 text-neutral-800 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .dmg (Universal)</span>
              </button>
            </div>

            {/* Linux Card */}
            <div className="p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-purple-400 transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-neutral-950 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  Linux (Debian / Arch / Fedora)
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">79 MB</span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                Self-contained AppImage and .deb package. Full integration with system bash/zsh, Docker daemon, and systemd daemons.
              </p>
              <button
                onClick={() => triggerDownload('linux', 'mcode-linux-x86_64.AppImage')}
                className="w-full py-2.5 rounded-xl bg-neutral-100 hover:bg-purple-600 text-neutral-800 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .AppImage</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── PERFORMANCE BENCHMARKS ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-neutral-950 mb-3">Engineered for Raw Speed</h2>
            <p className="text-neutral-600 text-sm">We obsess over millisecond latencies and lean memory consumption.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-3xl bg-neutral-50/70 border border-neutral-200">
              <p className="text-xs font-mono font-bold text-neutral-500 mb-2">IDLE MEMORY FOOTPRINT</p>
              <p className="text-4xl font-black text-emerald-600 mb-2 font-sans">180 MB</p>
              <p className="text-xs text-neutral-600">vs 1.4 GB (VS Code) & 1.8 GB (Cursor)</p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-50/70 border border-neutral-200">
              <p className="text-xs font-mono font-bold text-neutral-500 mb-2">COLD START TIME</p>
              <p className="text-4xl font-black text-purple-600 mb-2 font-sans">0.3s</p>
              <p className="text-xs text-neutral-600">Instant launch without heavy extension churn</p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-50/70 border border-neutral-200">
              <p className="text-xs font-mono font-bold text-neutral-500 mb-2">FILE WATCHER CAPACITY</p>
              <p className="text-4xl font-black text-cyan-600 mb-2 font-sans">500k+ Files</p>
              <p className="text-xs text-neutral-600">Native C++ inotify / ReadDirectoryChangesW</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── DESKTOP EXCLUSIVE POWERS ─────────────────── */}
      <section className="py-20 border-t border-neutral-200/80 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-neutral-950 mb-3">Desktop Exclusive Capabilities</h2>
            <p className="text-neutral-600 text-sm">Direct hardware and filesystem integration that browsers cannot offer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-700 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 mb-1.5">Offline Local Ollama & Llama.cpp Support</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Run DeepSeek-R1, Qwen 2.5 Coder, and Llama 3.3 locally on your GPU. Your proprietary source code never leaves your workstation.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 mb-1.5">Multi-Split Terminal Profiles</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Open parallel terminal panes across PowerShell 7, WSL2 Ubuntu, Zsh, and Docker exec simultaneously with zero latency.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-100 text-blue-700 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 mb-1.5">Global Hotkey Command Palette</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Hit <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-200 font-mono text-neutral-800 text-[10px]">Ctrl+Shift+M</kbd> anywhere on your system to summon the AI assistant instantly over any application.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-950 mb-1.5">Hardware-Secured AES-256 Vault</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  API tokens are encrypted with Windows DPAPI / macOS Keychain / Linux SecretService. Keys are never transmitted over the cloud.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}