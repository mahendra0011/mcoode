"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Cpu, Shield, Zap, Sparkles, Layers, ArrowRight,
  Check, Copy, Play, GitBranch, RefreshCw, Lock, Globe,
  Monitor, Puzzle, ChevronRight, CheckCircle2, MessageSquare,
  Activity, Star, Download, Code2, Database, ExternalLink,
  Laptop, CheckCircle, Flame, Rocket, ChevronDown, Smartphone
} from 'lucide-react';
import { Layout } from '../layout/Layout';
import { toast } from 'sonner';

export function LandingPage() {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(78);

  const copyInstall = () => {
    navigator.clipboard.writeText('npm install -g mcode');
    setCopiedCmd(true);
    toast.success('Copied: npm install -g mcode');
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedProgress((p) => (p >= 100 ? 60 : p + 4));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <Layout>
      {/* ─────────────────── MOTION GRAPHIC HERO SECTION (LIGHT MODE) ─────────────────── */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        {/* Ambient Motion Mesh Gradients */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-emerald-200/40 via-teal-100/35 to-indigo-200/40 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-cyan-200/30 blur-[110px] rounded-full pointer-events-none -z-10 animate-float" />
        <div className="absolute top-60 left-10 w-80 h-80 bg-violet-200/25 blur-[100px] rounded-full pointer-events-none -z-10" />

        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none -z-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

        <div className="max-w-6xl mx-auto px-6">
          {/* Main Hero Grid: Left Content, Right 3D Metallic MCODE Logo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 text-left">
            {/* Left Column (7 cols): Content & CTAs */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Animated Announcement Pill */}
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 p-1 pl-3.5 pr-4 rounded-full bg-white/90 border border-neutral-200/80 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] text-xs font-semibold text-neutral-800 mb-6 hover:scale-105 transition-transform"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="bg-gradient-to-r from-emerald-700 via-teal-700 to-indigo-700 bg-clip-text text-transparent font-bold">
                  mcode v2.4
                </span>
                <span className="text-neutral-400">•</span>
                <span className="text-neutral-600">Autonomous Swarm Engine & Multi-Model CLI</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </motion.div>

              {/* Main Hero Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-neutral-950 leading-[1.1] mb-6 font-sans"
              >
                Code at the Speed of Thought with{' '}
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
                  Autonomous AI Swarms
                </span>
              </motion.h1>

              {/* Hero Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-base sm:text-lg text-neutral-600 leading-relaxed mb-8 font-normal max-w-xl"
              >
                Terminal-first, multi-model AI coding engine. Plan architectures, dispatch parallel subagents, and auto-heal breaking builds with background watch daemons.
              </motion.p>

              {/* CTA Action Hero Group */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-full max-w-xl space-y-3"
              >
                {/* Primary Launch & CLI Install Row */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                  {/* 1. Start Web IDE (Primary Action) */}
                  <Link
                    href="/web-ide"
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-[0_4px_16px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.5)] transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-emerald-200" />
                    <span>Start Web IDE</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {/* 2. mcode Install Command Button */}
                  <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white border border-neutral-200 shadow-sm font-mono text-xs text-neutral-800 hover:border-neutral-300 transition-colors">
                    <Link
                      href="/cli"
                      className="flex items-center gap-2 hover:text-emerald-700 transition-colors"
                      title="View CLI Documentation"
                    >
                      <span className="text-emerald-600 font-extrabold">$</span>
                      <span className="font-semibold select-all">npm install -g mcode</span>
                    </Link>
                    <button
                      onClick={copyInstall}
                      type="button"
                      aria-label="Copy install command"
                      className="p-1 rounded-md hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                      title="Click to copy install command"
                    >
                      {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Platform Downloads Bar (Equal 3-column grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full max-w-[530px] pt-0.5">
                  {/* 3. Download Software (Desktop App) */}
                  <Link
                    href="/ide"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs border border-neutral-200 shadow-sm hover:border-neutral-300 hover:shadow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                    title="Download Desktop Software for Windows, macOS, and Linux"
                  >
                    <Monitor className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>Download Software</span>
                  </Link>

                  {/* 4. Download App */}
                  <Link
                    href="/mcode"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs border border-neutral-200 shadow-sm hover:border-neutral-300 hover:shadow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                    title="Download Mobile & Companion App"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Download App</span>
                  </Link>

                  {/* 5. VS Code Extension */}
                  <Link
                    href="/vscode"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs border border-neutral-200 shadow-sm hover:border-neutral-300 hover:shadow transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap cursor-pointer"
                    title="Install official VS Code Extension"
                  >
                    <Puzzle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>VS Code Extension</span>
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Right Column (5 cols): Glowing 3D Metallic MCODE Logo Showcase */}
            <div className="lg:col-span-5 flex items-center justify-center relative mt-6 lg:mt-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative group w-full max-w-[420px]"
              >
                {/* Multi-layered Neon Ambient Halos */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/30 via-indigo-500/25 to-purple-600/30 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition duration-700 pointer-events-none" />
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-teal-500/20 opacity-50 blur-sm pointer-events-none" />

                {/* Card Container with Glassmorphism */}
                <div className="relative rounded-3xl p-3 bg-neutral-950/95 border border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6),0_0_40px_rgba(59,130,246,0.25)] overflow-hidden">
                  {/* Subtle Grid Accent */}
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                  {/* Floating 3D Image */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 rounded-2xl overflow-hidden bg-black/80 flex items-center justify-center p-2 border border-white/5"
                  >
                    <img
                      src="/hero-logo.png"
                      alt="MCODE 3D Metallic Logo"
                      className="w-full h-auto object-contain rounded-xl drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] filter group-hover:brightness-110 transition duration-500"
                    />
                  </motion.div>

                  {/* Floating Feature Badges */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-emerald-500/30 backdrop-blur-md shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-emerald-300">v2.4 Swarm Core</span>
                  </div>

                  <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-blue-500/30 backdrop-blur-md shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span className="text-[11px] font-mono font-semibold text-blue-200">
                      Multi-Model Orchestration
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* ─────────────────── THREE CORE WORKSPACE MODES SHOWCASE (STACKED ALTERNATING) ─────────────────── */}
          <div className="mt-20 space-y-24">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold uppercase tracking-wider mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Three Unified AI Environments
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 tracking-tight mb-4">
                Engineered for Every Stage of Software Creation
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Work seamlessly across conversational architecture, autonomous agentic file manipulation, and full-featured cloud IDE editing.
              </p>
            </div>

            {/* ─── MODE 1: AI Chat (Image on LEFT, Text on RIGHT) ─── */}
            <motion.div
              id="mode-section-chat"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              {/* Image on Left (7 cols) */}
              <div className="lg:col-span-7">
                <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] p-2.5 sm:p-3 group">
                  {/* Ambient Glow */}
                  <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-500/15 blur-[80px] pointer-events-none rounded-full" />

                  {/* macOS Titlebar */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block" />
                      <span className="text-[11px] font-mono text-neutral-400 ml-2">mcode — ai chat [llama-3.3-70b]</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Ready
                    </span>
                  </div>

                  <Link href="/ai/chat?tab=Chat" className="block relative overflow-hidden rounded-xl">
                    <img
                      src="/modes/preview-ai-chat.png"
                      alt="AI Chat Mode Preview"
                      className="w-full h-auto object-cover rounded-xl transition duration-500 group-hover:scale-[1.015]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                      <span className="text-xs font-mono font-bold text-white">Click to launch AI Chat</span>
                      <span className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1">
                        Open <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Text on Right (5 cols) */}
              <div className="lg:col-span-5 space-y-5 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  01 / Conversational Architecture
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mb-2">
                    AI Chat
                  </h3>
                  <p className="text-sm font-semibold text-emerald-700 mb-2">
                    Natural Language Architecture & Planning
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Stream answers, ask follow-up questions, design databases, and brainstorm with state-of-the-art models like Llama 3.3 70B, Claude 3.5 Sonnet, and GPT-4o.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-neutral-900">Real-Time Streaming</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Zero lag token generation & markdown rendering</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-neutral-900">Model Switcher</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Pick Llama, Claude, GPT, or Gemini instantly</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-neutral-900">Context Memory</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Organized session histories and project groups</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-neutral-900">Instant Handoff</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Export brainstormed specs into code with 1 click</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/ai/chat?tab=Chat"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Launch AI Chat</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* ─── MODE 2: AI Code Assistant (Text on LEFT, Image on RIGHT) ─── */}
            <motion.div
              id="mode-section-assistant"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              {/* Text on Left (5 cols) */}
              <div className="lg:col-span-5 space-y-5 text-left order-2 lg:order-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  02 / Autonomous Workflow
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mb-2">
                    AI Code Assistant
                  </h3>
                  <p className="text-sm font-semibold text-purple-700 mb-2">
                    Autonomous Multi-Step Code Agent
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Execute agentic coding sequences with God Mode prompt enhancement, workspace branch tracking, and clean AST security scans.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-neutral-900">God Mode Auto-Turns</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Multi-turn file generation & self-healing execution</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-neutral-900">Clean Code Scanner</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Automatic lint, typecheck, and AST security pass</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-neutral-900">Git Branch Awareness</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Target branches and commit checkpoints safely</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-bold text-neutral-900">Prompt Enhancer</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">AI-expanded instructions for zero-shot accuracy</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/ai/chat?tab=AI+Code+Assistant"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Launch AI Code Assistant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Image on Right (7 cols) */}
              <div className="lg:col-span-7 order-1 lg:order-2">
                <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] p-2.5 sm:p-3 group">
                  {/* Ambient Glow */}
                  <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-500/15 blur-[80px] pointer-events-none rounded-full" />

                  {/* macOS Titlebar */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block" />
                      <span className="text-[11px] font-mono text-neutral-400 ml-2">mcode — ai code assistant [god mode]</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-purple-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      Agent Active
                    </span>
                  </div>

                  <Link href="/ai/chat?tab=AI+Code+Assistant" className="block relative overflow-hidden rounded-xl">
                    <img
                      src="/modes/preview-ai-assistant.png"
                      alt="AI Code Assistant Mode Preview"
                      className="w-full h-auto object-cover rounded-xl transition duration-500 group-hover:scale-[1.015]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                      <span className="text-xs font-mono font-bold text-white">Click to launch AI Code Assistant</span>
                      <span className="px-3 py-1 rounded-lg bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1">
                        Open <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* ─── MODE 3: AI Code Editor (Image on LEFT, Text on RIGHT) ─── */}
            <motion.div
              id="mode-section-editor"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              {/* Image on Left (7 cols) */}
              <div className="lg:col-span-7">
                <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] p-2.5 sm:p-3 group">
                  {/* Ambient Glow */}
                  <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-500/15 blur-[80px] pointer-events-none rounded-full" />

                  {/* macOS Titlebar */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800/80 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block" />
                      <span className="text-[11px] font-mono text-neutral-400 ml-2">mcode — ai code editor [monaco + bash]</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      Container Live
                    </span>
                  </div>

                  <Link href="/ai/chat?tab=AI+Code+Editor" className="block relative overflow-hidden rounded-xl">
                    <img
                      src="/modes/preview-ai-editor.png"
                      alt="AI Code Editor Mode Preview"
                      className="w-full h-auto object-cover rounded-xl transition duration-500 group-hover:scale-[1.015]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                      <span className="text-xs font-mono font-bold text-white">Click to launch AI Code Editor</span>
                      <span className="px-3 py-1 rounded-lg bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1">
                        Open <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </div>
              </div>

              {/* Text on Right (5 cols) */}
              <div className="lg:col-span-5 space-y-5 text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold font-mono uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  03 / Cloud IDE & Terminal
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 tracking-tight mb-2">
                    AI Code Editor
                  </h3>
                  <p className="text-sm font-semibold text-blue-700 mb-2">
                    Full-Featured Cloud IDE + Integrated Linux Terminal
                  </p>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                    Desktop-grade browser IDE powered by Monaco, integrated Linux terminal container, multi-tab file tree, and side-by-side Explain & Agent assistance.
                  </p>
                </div>

                {/* Capability Cards */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Code2 className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-neutral-900">Monaco Core</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">VS Code shortcuts, syntax highlighting & diffs</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Terminal className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-neutral-900">Integrated Terminal</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Real bash shell connected to project workspace</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-neutral-900">Multi-Tier File Tree</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Instant folder hierarchy, zip uploads & git clones</p>
                  </div>

                  <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80">
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-neutral-900">Explain & Agent Dock</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 leading-tight">Side-by-side code explain and generation</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/ai/chat?tab=AI+Code+Editor"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Launch AI Code Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────────── MOTION GRAPHIC LIVE STATS BANNER ─────────────────── */}
      <section className="py-12 border-y border-neutral-200/80 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { stat: '12x', label: 'Faster Parallel Swarms', sub: 'vs Single Thread' },
              { stat: '99.4%', label: 'Build Auto-Heal Rate', sub: 'Zero Broken Builds' },
              { stat: '40+', label: 'Supported AI Models', sub: 'Cloud & Local Ollama' },
              { stat: '< 80ms', label: 'Local P99 Latency', sub: 'Zero Lag Web IDE' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-neutral-50/70 border border-neutral-200/70 hover:border-emerald-300 transition-colors"
              >
                <div className="text-3xl sm:text-4xl font-black text-neutral-950 font-sans tracking-tight mb-1 bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
                  {s.stat}
                </div>
                <div className="text-xs font-bold text-neutral-900 mb-0.5">{s.label}</div>
                <div className="text-[11px] text-neutral-500 font-medium">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── MCODE CLI TERMINAL SHOWCASE SECTION ─────────────────── */}
      <section className="relative py-28 bg-[#090d12] text-white overflow-hidden border-b border-neutral-800">
        {/* Ambient Dark-Cyber Matrix Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent blur-[120px] pointer-events-none -z-10" />
        <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-cyan-500/10 blur-[130px] pointer-events-none -z-10" />
        {/* Terminal Matrix Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />

        <div className="max-w-6xl mx-auto px-6">
          {/* Header Row */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold mb-5 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>TERMINAL-FIRST AUTONOMOUS CODING</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-5"
            >
              Control Autonomous AI Swarms from Your{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Command Line
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-neutral-400 text-sm sm:text-base leading-relaxed"
            >
              MCODE CLI is an ultra-fast, multi-model AI coding engine built right inside your shell. Plan system architectures, dispatch parallel subagents with God Mode, and auto-heal breaking builds with real-time watch daemons.
            </motion.p>
          </div>

          {/* Featured Terminal Screenshot Showcase with Glow and Mac Titlebar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-[#0d1218]/90 shadow-[0_20px_70px_-15px_rgba(16,185,129,0.25)] p-2.5 sm:p-4 mb-8 sm:mb-10 overflow-hidden backdrop-blur-xl group"
          >
            {/* Terminal Window Chrome Titlebar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
                <span className="text-[12px] font-mono text-neutral-400 ml-2 hidden sm:inline">
                  ~/mcode-workspaces — mcode (OpenTUI v2.4)
                </span>
                <span className="text-[12px] font-mono text-neutral-400 ml-2 sm:hidden">
                  mcode cli
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  meta-llama/llama-3.3-70b-instruct
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-neutral-300 border border-white/10 hidden md:inline">
                  God Mode
                </span>
              </div>
            </div>

            {/* The Actual Terminal Screenshot */}
            <div className="relative rounded-xl overflow-hidden bg-black/90 border border-white/5">
              <img
                src="/mcode-cli-terminal.png"
                alt="MCODE CLI Terminal Interface Preview"
                className="w-full h-auto object-cover rounded-xl transition duration-500 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 sm:p-6 pointer-events-none">
                <span className="text-xs font-mono text-emerald-300 font-semibold bg-black/70 px-3 py-1.5 rounded-lg border border-emerald-500/30 backdrop-blur-md">
                  mcode --god &quot;build a rest api for orders&quot;
                </span>
                <Link
                  href="/cli"
                  className="pointer-events-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-sans flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95"
                >
                  <span>Explore CLI Commands</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Quick Copy CLI Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f151d] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-emerald-400 font-mono text-sm font-bold pl-2 select-none">$</span>
              <span className="font-mono text-xs sm:text-sm text-neutral-200">
                npm install -g mcode &amp;&amp; mcode
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText('npm install -g mcode && mcode');
                  toast.success('Copied: npm install -g mcode && mcode');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold font-mono flex items-center gap-2 transition cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copy Command</span>
              </button>
              <Link
                href="/cli"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-sans flex items-center gap-1.5 transition shadow-md shadow-emerald-500/20"
              >
                <span>Read CLI Docs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── THE 5 UNIFIED WAYS TO BUILD ─────────────────── */}
      <section className="py-24 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-4 tracking-tight">
              One Unified AI Engine. Five Ways to Build.
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              Work wherever you are most productive. Your encrypted vault, MCP tools, and subagents stay synchronized everywhere.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
            {/* 1: Terminal CLI */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Terminal className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950">Terminal CLI</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">v2.4</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Terminal-first agent. Autonomous swarms, file watchers, git rollback, and 25+ fast commands with zero UI overhead.
                </p>
              </div>
              <Link
                href="/cli"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-emerald-600 text-xs font-bold text-neutral-800 hover:text-white transition-all group-hover:shadow-md"
              >
                <span>Explore CLI</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 2: Web IDE */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-cyan-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950">Web IDE</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-mono font-bold">Cloud</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Zero setup in your browser. Embedded Monaco Editor, real xterm.js terminal, split diff reviews, and multi-model chat.
                </p>
              </div>
              <Link
                href="/web-ide"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-cyan-600 text-xs font-bold text-neutral-800 hover:text-white transition-all group-hover:shadow-md"
              >
                <span>Launch Web IDE</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 3: VS Code Plugin */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Puzzle className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950">VS Code Plugin</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold">VSIX</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Bring mcode inside your daily VS Code or Cursor editor. Contextual sidebar chat, inline diff generation, and quick fix.
                </p>
              </div>
              <Link
                href="/vscode"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-indigo-600 text-xs font-bold text-neutral-800 hover:text-white transition-all group-hover:shadow-md"
              >
                <span>Get Extension</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 4: Desktop Software */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-rose-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950">Desktop Software</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono font-bold">Native IDE</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Standalone desktop IDE powerhouse. Low-latency native filesystem watchers, multi-root tabs, and full local docker sandbox.
                </p>
              </div>
              <Link
                href="/ide"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-rose-600 text-xs font-bold text-neutral-800 hover:text-white transition-all group-hover:shadow-md"
              >
                <span>Download Software</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* 5: Desktop App */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-neutral-200/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] hover:shadow-xl hover:border-purple-300 transition-all flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <Monitor className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base sm:text-lg font-bold text-neutral-950">Desktop App</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono font-bold">Win/Mac</span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  Dedicated high-performance desktop client. Multi-terminal split profiles, Docker sandbox integration, and offline local LLMs.
                </p>
              </div>
              <Link
                href="/mcode"
                className="inline-flex items-center justify-between w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-purple-600 text-xs font-bold text-neutral-800 hover:text-white transition-all group-hover:shadow-md"
              >
                <span>Download App</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Access Action Bar for All 5 Ways */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-sm flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-2 hidden md:inline">Quick Links:</span>
            <Link
              href="/web-ide"
              className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold transition flex items-center gap-1.5 border border-cyan-200/80"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-600" />
              <span>Start Web IDE</span>
            </Link>
            <Link
              href="/cli"
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold font-mono transition flex items-center gap-1.5 border border-emerald-200/80"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <span>$ npm install -g mcode</span>
            </Link>
            <Link
              href="/ide"
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold transition flex items-center gap-1.5 border border-rose-200/80"
            >
              <Code2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Download Software</span>
            </Link>
            <Link
              href="/mcode"
              className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition flex items-center gap-1.5 border border-purple-200/80"
            >
              <Monitor className="w-3.5 h-3.5 text-purple-600" />
              <span>Download App</span>
            </Link>
            <Link
              href="/vscode"
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200/80"
            >
              <Puzzle className="w-3.5 h-3.5 text-indigo-600" />
              <span>VS Code Extension</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── 3 WORKING MODES SHOWCASE ─────────────────── */}
      <section className="py-24 bg-white border-t border-neutral-200/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-950 mb-4 tracking-tight">
              Three Distinct Working Modes
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base">
              Shift between interactive chat pairing, fully autonomous multi-agent execution, and automatic background healing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mode 1: Chat Mode */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 hover:border-blue-300 transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-5 shadow-sm">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-950 mb-2">1. Chat Pairing Mode</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                Interactive pairing for exploratory architecture questions, code reviews, debugging stack traces, and rubber-ducking.
              </p>
              <ul className="text-xs text-neutral-700 space-y-2.5 font-mono">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Stream responses in real-time</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  <span>Context tags: @file, @git, @docs</span>
                </li>
              </ul>
            </div>

            {/* Mode 2: God Mode */}
            <div className="p-7 rounded-3xl bg-emerald-50/60 border border-emerald-300/80 relative shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold shadow-sm">
                FLAGSHIP
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-200 text-emerald-800 flex items-center justify-center mb-5 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-950 mb-2">2. God Mode (Autonomous)</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                Full-stack agent mode. Deconstructs your prompt into a DAG dependency graph and launches subagents in parallel waves.
              </p>
              <ul className="text-xs text-neutral-800 space-y-2.5 font-mono font-medium">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Parallel multi-agent waves</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Atomic rollback checkpoints</span>
                </li>
              </ul>
            </div>

            {/* Mode 3: Watch & Auto-Heal */}
            <div className="p-7 rounded-3xl bg-neutral-50/70 border border-neutral-200/90 hover:border-amber-300 transition-colors">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-5 shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-950 mb-2">3. Watch & Auto-Heal</h3>
              <p className="text-xs text-neutral-600 leading-relaxed mb-5">
                Background daemon watches your Git repo. When you save a broken import or a test fails, mcode auto-fixes it.
              </p>
              <ul className="text-xs text-neutral-700 space-y-2.5 font-mono">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600" />
                  <span>Runs vitest/jest automatically</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-600" />
                  <span>Self-healing patch suggestions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── FINAL HIGH-IMPACT LIGHT CALL TO ACTION ─────────────────── */}
      <section className="py-24 bg-gradient-to-b from-[#f8fafc] to-emerald-50/40 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-14 h-14 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-6 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4)]">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-neutral-950 mb-6 tracking-tight font-sans">
            Ready to Supercharge Your Engineering?
          </h2>
          <p className="text-lg text-neutral-600 mb-10 max-w-xl mx-auto font-normal">
            Install mcode in seconds. Free for individual developers with bring-your-own-keys support and local Ollama execution.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/web-ide"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-[0_10px_30px_-5px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              Start Web IDE
            </Link>
            <Link
              href="/ide"
              className="px-8 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm border border-neutral-200 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              Download Software
            </Link>
            <Link
              href="/mcode"
              className="px-8 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm border border-neutral-200 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              Download App
            </Link>
            <Link
              href="/vscode"
              className="px-8 py-4 rounded-full bg-white hover:bg-neutral-50 text-neutral-900 font-bold text-sm border border-neutral-200 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              VS Code Extension
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
