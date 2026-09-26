"use client";
import React from 'react';
import { motion } from 'framer-motion';

const ENTRIES: { version: string; date: string; items: string[] }[] = [
  {
    version: '2.4.6', date: '2026-09-26',
    items: [
      'Security: CORS allowlist, Socket.IO exec auth gates, workspace IDOR fixes, fail-closed safeJoin, unified upload policy.',
      'Fixed: /version ESM crash, /live hang, double Redis, CostLedger TPM, watch budget deadlock, god --yes, doctor counts.',
      'Added: mcode connect, plugin remove/disable/enable, gen --dry-run/--force, refresh rotation, usage CSV, OTP password reset.',
    ],
  },
];

export function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Changelog</h1>
      <div className="relative border-l border-white/10 ml-2 space-y-8">
        {ENTRIES.map((e) => (
          <motion.section
            key={e.version}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pl-6 relative"
          >
            <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-400" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-300">v{e.version}</span>
              <span className="text-xs text-white/40">{e.date}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {e.items.map((it, i) => <li key={i} className="text-sm text-white/60">{it}</li>)}
            </ul>
          </motion.section>
        ))}
      </div>
      <p className="mt-8 text-xs text-white/30">Full history in CHANGELOG.md at the repo root.</p>
    </div>
  );
}

export default ChangelogPage;
