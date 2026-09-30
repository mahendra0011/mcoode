import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bot, Code2, LayoutDashboard, ArrowUpRight, CheckCircle, Terminal, FileCode } from 'lucide-react';

const modes = [
  {
    id: 'chat',
    label: 'Chat Mode',
    icon: MessageSquare,
    tagline: 'Conversational Code Partner',
    desc: 'Ask questions, explore codebase architecture, draft snippets, and iterate on design decisions before committing changes.',
    previewTitle: 'AIChatPage — Interactive Chat',
    features: ['Context-aware repository Q&A', 'Code explainers & architectural advice', 'Multi-file change proposals']
  },
  {
    id: 'agent',
    label: 'Agent Mode (God Mode)',
    icon: Bot,
    tagline: 'Autonomous Execution Engine',
    desc: 'Switches the chat interface into autonomous execution: plans DAG tasks, dispatches parallel subagents, and auto-tests results.',
    previewTitle: 'God Mode Engine Active',
    features: ['Parallel subagent dispatch', 'Shared undo stack & automatic rollbacks', 'Hard 25-turn safety cap']
  },
  {
    id: 'editor',
    label: 'Code Editor & Terminal',
    icon: Code2,
    tagline: 'Split-Pane IDE Surface',
    desc: 'Embedded Monaco editor and xterm terminal side-by-side with chat — edit files and view terminal logs without leaving the view.',
    previewTitle: 'Monaco Editor + xterm.js Terminal',
    features: ['Full syntax highlighting & auto-complete', 'Interactive xterm terminal shell', 'Live side-by-side file diff preview']
  }
];

export function ModesShowcase() {
  const [activeModeId, setActiveModeId] = useState('agent');
  const activeMode = modes.find((m) => m.id === activeModeId) || modes[1];

  return (
    <section className="w-full px-6 py-20 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            One Interface, <span className="italic font-serif text-accent">Three Working Modes</span>
          </motion.h2>
          <motion.p
            className="text-lg text-neutral-500 max-w-2xl mx-auto font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Switch seamlessly between chat, autonomous agent execution, and direct code editing inside the same split-pane window.
          </motion.p>
        </div>

        {/* Segmented Control Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 gap-1.5">
            {modes.map((m) => {
              const Icon = m.icon;
              const isActive = activeModeId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModeId(m.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    isActive ? 'text-black dark:text-white' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeModeIndicator"
                      className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : ''}`} />
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle Mode Preview Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMode.id}
            className="bg-neutral-100 dark:bg-neutral-900 rounded-4xl p-8 md:p-12 mb-12 border border-neutral-200/60 dark:border-neutral-800/60 grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent mb-4">
                {activeMode.tagline}
              </span>
              <h3 className="text-3xl font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                {activeMode.label}
              </h3>
              <p className="text-neutral-500 leading-relaxed mb-6 font-medium">
                {activeMode.desc}
              </p>

              <div className="space-y-3">
                {activeMode.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                    <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-neutral-950 rounded-3xl p-6 text-white border border-neutral-800 font-mono text-xs shadow-2xl flex flex-col justify-between min-h-[260px]">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-neutral-400 text-xs">
                  {activeMode.id === 'chat' && <MessageSquare className="w-4 h-4 text-accent" />}
                  {activeMode.id === 'agent' && <Bot className="w-4 h-4 text-accent" />}
                  {activeMode.id === 'editor' && <FileCode className="w-4 h-4 text-accent" />}
                  <span>{activeMode.previewTitle}</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-neutral-800"></div>
                  <div className="w-3 h-3 rounded-full bg-neutral-800"></div>
                  <div className="w-3 h-3 rounded-full border border-accent"></div>
                </div>
              </div>

              <div className="py-6 space-y-2 text-neutral-300">
                {activeMode.id === 'chat' && (
                  <>
                    <p className="text-accent">&gt; Explain how God Mode routes subagents in mcode</p>
                    <p className="text-neutral-400">mcode creates a DAG task graph, then dispatches subagents in parallel with shared undo stacks.</p>
                  </>
                )}
                {activeMode.id === 'agent' && (
                  <>
                    <p className="text-accent">&gt; mcode god "refactor auth handlers & add JWT tests"</p>
                    <p className="text-neutral-400">[PLAN] Created DAG (3 tasks)</p>
                    <p className="text-neutral-400">[SUBAGENT 1] Editing auth.ts... [SUBAGENT 2] Writing tests...</p>
                    <p className="text-emerald-400">[INTEGRATION] All 14 tests passing. Capped at 4 turns.</p>
                  </>
                )}
                {activeMode.id === 'editor' && (
                  <>
                    <div className="flex justify-between text-neutral-500 border-b border-neutral-900 pb-2">
                      <span>auth.ts — Monaco</span>
                      <span>Terminal — xterm.js</span>
                    </div>
                    <p className="text-neutral-300">export function verifyToken(token: string) &#123;</p>
                    <p className="text-neutral-300">&nbsp;&nbsp;return jwt.verify(token, process.env.JWT_SECRET);</p>
                    <p className="text-neutral-300">&#125;</p>
                  </>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Status: Active</span>
                <span className="text-accent">Ready</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Project Reference Hub Card (/mcode) */}
        <motion.div
          className="bg-neutral-900 text-white rounded-4xl p-8 md:p-10 border border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex items-start gap-6">
            <div className="w-14 h-14 rounded-3xl bg-accent flex items-center justify-center text-black shrink-0">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent mb-2">
                Separate Route — /mcode
              </div>
              <h3 className="text-2xl md:text-3xl font-medium tracking-tight mb-2 text-white">
                Project Reference Hub
              </h3>
              <p className="text-neutral-400 text-sm md:text-base max-w-xl leading-relaxed">
                Central control panel for your codebase: architecture DAGs, Git tools, MCP server configuration, plugin management, skills reference, and turn machine logs.
              </p>
            </div>
          </div>

          <motion.a
            href="/mcode"
            className="group relative cursor-pointer inline-flex items-center shrink-0"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="absolute right-0 inset-y-0 w-[calc(100%-2rem)] rounded-xl bg-accent"></span>
            <motion.span
              className="relative z-10 px-6 py-3 rounded-xl bg-white text-black font-medium text-sm"
              whileHover={{ boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)' }}
            >
              Open Project Hub
            </motion.span>
            <motion.span
              className="relative -left-px z-10 w-11 h-11 rounded-xl flex items-center justify-center text-black"
              whileHover={{ rotate: -45 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <ArrowUpRight className="w-4 h-4" />
            </motion.span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
