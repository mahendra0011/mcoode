import React from 'react';
import { motion } from 'framer-motion';
import { Download, ShieldCheck, X } from 'lucide-react';

const GRADE_COLOR: Record<string, string> = {
  A: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  B: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  C: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  D: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  F: 'text-red-400 border-red-500/30 bg-red-500/10',
};

export interface AuditScorecardProps {
  grades: Record<string, string>;
  overallGrade: string;
  results?: Record<string, any>;
  onDownloadPDF?: () => void;
  onDismiss?: () => void;
}

export function AuditScorecard({
  grades = {},
  overallGrade = 'A',
  results = {},
  onDownloadPDF,
  onDismiss
}: AuditScorecardProps) {
  const gradeKey = overallGrade?.[0]?.toUpperCase() || 'A';
  const overallBadgeClass = GRADE_COLOR[gradeKey] || GRADE_COLOR.A;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden shadow-2xl"
    >
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-white/90">Audit Report</span>
          <span className="text-[10px] text-white/40 font-mono">read-only assessment</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-base font-bold px-3 py-0.5 rounded-lg border ${overallBadgeClass}`}>
            {overallGrade}
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-white/40 hover:text-white/70 p-1 rounded transition-colors"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-white/5">
        {Object.entries(grades).map(([cat, grade]) => {
          const catKey = grade?.[0]?.toUpperCase() || 'A';
          const catBadgeClass = GRADE_COLOR[catKey] || GRADE_COLOR.A;
          const catCounts = results[cat]?.counts || {};
          const totalIssues = (catCounts.critical || 0) + (catCounts.high || 0) + (catCounts.medium || 0) + (catCounts.low || 0);

          return (
            <div key={cat} className="px-4 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-white/80 capitalize font-medium">{cat}</span>
                <span className="text-[10px] text-white/40">
                  {totalIssues === 0 ? '✓ zero issues' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''}`}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${catBadgeClass}`}>
                {grade}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2.5 border-t border-white/5 flex items-center justify-between bg-black/20">
        <span className="text-[10px] text-white/40">
          Zero code changes made. Use <code className="text-white/60">mcode security-check</code> to fix.
        </span>
        {onDownloadPDF && (
          <button
            onClick={onDownloadPDF}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3 h-3" /> Download PDF report
          </button>
        )}
      </div>
    </motion.div>
  );
}
