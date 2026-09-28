import { Orchestrator } from '../core/orchestrator.js';
import { loadConfig } from '../core/store.js';
import { ok, info, warn, fail, confirm, table, json, isJsonMode, isInteractive } from '../core/logger.js';
import { saveHistory } from '../core/history.js';
import {
  loadResumableState,
  listSessionStates,
  summarizeTodoStatus,
  interruptedTodos,
  revertInterruptedFiles
} from '../core/session-state.js';
import { DEFAULT_CONFIG } from '@mcode/shared';

export async function godCommand({ prompt, yes, stack, deployTarget, noTests, concurrency, watchAfter, model = null, verbose = false, resume = null, listSessions = false, revertInterrupted = false, dryRun = false, executePlan = false, maxCost = null }) {
  // MF-001: `mcode god --list-sessions` is a pure read — never plans, never writes.
  if (listSessions) return listSessionsCommand();

  // MF-001: resume loads the wave checkpoint instead of re-planning; DONE todos
  // are re-attached so they are neither re-dispatched nor re-billed.
  let resumeState = null;
  if (resume !== null && resume !== undefined && resume !== false) {
    try {
      resumeState = await loadResumableState(resume === true ? null : resume, {
        projectPath: process.cwd()
      });
    } catch (err) {
      return reportResumeFailure(err);
    }
  }

  const config = await loadConfig();
  const merged = {
    ...DEFAULT_CONFIG,
    ...config,
    concurrency: concurrency || config.concurrency || DEFAULT_CONFIG.concurrency,
    watchAfter
  };
  if (stack) merged.stackHint = stack;

  const orchestrator = new Orchestrator({
    projectPath: process.cwd(),
    config: merged,
    // MF-002: --max-cost rides along as the default ceiling for this run.
    options: { modelOverride: model, verbose, ...(maxCost != null ? { maxCost } : {}) }
  });
  await orchestrator.init();

  const addMessage = (msg) => {
    const text = typeof msg === 'string' ? msg : msg.text || '';
    if (msg.kind === 'ok') ok(text);
    else if (msg.kind === 'err') console.error(text);
    else info(text);
  };

  if (resumeState) {
    await announceResume({ state: resumeState, orchestrator, revertInterrupted });
    info('tip: `mcode god --list-sessions` shows every resumable run');
  }

  // MF-001: SIGINT flush — Ctrl+C must leave a resumable checkpoint behind and
  // tell the user how to continue, instead of silently losing the wave state.
  const onSigint = async () => {
    process.off('SIGINT', onSigint); // never re-enter while flushing
    warn('interrupted - flushing session checkpoint');
    const manager = orchestrator.manager;
    if (manager) {
      manager.stop();
      await manager.pendingCheckpoint.catch(() => {});
      info(`resume with: mcode god --resume ${orchestrator.sessionId}`);
    } else {
      info('no checkpoint yet (planning had not finished)');
    }
    orchestrator.disconnect();
    process.exit(130);
  };
  process.on('SIGINT', onSigint);

  let summary;
  try {
    summary = await orchestrator.runGod(prompt, {
      addMessage,
      fresh: false,
      noTests,
      deployTarget,
      resumeState,
      // MF-003: preview-only / execute-the-previewed-plan modes.
      dryRun: Boolean(dryRun),
      executePlan: Boolean(executePlan),
      // MF-002: explicit budget ceiling for this run.
      maxCost: maxCost ?? null,
      confirmFn: yes ? null : async (plan) => {
        info(`${plan.summary}`);
        table(plan.todos.map((t) => [t.id, t.domain, t.title]), {
          columns: ['ID', 'DOMAIN', 'TITLE']
        });
        return confirm(
          resumeState
            ? 'resume this plan and dispatch the remaining subagents?'
            : 'approve plan and dispatch subagents?',
          { defaultYes: true }
        );
      }
    });
  } finally {
    process.off('SIGINT', onSigint);
  }
  // 851: don't amputate the socket 500ms after the build — in-flight
  // summary events would never reach the dashboard. Give the transport a
  // bounded drain window, then disconnect (no-op when already offline).
  if (!watchAfter) {
    const sock = orchestrator.socket;
    if (sock?.connected) {
      await Promise.race([
        new Promise((r) => {
          const t = setTimeout(r, 2000);
          t.unref?.();
        }),
      ]);
    }
    orchestrator.disconnect();
  }

  if (!summary) return;

  // MF-003: dry-run stops before history/session bookkeeping — it ran nothing.
  if (summary.dryRun) {
    ok(`dry run — ${summary.todos} todos in ${summary.waves} wave(s) across ${summary.domains.length} domain(s), nothing dispatched`);
    info('execute with: mcode god --execute-plan');
    orchestrator.disconnect();
    return;
  }

  const duration = formatDuration(summary.elapsedSecs);
  const spendUsd = Number(summary.spendUsd ?? summary.cost ?? 0);
  ok(`build complete — ${summary.done}/${summary.total} todos \u00b7 ${duration} \u00b7 $${spendUsd.toFixed(2)}`);
  // MF-002: per-run money + token line — the "kitna kharcha hua?" answer.
  info(`  spend: $${spendUsd.toFixed(2)}${summary.budget ? ` of $${Number(summary.budget.limitUsd).toFixed(2)} budget` : ''} \u00b7 tokens ${summary.tokensIn ?? 0} in / ${summary.tokensOut ?? 0} out`);

  // MF-002: budget ceiling hit — todos are pending, checkpoint is resumable.
  if (summary.budget) {
    warn(`budget ceiling reached (~$${Number(summary.budget.spentUsd).toFixed(2)} of $${Number(summary.budget.limitUsd).toFixed(2)}) - remaining todos left pending`);
    info(`resume with a higher cap: mcode god --resume ${orchestrator.sessionId} --max-cost <usd>`);
    process.exitCode = 1;
  }

  // MF-004: conflict report — parallel todos that wrote the same file.
  if (summary.overlaps?.length) {
    warn(`${summary.overlaps.length} overlapping write(s) detected (last write wins):`);
    for (const o of summary.overlaps.slice(0, 5)) {
      info(`  ${o.file} \u2190 ${o.writers.join(', ')}`);
    }
    if (summary.overlaps.length > 5) info(`  \u2026 +${summary.overlaps.length - 5} more`);
    info('to chain them next time, list the shared file in both todos\' "files"');
    await offerConflictResolution(summary.overlaps, orchestrator);
  }
  if (summary.lockConflicts?.length) {
    warn(`${summary.lockConflicts.length} file-lock conflict(s) - verify the diffs:`);
    for (const c of summary.lockConflicts.slice(0, 5)) {
      info(`  ${c.file} (${c.todoId} waited on ${c.lockedBy || 'unknown'})`);
    }
  }

  for (const t of summary.todos) {
    if (t.status === 'failed' || t.status === 'needs_review') {
      console.error(`  \u2717 ${t.id} [${t.domain}] ${t.title} — ${t.status}`);
    }
  }

  await saveHistory({
    id: orchestrator.sessionId,
    mode: 'god',
    projectName: process.cwd().split(/[\\/]/).pop(),
    projectPath: process.cwd(),
    startedAt: new Date(),
    completedAt: new Date().toISOString(),
    status: summary.failed > 0 ? 'failed' : 'completed',
    plan: orchestrator.manager?.plan || null,
    results: summary
  });

  // 852: post-build clean stays out of non-interactive/JSON pipelines.
  if (merged.clean?.autoDetectOnGodModeComplete && process.stdout.isTTY) {
    try {
      const { cleanCommand } = await import('./clean.js');
      info('\n[clean] running post-god-mode bloat & dead code detection...');
      await cleanCommand({ dryRun: true, thresholdLines: merged.clean?.bloatSizeThresholdLines || 30 });
    } catch {
      /* post-build clean is best-effort — never fail the god run for it */
    }
  }

  if (watchAfter) {
    info('\u25c9 watch daemon started — continuous monitoring active (mcode watch-stop to end)');
  }
}

/**
 * MF-004 (phase 4): interactive resolution for overlapping writes — for each
 * reported file the user can keep the later write (default) or roll it back
 * and keep the first. Non-interactive / JSON runs report and move on.
 */
async function offerConflictResolution(overlaps, orchestrator, { maxPrompts = 3 } = {}) {
  if (!isInteractive() || isJsonMode() || !orchestrator?.manager) return;
  const undoStack = orchestrator.manager.undoStack;
  if (!undoStack?.undo) return;

  const decisions = {};
  for (const o of overlaps.slice(0, maxPrompts)) {
    const keepFirst = await confirm(
      `${o.file}: ${o.writers.join(' then ')} — roll back the later write and keep the first?`,
      { defaultYes: false }
    );
    if (keepFirst) decisions[o.file] = 'keep-first';
  }
  if (Object.keys(decisions).length === 0) return;

  const actions = await orchestrator.manager.resolveOverlaps({ undoStack, decisions });
  for (const a of actions) {
    if (a.action === 'rolled-back') ok(`rolled back ${a.todoId}'s write to ${a.file} (kept the earlier version)`);
    else if (a.action === 'no-snapshot') warn(`${a.file}: ${a.todoId}'s write had no snapshot — cannot roll it back automatically; check the diff`);
    else if (a.action === 'undo-failed') fail(`${a.file}: rollback of ${a.todoId} failed — check the diff manually`);
  }
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}

/** `2026-09-28T10:00:00.000Z` -> `2026-09-28 10:00:00`. */
function formatStamp(iso) {
  return String(iso || '').replace('T', ' ').slice(0, 19) || '-';
}

/** MF-001: `mcode god --list-sessions` — every resumable checkpoint, newest first. */
async function listSessionsCommand() {
  const sessions = await listSessionStates();
  if (isJsonMode()) return json(sessions);
  if (sessions.length === 0) {
    ok('no saved sessions yet - run `mcode god "<task>"` to start one');
    return;
  }
  table(
    sessions.map((s) => {
      const c = summarizeTodoStatus(s.todoStatus);
      return [
        s.sessionId || s.projectId || '-',
        s.projectName || '-',
        s.status || 'unknown',
        `${c.done}/${c.total}`,
        `${s.waveIndex ?? 0}/${s.totalWaves || '?'}`,
        String(s.prompt || '').replace(/\s+/g, ' ').slice(0, 40),
        formatStamp(s.updatedAt)
      ];
    }),
    { columns: ['SESSION', 'PROJECT', 'STATUS', 'DONE', 'WAVE', 'PROMPT', 'UPDATED'] }
  );
  info('resume with: mcode god --resume <session>');
}

/**
 * MF-001: say exactly what is being resumed, and reconcile the files an
 * interrupted subagent already wrote — kept by default, rolled back through the
 * per-project undo stack with `--revert-interrupted`.
 */
async function announceResume({ state, orchestrator, revertInterrupted }) {
  const counts = summarizeTodoStatus(state.todoStatus);
  ok(`resuming ${state.sessionId} - ${counts.done}/${counts.total} todos already done`);
  info(`  prompt: ${String(state.prompt || '').replace(/\s+/g, ' ').slice(0, 120) || '(unknown)'}`);
  info(`  progress: wave ${state.waveIndex ?? 0}/${state.totalWaves || '?'} - checkpoint ${formatStamp(state.updatedAt)}`);
  if (counts.running > 0) {
    warn(`${counts.running} todo(s) were mid-flight when the run died - retrying them from scratch`);
  }

  const interrupted = interruptedTodos(state);
  if (interrupted.length === 0) return;

  warn('interrupted subagents left files on disk:');
  for (const t of interrupted) {
    info(`  - ${t.id} [${t.domain}] ${t.title || ''} -> ${t.files.join(', ')}`);
  }
  if (!revertInterrupted) {
    info('keeping them (default) - re-run with --revert-interrupted to roll back first');
    return;
  }
  const { reverted, missing } = await revertInterruptedFiles({
    state,
    undoStack: orchestrator.undoStack
  });
  if (reverted.length) ok(`reverted ${reverted.length} file(s): ${reverted.join(', ')}`);
  if (missing.length) warn(`no undo snapshot for: ${missing.join(', ')} - those edits stay on disk`);
}

/** A resume target that cannot be resolved must fail loudly, never re-plan. */
function reportResumeFailure(err) {
  fail(err?.message || String(err));
  const available = err?.sessions || [];
  if (available.length > 0) {
    table(
      available.map((s) => {
        const c = summarizeTodoStatus(s.todoStatus);
        return [
          s.sessionId || s.projectId || '-',
          s.projectName || '-',
          `${c.done}/${c.total}`,
          s.status || '-',
          formatStamp(s.updatedAt)
        ];
      }),
      { columns: ['SESSION', 'PROJECT', 'DONE', 'STATUS', 'UPDATED'] }
    );
    info('pick one with: mcode god --resume <session>');
  } else {
    info('no saved sessions - start one with `mcode god "<task>"`');
  }
  process.exitCode = 1;
  return null;
}
