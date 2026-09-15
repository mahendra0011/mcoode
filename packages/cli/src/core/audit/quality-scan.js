import { readdir, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { execa } from 'execa';
import { countBySeverity } from './performance-scan.js';

const CODE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.mcode']);

async function collectCodeFiles(dir, depth = 0) {
  if (depth > 5 || !existsSync(dir)) return [];
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (IGNORED_DIRS.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        files.push(...(await collectCodeFiles(full, depth + 1)));
      } else if (CODE_EXTS.has(extname(e.name).toLowerCase())) {
        files.push(full);
      }
    }
  } catch {}
  return files;
}

/**
 * Scan codebase for code quality issues (ESLint + static crash/smell patterns).
 */
export async function runQualityScan(projectPath = process.cwd()) {
  const findings = [];

  // 1. Try running local ESLint if present
  const eslintBin = join(projectPath, 'node_modules', '.bin', process.platform === 'win32' ? 'eslint.cmd' : 'eslint');
  if (existsSync(eslintBin)) {
    try {
      const { stdout } = await execa(eslintBin, ['.', '--format', 'json', '--max-warnings', '1000'], {
        cwd: projectPath,
        reject: false,
        timeout: 10000
      });

      if (stdout && stdout.trim()) {
        const results = JSON.parse(stdout);
        for (const fileRes of results) {
          const rel = relative(projectPath, fileRes.filePath).replace(/\\/g, '/');
          for (const msg of fileRes.messages || []) {
            const sev = msg.severity === 2 ? 'high' : 'medium';
            findings.push({
              severity: sev,
              category: 'quality',
              rule: msg.ruleId || 'eslint',
              file: rel,
              line: msg.line,
              msg: `${msg.message} (${msg.ruleId || 'lint'})`
            });
            if (findings.length >= 30) break;
          }
          if (findings.length >= 30) break;
        }
      }
    } catch {}
  }

  // 2. Static Code Smell & Anti-Pattern Inspection (Tier 1-2)
  const codeFiles = await collectCodeFiles(projectPath);

  for (const file of codeFiles) {
    if (file.includes('.test.') || file.includes('.spec.')) continue;
    try {
      const content = await readFile(file, 'utf8');
      const rel = relative(projectPath, file).replace(/\\/g, '/');
      // Multiline / singleline empty catch blocks
      const catchMatches = content.matchAll(/catch\s*\([^)]*\)\s*\{[\s\n\r]*\}/g);
      for (const m of catchMatches) {
        const pre = content.slice(0, m.index);
        const lineNum = pre.split('\n').length;
        findings.push({
          severity: 'medium',
          category: 'quality',
          rule: 'empty-catch',
          file: rel,
          line: lineNum,
          msg: `Empty catch block swallows error silently in ${rel}:${lineNum}`
        });
      }
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Debugger statement
        if (/\bdebugger;?/.test(line)) {
          findings.push({
            severity: 'high',
            category: 'quality',
            rule: 'no-debugger',
            file: rel,
            line: lineNum,
            msg: `Leftover debugger statement in ${rel}:${lineNum}`
          });
        }

        // Potential memory leak: setInterval without clear or broad event listeners
        if (/\bsetInterval\s*\(/.test(line) && !content.includes('clearInterval')) {
          findings.push({
            severity: 'low',
            category: 'quality',
            rule: 'uncleared-interval',
            file: rel,
            line: lineNum,
            msg: `setInterval without matching clearInterval — potential memory leak in ${rel}:${lineNum}`
          });
        }

        // Console log statements left in core logic
        if (/\bconsole\.(?:log|debug|trace)\s*\(/.test(line) && !rel.includes('cli') && !rel.includes('scripts')) {
          findings.push({
            severity: 'low',
            category: 'quality',
            rule: 'no-console',
            file: rel,
            line: lineNum,
            msg: `Console statement in production code in ${rel}:${lineNum}`
          });
        }

        if (findings.length >= 40) break;
      }
    } catch {}
    if (findings.length >= 40) break;
  }

  return {
    findings,
    counts: countBySeverity(findings)
  };
}
