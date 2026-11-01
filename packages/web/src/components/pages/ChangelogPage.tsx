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
    <div className="min-h-screen bg-slate-50 text-neutral-900 py-10 px-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-8">Changelog</h1>
      <div className="relative border-l-2 border-slate-200 ml-2 space-y-8">
        {ENTRIES.map((e) => (
          <motion.section
            key={e.version}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="pl-6 relative"
          >
            <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                v{e.version}
              </span>
              <span className="text-xs font-medium text-neutral-400">{e.date}</span>
            </div>
            <div className="mt-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <ul className="space-y-2.5">
                {e.items.map((it, i) => (
                  <li key={i} className="text-sm text-neutral-600 leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        ))}
      </div>
      <p className="mt-10 text-xs text-neutral-400">Full history in CHANGELOG.md at the repo root.</p>
    </div>
  );
}

export default ChangelogPage;
