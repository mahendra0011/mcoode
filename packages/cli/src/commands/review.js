import chalk from 'chalk';
import { isJsonMode, json } from '../core/logger.js';
import { runReview } from '../core/review/run-review.js';

const CATEGORY_CHALK = {
  bug: chalk.red,
  security: chalk.yellow,
  perf: chalk.yellow,
  style: chalk.blue,
  maintainability: chalk.magenta,
  praise: chalk.green,
};

/**
 * Main command handler for `mcode review`.
 */
export async function reviewCommand(target = null, { pr = null, asJson = false } = {}) {
  const projectPath = process.cwd();
  const jsonOutput = Boolean(asJson || isJsonMode());

  let scope = 'diff';
  let reviewTarget = target;

  if (pr) {
    scope = 'pr';
    reviewTarget = pr;
  } else if (target) {
    scope = 'file';
    reviewTarget = target;
  }

  if (!jsonOutput) {
    const scopeLabel = scope === 'pr' ? `PR #${pr}`
                     : scope === 'file' ? target
                     : 'uncommitted changes';
    console.log(`\nreviewing ${scopeLabel}...\n`);
  }

  const findings = await runReview({ scope, target: reviewTarget, projectPath });

  if (jsonOutput) {
    json(findings);
    return;
  }

  if (!findings || findings.length === 0) {
    console.log(chalk.green('✓ 0 comments — clean review!\n'));
    return;
  }

  // Group comments by file
  const grouped = {};
  for (const f of findings) {
    const file = f.file || 'General';
    if (!grouped[file]) grouped[file] = [];
    grouped[file].push(f);
  }

  // Count by category
  const categoryCounts = {};
  for (const f of findings) {
    const cat = String(f.category || 'other').toLowerCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  for (const [file, items] of Object.entries(grouped)) {
    console.log(chalk.bold.white(file));
    for (const item of items) {
      const lineTag = item.category === 'praise' && !item.line
        ? chalk.dim('     ')
        : chalk.dim(`L${item.line || 1}`.padEnd(6));
      const colorFn = CATEGORY_CHALK[item.category] || chalk.white;
      const catTag = colorFn(item.category.padEnd(11));
      console.log(`  ${lineTag}${catTag}${item.comment}`);
    }
    console.log('');
  }

  const countBreakdown = Object.entries(categoryCounts)
    .map(([cat, count]) => `${count} ${cat}`)
    .join(', ');

  console.log(chalk.dim(`${findings.length} comment${findings.length !== 1 ? 's' : ''} (${countBreakdown})\n`));
}
