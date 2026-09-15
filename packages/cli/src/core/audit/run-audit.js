import { runSecurityCheck } from '../security-checkup/scanner.js';
import { runPerformanceScan } from './performance-scan.js';
import { runA11yScan } from './a11y-scan.js';
import { runDependencyHealthScan } from './dependencies-scan.js';
import { runQualityScan } from './quality-scan.js';
import { saveAuditReport } from './report.js';

const GRADE_POINTS = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

/**
 * Calculates letter grade from category penalty score.
 */
export function scoreToGrade(categoryResult) {
  const { critical = 0, high = 0, medium = 0, low = 0 } = categoryResult?.counts || {};
  const penalty = critical * 25 + high * 10 + medium * 3 + low * 1;
  const score = Math.max(0, 100 - penalty);
  if (score >= 95) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'B-';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Calculates overall GPA average letter grade from individual category grades.
 */
export function averageGrade(grades) {
  const values = Object.values(grades || {});
  if (values.length === 0) return 'A';

  let sum = 0;
  for (const g of values) {
    sum += GRADE_POINTS[g] ?? (g.startsWith('A') ? 4.0 : g.startsWith('B') ? 3.0 : g.startsWith('C') ? 2.0 : g.startsWith('D') ? 1.0 : 0.0);
  }
  const avg = sum / values.length;
  if (avg >= 3.85) return 'A';
  if (avg >= 3.5) return 'A-';
  if (avg >= 3.15) return 'B+';
  if (avg >= 2.85) return 'B';
  if (avg >= 2.5) return 'B-';
  if (avg >= 2.0) return 'C';
  if (avg >= 1.0) return 'D';
  return 'F';
}

/**
 * Runs doc 47's security checklist in pure detection mode (no fixes).
 */
async function runSecurityChecklist(projectPath) {
  const sec = await runSecurityCheck({ projectPath });
  const findings = (sec.findings || []).map((f) => ({
    ...f,
    severity: f.risk || 'medium',
    msg: `${f.label} — ${f.impact}`
  }));

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    const r = String(f.risk || f.severity || 'low').toLowerCase();
    if (r === 'critical') counts.critical++;
    else if (r === 'high') counts.high++;
    else if (r === 'medium') counts.medium++;
    else counts.low++;
  }

  return { findings, counts };
}

export const ALL_AUDIT_CATEGORIES = Object.freeze([
  'security',
  'performance',
  'accessibility',
  'dependencies',
  'quality'
]);

/**
 * Runs pure, zero-modification project health audit across categories.
 *
 * @param {string} projectPath
 * @param {{
 *   categories?: string[],
 *   targetUrl?: string,
 *   router?: object,
 *   bus?: object
 * }} options
 * @returns {Promise<{
 *   results: Record<string, object>,
 *   grades: Record<string, string>,
 *   overallGrade: string,
 *   reportFile?: string
 * }>}
 */
export async function runAudit(projectPath = process.cwd(), {
  categories = ALL_AUDIT_CATEGORIES,
  targetUrl = null,
  router = null,
  bus = null
} = {}) {
  const activeCats = categories.map((c) => c === 'a11y' ? 'accessibility' : c.toLowerCase());
  const results = {};

  bus?.emit('AUDIT_STATUS', { stage: 'start', message: `Running audit — ${activeCats.length} categories...` });

  // 1. Security
  if (activeCats.includes('security')) {
    bus?.emit('AUDIT_STATUS', { stage: 'category', category: 'security', message: 'Scanning security controls...' });
    results.security = await runSecurityChecklist(projectPath);
  }

  // 2. Performance
  if (activeCats.includes('performance')) {
    bus?.emit('AUDIT_STATUS', { stage: 'category', category: 'performance', message: 'Scanning performance metrics...' });
    results.performance = await runPerformanceScan(projectPath);
  }

  // 3. Accessibility
  if (activeCats.includes('accessibility')) {
    bus?.emit('AUDIT_STATUS', { stage: 'category', category: 'accessibility', message: 'Scanning accessibility (a11y)...' });
    results.accessibility = await runA11yScan(projectPath, { targetUrl, bus });
  }

  // 4. Dependencies
  if (activeCats.includes('dependencies')) {
    bus?.emit('AUDIT_STATUS', { stage: 'category', category: 'dependencies', message: 'Scanning dependencies & vulnerabilities...' });
    results.dependencies = await runDependencyHealthScan(projectPath);
  }

  // 5. Code Quality
  if (activeCats.includes('quality')) {
    bus?.emit('AUDIT_STATUS', { stage: 'category', category: 'quality', message: 'Scanning code quality & static patterns...' });
    results.quality = await runQualityScan(projectPath);
  }

  const grades = Object.fromEntries(
    Object.entries(results).map(([cat, r]) => [cat, scoreToGrade(r)])
  );

  const overallGrade = averageGrade(grades);

  const auditOutput = {
    results,
    grades,
    overallGrade,
    timestamp: new Date().toISOString()
  };

  // Save report
  try {
    const { filePath, fileName } = await saveAuditReport(auditOutput, projectPath);
    auditOutput.reportPath = filePath;
    auditOutput.reportFileName = fileName;
  } catch {}

  bus?.emit('AUDIT_COMPLETE', auditOutput);

  return auditOutput;
}
