import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointerClick, CheckCircle2, AlertTriangle, ImageIcon } from 'lucide-react';

export interface PlaywrightIssue {
  description: string;
  severity: 'low' | 'medium' | 'high' | string;
  screenshot?: string;
  screenshotUrl?: string;
  route?: string;
}

export function PlaywrightAuditPanel({
  active,
  pass,
  maxPasses,
  issues = [],
  clean,
}: {
  active?: boolean;
  pass: number;
  maxPasses: number;
  issues?: PlaywrightIssue[];
  clean: boolean;
}) {
  if (!active) return null;
  const severityColor: Record<string, string> = {
    low: 'text-white/50',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-white/10 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <MousePointerClick className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-white/90">Playwright Audit — pass {pass}/{maxPasses}</span>
      </div>

      {clean ? (
        <div className="px-3 py-3 flex items-center gap-2 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4" /> No visual/functional issues found
        </div>
      ) : (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <AnimatePresence>
            {issues.map((issue, i) => {
              const src = issue.screenshot || issue.screenshotUrl;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black/30 rounded-lg border border-white/5 overflow-hidden"
                >
                  {src ? (
                    <img
                      src={src}
                      alt={issue.description}
                      className="w-full h-24 object-cover object-top border-b border-white/5"
                    />
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center bg-white/5 border-b border-white/5">
                      <ImageIcon className="w-5 h-5 text-white/20" />
                    </div>
                  )}
                  <div className="p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className={`w-3 h-3 ${severityColor[issue.severity] || severityColor.medium}`} />
                      <span className={`text-[9px] uppercase font-bold ${severityColor[issue.severity] || severityColor.medium}`}>
                        {issue.severity}
                      </span>
                      {issue.route && <span className="text-[9px] text-white/30 font-mono">{issue.route}</span>}
                    </div>
                    <div className="text-[11px] text-white/70">{issue.description}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
