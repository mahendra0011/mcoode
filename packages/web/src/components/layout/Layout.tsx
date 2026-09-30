"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Header } from './Header';

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Web IDE', href: '/web-ide' },
  { label: 'IDE', href: '/ide' },
  { label: 'CLI', href: '/cli' },
  { label: 'Extension', href: '/vscode' },
  { label: 'App', href: '/mcode' },
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
    <div className="min-h-screen text-foreground font-sans antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-foreground">
        Skip to content
      </a>
      <Header />
      <motion.main
        className="flex-1"
        id="main-content"
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.main>
      <motion.footer
        className="py-12 text-center text-sm text-muted-foreground bg-frame border-t border-accent/15"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer">
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
        <p>&copy; {new Date().getFullYear()} mcode{version ? ` · ${version}` : ''}. All rights reserved.</p>
      </motion.footer>
    </div>
  );
}
