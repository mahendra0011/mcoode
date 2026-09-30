import React from 'react';
import { motion } from 'framer-motion';
import { FolderTree, Code2, Terminal, Bot, Play, GitBranch, Search, Bug } from 'lucide-react';

export function IDEPreview() {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-6 pt-16 pb-28">
      <motion.div
        className="relative bg-neutral-950 rounded-4xl p-4 md:p-6 shadow-2xl border border-neutral-800 text-white font-mono"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* IDE Top Bar Chrome */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <span className="ml-3 font-sans font-medium text-neutral-400">mcode IDE — Full-Window Workspace</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-500 text-[11px] font-sans">
            <span className="text-emerald-400 font-mono">● God Mode Ready</span>
            <span>Node v20.12.0</span>
          </div>
        </div>

        {/* 4-Pane Split IDE View */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_300px] gap-3 min-h-[380px]">
          {/* Left Explorer Sidebar */}
          <div className="bg-neutral-900/60 rounded-2xl p-3 border border-neutral-800/80 text-xs space-y-2 font-sans">
            <div className="flex items-center justify-between text-neutral-400 font-bold uppercase tracking-wider text-[10px] pb-2 border-b border-neutral-800">
              <span>EXPLORER</span>
              <FolderTree className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1.5 font-mono text-[11px] text-neutral-300">
              <p className="text-neutral-500">▼ packages/web/src</p>
              <p className="pl-3 text-accent font-semibold">📄 App.tsx</p>
              <p className="pl-3 text-neutral-400">📄 AgentPane.tsx</p>
              <p className="pl-3 text-neutral-400">📄 EditorPane.tsx</p>
              <p className="pl-3 text-neutral-400">📄 TerminalPane.tsx</p>
            </div>
          </div>

          {/* Middle Monaco Editor + Docked Terminal */}
          <div className="flex flex-col justify-between gap-3">
            <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/80 flex-1 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-[11px] text-neutral-400 font-sans mb-3">
                <span className="text-white font-medium flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-accent" /> App.tsx — Monaco Editor
                </span>
                <span className="text-neutral-500">UTF-8 · TSX</span>
              </div>
              <p className="text-purple-400">import <span className="text-white">&#123; GodModeEngine &#125;</span> from <span className="text-emerald-300">'./engine'</span>;</p>
              <p className="text-blue-400">export function <span className="text-yellow-300">App</span>() &#123;</p>
              <p className="pl-4 text-neutral-300">return &lt;<span className="text-accent">GodModeEngine</span> task=<span className="text-emerald-300">"auto-heal"</span> /&gt;;</p>
              <p className="text-blue-400">&#125;</p>
            </div>

            {/* Bottom Docked Terminal */}
            <div className="bg-neutral-900/80 rounded-2xl p-3 border border-neutral-800 text-xs font-mono text-neutral-300">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 pb-1.5 border-b border-neutral-800 mb-1.5 font-sans">
                <span className="flex items-center gap-1.5 text-white">
                  <Terminal className="w-3.5 h-3.5 text-accent" /> Terminal (xterm.js)
                </span>
                <span>bash</span>
              </div>
              <p className="text-accent">$ npm run dev</p>
              <p className="text-emerald-400">✓ Ready in 240ms on http://localhost:3000</p>
            </div>
          </div>

          {/* Right Agent & Tool Controls Pane */}
          <div className="bg-neutral-900/60 rounded-2xl p-3 border border-neutral-800/80 flex flex-col justify-between font-sans">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-accent" /> AI Assistant
                </span>
                <span className="text-[10px] text-accent font-mono bg-accent/10 px-2 py-0.5 rounded-md">God Mode</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                Autonomous task execution with parallel subagents and real-time diff previews.
              </p>
              <div className="space-y-2 text-[11px]">
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-300">Subagent Concurrency</span>
                  <span className="font-mono text-accent">4 Active</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                  <span className="text-neutral-300">Turn Limit Cap</span>
                  <span className="font-mono text-emerald-400">25 Turns</span>
                </div>
              </div>
            </div>

            <button className="w-full py-2.5 bg-accent text-black text-xs font-bold rounded-xl shadow-md">
              Run God Mode Task
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
