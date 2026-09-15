import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

export interface SecurityFinding {
  id: string;
  category: string;
  label: string;
  risk: 'critical' | 'high' | 'medium' | string;
  impact: string;
  file: string;
  line?: number;
}

function toggleSet(id: string, set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>) {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  setter(next);
}

function downloadReport(findings: SecurityFinding[]) {
  const critical = findings.filter((f) => f.risk === 'critical');
  const high = findings.filter((f) => f.risk === 'high');
  const medium = findings.filter((f) => f.risk === 'medium');

  const content = [
    `# Security Checkup Report`,
    `Generated ${new Date().toISOString()} · ${findings.length} issues found (${critical.length} critical)\n`,
    critical.length > 0 ? `## Critical\n` + critical.map((f) => `- **${f.label}** — ${f.file}${f.line ? `:${f.line}` : ''} — ${f.impact}`).join('\n') + '\n' : '',
    high.length > 0 ? `## High\n` + high.map((f) => `- **${f.label}** — ${f.file}${f.line ? `:${f.line}` : ''} — ${f.impact}`).join('\n') + '\n' : '',
    medium.length > 0 ? `## Medium\n` + medium.map((f) => `- **${f.label}** — ${f.file}${f.line ? `:${f.line}` : ''} — ${f.impact}`).join('\n') + '\n' : '',
  ].filter(Boolean).join('\n');

  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security-report-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SecurityChecklistCard({ findings, onFixSelected }: {
  findings: SecurityFinding[]; onFixSelected: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const RISK_STYLE: Record<string, string> = {
    critical: 'text-red-400 border-red-500/30 bg-red-500/10',
    high: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Security Checkup — {findings.length} issue{findings.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {findings.map((f) => (
          <label key={f.id} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-white/5">
            <input type="checkbox" checked={selected.has(f.id)}
              onChange={() => toggleSet(f.id, selected, setSelected)}
              className="mt-0.5 accent-emerald-500" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${RISK_STYLE[f.risk] || RISK_STYLE.medium}`}>{f.risk}</span>
                <span className="text-[11px] text-white/80">{f.label}</span>
              </div>
              <div className="text-[10px] text-white/40 mt-0.5">{f.impact}</div>
              <div className="text-[9px] text-white/30 font-mono mt-0.5">{f.file}{f.line ? `:${f.line}` : ''}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="px-3 py-2 border-t border-white/5 flex gap-2">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          disabled={selected.size === 0}
          onClick={() => onFixSelected([...selected])}
          className="flex-1 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed text-emerald-400 text-xs font-medium">
          Fix {selected.size > 0 ? `${selected.size} selected` : 'selected'} with AI
        </motion.button>
        <a href="#" onClick={(e) => { e.preventDefault(); downloadReport(findings); }}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs">
          Download report
        </a>
      </div>
    </motion.div>
  );
}
