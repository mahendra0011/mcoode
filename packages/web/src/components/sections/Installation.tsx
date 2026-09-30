import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Copy, Check, Apple, Monitor, Cpu } from 'lucide-react';

const platforms = [
  { id: 'macos', label: 'macOS', icon: Apple, cmd: 'npm install -g mcode' },
  { id: 'windows', label: 'Windows', icon: Monitor, cmd: 'npm install -g mcode' },
  { id: 'linux', label: 'Linux', icon: Cpu, cmd: 'npm install -g mcode' }
];

export function Installation() {
  const [activeTab, setActiveTab] = useState('macos');
  const [copied, setCopied] = useState(false);

  const activePlatform = platforms.find((p) => p.id === activeTab) || platforms[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activePlatform.cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="w-full px-6 py-20 bg-background">
      <motion.div
        className="max-w-4xl mx-auto text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-neutral-900 dark:text-neutral-100 mb-4">
          Install <span className="italic font-serif text-accent">mcode</span> in Seconds
        </h2>
        <p className="text-lg text-neutral-500 max-w-xl mx-auto mb-10 font-medium">
          Requires Node.js 20+ and works natively across macOS, Windows (PowerShell/CMD/WSL), and Linux.
        </p>

        {/* Platform Selector Tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {platforms.map((p) => {
            const Icon = p.icon;
            const isActive = activeTab === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActiveTab(p.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Block Box */}
        <div className="relative max-w-2xl mx-auto rounded-3xl bg-neutral-950 text-white p-6 md:p-8 shadow-2xl border border-neutral-800 flex items-center justify-between gap-4 font-mono text-left">
          <div className="flex items-center gap-3 overflow-x-auto">
            <Terminal className="w-5 h-5 text-accent shrink-0" />
            <span className="text-neutral-400 select-none">$</span>
            <span className="text-accent font-semibold text-base md:text-lg whitespace-nowrap">
              {activePlatform.cmd}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-sans font-medium text-white transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-accent" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
