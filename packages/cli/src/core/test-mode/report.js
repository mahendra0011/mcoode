/**
 * Test Mode — markdown report (same MD shape as docs 43/47, test-scoped).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function buildTestReport({ projectName, inventory, autonomousResults, traditional = [], targetUrl, skipped }) {
  const ts = new Date().toISOString();
  const results = autonomousResults || [];
  const passedClean = results.filter((r) => r.status === 'passed');
  const passedAfterFix = results.filter((r) => r.status === 'passed-after-fix');
  const needsReview = results.filter((r) => r.status === 'needs-review');
  const selfHealed = results.flatMap((r) => r.fixedIssues || []);

  const lines = [];
  lines.push(`# Test Report — ${projectName}`);
  lines.push(`Generated ${ts}`);
  lines.push('');

  lines.push(`## Autonomous Testing — ${inventory?.length ?? 0} features`);
  lines.push(`- ${passedClean.length} passed cleanly`);
  lines.push(`- ${passedAfterFix.length} passed after auto-fix (${selfHealed.length} issues found and fixed during testing)`);
  lines.push(`- ${needsReview.length} needs manual review${needsReview.length ? ' (' + needsReview.map((r) => r.failedAtDesc || r.error || r.feature).join('; ').slice(0, 300) + ')' : ''}`);
  if (skipped) lines.push(`- (autonomous pass skipped: ${skipped})`);
  lines.push('');

  if (selfHealed.length > 0) {
    lines.push('## Self-Healed Issues (fixed automatically during this run)');
    selfHealed.forEach((f, i) => {
      lines.push(`${i + 1}. ${f.feature} — ${f.issue}${f.files?.length ? ' — ' + f.files.join(', ') : ''}`);
    });
    lines.push('');
  }

  if (needsReview.length > 0) {
    lines.push('## Needs Manual Review');
    needsReview.forEach((r) => {
      lines.push(`- **${r.feature}** (${r.route || 'n/a'}) — failed at: ${r.failedAtDesc || 'n/a'} — ${r.error || ''}${r.screenshotPath ? ` — screenshot: ${r.screenshotPath}` : ''}`);
    });
    lines.push('');
  }

  for (const t of traditional) {
    const label = { unit: 'Unit Tests', integration: 'Integration Tests', load: 'Load Test', a11y: 'Accessibility' }[t.kind] || t.kind;
    lines.push(`## ${label}`);
    if (t.kind === 'unit' || t.kind === 'integration') {
      lines.push(`${t.passed}/${t.total} passed${t.detail ? ` — ${t.detail}` : ''}`);
    } else if (t.kind === 'load') {
      const worst = (t.cases || []).filter((c) => c.p95Ms !== undefined).sort((a, b) => b.p95Ms - a.p95Ms)[0];
      lines.push(worst ? `p95 latency ${worst.p95Ms}ms at ${worst.concurrency} concurrent users — ${t.detail}` : (t.detail || 'no data'));
    } else {
      lines.push(`${t.detail || `${t.passed}/${t.total} passed`}`);
    }
    lines.push('');
  }

  lines.push(`Target: ${targetUrl}`);
  lines.push('');

  return lines.join('\n');
}

/** Save the report to .mcode/reports/ and return its path + filename. */
export async function saveTestReport(reportMd, projectPath = process.cwd()) {
  const dir = join(projectPath, '.mcode', 'reports');
  await mkdir(dir, { recursive: true });
  const reportFileName = `test-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.md`;
  const filePath = join(dir, reportFileName);
  await writeFile(filePath, reportMd, 'utf8');
  return { filePath, reportFileName };
}
