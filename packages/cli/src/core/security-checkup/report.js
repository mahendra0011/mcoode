import fs from 'node:fs';
import path from 'node:path';

/**
 * Format timestamp into YYYY-MM-DD.
 */
export function getReportDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generate markdown report matching Doc 47 shape.
 */
export function generateMarkdownReport(scanResults, projectName = 'project') {
  const { findings = [], passed = [], totalChecks = 0, timestamp = new Date().toISOString() } = scanResults;
  const criticalFindings = findings.filter((f) => f.risk === 'critical');
  const highFindings = findings.filter((f) => f.risk === 'high');
  const mediumFindings = findings.filter((f) => f.risk === 'medium' || f.risk === 'low');

  const lines = [];
  lines.push(`# Security Checkup Report — ${projectName}`);
  lines.push(`Generated ${timestamp} · ${totalChecks} checks run · ${findings.length} issues found (${criticalFindings.length} critical)\n`);

  if (criticalFindings.length > 0) {
    lines.push(`## Critical (fix immediately — can crash system or leak data)`);
    for (const f of criticalFindings) {
      lines.push(`- **${f.label}** — ${f.file}${f.line ? `:${f.line}` : ''} — ${f.impact}`);
    }
    lines.push('');
  }

  if (highFindings.length > 0) {
    lines.push(`## High`);
    for (const f of highFindings) {
      lines.push(`- **${f.label}** — ${f.file}${f.line ? `:${f.line}` : ''} — ${f.impact}`);
    }
    lines.push('');
  }

  if (mediumFindings.length > 0) {
    lines.push(`## Medium`);
    for (const f of mediumFindings) {
      lines.push(`- **${f.label}** — ${f.file}${f.line ? `:${f.line}` : ''} — ${f.impact}`);
    }
    lines.push('');
  }

  lines.push(`## Passed Checks (${passed.length})`);
  if (passed.length === 0) {
    lines.push(`- None`);
  } else {
    for (const p of passed) {
      lines.push(`- ✓ ${p.label}`);
    }
  }
  lines.push('');

  lines.push(`## What Was Checked`);
  lines.push(`${totalChecks} controls across HTTP hardening, injection, auth & secrets, data protection,`);
  lines.push(`dependencies, data-leak surface. Full checklist: see doc 47.\n`);

  return lines.join('\n');
}

/**
 * Save report to .mcode/reports/security-YYYY-MM-DD.md
 */
export function saveReport(scanResults, projectPath = process.cwd()) {
  const reportsDir = path.join(projectPath, '.mcode', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const dateStr = getReportDateString();
  const reportFileName = `security-${dateStr}.md`;
  const reportPath = path.join(reportsDir, reportFileName);

  const projectName = path.basename(projectPath) || 'project';
  const content = generateMarkdownReport(scanResults, projectName);

  fs.writeFileSync(reportPath, content, 'utf8');
  return { reportPath, reportFileName, content };
}
