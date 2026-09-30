import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Code2, Sparkles, Terminal } from 'lucide-react';

export function VSCodeExtensionPreview() {
  return (
    <div className="relative w-full max-w-5xl mx-auto px-6 pt-16 pb-28">
      <motion.div
        className="relative bg-neutral-950 rounded-4xl p-4 md:p-6 shadow-2xl border border-neutral-800 text-white font-mono"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* VS Code Window Header Chrome */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <span className="ml-4 text-xs text-neutral-400 font-sans font-medium">mcode-workspace — Visual Studio Code</span>
          </div>
          <div className="text-xs text-neutral-500 font-mono">VS Code Sidebar Extension</div>
        </div>

        {/* Split UI Preview: VS Code Activity Bar + Sidebar + Editor */}
        <div className="grid grid-cols-1 md:grid-cols-[48px_280px_1fr] gap-3 min-h-[360px] bg-neutral-900/60 rounded-2xl p-2 border border-neutral-800">
          {/* Left Activity Bar */}
          <div className="hidden md:flex flex-col items-center gap-4 py-3 border-r border-neutral-800/80 text-neutral-500">
            <Code2 className="w-5 h-5" />
            <div className="w-8 h-8 rounded-xl bg-accent text-black flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <Terminal className="w-5 h-5" />
          </div>

          {/* Docked mcode Panel Sidebar */}
          <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> mcode Assistant
                </span>
                <span className="text-[10px] text-accent font-mono bg-accent/10 px-2 py-0.5 rounded-md">Online</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-3 font-sans">Sidebar Chat & Diff Direct Applicator</p>
              <div className="bg-neutral-900 rounded-lg p-2.5 text-[11px] text-neutral-300 space-y-2 mb-3">
                <p className="text-accent font-semibold">&gt; Refactor auth route to use JWT</p>
                <p className="text-neutral-400">Inspecting 3 files in workspace...</p>
                <p className="text-emerald-400">✓ Diff ready (3 insertions, 1 deletion)</p>
              </div>
            </div>
            <button className="w-full py-2 bg-accent text-black text-xs font-bold rounded-lg font-sans">
              Apply Edits to Editor
            </button>
          </div>

          {/* Main Monaco Editor Space */}
          <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-900 text-neutral-400 text-[11px] mb-3">
                <span className="text-accent border-b border-accent pb-0.5">auth.controller.ts</span>
                <span className="text-neutral-600">user.service.ts</span>
              </div>
              <div className="space-y-1 text-neutral-300">
                <p className="text-neutral-500">// mcode inline diff suggestion</p>
                <p className="text-emerald-400">+ export async function loginHandler(req: Request, res: Response) &#123;</p>
                <p className="text-emerald-400">+   const token = await signJwtPayload(req.body);</p>
                <p className="text-emerald-400">+   return res.json(&#123; token &#125;);</p>
                <p className="text-emerald-400">+ &#125;</p>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-900 flex justify-between font-sans">
              <span>TypeScript 5.4 · UTF-8</span>
              <span className="text-accent">Auto-sync with VS Code workspace</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
