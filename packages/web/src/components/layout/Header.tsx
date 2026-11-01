"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDownRight, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../lib/i18n';

export function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyMode, setKeyMode] = useState<'mock' | 'live' | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    let access: string | null = null;
    try {
      const parsed = JSON.parse(localStorage.getItem('mcode_tokens') || '{}');
      if (parsed.access) {
        access = parsed.access;
        setIsLoggedIn(true);
      }
    } catch { }
    // Provider badge: no stored keys → mock (free demo) mode.
    const headers: Record<string, string> = access ? { Authorization: `Bearer ${access}` } : {};
    fetch('/api/v1/keys', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.keys)) setKeyMode(d.keys.length > 0 ? 'live' : 'mock');
      })
      .catch(() => { });
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3.5 inset-x-0 mx-auto w-full max-w-5xl z-50 px-4 pointer-events-none"
    >
      <div className="pointer-events-auto h-16 rounded-full bg-white/80 backdrop-blur-2xl border border-neutral-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] grid grid-cols-[auto_1fr_auto] items-center px-4 w-full transition-all duration-300">

        {/* Left Side: Brand Logo */}
        <div className="flex items-center pl-1">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative group/logo flex items-center justify-center flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-xl blur opacity-30 group-hover/logo:opacity-75 transition duration-500"></div>
              <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-white border border-neutral-200 shadow-sm p-0.5 flex items-center justify-center transition-transform group-hover/logo:scale-105">
                <img
                  src="/logo.png"
                  alt="mcode"
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-tight text-neutral-950 font-sans">
                mcode
              </span>
              {keyMode && (
                <span
                  title={keyMode === 'live' ? 'Real provider keys configured' : 'No keys — running on free demo mock'}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${keyMode === 'live' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                >
                  {keyMode === 'live' ? 'LIVE' : 'MOCK'}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Center: Navigation Pills */}
        <div className="flex justify-center items-center max-[940px]:hidden">
          <nav className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-neutral-100/70 border border-neutral-200/60">
            {[
              { id: 'home', label: 'Home', href: '/' },
              { id: 'web-ide', label: 'Web IDE', href: '/web-ide', highlight: true },
              { id: 'terminal', label: 'Terminal', href: '/cli' },
              { id: 'desktop', label: 'Desktop', href: '/ide' },
              { id: 'app', label: 'Mobile App', href: '/mcode' },
              { id: 'vscode', label: 'VS Code Extension', href: '/vscode' },
              { id: 'pricing', label: 'Pricing', href: '/pricing' },
              { id: 'tools', label: 'Tools', href: '/tools' },
            ].map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`relative px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 whitespace-nowrap ${item.highlight
                    ? 'text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 font-bold'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-white hover:shadow-sm'
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side: Auth Actions & Mobile Hamburger */}
        <div className="flex justify-end items-center gap-2">
          <div className="flex items-center gap-2 max-[940px]:hidden">
            {isLoggedIn ? (
              <Link
                href="/settings"
                className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
                title="Account Settings"
              >
                <User className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/signup"
                  className="group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_2px_14px_rgba(16,185,129,0.35)] transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <span>Sign up</span>
                  <ArrowDownRight className="w-3.5 h-3.5 text-white/90 group-hover:-rotate-45 transition-transform duration-200" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="hidden max-[940px]:flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 hover:bg-neutral-200/80 transition-colors cursor-pointer"
          >
            <div className="w-4 h-3.5 flex flex-col justify-between">
              <span className={`block h-0.5 w-full bg-neutral-800 rounded-full transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block h-0.5 w-full bg-neutral-800 rounded-full transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-full bg-neutral-800 rounded-full transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mt-2 p-3 rounded-2xl bg-white/95 backdrop-blur-2xl border border-neutral-200 shadow-xl flex flex-col gap-1"
          >
            {[
              { label: 'Home', href: '/' },
              { label: 'Web IDE', href: '/web-ide', highlight: true },
              { label: 'Terminal', href: '/cli' },
              { label: 'Desktop', href: '/ide' },
              { label: 'Mobile App', href: '/mcode' },
              { label: 'VS Code Extension', href: '/vscode' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Tools', href: '/tools' },
              { label: isLoggedIn ? 'Account Settings' : 'Log in', href: isLoggedIn ? '/settings' : '/login' },
            ].map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors ${item.highlight
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-neutral-700 hover:text-black hover:bg-neutral-100'
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
