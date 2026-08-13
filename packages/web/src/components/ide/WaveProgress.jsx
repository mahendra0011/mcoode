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
const DOMAIN_COLORS = {
  frontend: 'text-blue-400',
  backend: 'text-purple-400',
  db: 'text-amber-400',
  devops: 'text-green-400',
  test: 'text-teal-400',
  docs: 'text-gray-400',
};

const STATUS_ICON = {
  done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  running: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
  pending: <Clock className="w-3.5 h-3.5 text-white/30" />,
  needs_review: <Clock className="w-3.5 h-3.5 text-amber-400" />,
};

export function WaveProgress({ waves = [], subagents = {}, buildSummary = null, godMode = false }) {
  if (!godMode) return null;

  const activeWave = waves.find((w) => w.status === 'running');
  const hasCompleted = buildSummary && buildSummary.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
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
          {activeWave && (
            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
              Wave {activeWave.wave} active
            </span>
          )}
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
              const barColor = isDone ? 'bg-emerald-500' : isActive ? 'bg-blue-400' : 'bg-white/10';

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
                      transition={{ duration: 0.5, ease: 'easeOut' }}
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
                              [{s.domain?.slice(0, 6) || 'unknown'}]
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
          {hasCompleted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-2 border-t border-white/5 mt-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={buildSummary.failed > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    ✓ {buildSummary.done}/{buildSummary.total} done
                  </span>
                  {buildSummary.failed > 0 && (
                    <span className="text-red-400">✗ {buildSummary.failed} failed</span>
                  )}
                  {buildSummary.needsReview > 0 && (
                    <span className="text-amber-400">⚑ {buildSummary.needsReview} review</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-white/40">
                  <BarChart3 className="w-3 h-3" />
                  <span>{Math.round(buildSummary.elapsedSecs || 0)}s</span>
                  {buildSummary.cost > 0 && <span>${Number(buildSummary.cost).toFixed(2)}</span>}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
