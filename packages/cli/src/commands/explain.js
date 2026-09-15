import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { runExplain, generateProjectTour } from '../core/explain/run-explain.js';

/**
 * Main command handler for `mcode explain`.
 */
export async function explainCommand(target = null, { tour = false } = {}) {
  const projectPath = process.cwd();

  if (tour) {
    console.log(chalk.cyan('\nGenerating onboarding project tour...\n'));
    const tourText = await generateProjectTour(projectPath);
    console.log(tourText);
    console.log(chalk.dim('\nReport saved to .mcode/reports/project-tour.md\n'));
    return;
  }

  let targetFile = null;
  let question = target;

  if (target) {
    const candidatePath = resolve(projectPath, target);
    if (existsSync(candidatePath)) {
      targetFile = target;
      question = `Explain the purpose and implementation of ${target}`;
    }
  } else {
    question = 'Explain how this project works, its architecture, and main components.';
  }

  const answer = await runExplain(question, { projectPath, targetFile });
  console.log(`\n${answer}\n`);
}
