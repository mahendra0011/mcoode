import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Cpu, CheckCircle2, Loader2, ShieldCheck, Activity, Layers, GitBranch, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DashboardPreview() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20% 0px 0px' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="relative px-6 mt-20 max-[850px]:mt-10 mb-32 z-10"
    >
      <motion.div
        className="relative max-w-5xl mx-auto"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        {/* Glow ambient background */}
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-indigo-500/20 rounded-3xl blur-2xl opacity-50 -z-10" />

        <motion.div
          className="relative bg-neutral-950/95 rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl text-left"
          whileHover={{ scale: 1.01, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          {/* Top Window Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-neutral-400 ml-2 hidden sm:inline-block">
                mcode orchestrator — god mode session
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Swarm Active: 4 Subagents
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-neutral-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Vault AES-256
              </span>
            </div>
          </div>

          {/* Active Command Prompt Bar */}
          <div className="px-5 py-3.5 bg-neutral-900/40 border-b border-neutral-800/60 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="text-emerald-400 font-bold">$</span>
              <span className="text-white font-semibold">mcode god</span>
              <span className="text-neutral-400">"build full-stack auth & live streaming dashboard"</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px]">--concurrency 5</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/50">Wave 2 / 3</span>
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/50 text-emerald-400">Budget: 74% remaining</span>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-neutral-800">
            {/* Left: Parallel Subagents Wave Swarm */}
            <div className="lg:col-span-6 p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-400 pb-1">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-neutral-300" />
                  Dependency-Sorted Subagents (DAG)
                </span>
                <span className="text-[11px] text-neutral-500">Auto-routed</span>
              </div>

              {/* Task 1 */}
              <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Database Schema & Migrations
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    DONE (1.2s)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                  <span className="font-mono text-neutral-500">claude-3-5-sonnet</span>
                  <span>Wrote 2 files • 0 errors</span>
                </div>
              </div>

              {/* Task 2 */}
              <div className="p-3 rounded-xl bg-neutral-900/90 border border-emerald-500/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    JWT Auth & Session Ledger
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    WRITING
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                  <span className="font-mono text-neutral-300">gpt-4o • Turn 12/25</span>
                  <span className="font-mono text-neutral-400">src/auth/jwt.js</span>
                </div>
              </div>

              {/* Task 3 */}
              <div className="p-3 rounded-xl bg-neutral-900/90 border border-cyan-500/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan-500" />
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    Socket.IO /live Namespace
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    VERIFYING
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                  <span className="font-mono text-neutral-300">deepseek-v3</span>
                  <span className="text-cyan-400 font-mono">running vitest</span>
                </div>
              </div>

              {/* Task 4 */}
              <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60 opacity-60">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-neutral-500" />
                    Integration Pass & Auto-Fix Scan
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                    QUEUED
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                  <span className="font-mono">mcode:watch-daemon</span>
                  <span>Waits on Wave 2</span>
                </div>
              </div>
            </div>

            {/* Right: Live Activity Stream / Terminal Feed */}
            <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col justify-between bg-black/40">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-neutral-400 pb-1">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-neutral-300" />
                    Live Activity Stream
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    streaming
                  </span>
                </div>

                <div className="font-mono text-[11.5px] leading-relaxed space-y-1.5 text-neutral-300 bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800/80">
                  <p className="text-neutral-500">
                    <span className="text-neutral-600">[10:42:01]</span> <span className="text-indigo-400">orchestrator:</span> Plan generated 4 tasks across 2 waves
                  </p>
                  <p className="text-emerald-400">
                    <span className="text-neutral-600">[10:42:02]</span> <span className="text-emerald-300">subagent:t1:</span> Wrote packages/backend/models/user.js (+48 lines)
                  </p>
                  <p className="text-yellow-300/90">
                    <span className="text-neutral-600">[10:42:04]</span> <span className="text-yellow-400">subagent:t2:</span> Tool call: read_file("packages/backend/.env")
                  </p>
                  <p className="text-cyan-300">
                    <span className="text-neutral-600">[10:42:06]</span> <span className="text-cyan-400">subagent:t3:</span> Mounted /live room broker on port 3100
                  </p>
                  <p className="text-emerald-400/90">
                    <span className="text-neutral-600">[10:42:08]</span> <span className="text-purple-400">watch-daemon:</span> 0 broken imports detected, 14/14 tests green
                  </p>
                  <p className="text-neutral-400 flex items-center gap-1 pt-1">
                    <span className="text-emerald-400">$</span>
                    <span>mcode: subagents executing in parallel...</span>
                    <span className="w-2 h-4 bg-emerald-400 inline-block animate-pulse ml-0.5" />
                  </p>
                </div>
              </div>

              {/* Mini Features Footer */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-neutral-300" />
                    18 Provider Adapters
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Watch Daemon On
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/ai/chat')}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition"
                >
                  Open AI Chat <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
