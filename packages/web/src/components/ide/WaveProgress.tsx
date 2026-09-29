import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Clock, Zap, BarChart3 } from 'lucide-react';

/**
 * WaveProgress — compact god-mode execution dashboard.
 * Shows wave-based parallel subagent progress with a per-wave bar,
 * live subagent row, and a final build summary card.
 *
 * Props (all optional — component degrades gracefully to null):
 *   waves          [{ wave, total, completed, status }]  — from Redux store
 *   subagents      { todoId: { todoId, domain, status, message, progress } }
 *   buildSummary   { done, total, failed, needsReview, elapsedSecs, cost, ... }
 *   godMode        boolean — show the dashboard only when true
 */
export const DOMAIN_COLORS: Record<string, string> = {
  general: 'text-white/60',
  bugfix: 'text-red-400',
  frontend: 'text-blue-400',
  backend: 'text-purple-400',
  animation: 'text-pink-400',
  testing: 'text-teal-400',
  security: 'text-orange-400',
  database: 'text-amber-400',
  devops: 'text-green-400',
  mobile: 'text-cyan-400',
  'ai-ml': 'text-fuchsia-400',
  'system-design': 'text-indigo-400',
  'real-world': 'text-lime-400',
};

export const DOMAIN_BG: Record<string, string> = {
  general: 'bg-white/10',
  bugfix: 'bg-red-500/10',
  frontend: 'bg-blue-500/10',
  backend: 'bg-purple-500/10',
  animation: 'bg-pink-500/10',
  testing: 'bg-teal-500/10',
  security: 'bg-orange-500/10',
  database: 'bg-amber-500/10',
  devops: 'bg-green-500/10',
  mobile: 'bg-cyan-500/10',
  'ai-ml': 'bg-fuchsia-500/10',
  'system-design': 'bg-indigo-500/10',
  'real-world': 'bg-lime-500/10',
};

export const DOMAIN_ABBREV: Record<string, string> = {
  'system-design': 'sysdes',
  'real-world': 'rlwrld',
  'ai-ml': 'ai-ml',
};

const STATUS_ICON = {
  done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  running: <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />,
  pending: <Clock className="w-3.5 h-3.5 text-white/30" />,
  needs_review: <Clock className="w-3.5 h-3.5 text-amber-400" />,
};

interface Wave {
  wave: number;
  total: number;
  completed: number;
  status: 'pending' | 'running' | 'complete' | 'done' | 'failed';
  subagentIds?: string[];
}
interface Subagent {
  todoId: string;
  domain: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  message?: string;
  progress?: number;
}
/**
 * `BuildSummary` is declared once, in the store, because that is where the
 * `build:complete` payload lands (`chatSlice.setBuildComplete`). Re-declaring it
 * here is what allowed the cost/budget/conflict fields to be dropped from the
 * UI while still type-checking (audit WEB-004).
 */
export type { BuildSummary } from '../../store/chatSlice';
import type { BuildSummary } from '../../store/chatSlice';
export interface WaveProgressProps {
  waves?: Wave[];
  subagents?: Record<string, Subagent>;
  buildSummary?: BuildSummary | null;
  godMode?: boolean;
  projectTier?: string | null;
  concurrency?: number;
}

export function WaveProgress({
  waves = [],
  subagents = {},
  buildSummary = null,
  godMode = false,
  projectTier = null,
  concurrency = 0,
}: WaveProgressProps) {
  if (!godMode) return null;

  const activeWave = waves.find((w) => w.status === 'running');
  const hasCompleted = !!buildSummary && (buildSummary.total ?? 0) > 0;

  return (
    // WEB-019: polite live region so screen readers hear wave progress and
    // build completion without moving focus.
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Parallel build progress"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="w-full max-w-4xl mx-auto mb-4"
    >
      <div className="bg-[#151515] border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
              God Mode — Parallel Build
            </span>
          </div>
          <div className="flex items-center gap-2">
            {projectTier && (
              <span className="text-[10px] text-white/30">
                {projectTier} project · {concurrency} parallel
              </span>
            )}
            {activeWave && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Wave {activeWave.wave} active
              </span>
            )}
          </div>
        </div>

        {/* Waves list */}
        <div className="p-3 flex flex-col gap-2.5">
          {waves.length === 0 && !hasCompleted ? (
            <div className="text-xs text-white/40 py-2">Planning...</div>
          ) : (
            waves.map((w) => {
              const pct = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0;
              const isActive = w.status === 'running';
              const isDone = w.status === 'complete' || w.status === 'done';
              const barColor = isDone ? 'bg-emerald-500' : isActive ? 'bg-emerald-400' : 'bg-white/10';

              return (
                <div key={w.wave} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 flex items-center gap-1.5">
                      {STATUS_ICON[isDone ? 'done' : isActive ? 'running' : 'pending']}
                      Wave {w.wave} · {w.completed}/{w.total}
                    </span>
                    <span className="text-[10px] text-white/40">{pct}%</span>
                  </div>
                  <div
                    className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"
                    {...(isActive ? { 'data-slot': 'progress-indicator' } : {})}
                  >
                    <motion.div
                      className={`h-full rounded-full ${barColor} relative`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>

                  {/* Live subagents in this wave */}
                  {isActive && (
                    <div className="ml-4 flex flex-col gap-1 mt-1">
                      {Object.values(subagents)
                        .filter((s) => {
                          // Show subagents that are running or done
                          const todo = w.subagentIds?.includes(s.todoId);
                          return s.status === 'running' || s.status === 'done';
                        })
                        .slice(0, 3)
                        .map((s) => (
                          <div key={s.todoId} className="flex items-center gap-2 text-[11px]">
                            {STATUS_ICON[s.status] || STATUS_ICON.pending}
                            <span className={DOMAIN_COLORS[s.domain] || 'text-white/40'}>
                              [{DOMAIN_ABBREV[s.domain] || s.domain?.slice(0, 6) || 'unknown'}]
                            </span>
                            <span className="text-white/60 truncate max-w-[180px]">
                              {s.message || 'working...'}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Build summary (appears after all waves complete) */}
          {hasCompleted && buildSummary && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2 border-t border-white/5 mt-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={(buildSummary.failed ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    ✓ {buildSummary.done ?? 0}/{buildSummary.total ?? 0} done
                  </span>
                  {(buildSummary.failed ?? 0) > 0 && (
                    <span className="text-red-400">✗ {buildSummary.failed} failed</span>
                  )}
                  {(buildSummary.needsReview ?? 0) > 0 && (
                    <span className="text-amber-400">⚑ {buildSummary.needsReview} review</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <BarChart3 className="w-3 h-3" />
                  <span>{Math.round(buildSummary.elapsedSecs || 0)}s</span>
                  {/* Real, ledger-attributed spend (MF-002). `cost` is the legacy
                      rate-table estimate and is only shown when no ledger figure
                      exists — WEB-004 used to render neither. */}
                  {buildSummary.spendUsd != null ? (
                    <span className="text-white/60" title="Ledger-attributed spend">
                      ${Number(buildSummary.spendUsd).toFixed(2)}
                    </span>
                  ) : (
                    buildSummary.cost != null && buildSummary.cost > 0 && (
                      <span title="Legacy rate-table estimate">~${Number(buildSummary.cost).toFixed(2)}</span>
                    )
                  )}
                  {(buildSummary.tokensIn != null || buildSummary.tokensOut != null) && (
                    <span className="font-mono text-[10px]">
                      {((buildSummary.tokensIn ?? 0) / 1000).toFixed(1)}k in /{' '}
                      {((buildSummary.tokensOut ?? 0) / 1000).toFixed(1)}k out
                    </span>
                  )}
                </div>
              </div>

              {/* Cost ceiling reached — the run was STOPPED, not completed. This is
                  a warning, not a failure: the user needs the resume command. */}
              {buildSummary.budget != null && (
                <div
                  role="status"
                  data-testid="build-budget-banner"
                  className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] text-amber-200/90"
                >
                  <strong className="font-medium">Stopped at the cost ceiling.</strong>{' '}
                  spent ${Number(buildSummary.budget.spentUsd ?? 0).toFixed(2)} of the $
                  {Number(buildSummary.budget.limitUsd ?? 0).toFixed(2)} limit
                  {buildSummary.budget.at ? ` (${new Date(buildSummary.budget.at).toLocaleString()})` : ''}.
                  Resume with <code className="font-mono">mcode god --resume</code>.
                </div>
              )}

              {/* Writer-safety signals (MF-004) — previously dropped at the type. */}
              {(buildSummary.overlaps?.length || buildSummary.lockConflicts?.length || buildSummary.emptyFileTodos?.length) ? (
                <div className="mt-2 flex flex-col gap-1 text-[11px]" data-testid="build-conflicts">
                  {(buildSummary.overlaps?.length ?? 0) > 0 && (
                    <details>
                      <summary className="cursor-pointer text-amber-300/80">
                        ⚠ {buildSummary.overlaps!.length} file(s) written by more than one agent
                      </summary>
                      <ul className="mt-1 flex flex-col gap-0.5 text-white/50">
                        {buildSummary.overlaps!.map((o) => (
                          <li key={o.file} className="font-mono truncate">
                            {o.file} — {o.writers.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {(buildSummary.lockConflicts?.length ?? 0) > 0 && (
                    <details>
                      <summary className="cursor-pointer text-red-300/80">
                        ⛔ {buildSummary.lockConflicts!.length} lock conflict(s)
                      </summary>
                      <ul className="mt-1 flex flex-col gap-0.5 text-white/50">
                        {buildSummary.lockConflicts!.map((c, i) => (
                          <li key={`${c.file}-${i}`} className="font-mono truncate">
                            {c.file} — todo {c.todoId} blocked by {c.lockedBy ?? 'unknown'}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {(buildSummary.emptyFileTodos?.length ?? 0) > 0 && (
                    <details>
                      <summary className="cursor-pointer text-white/40">
                        {buildSummary.emptyFileTodos!.length} todo(s) produced no files
                      </summary>
                      <ul className="mt-1 flex flex-col gap-0.5 text-white/50">
                        {buildSummary.emptyFileTodos!.map((t) => (
                          <li key={t.id} className="truncate">
                            <span className="text-white/30">{t.domain}</span> {t.title}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              ) : null}

              {(buildSummary.verificationComplete !== undefined || buildSummary.securityPassed !== undefined || buildSummary.playwrightClean !== undefined) && (
                <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-white/5 text-[11px]">
                  {buildSummary.verificationComplete !== undefined && (
                    <span className={buildSummary.verificationComplete ? 'text-emerald-400' : 'text-amber-400'}>
                      {buildSummary.verificationComplete ? '✓' : '○'} verification ({buildSummary.verificationPasses || 0} pass{buildSummary.verificationPasses !== 1 ? 'es' : ''})
                    </span>
                  )}
                  {buildSummary.securityPassed !== undefined && (
                    <span className={buildSummary.securityPassed ? 'text-emerald-400' : 'text-red-400'}>
                      {buildSummary.securityPassed ? '✓' : '✗'} security ({buildSummary.securityChecks?.done ?? 0}/{buildSummary.securityChecks?.total ?? 0})
                    </span>
                  )}
                  {buildSummary.playwrightClean !== undefined && (
                    <span className={buildSummary.playwrightClean ? 'text-emerald-400' : 'text-amber-400'}>
                      {buildSummary.playwrightClean ? '✓' : '⚠'} playwright{!buildSummary.playwrightClean && ` (${buildSummary.playwrightIssuesRemaining ?? 0} open)`}
                    </span>
                  )}
                </div>
              )}

              {/* Model usage breakdown — collapsible */}
              {buildSummary.modelsByDomain && buildSummary.modelsByDomain.length > 0 && (
                <details className="mt-1.5">
                  <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">model usage ▾</summary>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {buildSummary.modelsByDomain.map((m) => (
                      <div key={m.domain} className="flex justify-between text-[10px] text-white/40">
                        <span>{m.domain}</span>
                        <span className="font-mono">{m.model} · {m.calls}× · ${Number(m.cost || 0).toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
