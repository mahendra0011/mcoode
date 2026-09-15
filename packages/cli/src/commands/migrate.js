import chalk from 'chalk';
import readline from 'node:readline';
import { isJsonMode, json, out } from '../core/logger.js';
import { runMigrate } from '../core/migrate/runner.js';
import { EventEmitter } from 'node:events';

/**
 * Ask user confirmation via standard terminal prompt or ASCII box.
 */
async function askConfirmation(question = 'proceed with migration? [Y/n]') {
  if (process.env.CI || process.env.NON_INTERACTIVE) return true;

  const width = 45;
  const topBorder = '┌ ' + '─ '.repeat(Math.floor((width - 4) / 2)) + ' ┐';
  const botBorder = '└ ' + '─ '.repeat(Math.floor((width - 4) / 2)) + ' ┘';

  console.log('');
  console.log(chalk.dim(topBorder));
  console.log(chalk.dim('│') + chalk.bold.cyan(`  > ${question}`.padEnd(width - 2)) + chalk.dim('│'));
  console.log(chalk.dim(botBorder));
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('> ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes');
    });
  });
}

/**
 * CLI Command handler for `mcode migrate <prompt>`
 *
 * @param {string} prompt - Migration description
 * @param {{
 *   yes?: boolean,
 *   asJson?: boolean,
 *   maxPasses?: number
 * }} options
 */
export async function migrateCommand(prompt, { yes = false, asJson = false, maxPasses = 5 } = {}) {
  const jsonMode = Boolean(asJson || isJsonMode());

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    if (jsonMode) {
      json({ error: 'Migration description prompt is required' });
      process.exit(1);
    }
    console.error(chalk.red('Error: Migration prompt is required (e.g. mcode migrate "upgrade React 18 to React 19")'));
    process.exit(1);
  }

  const bus = new EventEmitter();

  if (!jsonMode) {
    console.log('');
    console.log(chalk.bold(`$ mcode migrate "${prompt.trim()}"`));
    console.log('');

    bus.on('MIGRATE_STATUS', (evt) => {
      switch (evt.stage) {
        case 'snapshot':
          console.log(chalk.cyan('snapshotting current behavior...'));
          break;
        case 'plan':
          console.log(chalk.cyan('planning migration (domain: migration)...'));
          break;
        case 'executing':
          console.log(chalk.cyan(`executing... ${evt.totalTodos}/${evt.totalTodos} tasks`));
          break;
        case 'verify':
          console.log(chalk.cyan(`verifying behavioral equivalence — pass ${evt.pass}/${evt.maxPasses}…`));
          break;
        case 'fixing':
          console.log(chalk.yellow(`  fixing ${evt.fixCount} regression${evt.fixCount !== 1 ? 's' : ''}...`));
          break;
        case 'verified':
          console.log(chalk.green(`  ${evt.message}`));
          break;
        case 'cancelled':
          console.log(chalk.red('  Migration cancelled.'));
          break;
        default:
          if (evt.message) console.log(chalk.dim(`  ${evt.message}`));
      }
    });

    bus.on('MIGRATE_PASS_RESULT', (evt) => {
      if (evt.regressions && evt.regressions.length > 0) {
        console.log(chalk.yellow(`  ⚠ ${evt.regressions.length} regression${evt.regressions.length !== 1 ? 's' : ''}:`));
        for (const reg of evt.regressions) {
          console.log(chalk.yellow(`    • ${reg.feature}: ${reg.reason}`));
        }
      }
    });
  }

  try {
    const result = await runMigrate(prompt, {
      projectPath: process.cwd(),
      bus,
      maxPasses: Number(maxPasses || 5),
      yes: Boolean(yes),
      onConfirmPlan: async (plan) => {
        if (!jsonMode) {
          console.log(chalk.dim(`  ${plan.todos.length} todos — ${plan.summary || 'migration plan'}`));
          return askConfirmation('proceed with migration? [Y/n]');
        }
        return true;
      }
    });

    if (jsonMode) {
      json(result);
      return;
    }

    console.log('');
    if (result.cancelled) {
      console.log(chalk.yellow('Migration aborted by user.'));
      return;
    }

    if (result.equivalent) {
      const todoCount = result.plan?.todos?.length || 0;
      console.log(chalk.bold.green(`✓ migration complete — ${todoCount} tasks executed, behavior verified identical`));
    } else {
      console.log(chalk.bold.red(`✗ migration finished with unresolved regressions (${result.unresolvedRegressions?.length || 0} issues)`));
      process.exitCode = 1;
    }
  } catch (err) {
    if (jsonMode) {
      json({ error: err.message, stack: err.stack });
    } else {
      console.error(chalk.red(`\nMigration failed: ${err.message}`));
    }
    process.exitCode = 1;
  }
}
