"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Smartphone, Download, QrCode, Wifi, Bell, Shield,
  Mic, CheckCircle2, Sparkles, ExternalLink, ArrowRight,
  Check, Copy, CheckCheck, RefreshCw, Layers, Terminal,
  Globe, ChevronRight, Play, CheckCircle
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function MobileAppPage() {
  const [copiedPairCmd, setCopiedPairCmd] = useState(false);
  const [diffApproved, setDiffApproved] = useState(false);

  const triggerDownloadApk = () => {
    toast.success('Starting download: mcode-v2.4.6.apk');
    const link = document.createElement('a');
    link.href = '/downloads/mcode-v2.4.6.apk';
    link.setAttribute('download', 'mcode-v2.4.6.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPairCommand = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('mcode pair --qr');
      setCopiedPairCmd(true);
      toast.success('Copied: mcode pair --qr');
      setTimeout(() => setCopiedPairCmd(false), 2000);
    }
  };

  return (
    <Layout>
      {/* ─────────────────── HERO ─────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-white">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-gradient-to-tr from-emerald-200/40 via-purple-100/35 to-blue-200/40 blur-[130px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto px-6 text-center">
          {/* Version badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-neutral-200/90 shadow-sm text-emerald-900 text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mobile Companion App • Android &amp; iOS • v2.4.6</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 max-w-4xl mx-auto leading-[1.1] mb-6 font-sans">
            Your Autonomous AI Swarm,{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Right in Your Pocket
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed mb-10 font-sans">
            Never wait at your desk for long-running builds. Monitor God Mode subagent waves, approve split diffs, voice-prompt codebases, and pair seamlessly with your workstation over LAN.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <button
              type="button"
              onClick={triggerDownloadApk}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Download Android APK</span>
              <span className="text-emerald-200 text-xs font-normal">(Direct 28 MB)</span>
            </button>

            <a
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current text-emerald-400" />
              <span>Google Play</span>
            </a>

            <a
              href="https://testflight.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm border border-neutral-200/90 shadow-sm transition-all hover:scale-105 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span>iOS TestFlight</span>
            </a>
          </div>

          {/* 1-Click Terminal Pairing Command */}
          <div className="max-w-md mx-auto mb-16">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-left shadow-lg">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                <code className="text-xs font-mono text-neutral-200 truncate">
                  $ mcode pair --qr
                </code>
              </div>
              <button
                type="button"
                onClick={copyPairCommand}
                aria-label="Copy pair command"
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy pair command"
              >
                {copiedPairCmd ? (
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-2 font-medium">
              Run in your project directory to instantly pair mobile app with your workstation.
            </p>
          </div>

          {/* ─────────────────── SMARTPHONE DEVICE SHOWCASE ─────────────────── */}
          <div className="relative max-w-sm mx-auto">
            {/* Phone Outer Chassis */}
            <div className="relative rounded-[48px] p-3.5 bg-gradient-to-b from-neutral-800 via-neutral-900 to-black shadow-2xl border-4 border-neutral-700/80 ring-1 ring-white/10">
              {/* Dynamic Island / Speaker cutout */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-20 flex items-center justify-between px-3">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 inline-block border border-neutral-800" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse inline-block" />
              </div>

              {/* Inner Screen */}
              <div className="relative rounded-[36px] bg-[#0c0d14] overflow-hidden text-left font-sans text-xs text-neutral-200 pt-9 pb-6 px-4 border border-neutral-800 shadow-inner">
                {/* Mobile Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-4 px-1">
                  <span>9:41</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-emerald-400">5G</span>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>100%</span>
                  </div>
                </div>

                {/* Mobile Connection Pill */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-white">MacBook-Pro.local</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    LAN Sync
                  </span>
                </div>

                {/* Active Swarm Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-neutral-900 to-[#141522] border border-neutral-800 mb-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      God Mode Wave #3
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded font-bold">
                      claude-3-5
                    </span>
                  </div>
                  <p className="text-[11.5px] text-neutral-300 font-medium mb-3">
                    Refactor Stripe webhook handlers &amp; add idempotency keys
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                      <span>Subagents: 4/4 passing</span>
                      <span className="text-emerald-400 font-bold">100%</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                </div>

                {/* Proposed Diff Card on Phone */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 mb-4">
                  <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                    <span className="text-white font-bold">api/webhook.ts</span>
                    <span className="text-emerald-400 font-bold">+24 / -3</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/60 font-mono text-[10px] text-neutral-400 space-y-1 mb-3">
                    <p className="text-neutral-500">// Idempotency check</p>
                    <p className="text-emerald-400 bg-emerald-500/10 px-1 rounded">+ const event = await stripe.verify();</p>
                    <p className="text-emerald-400 bg-emerald-500/10 px-1 rounded">+ if (await db.has(event.id)) return 200;</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDiffApproved(!diffApproved);
                        toast.success(diffApproved ? 'Diff reset' : 'Approved on workstation from mobile!');
                      }}
                      className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{diffApproved ? 'Approved ✓' : '1-Tap Approve'}</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Voice Prompt Bar */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-neutral-900 border border-neutral-800">
                  <input
                    type="text"
                    placeholder="Speak or type prompt..."
                    readOnly
                    className="bg-transparent outline-none text-white text-xs px-2 w-full placeholder-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => toast.info('Voice mic activated')}
                    className="p-2 rounded-xl bg-emerald-500 text-black cursor-pointer hover:bg-emerald-400 transition"
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 6 MOBILE SUPERPOWERS ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-neutral-50/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Pocket Engineering
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mt-3 mb-3">
              Mobile Exclusive Capabilities
            </h2>
            <p className="text-neutral-600 text-sm">
              Purpose-built features designed for developers who want continuous autonomy without being chained to a desk.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1: On-The-Go Swarms */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  On-The-Go Swarm Control
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Trigger autonomous God Mode waves right from your phone. Watch subagents formulate architectural DAGs and implement multi-file changes remotely.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-emerald-700 font-semibold">
                <span>Multi-Wave Execution</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">Autonomous</span>
              </div>
            </div>

            {/* Card 2: Push Notifications & Wave Alerts */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Push Notifications &amp; Alerts
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Get instant lock-screen push notifications when a background task finishes, all unit tests pass, or human approval is needed for a schema migration.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-purple-700 font-semibold">
                <span>Lock-Screen Banners</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-800">Zero Wait</span>
              </div>
            </div>

            {/* Card 3: 1-Click Wi-Fi & Cloud Pairing */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Wifi className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  1-Click Wi-Fi &amp; QR Pairing
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Point your phone camera at your terminal or desktop IDE QR code to securely link over local Wi-Fi or end-to-end encrypted WebSockets.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-blue-700 font-semibold">
                <span>Zero Port-Forwarding</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">Auto Discovery</span>
              </div>
            </div>

            {/* Card 4: Mobile Diff Approvals */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Mobile Diff Approvals &amp; Reviews
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Review proposed code changes line-by-line with mobile-optimized syntax highlighting. Tap to merge directly into your git workspace.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-cyan-700 font-semibold">
                <span>1-Tap Merge</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800">Git Synced</span>
              </div>
            </div>

            {/* Card 5: Voice-to-Code Architecture */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Voice-to-Code Architecture
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Dictate high-level architectural requirements while on a walk or commute. mcode converts voice notes into structured prompt waves.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-amber-700 font-semibold">
                <span>Speech-to-Prompt</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">Hands-Free</span>
              </div>
            </div>

            {/* Card 6: Biometric Vault */}
            <div className="p-7 rounded-3xl bg-white border border-neutral-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-950 mb-2">
                  Biometric Hardware Vault
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Unlock your project secrets and cloud keys using FaceID, TouchID, or Android Biometrics. Protected with device-level secure enclaves.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-indigo-700 font-semibold">
                <span>Secure Enclave</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800">Biometric AES</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── 3 STEP PAIRING GUIDE ─────────────────── */}
      <section className="py-24 border-t border-neutral-200/80 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full border border-neutral-200">
              Zero Configuration
            </span>
            <h2 className="text-3xl font-extrabold text-neutral-950 mt-3 mb-2">
              Pair in Under 10 Seconds
            </h2>
            <p className="text-neutral-600 text-sm">
              Connect your phone to your workstation with zero complex network setup.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-neutral-50/80 border border-neutral-200 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-neutral-950 mb-2">Run mcode pair</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Execute <code className="text-emerald-700 font-bold font-mono">mcode pair --qr</code> in your terminal or click the Mobile icon in your desktop IDE.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-50/80 border border-neutral-200 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-neutral-950 mb-2">Scan QR Code</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Open mcode on your Android or iPhone and point the camera at your desktop screen to establish end-to-end encryption.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-neutral-50/80 border border-neutral-200 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-neutral-950 mb-2">Orchestrate Freely</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Start God Mode swarms, review diffs, and receive instant push notifications as code is generated on your machine.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── FINAL CTA BANNER ─────────────────── */}
      <section className="py-20 bg-neutral-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 relative text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Coding Anywhere</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 font-sans">
            Ready to Take mcode With You?
          </h2>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-10">
            Download mcode for Android or iOS today. Free, open, and fully connected to your workstation.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={triggerDownloadApk}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Download Android APK</span>
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
