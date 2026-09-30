"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDownRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
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
    } catch {}
    // Provider badge: no stored keys → mock (free demo) mode.
    const headers: Record<string, string> = access ? { Authorization: `Bearer ${access}` } : {};
    fetch('/api/v1/keys', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.keys)) setKeyMode(d.keys.length > 0 ? 'live' : 'mock');
      })
      .catch(() => {});
  }, []);

  return (
    <motion.header
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed shadow-2xl/20 rounded-b-4xl top-2.5 inset-x-0 mx-auto w-full max-w-5xl bg-frame z-50 max-[850px]:top-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:rounded-none max-[850px]:rounded-b-4xl max-[850px]:overflow-hidden"
    >
      <div className="h-20 max-[850px]:h-[72px] grid grid-cols-[1fr_auto_1fr] items-center px-4 max-[850px]:px-6 w-full">
        {/* Left Side: Logo */}
        <div className="flex justify-start items-center">
          <motion.div
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          >
            <Link href="/" className="flex items-center gap-2.5 ml-4 max-[850px]:ml-0 group">
              <div className="relative group/logo flex items-center justify-center flex-shrink-0">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-40 group-hover/logo:opacity-80 transition duration-300"></div>
                <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-[#09090b] border border-white/15 p-0.5 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="mcode"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground leading-none max-[1200px]:hidden max-[850px]:inline">
                mcode
              </span>
              {keyMode && (
                <span
                  title={keyMode === 'live' ? 'Real provider keys configured' : 'No keys — running on the free mock provider'}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full max-[1200px]:hidden max-[850px]:inline ${
                    keyMode === 'live' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {keyMode === 'live' ? 'LIVE' : 'MOCK'}
                </span>
              )}
            </Link>
          </motion.div>
        </div>

        {/* Center: Nav (Perfectly Centered via Grid) */}
        <div className="flex justify-center items-center max-[850px]:hidden">
          <nav className="flex items-center gap-1 max-[1200px]:gap-0">
            {[
              { id: 'home', label: 'Home', href: '/' },
              { id: 'web-ide', label: 'Web IDE', href: '/web-ide' },
              { id: 'ide', label: 'IDE', href: '/ide' },
              { id: 'cli', label: 'CLI', href: '/cli' },
              { id: 'extension', label: 'Extension', href: '/vscode' },
              { id: 'app', label: 'App', href: '/mcode' },
              { id: 'pricing', label: 'Pricing', href: '/pricing' },
              { id: 'tools', label: 'Tools', href: '/tools' },
            ].map((item) => {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3.5 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-all duration-150 hover:scale-105 active:scale-95 rounded-full hover:bg-foreground/5 flex items-center whitespace-nowrap"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Auth & Mobile Menu */}
        <div className="flex justify-end items-center">
          <motion.div
            className="flex items-center gap-4 max-[850px]:hidden"
            initial={false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {isLoggedIn ? (
              <Link
                href="/settings"
                className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-foreground hover:bg-accent/40 transition-transform duration-150 hover:scale-105 active:scale-95"
              >
                <User className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors hover:translate-x-0.5"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/signup"
                  className="relative group inline-flex items-center h-10 rounded-xl bg-accent overflow-hidden transition-transform duration-150 hover:scale-[1.03] active:scale-[0.97]"
                >
                  <span className="relative z-10 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-medium transition-shadow group-hover:shadow-[0_0_20px_rgba(74,222,128,0.5)]">
                    Sign up
                  </span>
                  <span className="relative z-10 w-10 h-10 flex items-center justify-center text-black transition-transform duration-200 group-hover:-rotate-45">
                    <ArrowDownRight className="w-4 h-4" />
                  </span>
                </Link>
              </>
            )}
          </motion.div>

          <motion.button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="hidden max-[850px]:flex items-center justify-center w-10 h-10 ml-4 cursor-pointer"
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              className="w-8 h-4 relative flex flex-col justify-between cursor-pointer"
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.span
                className="block h-0.5 w-full bg-foreground origin-center rounded-full"
                animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 7 : 0 }}
                transition={{ duration: 0.2 }}
              />
              <motion.span
                className="block h-0.5 w-full bg-foreground origin-center rounded-full"
                animate={{ opacity: menuOpen ? 0 : 1 }}
                transition={{ duration: 0.15 }}
              />
              <motion.span
                className="block h-0.5 w-full bg-foreground origin-center rounded-full"
                animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -7 : 0 }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          </motion.button>
        </div>
      </div>
      {menuOpen && (
        <nav className="hidden max-[850px]:flex flex-col gap-1 px-6 pb-4 bg-frame/95 backdrop-blur border-t border-foreground/10 pt-3" aria-label="Mobile">
          {[
            { label: 'Home', href: '/' },
            { label: 'Web IDE', href: '/web-ide' },
            { label: 'IDE', href: '/ide' },
            { label: 'CLI', href: '/cli' },
            { label: 'Extension', href: '/vscode' },
            { label: 'App', href: '/mcode' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'Tools', href: '/tools' },
            { label: isLoggedIn ? t('nav.account') : t('nav.login'), href: isLoggedIn ? '/settings' : '/login' },
          ].map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </motion.header>
  );
}
