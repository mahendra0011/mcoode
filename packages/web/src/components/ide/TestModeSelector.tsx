"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Play } from 'lucide-react';

export interface TestType {
  id: string;
  label: string;
  desc: string;
  recommended?: boolean;
}

export const TEST_TYPES: TestType[] = [
  { id: 'unit', label: 'Unit tests', desc: 'Functions/modules in isolation' },
  { id: 'integration', label: 'Integration tests', desc: 'API routes, DB interactions' },
  { id: 'e2e', label: 'End-to-end', desc: 'Full user flows, browser-driven' },
  { id: 'visual', label: 'Visual regression', desc: 'Screenshot diffing' },
  { id: 'load', label: 'Load/performance', desc: 'Concurrency + response-time testing' },
  { id: 'a11y', label: 'Accessibility', desc: 'WCAG compliance scan' },
  { id: 'autonomous', label: 'Autonomous exploratory testing', desc: 'AI plays the app like a real user', recommended: true },
];

function toggleSet(id: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  setter(next);
}

/**
 * TestModeSelector — Test Mode Step 1 (doc 48).
 * Multi-select checkbox card, same shell family as SecurityChecklistCard
 * (doc 47) / ClarifyCard (doc 33). Reused family, not reinvented.
 */
export function TestModeSelector({
  onStart,
  onCancel,
}: {
  onStart: (types: string[], targetUrl?: string) => void;
  onCancel?: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['autonomous']));
  const [targetUrl, setTargetUrl] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-teal-500/20 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5 text-teal-400" /> Test Mode — what kind of testing?
        </span>
        <span className="text-[9px] text-white/30">select multiple · space to toggle</span>
      </div>

      <div className="divide-y divide-white/5">
        {TEST_TYPES.map((t) => (
          <label
            key={t.id}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5"
          >
            <input
              type="checkbox"
              checked={selected.has(t.id)}
              onChange={() => toggleSet(t.id, selected, setSelected)}
              className="mt-0.5 accent-teal-500"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/80">{t.label}</span>
                {t.recommended && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400">
                    recommended
                  </span>
                )}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{t.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="Target URL (default: local/staging from testMode.targetUrl)"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 outline-none focus:border-teal-500/40"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={selected.size === 0}
          onClick={() => onStart([...selected], targetUrl.trim() || undefined)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-teal-400 text-xs font-medium"
        >
          <Play className="w-3 h-3 fill-current" /> Run tests
        </motion.button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default TestModeSelector;
