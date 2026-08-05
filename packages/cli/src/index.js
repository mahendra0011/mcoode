import { Command } from 'commander';
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

  if (argv.length <= 2) {
    await startRepl();
    return;
  }

  program.parse(argv);
}
