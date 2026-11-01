"use client";
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout({ children }: { children: React.ReactNode }) {
  const [, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/version')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.version && setVersion(`v${d.version}`))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900 font-sans antialiased relative selection:bg-emerald-500/20 selection:text-emerald-900 overflow-x-hidden flex flex-col justify-between">
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

      {/* Modern Attractive Production Footer */}
      <Footer />
    </div>
  );
}
