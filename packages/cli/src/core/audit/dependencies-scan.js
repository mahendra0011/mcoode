import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execa } from 'execa';
import { countBySeverity } from './performance-scan.js';

const KNOWN_DEPRECATED_PACKAGES = {
  request: 'Deprecated: use native fetch, axios, or got',
  moment: 'Deprecated: in maintenance mode, consider date-fns or dayjs',
  'node-uuid': 'Deprecated: use uuid package instead',
  'babel-eslint': 'Deprecated: use @babel/eslint-parser',
  tslint: 'Deprecated: use typescript-eslint',
  querystring: 'Deprecated: use URLSearchParams',
  urllib: 'Contains severe SSRF/RCE vulnerabilities in older releases',
  colors: 'Historically compromised package — use chalk or picocolors'
};

/**
 * Runs Dependency Health Scan (npm audit vulnerabilities + outdated/staleness).
 */
export async function runDependencyHealthScan(projectPath = process.cwd()) {
  const findings = [];
  const pkgPath = join(projectPath, 'package.json');

  if (!existsSync(pkgPath)) {
    return { findings: [], counts: { critical: 0, high: 0, medium: 0, low: 0 } };
  }

  let pkg = {};
  try {
    const raw = await readFile(pkgPath, 'utf8');
    pkg = JSON.parse(raw);
  } catch {
    return { findings: [], counts: { critical: 0, high: 0, medium: 0, low: 0 } };
  }

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {})
  };

  // 1. Check for deprecated packages
  for (const [dep, ver] of Object.entries(allDeps)) {
    if (KNOWN_DEPRECATED_PACKAGES[dep]) {
      findings.push({
        severity: 'high',
        category: 'dependencies',
        rule: 'deprecated-package',
        package: dep,
        file: 'package.json',
        msg: `Dependency "${dep}@${ver}" is deprecated: ${KNOWN_DEPRECATED_PACKAGES[dep]}`
      });
    }

    // Floating/unpinned dependency versions
    if (typeof ver === 'string' && (ver === '*' || ver.startsWith('>=') || ver.startsWith('^0.0.'))) {
      findings.push({
        severity: 'low',
        category: 'dependencies',
        rule: 'unpinned-dependency',
        file: 'package.json',
        msg: `Floating dependency version "${dep}": "${ver}" can introduce unpredictable breaking changes`
      });
    }
  }

  // 2. npm audit check
  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  const hasLockfile = lockFiles.some((f) => existsSync(join(projectPath, f)));

  if (hasLockfile) {
    try {
      const { stdout } = await execa('npm', ['audit', '--json'], {
        cwd: projectPath,
        reject: false,
        timeout: 8000
      });

      if (stdout && stdout.trim()) {
        const auditData = JSON.parse(stdout);
        const vulns = auditData.vulnerabilities || {};
        for (const [name, info] of Object.entries(vulns)) {
          const sevRaw = String(info.severity || 'low').toLowerCase();
          const sev = sevRaw === 'moderate' ? 'medium' : sevRaw;
          findings.push({
            severity: ['critical', 'high', 'medium', 'low'].includes(sev) ? sev : 'low',
            category: 'dependencies',
            rule: 'vulnerable-dependency',
            file: 'package.json',
            msg: `Security vulnerability in dependency "${name}": ${info.title || info.name || sevRaw} (${sev.toUpperCase()})`
          });
          if (findings.length >= 30) break;
        }
      }
    } catch {
      // Ignore npm audit timeout or failure
    }
  }

  return {
    findings,
    counts: countBySeverity(findings)
  };
}
