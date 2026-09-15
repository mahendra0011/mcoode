import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generate Markdown audit report string.
 */
export function generateMarkdownReport(auditResult) {
  const lines = [
    `# MCODE AUDIT REPORT`,
    `Generated on ${new Date().toISOString()} · Read-Only Assessment\n`,
    `## Overall Grade: ${auditResult.overallGrade}\n`,
    `| Category | Grade | Issues Found |`,
    `|---|---|---|`
  ];

  for (const [cat, grade] of Object.entries(auditResult.grades || {})) {
    const findings = auditResult.results?.[cat]?.findings || [];
    const counts = auditResult.results?.[cat]?.counts || {};
    const countSummary = `${counts.critical || 0} crit, ${counts.high || 0} high, ${counts.medium || 0} med, ${counts.low || 0} low`;
    lines.push(`| **${cat.toUpperCase()}** | **${grade}** | ${findings.length} (${countSummary}) |`);
  }

  lines.push('\n---\n');

  for (const [cat, catResult] of Object.entries(auditResult.results || {})) {
    lines.push(`### ${cat.toUpperCase()} Findings (Grade: ${auditResult.grades?.[cat] || 'N/A'})\n`);
    const findings = catResult.findings || [];
    if (findings.length === 0) {
      lines.push('_No issues detected in this category._\n');
    } else {
      for (const f of findings) {
        const loc = f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : '';
        lines.push(`- **[${String(f.severity).toUpperCase()}]** ${f.msg || f.label || 'Issue found'}${loc}`);
      }
      lines.push('');
    }
  }

  lines.push('---\n');
  lines.push('_(This was a read-only assessment — zero code changes made. Use `mcode security-check` or `mcode bugcheck` to remediate issues.)_\n');

  return lines.join('\n');
}

/**
 * Save Markdown audit report to .mcode/reports/audit-YYYY-MM-DD.md
 */
export async function saveAuditReport(auditResult, projectPath = process.cwd()) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const reportsDir = join(projectPath, '.mcode', 'reports');
  await mkdir(reportsDir, { recursive: true });

  const fileName = `audit-${dateStr}.md`;
  const filePath = join(reportsDir, fileName);
  const content = generateMarkdownReport(auditResult);
  await writeFile(filePath, content, 'utf8');

  return {
    filePath,
    fileName
  };
}
