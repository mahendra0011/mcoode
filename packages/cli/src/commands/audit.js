import chalk from 'chalk';
import { join } from 'node:path';
import { isJsonMode, json } from '../core/logger.js';
import { runAudit, ALL_AUDIT_CATEGORIES } from '../core/audit/run-audit.js';
import { generateAuditPDF } from '../core/audit/pdf-report.js';

/**
 * Format category label with padding.
 */
function padCategory(cat) {
  const map = {
    security: 'Security',
    performance: 'Performance',
    accessibility: 'Accessibility',
    dependencies: 'Dependencies',
    quality: 'Code Quality'
  };
  return (map[cat] || cat).padEnd(16);
}

/**
 * Colorize grade badge.
 */
function formatGrade(grade) {
  if (grade.startsWith('A')) return chalk.bold.green(grade.padEnd(4));
  if (grade.startsWith('B')) return chalk.bold.blue(grade.padEnd(4));
  if (grade.startsWith('C')) return chalk.bold.yellow(grade.padEnd(4));
  if (grade.startsWith('D')) return chalk.bold.magenta(grade.padEnd(4));
  return chalk.bold.red(grade.padEnd(4));
}

/**
 * Summarize counts for a category.
 */
function formatCounts(counts) {
  const parts = [];
  if (counts.critical) parts.push(`${counts.critical} critical`);
  if (counts.high) parts.push(`${counts.high} high`);
  if (counts.medium) parts.push(`${counts.medium} medium`);
  if (counts.low) parts.push(`${counts.low} low`);
  if (parts.length === 0) return chalk.dim('0 issues');
  return parts.join(', ');
}

/**
 * Command handler for `mcode audit`
 */
export async function auditCommand({
  securityOnly = false,
  perfOnly = false,
  a11yOnly = false,
  depsOnly = false,
  qualityOnly = false,
  pdf = false,
  asJson = false,
  category = null
} = {}) {
  const jsonMode = Boolean(asJson || isJsonMode());

  let categories = [...ALL_AUDIT_CATEGORIES];
  if (securityOnly) categories = ['security'];
  else if (perfOnly) categories = ['performance'];
  else if (a11yOnly) categories = ['accessibility'];
  else if (depsOnly) categories = ['dependencies'];
  else if (qualityOnly) categories = ['quality'];
  else if (category) {
    categories = category.split(',').map((c) => c.trim().toLowerCase());
  }

  if (!jsonMode) {
    console.log('');
    console.log(chalk.bold.cyan(`Running audit — ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}...`));
    console.log('');
  }

  try {
    const projectPath = process.cwd();
    const result = await runAudit(projectPath, { categories });

    if (pdf) {
      const dateStr = new Date().toISOString().slice(0, 10);
      const pdfPath = join(projectPath, '.mcode', 'reports', `audit-${dateStr}.pdf`);
      await generateAuditPDF(result, pdfPath);
      result.pdfPath = pdfPath;
    }

    if (jsonMode) {
      json(result);
      return;
    }

    // CLI Render matching doc 52
    console.log(chalk.bold(`AUDIT REPORT — Overall: ${formatGrade(result.overallGrade)}`));

    for (const [cat, grade] of Object.entries(result.grades || {})) {
      const counts = result.results?.[cat]?.counts || {};
      console.log(`  ${padCategory(cat)} ${formatGrade(grade)} ${formatCounts(counts)}`);
    }

    console.log('');
    if (result.reportPath) {
      console.log(chalk.dim(`full report: ${result.reportPath}`));
    }
    if (result.pdfPath) {
      console.log(chalk.green(`PDF report:  ${result.pdfPath}`));
    }

    console.log(chalk.dim('(this was a read-only scan — nothing was changed. Run "mcode security-check"'));
    console.log(chalk.dim(' or "mcode bugcheck" if you want to select specific items to auto-fix.)'));
    console.log('');
  } catch (err) {
    if (jsonMode) {
      json({ error: err.message, stack: err.stack });
    } else {
      console.error(chalk.red(`\nAudit failed: ${err.message}`));
    }
    process.exitCode = 1;
  }
}
