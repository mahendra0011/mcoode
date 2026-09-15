import chalk from 'chalk';
import { multiselect, isCancel } from '@clack/prompts';
import { isJsonMode, json, out } from '../core/logger.js';
import { runSecurityCheck } from '../core/security-checkup/scanner.js';
import { fixFinding, reCheckSelected } from '../core/security-checkup/fixer.js';
import { saveReport } from '../core/security-checkup/report.js';

/**
 * Format severity badge for CLI box.
 */
function formatSeverity(risk) {
  switch (String(risk).toLowerCase()) {
    case 'critical':
      return chalk.bgRed.black.bold(' CRITICAL ');
    case 'high':
      return chalk.bgYellow.black.bold(' HIGH ');
    case 'medium':
      return chalk.bgCyan.black.bold(' MEDIUM ');
    default:
      return chalk.bgWhite.black.bold(` ${String(risk).toUpperCase()} `);
  }
}

/**
 * Renders the formatted box for findings.
 */
function renderSecurityBox(findings) {
  const width = 64;
  const topBorder = '┌' + '─'.repeat(width) + '┐';
  const midBorder = '├' + '─'.repeat(width) + '┤';
  const botBorder = '└' + '─'.repeat(width) + '┘';

  console.log(chalk.red(topBorder));
  const headerText = `  SECURITY CHECKUP — ${findings.length} issue${findings.length !== 1 ? 's' : ''} found`;
  console.log(chalk.red('│') + chalk.bold.white(headerText.padEnd(width)) + chalk.red('│'));
  console.log(chalk.red(midBorder));

  findings.forEach((f, idx) => {
    const riskBadge = f.risk.toUpperCase().padEnd(9);
    const loc = `${f.file}${f.line ? `:${f.line}` : ''}`;
    const line1 = `  [ ] ${riskBadge} ${f.label} in ${loc}`;
    console.log(chalk.red('│') + chalk.white(line1.slice(0, width).padEnd(width)) + chalk.red('│'));
    const line2 = `                 → ${f.impact}`;
    console.log(chalk.red('│') + chalk.dim(line2.slice(0, width).padEnd(width)) + chalk.red('│'));
    if (idx < findings.length - 1) {
      console.log(chalk.red('│') + ' '.repeat(width) + chalk.red('│'));
    }
  });

  console.log(chalk.red(botBorder));
  console.log('');
}

/**
 * Main command handler for `mcode security-check`.
 */
export async function securityCheckCommand({ category = null, asJson = false, noFix = false, yes = false } = {}) {
  const projectPath = process.cwd();
  const jsonOutput = Boolean(asJson || isJsonMode());

  if (!jsonOutput) {
    console.log(`\nScanning... (17 checks, 0 AI calls needed for detection)\n`);
  }

  const scanResults = await runSecurityCheck({ projectPath, category, noAI: true });

  if (jsonOutput) {
    json(scanResults);
    return;
  }

  const { findings, passed, totalChecks } = scanResults;

  if (findings.length === 0) {
    console.log(chalk.green(`✓ Security checkup passed — ${passed.length}/${totalChecks} checks clean. No vulnerabilities found.`));
    saveReport(scanResults, projectPath);
    return;
  }

  renderSecurityBox(findings);

  // If user requested --no-fix or non-interactive without auto-confirm
  if (noFix) {
    const { reportFileName } = saveReport(scanResults, projectPath);
    console.log(chalk.dim(`Report saved to .mcode/reports/${reportFileName}`));
    return;
  }

  // Interactive selection via @clack/prompts multiselect
  const options = findings.map((f) => ({
    label: `${f.risk.toUpperCase()}: ${f.label} (${f.file}${f.line ? `:${f.line}` : ''})`,
    value: f.id,
    hint: f.impact
  }));

  let selected = [];
  if (yes) {
    selected = findings.map((f) => f.id);
  } else {
    try {
      const promptResult = await multiselect({
        message: 'select which to auto-fix (space to toggle, a to select all, enter to confirm):',
        options,
        required: false
      });

      if (isCancel(promptResult)) {
        console.log(chalk.yellow('\nSecurity remediation cancelled.'));
        const { reportFileName } = saveReport(scanResults, projectPath);
        console.log(chalk.dim(`Report saved to .mcode/reports/${reportFileName}`));
        return;
      }
      selected = promptResult;
    } catch {
      // Non-interactive fallback
      selected = [];
    }
  }

  if (!selected || selected.length === 0) {
    console.log(chalk.dim('\nNo issues selected for auto-fix.'));
    const { reportFileName } = saveReport(scanResults, projectPath);
    console.log(chalk.dim(`Report saved to .mcode/reports/${reportFileName}`));
    return;
  }

  console.log(chalk.green(`\n✓ fixing ${selected.length} selected issue${selected.length !== 1 ? 's' : ''}...`));

  let fixIndex = 1;
  for (const id of selected) {
    const finding = findings.find((f) => f.id === id);
    const label = finding?.label || id;
    const res = await fixFinding(finding || id, projectPath);
    console.log(`  [${fixIndex}/${selected.length}] ${label} — ${res.detail || 'fixed'} ✓`);
    fixIndex++;
  }

  // Re-verify the selected controls
  const reVerified = await reCheckSelected(selected, projectPath);
  const fixedCount = reVerified.filter((r) => r.passed).length;
  const unselectedCount = findings.length - selected.length;

  // Save updated report
  const freshScan = await runSecurityCheck({ projectPath, category, noAI: true });
  const { reportFileName } = saveReport(freshScan, projectPath);

  console.log(chalk.green(`\n✓ ${fixedCount}/${selected.length} fixed and verified. ${unselectedCount > 0 ? `${unselectedCount} issues left unselected — run again or select\n  them next time. ` : ''}Report saved to .mcode/reports/${reportFileName}\n`));
}
