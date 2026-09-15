import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, CheckCircle2, XCircle, Loader2, Clock, Wrench, ImageIcon, Download, AlertTriangle } from 'lucide-react';

export interface TestFeatureStatus {
  id: string;
  name: string;
  route?: string;
  status: 'pending' | 'running' | 'passed' | 'passed-after-fix' | 'needs-review';
  selfHealed?: number;
  error?: string | null;
  steps?: { desc: string; status: 'ok' | 'failed' | 'fixed' }[];
  screenshotPath?: string | null;
}

export interface TestTraditional {
  kind: 'unit' | 'integration' | 'load' | 'a11y' | string;
  total: number;
  passed: number;
  failed: number;
  detail?: string;
  running?: boolean;
}

export interface TestModeSummary {
  inventoryCount: number;
  selfHealedCount: number;
  needsReview: number;
  autonomousSkipped?: string | null;
  traditional: TestTraditional[];
  reportFileName?: string;
  targetUrl?: string;
  elapsedSecs?: number;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-white/30" />,
  running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  passed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  'passed-after-fix': <Wrench className="w-3.5 h-3.5 text-purple-400" />,
  'needs-review': <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-white/40',
  running: 'text-white/90',
  passed: 'text-emerald-400',
  'passed-after-fix': 'text-purple-400',
  'needs-review': 'text-amber-400',
};

/**
 * AutonomousTestPanel — Test Mode (doc 48) live dashboard.
 * Structurally a sibling of WaveProgress (doc 34): one row per feature
 * instead of one row per subagent, plus a live step log for the feature
 * currently being tested and a final test-report summary card.
 */
export function AutonomousTestPanel({
  active,
  inventoryCount,
  features = [],
  traditional = [],
  summary = null,
  reportUrl,
  targetUrl,
}: {
  active: boolean;
  inventoryCount?: number;
  features?: TestFeatureStatus[];
  traditional?: TestTraditional[];
  summary?: TestModeSummary | null;
  reportUrl?: string | null;
  targetUrl?: string | null;
}) {
  if (!active) return null;

  const done = features.filter((f) => f.status !== 'pending' && f.status !== 'running').length;
  const selfHealed = features.reduce((n, f) => n + (f.selfHealed || 0), 0);
  const needsReview = features.filter((f) => f.status === 'needs-review').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-4 bg-[#111] rounded-xl border border-teal-500/20 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
          <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
          Autonomous Testing{inventoryCount ? ` — ${inventoryCount} features` : ''}
        </span>
        <span className="text-[10px] text-white/40 font-mono">
          {summary ? 'complete' : `${done}/${features.length || inventoryCount || 0}`}
        </span>
      </div>

      {/* Per-feature progress rows — WaveProgress row pattern */}
      <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
        {features.map((f) => (
          <div key={f.id}>
            <div className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className={`flex items-center gap-1.5 min-w-0 ${STATUS_COLOR[f.status] || 'text-white/60'}`}>
                {STATUS_ICON[f.status] || STATUS_ICON.pending}
                <span className="truncate">{f.name}</span>
                {f.route && <span className="text-[9px] text-white/30 font-mono truncate">{f.route}</span>}
              </span>
              {(f.selfHealed || 0) > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 flex-shrink-0">
                  {f.selfHealed} auto-fixed
                </span>
              )}
              {f.status === 'needs-review' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 flex-shrink-0">
                  needs review
                </span>
              )}
            </div>

            {/* Live step log for the running feature — "watching a robot use my app" */}
            {f.status === 'running' && (f.steps?.length || 0) > 0 && (
              <div className="px-3 pb-2 pl-8 space-y-0.5">
                {f.steps!.slice(-6).map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    {s.status === 'ok' && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                    {s.status === 'failed' && <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                    {s.status === 'fixed' && <Wrench className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                    <span className={s.status === 'failed' ? 'text-red-400' : 'text-white/60'}>{s.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {features.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-white/40 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-white/20" /> scanning codebase for testable features…
          </div>
        )}
      </div>

      {/* Traditional suites (Step 3a) */}
      {traditional.length > 0 && (
        <div className="px-3 py-2 border-t border-white/5 space-y-1">
          {traditional.map((t) => (
            <div key={t.kind} className="flex items-center justify-between text-[11px]">
              <span className="text-white/60 capitalize">{t.kind === 'a11y' ? 'Accessibility' : t.kind} tests</span>
              <span className={t.failed > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {t.running ? '…' : `${t.passed}/${t.total} passed`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Final summary card — mirrors WaveProgress BUILD_COMPLETE card */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-3 py-2 border-t border-white/5"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-emerald-400">
                ✓ {features.filter((f) => f.status === 'passed' || f.status === 'passed-after-fix').length}/
                {features.length || summary.inventoryCount} passed
              </span>
              {selfHealed > 0 && <span className="text-purple-400">🔧 {selfHealed} auto-fixed</span>}
              {needsReview > 0 && <span className="text-amber-400">⚑ {needsReview} review</span>}
            </div>
            <div className="flex items-center gap-2 text-white/40 text-[10px]">
              <span>{summary.elapsedSecs || 0}s</span>
              {reportUrl && (
                <a href={reportUrl} download className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                  <Download className="w-3 h-3" /> .md report
                </a>
              )}
            </div>
          </div>
          {summary.traditional?.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-1.5 pt-1.5 border-t border-white/5 text-[11px]">
              {summary.traditional.map((t) => (
                <span key={t.kind} className={t.failed > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {t.kind === 'a11y' ? '♿' : t.kind === 'load' ? '⚡' : t.kind === 'unit' ? '🧩' : '🔌'}{' '}
                  {t.kind === 'a11y' ? `Accessibility: ${t.detail || `${t.passed}/${t.total} passed`}`
                    : t.kind === 'load' ? `Load: ${t.detail || `${t.passed}/${t.total} passed`}`
                    : `${t.kind === 'unit' ? 'Unit' : 'Integration'}: ${t.passed}/${t.total} passed`}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {targetUrl && (
        <div className="px-3 py-1.5 border-t border-white/5 text-[9px] text-white/30 font-mono">
          target: {targetUrl}
        </div>
      )}
    </motion.div>
  );
}

export default AutonomousTestPanel;
