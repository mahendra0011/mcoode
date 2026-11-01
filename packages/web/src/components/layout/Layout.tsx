"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Sparkles, Terminal, Shield, Zap } from 'lucide-react';

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Web IDE', href: '/web-ide' },
  { label: 'Terminal', href: '/cli' },
  { label: 'Desktop', href: '/ide' },
  { label: 'App', href: '/mcode' },
  { label: 'VS Code Extension', href: '/vscode' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Tools', href: '/tools' },
  { label: 'Settings', href: '/settings' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/version')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.version && setVersion(`v${d.version}`))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900 font-sans antialiased relative selection:bg-emerald-500/20 selection:text-emerald-900 overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-neutral-900 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Floating Header */}
      <Header />

      {/* Main Content */}
      <motion.main
        className="flex-1"
        id="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.main>

      {/* Clean Modern Motion Graphic Light Footer */}
      <footer className="relative mt-24 border-t border-neutral-200/80 bg-white/70 backdrop-blur-xl py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            {/* Left: Brand & Tagline */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden bg-white border border-neutral-200 shadow-sm p-0.5 flex items-center justify-center">
                  <img src="/logo.png" alt="mcode" className="w-full h-full object-cover rounded-md" />
                </div>
                <span className="text-base font-extrabold tracking-tight text-neutral-950 font-sans">
                  mcode
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  Swarm Engine
                </span>
              </Link>
              <p className="text-xs text-neutral-500 max-w-sm text-center md:text-left">
                Next-generation autonomous AI swarm engine for terminal, browser & desktop.
              </p>
            </div>

            {/* Right: Quick Highlights */}
            <div className="flex items-center gap-4 text-xs font-medium text-neutral-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100/80 border border-neutral-200">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Multi-Model Swarms
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100/80 border border-neutral-200">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> AES-256 Vault
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100/80 border border-neutral-200">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" /> CLI & Web IDE
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 py-6 border-y border-neutral-200/60" aria-label="Footer">
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs font-semibold text-neutral-600 hover:text-emerald-700 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Bottom Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 text-xs text-neutral-500">
            <p>&copy; {new Date().getFullYear()} mcode{version ? ` · ${version}` : ''}. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
