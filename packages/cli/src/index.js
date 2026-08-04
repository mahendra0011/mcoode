import { Command } from 'commander';
import { initCommand, initListCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { testCommand } from './commands/test.js';
import { envCommand } from './commands/env.js';
import { addCommand, pluginsListCommand } from './commands/add.js';
import { shipCommand } from './commands/ship.js';
import { doctorCommand } from './commands/doctor.js';
import { genCommand } from './commands/gen.js';
import { modelListCommand, modelSetCommand, modelShowCommand } from './commands/model.js';
import { historyCommand } from './commands/history.js';
import { configCommand, serveCommand } from './commands/config.js';
import { godCommand } from './commands/god.js';
import { watchCommand, watchStopCommand, watchStatusCommand } from './commands/watch.js';
import { loginCommand, logoutCommand, apiKeyCommand } from './commands/onboarding.js';
import { setJsonMode, setInteractive } from './core/logger.js';
import { startRepl } from './repl.js';

export async function run(argv) {
  const program = new Command('mcode')
    .version('2.4.6')
    .description('terminal-first, multi-model AI coding CLI')
    .option('--json', 'machine-readable output', false)
    .option('--non-interactive', 'disable TUI, plain stdout, no prompts (CI mode)', false)
    .hook('preAction', (cmd) => {
      const opts = cmd.opts();
      setJsonMode(Boolean(opts.json));
      setInteractive(!opts.nonInteractive);
    });

  program
    .command('init [name]')
    .description('scaffold a new project from a template')
    .option('-t, --template <tpl>', 'template: express | fastify | react-vite | full-stack', 'express')
    .option('-y, --yes', 'skip confirmation', false)
    .action(async (name, opts) => {
      if (name === 'list') return initListCommand();
      await initCommand({ name, template: opts.template, yes: opts.yes });
    });

  program
    .command('run <script>')
    .description('run a dev/build/test script with log streaming')
    .action((script) => runCommand(script));

  program
    .command('test')
    .description('run tests; --changed limits to git-changed files')
    .option('--changed', 'only git-changed files', false)
    .action((opts) => testCommand({ changed: opts.changed }));

  program
    .command('env')
    .description('manage encrypted per-project secrets/env vars')
    .argument('<action>', 'add | remove | list')
    .argument('[key]')
    .argument('[value]')
    .option('--file <path>', 'read value from file')
    .option('--plain', 'write to .env instead of the vault (CI mode)', false)
    .action((action, key, value, opts) =>
      envCommand({ action, key, value, plain: opts.plain, file: opts.file }));

  program
    .command('add <plugin>')
    .description('install a plugin/preset from the registry')
    .action((plugin) => addCommand(plugin));

  program
    .command('plugins')
    .description('list registry plugins')
    .action(async () => {
      const list = await pluginsListCommand();
      for (const p of list) process.stdout.write(`${p.name.padEnd(18)} ${p.category.padEnd(10)} ${p.desc}\n`);
    });

  program
    .command('ship')
    .description('build, verify, tag, deploy in one pass')
    .option('--env <name>', 'deploy env', 'prod')
    .option('-y, --yes', 'skip confirmation', false)
    .action((opts) => shipCommand({ env: opts.env, yes: opts.yes }));

  program
    .command('doctor')
    .description('diagnose environment — node, keys, provider connectivity')
    .action(() => doctorCommand());

  program
    .command('gen <thing>')
    .description('generators: route | component | controller')
    .argument('[name]')
    .action((thing, name) => genCommand(thing, name));

  program
    .command('model')
    .description('list / set models for task types')
    .argument('<action>', 'list | set | show')
    .argument('[taskType]')
    .argument('[model]')
    .action((action, taskType, model) => {
      if (action === 'list') return modelListCommand();
      if (action === 'show') return modelShowCommand();
      if (action === 'set') return modelSetCommand(taskType, model);
      process.stderr.write('usage: mcode model list | show | set <task-type> <provider:model>\n');
      process.exit(1);
    });

  program
    .command('history')
    .description('show session history')
    .option('--clear', 'clear history', false)
    .action((opts) => historyCommand({ clear: opts.clear }));

  program
    .command('config')
    .description('show or open the global config file')
    .option('--open', 'open in editor', false)
    .action((opts) => configCommand({ open: opts.open }));

  program
    .command('login')
    .description('create an account (OTP) or log in to mcode')
    .action(() => loginCommand());

  program
    .command('logout')
    .description('log out of your mcode account')
    .action(() => logoutCommand());

  program
    .command('api-key')
    .description('add or replace an AI provider API key (stored in the encrypted vault)')
    .action(() => apiKeyCommand());

  program
    .command('serve')
    .description('start the local Express backend for the web dashboard')
    .option('-p, --port <n>', 'port', process.env.MCCODE_PORT || '3100')
    .action((opts) => serveCommand({ port: opts.port }));

  program
    .command('god')
    .description('God Mode — full autonomous multi-model build from a single prompt')
    .argument('<prompt...>')
    .option('-y, --yes', 'skip plan confirmation', false)
    .option('--stack <s>', 'hint stack (e.g. "next+postgres")')
    .option('--deploy-target <t>', 'deploy target (netlify|vercel|docker)')
    .option('--no-tests', 'skip test todos', false)
    .option('-m, --model <ref>', 'force a specific provider:model for every todo', null)
    .option('--verbose', 'log every tool call to stderr', false)
    .option('-c, --concurrency <n>', 'max parallel subagents', '5')
    .option('--watch-after', 'hand off to watch daemon after build', false)
    .action(async (promptParts, opts) => {
      await godCommand({
        prompt: promptParts.join(' '),
        yes: opts.yes,
        stack: opts.stack,
        deployTarget: opts.deployTarget,
        noTests: opts.noTests,
        model: opts.model,
        verbose: opts.verbose,
        concurrency: Number(opts.concurrency),
        watchAfter: opts.watchAfter
      });
    });

  program
    .command('watch')
    .description('start the always-on background scan/bugfix daemon')
    .option('--background', 'detach as a background OS process', false)
    .option('--scan-interval <ms>', 'full-repo scan interval', null)
    .action((opts) => watchCommand({ background: opts.background, scanIntervalMs: opts.scanIntervalMs }));

  program
    .command('watch-stop')
    .alias('watchstop')
    .description('stop the watch daemon')
    .action(() => watchStopCommand());

  program
    .command('watch-status')
    .alias('watchstatus')
    .description('show daemon status, uptime, fixes applied')
    .action(() => watchStatusCommand());

  program
    .command('agents')
    .description('list running subagents and their todo assignments')
    .action(async () => {
      const { agentsCommand } = await import('./commands/agents.js');
      await agentsCommand();
    });

  program
    .command('repl', { hidden: true })
    .description('start the interactive session')
    .action(() => startRepl());

  if (argv.length <= 2) {
    await startRepl();
    return;
  }

  program.parse(argv);
}
