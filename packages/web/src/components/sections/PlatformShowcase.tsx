"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Globe, Puzzle, Monitor, ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import Link from 'next/link';

const PLATFORMS = [
  {
    id: 'cli',
    title: 'Terminal CLI',
    tagline: 'Lightweight & Ultra-Fast',
    badge: 'Terminal-First',
    desc: 'Run autonomous God Mode swarms, watch daemons, and manage 46+ tools directly inside zsh, bash, or PowerShell with zero GUI overhead.',
    icon: Terminal,
    href: '/cli',
    command: 'npm i -g mcode',
    highlights: ['25 CLI commands', 'Background watch daemon', 'AES-256 encrypted vault'],
    cta: 'Explore CLI'
  },
  {
    id: 'web-ide',
    title: 'Web IDE',
    tagline: 'Zero Setup in Browser',
    badge: 'Zero Install',
    desc: 'Instant full-stack workspace in your browser tab. Embedded Monaco editor, live xterm.js terminal, split diffs, and multi-model AI chat.',
    icon: Globe,
    href: '/web-ide',
    command: 'mcode.dev/web-ide',
    highlights: ['Monaco editor + xterm.js', 'Direct GitHub repo import', 'Full God Mode execution'],
    cta: 'Explore Web IDE'
  },
  {
    id: 'vscode',
    title: 'VS Code Extension',
    tagline: 'Inside Your Daily Editor',
    badge: 'Official Extension',
    desc: 'Bring mcode AI power straight to your favorite IDE sidebar. Context-aware file access, inline quick fixes, and multi-model pairing.',
    icon: Puzzle,
    href: '/vscode',
    command: 'code --install-extension mcode',
    highlights: ['Sidebar chat & inline actions', 'Downloadable .vsix package', 'Workspace semantic search'],
    cta: 'Download Extension'
  },
  {
    id: 'ide',
    title: 'Desktop IDE',
    tagline: 'Native Windows / Mac / Linux',
    badge: 'Standalone App',
    desc: 'Dedicated standalone desktop application. No browser tabs or memory limits. Multi-terminal split profiles, Docker integration, and native performance.',
    icon: Monitor,
    href: '/ide',
    command: 'mcode-setup.exe',
    highlights: ['Native installer (.exe, .dmg, .AppImage)', 'Multi-pane editor surface', 'Offline local model support'],
    cta: 'Download Desktop App'
  }
];

export function PlatformShowcase() {
  return (
    <section className="w-full px-6 py-24 bg-background border-t border-foreground/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" /> One Engine, Four Platforms
          </motion.div>
          <motion.h2
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Use mcode Wherever You Code
          </motion.h2>
          <motion.p
            className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Whether in your terminal, inside VS Code, through the browser, or in a dedicated native desktop IDE — your AI swarms and configuration stay unified.
          </motion.p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PLATFORMS.map((platform, i) => {
            const Icon = platform.icon;
            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group relative flex flex-col justify-between rounded-2xl border border-foreground/10 bg-frame p-6 hover:border-emerald-500/40 transition-all hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-foreground/5 border border-foreground/10 flex items-center justify-center text-foreground group-hover:bg-emerald-500 group-hover:text-black transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foreground/5 text-muted-foreground border border-foreground/10">
                      {platform.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-emerald-400 transition-colors">
                    {platform.title}
                  </h3>
                  <p className="text-xs font-medium text-emerald-500/90 mb-3">{platform.tagline}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-5">{platform.desc}</p>

                  <ul className="space-y-1.5 mb-6 text-xs text-foreground/80">
                    {platform.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="mb-4 font-mono text-[11px] px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-emerald-300 truncate">
                    $ {platform.command}
                  </div>
                  <Link
                    href={platform.href}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-foreground/15 bg-foreground/5 hover:bg-foreground/10 text-foreground font-semibold text-xs group-hover:border-emerald-500/40 transition-all"
                  >
                    <span>{platform.cta}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
