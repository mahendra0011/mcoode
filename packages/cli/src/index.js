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

  // ── Scaffold ──────────────────────────────────────────────────────────
  program
    .command('init [name]')
    .description('scaffold a new project from a template')
    .option('-t, --template <name>', 'template: express | fastify | react-vite | full-stack', 'express')
    .option('-y, --yes', 'skip the empty-dir check', false)
    .option('-l, --list', 'list available templates', false)
    .action(async (name, opts) => {
      const { initCommand, initListCommand } = await import('./commands/init.js');
      if (opts.list || !name) return initListCommand();
      await initCommand({ name, template: opts.template, yes: opts.yes });
    });

  // ── God mode ──────────────────────────────────────────────────────────
  program
    .command('god <prompt>')
    .description('god mode: plan + parallel subagents + integration pass')
    .option('-y, --yes', 'skip plan confirmation', false)
    .option('--stack <stack>', 'stack hint for the planner')
    .option('--deploy <target>', 'deploy target label')
    .option('--no-tests', 'skip integration test pass', false)
    .option('-c, --concurrency <n>', 'max concurrent subagents', parseFloat)
    .option('--watch-after', 'start the watch daemon after the run', false)
    .option('-m, --model <ref>', 'force provider:model')
    .option('--verbose', 'verbose subagent output', false)
    .action(async (prompt, opts) => {
      const { godCommand } = await import('./commands/god.js');
      setInteractive(Boolean(opts.yes));
      await godCommand({
        prompt,
        yes: opts.yes,
        stack: opts.stack,
        deployTarget: opts.deploy,
        noTests: opts.noTests,
        concurrency: opts.concurrency,
        watchAfter: opts.watchAfter,
        model: opts.model,
        verbose: opts.verbose
      });
    });

  // ── Run / test ────────────────────────────────────────────────────────
  program
    .command('run <script>')
    .description('run a script from package.json (mcode run dev)')
    .action(async (script) => {
      const { runCommand } = await import('./commands/run.js');
      await runCommand(script);
    });

  program
    .command('test')
    .description('run the test script')
    .option('--changed', 'only test files changed since the last commit', false)
    .action(async (opts) => {
      const { testCommand } = await import('./commands/test.js');
      await testCommand({ changed: opts.changed });
    });

  program
    .command('gen <thing> <name>')
    .description('generate a file (component, route, controller)')
    .action(async (thing, name) => {
      const { genCommand } = await import('./commands/gen.js');
      await genCommand(thing, name);
    });

  // ── Env vault ─────────────────────────────────────────────────────────
  const env = program
    .command('env')
    .description('manage the encrypted secrets vault (mcode env add KEY value)');

  env
    .command('add <key> [value]')
    .description('store a secret (uses --file or prompts if value omitted)')
    .option('--plain', 'write to .env instead of the encrypted vault (CI)', false)
    .option('-f, --file <path>', 'read the value from a file')
    .action(async (key, value, opts) => {
      const { envCommand } = await import('./commands/env.js');
      await envCommand({ action: 'add', key, value, plain: opts.plain, file: opts.file });
    });

  env
    .command('remove <key>')
    .alias('rm')
    .description('delete a secret')
    .action(async (key) => {
      const { envCommand } = await import('./commands/env.js');
      await envCommand({ action: 'remove', key });
    });

  env
    .command('list')
    .description('list secrets (values masked)')
    .action(async () => {
      const { envCommand } = await import('./commands/env.js');
      await envCommand({ action: 'list' });
    });

  // env alone → list
  env.action(async () => {
    const { envCommand } = await import('./commands/env.js');
    await envCommand({ action: 'list' });
  });

  // ── Model catalog ─────────────────────────────────────────────────────
  const model = program
    .command('model')
    .description('inspect or pin the model catalog');

  model
    .command('list')
    .description('list all usable models')
    .action(async () => {
      const { modelListCommand } = await import('./commands/model.js');
      await modelListCommand();
    });

  model
    .command('show [domain]')
    .description('show routing for a domain (or all)')
    .action(async (domain) => {
      const { modelShowCommand } = await import('./commands/model.js');
      await modelShowCommand({ domain });
    });

  model
    .command('set <domain> <ref>')
    .description('pin provider:model for a domain (mcode model set devops groq:llama-3.1-8b-instant)')
    .action(async (domain, ref) => {
      const { modelSetCommand } = await import('./commands/model.js');
      await modelSetCommand(domain, ref);
    });

  model
    .command('reset [domain]')
    .description('restore default routing for a domain (or all)')
    .action(async (domain) => {
      const { modelResetCommand } = await import('./commands/model.js');
      await modelResetCommand({ domain });
    });

  model
    .command('modes')
    .description('list the quality modes')
    .action(async () => {
      const { modelModesCommand } = await import('./commands/model.js');
      await modelModesCommand();
    });

  model.action(async () => {
    const { modelListCommand } = await import('./commands/model.js');
    await modelListCommand();
  });

  // ── Watch daemon ──────────────────────────────────────────────────────
  program
    .command('watch')
    .description('start the auto-fix watch daemon')
    .option('-b, --background', 'detach into the background (survives terminal close)', false)
    .option('--scan <ms>', 'scan interval in ms')
    .action(async (opts) => {
      const { watchCommand } = await import('./commands/watch.js');
      await watchCommand({ background: opts.background, scanIntervalMs: opts.scan });
    });

  program
    .command('watch-stop')
    .description('stop the watch daemon')
    .action(async () => {
      const { watchStopCommand } = await import('./commands/watch.js');
      await watchStopCommand();
    });

  program
    .command('watch-status')
    .description('show watch daemon status')
    .action(async () => {
      const { watchStatusCommand } = await import('./commands/watch.js');
      await watchStatusCommand();
    });

  program
    .command('agents')
    .description('list live subagents/daemons')
    .action(async () => {
      const { agentsCommand } = await import('./commands/agents.js');
      await agentsCommand();
    });

  // ── Backend / dashboard ───────────────────────────────────────────────
  program
    .command('serve')
    .description('start the backend (Express + Socket.IO) for the dashboard')
    .option('-p, --port <port>', 'port (default 3100)', (v) => Number(v))
    .action(async (opts) => {
      const { serveCommand } = await import('./commands/config.js');
      await serveCommand({ port: opts.port });
    });

  // ── Config / doctor / history ─────────────────────────────────────────
  program
    .command('config')
    .description('show or open the config file')
    .option('--open', 'open the config in your editor', false)
    .action(async (opts) => {
      const { configCommand } = await import('./commands/config.js');
      await configCommand({ open: opts.open });
    });

  program
    .command('doctor')
    .description('diagnose the environment (node, config, vault, providers)')
    .option('--json', 'machine-readable output', false)
    .action(async (opts) => {
      setJsonMode(Boolean(opts.json));
      const { doctorCommand } = await import('./commands/doctor.js');
      await doctorCommand({ asJson: opts.json });
    });

  program
    .command('history')
    .description('list session history')
    .option('--clear', 'clear history', false)
    .option('--json', 'machine-readable output', false)
    .action(async (opts) => {
      setJsonMode(Boolean(opts.json));
      const { historyCommand } = await import('./commands/history.js');
      await historyCommand({ asJson: opts.json, clear: opts.clear });
    });

  // ── Add / ship ────────────────────────────────────────────────────────
  program
    .command('add <plugin>')
    .description('install a registry plugin (eslint, prettier, deploy-*)')
    .action(async (plugin) => {
      const { addCommand } = await import('./commands/add.js');
      await addCommand(plugin);
    });

  program
    .command('plugins')
    .description('list available registry plugins')
    .option('-c, --category <cat>', 'filter by category')
    .action(async (opts) => {
      const { pluginsListCommand } = await import('./commands/add.js');
      await pluginsListCommand({ category: opts.category });
    });

  program
    .command('ship')
    .description('build + verify + tag + deploy hook')
    .option('-e, --env <env>', 'environment label', 'prod')
    .option('-y, --yes', 'skip confirmations', false)
    .action(async (opts) => {
      const { shipCommand } = await import('./commands/ship.js');
      await shipCommand({ env: opts.env, yes: opts.yes });
    });

  // ── Interactive onboarding / login ────────────────────────────────────
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