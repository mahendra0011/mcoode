import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { countBySeverity } from './performance-scan.js';

const HTML_JSX_EXTS = new Set(['.html', '.jsx', '.tsx', '.vue', '.svelte']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage']);

async function collectFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (IGNORED_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        files.push(...(await collectFiles(full)));
      } else {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

/**
 * Scans JSX/HTML source code for WCAG AA compliance violations.
 */
export async function runStaticA11yScan(projectPath) {
  const findings = [];
  const files = await collectFiles(projectPath);

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!HTML_JSX_EXTS.has(ext)) continue;
    if (file.includes('.test.') || file.includes('.spec.')) continue;

    try {
      const content = await readFile(file, 'utf8');
      const rel = relative(projectPath, file).replace(/\\/g, '/');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // 1. Image missing alt attribute
        if (/<img\b(?![^>]*\balt\s*=)[^>]*>/i.test(line) || /<Image\b(?![^>]*\balt\s*=)[^>]*>/i.test(line)) {
          findings.push({
            severity: 'medium',
            category: 'accessibility',
            rule: 'image-alt',
            file: rel,
            line: lineNum,
            msg: `Image element missing required alt attribute in ${rel}:${lineNum} (WCAG 1.1.1 Non-text Content)`
          });
        }

        // 2. Button without text or aria-label
        if (/<button\b(?![^>]*\baria-label\s*=)[^>]*>\s*<\/[a-zA-Z]+>/i.test(line) || /<button\b(?![^>]*\baria-label\s*=)[^>]*>\s*<\/button>/i.test(line)) {
          findings.push({
            severity: 'high',
            category: 'accessibility',
            rule: 'button-name',
            file: rel,
            line: lineNum,
            msg: `Button is empty or unlabelled (no discernible text or aria-label) in ${rel}:${lineNum} (WCAG 4.1.2 Name, Role, Value)`
          });
        }

        // 2b. Link without text or aria-label
        if (/<a\b(?![^>]*\baria-label\s*=)[^>]*>\s*<\/a>/i.test(line)) {
          findings.push({
            severity: 'medium',
            category: 'accessibility',
            rule: 'link-name',
            file: rel,
            line: lineNum,
            msg: `Link is empty or unlabelled in ${rel}:${lineNum} (WCAG 4.1.2 Name, Role, Value)`
          });
        }

        // 3. Positive tabIndex (anti-pattern disrupting logical tab order)
        if (/\btabIndex\s*=\s*\{?[1-9]\d*\}?/i.test(line) || /\btabindex\s*=\s*["'][1-9]\d*["']/i.test(line)) {
          findings.push({
            severity: 'low',
            category: 'accessibility',
            rule: 'tabindex-positive',
            file: rel,
            line: lineNum,
            msg: `Positive tabIndex value disrupts logical keyboard navigation in ${rel}:${lineNum} (WCAG 2.4.3 Focus Order)`
          });
        }

        // 4. Form inputs without associated label or aria-label
        if (/<input\b(?![^>]*\b(?:aria-label|aria-labelledby|placeholder)\s*=)(?![^>]*type\s*=\s*["'](?:hidden|submit|button|reset)["'])[^>]*>/i.test(line)) {
          // Check if previous or enclosing line has <label
          const surrounding = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(' ');
          if (!surrounding.includes('<label')) {
            findings.push({
              severity: 'medium',
              category: 'accessibility',
              rule: 'input-label',
              file: rel,
              line: lineNum,
              msg: `Form input element missing aria-label or associated <label> in ${rel}:${lineNum} (WCAG 3.3.2 Labels or Instructions)`
            });
          }
        }

        if (findings.length >= 25) break;
      }
    } catch {}
    if (findings.length >= 25) break;
  }

  return findings;
}

/**
 * Runs full Accessibility (a11y) audit for the project.
 */
export async function runA11yScan(projectPath = process.cwd(), { targetUrl = null, bus = null } = {}) {
  const findings = await runStaticA11yScan(projectPath);

  // If a live app URL is given and axe-core is available, run browser scan too
  if (targetUrl) {
    try {
      const { runA11yScan: runBrowserA11y } = await import('../test-mode/traditional.js');
      const browserRes = await runBrowserA11y([], { bus, targetUrl });
      if (Array.isArray(browserRes.cases)) {
        for (const c of browserRes.cases) {
          if (c.status === 'failed') {
            findings.push({
              severity: 'high',
              category: 'accessibility',
              rule: 'axe-core-violation',
              file: targetUrl,
              msg: `Live a11y violation on ${c.name}: ${c.detail}`
            });
          }
        }
      }
    } catch {
      // Browser scan fallback
    }
  }

  return {
    findings,
    counts: countBySeverity(findings)
  };
}
