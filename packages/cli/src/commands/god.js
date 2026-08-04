import { Orchestrator } from '../core/orchestrator.js';
import { loadConfig } from '../core/store.js';
import { ok, info, confirm, table } from '../core/logger.js';
import { saveHistory } from '../core/history.js';
import { DEFAULT_CONFIG } from '@mcode/shared';

export async function godCommand({ prompt, yes, stack, deployTarget, noTests, concurrency, watchAfter, model = null, verbose = false }) {
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
    options: { modelOverride: model, verbose }
  });
  await orchestrator.init();

  const addMessage = (msg) => {
    const text = typeof msg === 'string' ? msg : msg.text || '';
    if (msg.kind === 'ok') ok(text);
    else if (msg.kind === 'err') console.error(text);
    else info(text);
  };

  const summary = await orchestrator.runGod(prompt, {
    addMessage,
    fresh: false,
    noTests,
    deployTarget,
    confirmFn: yes ? null : async (plan) => {
      info(`${plan.summary}`);
      table(plan.todos.map((t) => [t.id, t.domain, t.title]), {
        columns: ['ID', 'DOMAIN', 'TITLE']
      });
      return confirm('approve plan and dispatch subagents?', { defaultYes: true });
    }
  });
  if (!watchAfter) setTimeout(() => orchestrator.disconnect(), 500);

  if (!summary) return;

  const duration = formatDuration(summary.elapsedSecs);
  ok(`build complete — ${summary.done}/${summary.total} todos · ${duration}`);
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

  if (watchAfter) {
    info('\u25c9 watch daemon started — continuous monitoring active (mcode watch-stop to end)');
  }
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m > 0 ? `${m}m${String(s).padStart(2, '0')}s` : `${s}s`;
}
