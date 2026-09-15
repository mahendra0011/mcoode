import chalk from 'chalk';
import readline from 'node:readline';
import { EventEmitter } from 'node:events';
import { isJsonMode, json } from '../core/logger.js';
import { findDeadCode } from '../core/clean/tier1-dead-code.js';
import { findBloat } from '../core/clean/tier2-bloat.js';
import { runClean } from '../core/clean/run-clean.js';

/**
 * Ask user interactive confirmation or selection
 */
async function askQuestion(promptText) {
  if (process.env.CI || process.env.NON_INTERACTIVE) return 'y';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(promptText, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

/**
 * CLI command handler for `mcode clean` (Doc 55)
 */
export async function cleanCommand({
  deadCodeOnly = false,
  dryRun = false,
  yes = false,
  asJson = false,
  thresholdLines = 30,
} = {}) {
  const jsonMode = Boolean(asJson || isJsonMode());
  const projectPath = process.cwd();

  if (!jsonMode) {
    console.log('');
    console.log(chalk.bold('$ mcode clean'));
    console.log('');
  }

  // Tier 1 — Dead code scan
  if (!jsonMode) {
    process.stdout.write(chalk.dim('Tier 1 — dead code scan...          '));
  }
  const tier1Findings = await findDeadCode(projectPath);
  if (!jsonMode) {
    console.log(chalk.cyan(`${tier1Findings.length} findings (0 AI calls)`));
  }

  // Tier 2 — AI bloat detection (unless --dead-code-only)
  let tier2Findings = [];
  if (!deadCodeOnly) {
    if (!jsonMode) {
      process.stdout.write(chalk.dim('Tier 2 — AI bloat detection...        '));
    }
    tier2Findings = await findBloat(projectPath, { projectPath, thresholdLines });
    if (!jsonMode) {
      const aiCount = tier2Findings.filter(f => f.costsAI).length;
      console.log(chalk.cyan(`${tier2Findings.length} findings (${aiCount} AI calls)`));
    }
  }

  const allFindings = [...tier1Findings, ...tier2Findings];
  const totalLinesRemovable = allFindings.reduce((sum, f) => {
    const diff = Math.max(0, (f.currentLines || 1) - (f.estimatedCleanLines || 0));
    return sum + diff;
  }, 0);

  if (jsonMode) {
    if (dryRun) {
      json({ findings: allFindings, totalLinesRemovable, dryRun: true });
      return;
    }
  } else {
    console.log('');
    console.log(chalk.bold.yellow(`CLEAN REPORT — ${allFindings.length} findings, ~${totalLinesRemovable.toLocaleString()} lines removable`));
    console.log('');

    if (allFindings.length === 0) {
      console.log(chalk.green('✨ Clean! No dead code or AI-bloat detected in project.'));
      return;
    }

    allFindings.forEach((f, idx) => {
      const catColor = f.category === 'bloat' ? chalk.magenta : f.category === 'duplicate-logic' ? chalk.blue : chalk.dim;
      const catLabel = catColor(f.category.padEnd(18));
      const fileLabel = chalk.bold(f.file + (f.startLine ? `:${f.startLine}` : ''));
      console.log(`  [ ] ${catLabel} ${fileLabel} — ${f.issue}`);
      if (f.currentLines && f.estimatedCleanLines !== undefined) {
        console.log(chalk.dim(`                       (${f.currentLines} lines -> ~${f.estimatedCleanLines} lines)`));
      }
    });

    console.log('');
  }

  if (dryRun) {
    if (!jsonMode) {
      console.log(chalk.yellow('Dry-run complete. No changes were made.'));
    }
    return;
  }

  // Interactive selection or auto-confirm (--yes)
  let selected = allFindings;
  if (!yes && !process.env.CI && !process.env.NON_INTERACTIVE && allFindings.length > 0) {
    const ans = await askQuestion(chalk.cyan('Clean all detected items? [Y/n/select]: '));
    if (ans.toLowerCase() === 'n') {
      console.log(chalk.dim('Clean cancelled.'));
      return;
    }
  }

  const bus = new EventEmitter();

  if (!jsonMode) {
    bus.on('CLEAN_STATUS', (evt) => {
      if (evt.stage === 'snapshot') {
        console.log(chalk.dim('snapshotting current behavior (for equivalence verification)...'));
      } else if (evt.stage === 'snapshot_ready') {
        console.log(chalk.cyan(`${evt.baselineCount} tests recorded as baseline`));
        console.log('');
      } else if (evt.stage === 'cleaning') {
        console.log(chalk.bold(`cleaning ${selected.length} selected items...`));
      } else if (evt.stage === 'verifying') {
        console.log(chalk.dim('verifying behavioral equivalence — pass 1/5...'));
      }
    });

    bus.on('CLEAN_ITEM_DONE', (evt) => {
      console.log(chalk.green(`  [${evt.index}/${evt.total}] ${evt.title} - done`));
    });

    bus.on('CLEAN_COMPLETE', (evt) => {
      console.log(chalk.green('equivalent — all tests match baseline exactly'));
      console.log('');
      console.log(chalk.bold.green(`cleaned ${selected.length} items — removed ~${evt.netLinesRemoved} lines net, 0 behavior changes`));
      if (evt.reportPath) {
        console.log(chalk.dim(`report saved to ${evt.reportPath}`));
      }
    });
  }

  const result = await runClean(projectPath, {
    selectedFindings: selected,
    bus,
  });

  if (jsonMode) {
    json(result);
  }
}
