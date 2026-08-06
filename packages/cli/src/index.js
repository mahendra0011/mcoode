import { Command } from 'commander';
import { setJsonMode, setInteractive, setQuiet, isJsonMode, out, ok, fail, json } from './core/logger.js';
import { startRepl } from './repl.js';

export async function run(argv) {
  const program = new Command('mcode')
    .version('2.4.6')
    .description('terminal-first, multi-model AI coding CLI')
    .option('--json', 'machine-readable output', false)
    .option('--non-interactive', 'disable TUI, plain stdout, no prompts (CI mode)', false)
    .option('--quiet', 'suppress non-essential output', false)
    .option('--no-watch', 'disable auto-watch mode after god runs', false)
    .option('--god <prompt>', 'one-shot God Mode: plan + parallel subagents + build')
    .option('--max-agents <n>', 'max concurrent subagents (default 5)')
    .option('--mode <mode>', 'quality dial: low | medium | high | extra | max | god')
    .option('--model <ref>', 'force a provider:model (e.g. openai:gpt-4o) for all roles')
    .option('--no-tests', 'skip the integration test pass and bugfix rounds after god')
    .option('--watch-after', 'start the watch daemon when a live god run finishes')
    .option('--confirm', 'ask for plan approval before dispatching subagents (--confirm no skips it)')
    .option('--deploy <target>', 'deploy target label for a god run')
    .hook('preAction', (cmd) => {
      const opts = cmd.opts();
      setJsonMode(Boolean(opts.json));
      setInteractive(!opts.nonInteractive);
      setQuiet(Boolean(opts.quiet));
    });

  program
    .command('uninstall')
    .alias('unistall')
    .alias('unstall')
    .description('uninstall mcode and all its local data')
    .action(async () => {
      const { uninstallCommand } = await import('./commands/uninstall.js');
      await uninstallCommand();
    });

  program
    .command('install')
    .description('install or repair mcode dependencies')
    .action(async () => {
      console.log('mcode dependencies are already installed.');
    });

  program
    .command('login')
    .description('create an account or log in to the mcode backend')
    .action(async () => {
      const { loginCommand } = await import('./commands/onboarding.js');
      await loginCommand();
    });

  program
    .command('logout')
    .description('log out of the mcode backend (vault keys are untouched)')
    .action(async () => {
      const { logoutCommand } = await import('./commands/onboarding.js');
      await logoutCommand();
    });

  program
    .command('api-key')
    .description('add or manage provider API keys')
    .action(async () => {
      const { apiKeyAddCommand } = await import('./commands/api-key.js');
      await apiKeyAddCommand();
    });

  program.action(async () => {
    const opts = program.opts();
    if (opts.god) {
      setInteractive(false);
      const exitCode = await runGodOnce(opts.god, opts.maxAgents, {
        watchAfter: opts.watchAfter === true && opts.watch !== false,
        noTests: opts.noTests,
        confirm: opts.confirm,
        model: opts.model,
        mode: opts.mode,
        deployTarget: opts.deploy
      });
      process.exit(exitCode);
    }
    program.help({ error: true });
  });

  if (argv.length <= 2) {
    const opts = program.opts();
    await startRepl({ watchAfter: opts.watch });
    return;
  }

  await program.parseAsync(argv);
}

/** One-shot non-interactive God Mode run: plan, dispatch subagents, print summary. */
async function runGodOnce(prompt, maxAgents, { watchAfter = false, noTests = false, confirm = null, model = null, mode = null, deployTarget = null } = {}) {
  const { Orchestrator } = await import('./core/orchestrator.js');
  const { loadConfig } = await import('./core/store.js');
  try {
    const config = await loadConfig();
    const { migrateLegacyRefreshToken } = await import('./commands/onboarding.js');
    await migrateLegacyRefreshToken(config);
    const orchestrator = new Orchestrator({
      config,
      options: {
        maxAgents: Number(maxAgents) || 5,
        watchAfter: Boolean(watchAfter),
        modelOverride: model || config.modelOverride || null,
        mode: mode || undefined
      }
    });
    await orchestrator.init();

    out(`\u25b8 god mode: "${String(prompt).slice(0, 120)}"`);
    const summary = await orchestrator.runGod(prompt, {
      noTests: Boolean(noTests),
      deployTarget: deployTarget || null,
      confirmFn: confirm ? async () => true : null,
      addMessage: (m) => {
        const line = String(m.text || '');
        if (m.kind === 'ok') ok(line);
        else if (m.kind === 'err' || m.kind === 'error') fail(line);
        else out(line);
      }
    });
    if (!summary) {
      if (isJsonMode()) json({ ok: false, error: 'god run cancelled or failed' });
      else fail('god run cancelled or failed');
      return 1;
    }
    if (isJsonMode()) {
      json({ ok: true, ...summary });
      return summary.failed > 0 ? 1 : 0;
    }
    ok(`build complete — ${summary.done}/${summary.total} todos \u00b7 ${summary.elapsedSecs.toFixed(1)}s \u00b7 ${summary.files || 0} files \u00b7 est. $${Number(summary.cost || 0).toFixed(2)}`);
    for (const m of summary.models || []) {
      out(`  ${m.domain.padEnd(10)} \u2192 ${m.model} (${m.count} todo${m.count === 1 ? '' : 's'})`);
    }
    if (summary.failed > 0) {
      fail(`${summary.failed} todo(s) failed, ${summary.needsReview || 0} need review`);
      return 1;
    }
    orchestrator.disconnect();
    return 0;
  } catch (err) {
    fail(err?.message || String(err));
    return 1;
  }
}
