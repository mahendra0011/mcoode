import fs from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import { CHECKLIST, hasPattern } from './checklist.js';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  '.cache', 'tmp', 'temp', '.turbo', 'out', 'vendor', '.zcode', '.mcode'
]);

const CODE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.env'
]);

/**
 * Recursively scan directory for relevant source code files.
 */
function collectCodeFiles(dir, rootDir, files = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.gitignore' && !entry.name.startsWith('.env.')) {
        if (entry.isDirectory()) continue;
      }
      if (SKIP_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectCodeFiles(fullPath, rootDir, files);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        const isEnv = entry.name.startsWith('.env');
        if (CODE_EXTENSIONS.has(ext) || isEnv || entry.name === '.gitignore') {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');
            files.push({ fullPath, relPath, content });
          } catch {}
        }
      }
    }
  } catch {}
  return files;
}

/**
 * Gather dependencies from package.json and monorepo workspaces.
 */
function gatherDependencies(projectPath) {
  const dependencies = {};
  const devDependencies = {};
  const allDependencies = new Set();

  const pkgPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      Object.assign(dependencies, pkg.dependencies || {});
      Object.assign(devDependencies, pkg.devDependencies || {});
      Object.keys(pkg.dependencies || {}).forEach((d) => allDependencies.add(d));
      Object.keys(pkg.devDependencies || {}).forEach((d) => allDependencies.add(d));
    } catch {}
  }

  // Also check packages/* if monorepo
  const packagesDir = path.join(projectPath, 'packages');
  if (fs.existsSync(packagesDir)) {
    try {
      const subEntries = fs.readdirSync(packagesDir, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const subPkgPath = path.join(packagesDir, sub.name, 'package.json');
          if (fs.existsSync(subPkgPath)) {
            try {
              const subPkg = JSON.parse(fs.readFileSync(subPkgPath, 'utf8'));
              Object.keys(subPkg.dependencies || {}).forEach((d) => allDependencies.add(d));
              Object.keys(subPkg.devDependencies || {}).forEach((d) => allDependencies.add(d));
            } catch {}
          }
        }
      }
    } catch {}
  }

  return { dependencies, devDependencies, allDependencies };
}

/**
 * Run npm audit and parse JSON output.
 */
async function fetchNpmAudit(projectPath) {
  try {
    const pkgPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return { vulnerabilities: [] };

    // npm audit requires a lockfile to run without hanging
    const lockFiles = ['package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'pnpm-lock.yaml'];
    const hasLockfile = lockFiles.some((f) => fs.existsSync(path.join(projectPath, f)));
    if (!hasLockfile) {
      return { vulnerabilities: [] };
    }

    const { stdout } = await execa('npm', ['audit', '--json'], {
      cwd: projectPath,
      reject: false,
      timeout: 4000
    });
    if (!stdout || !stdout.trim()) return { vulnerabilities: [] };
    const parsed = JSON.parse(stdout);
    return parsed;
  } catch {
    return { vulnerabilities: [] };
  }
}

/**
 * Create scan context for the project.
 */
export async function createScanContext(projectPath) {
  const { dependencies, devDependencies, allDependencies } = gatherDependencies(projectPath);

  let gitignoreContent = '';
  const gitignorePath = path.join(projectPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    } catch {}
  }

  const codeFiles = collectCodeFiles(projectPath, projectPath);
  const npmAuditResult = await fetchNpmAudit(projectPath);

  return {
    projectPath,
    dependencies,
    devDependencies,
    allDependencies,
    gitignoreContent,
    codeFiles,
    npmAuditResult
  };
}

/**
 * Run the full or scoped security checkup scan.
 */
export async function runSecurityCheck({ projectPath = process.cwd(), category = null, noAI = false } = {}) {
  const ctx = await createScanContext(projectPath);
  const filteredChecklist = category
    ? CHECKLIST.filter((c) => c.category.toLowerCase() === category.toLowerCase())
    : CHECKLIST;

  const findings = [];
  const passed = [];

  for (const control of filteredChecklist) {
    let result = false;
    try {
      result = await control.check(ctx);
    } catch {
      result = false;
    }

    if (result) {
      passed.push({
        id: control.id,
        category: control.category,
        label: control.label
      });
    } else {
      // Find matching file and line where applicable
      let location = { file: 'package.json', line: 1 };

      if (control.id === 'sql-injection') {
        const p = hasPattern(ctx, /`SELECT[^`]*\$\{/i) || hasPattern(ctx, /SELECT .* \+ .*req\./i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'jwt-secret-env') {
        const p = hasPattern(ctx, /jwt\.sign\([^,]+,\s*['"][^'"]{8,}['"]/);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'cors-scoped') {
        const p = hasPattern(ctx, /cors\s*\(\s*\{\s*origin\s*:\s*['"]\*['"]/);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'nosql-injection') {
        const p = hasPattern(ctx, /\.find(?:One)?\s*\(\s*req\.(?:body|query)\s*\)/) || hasPattern(ctx, /\$where\s*:/);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'xss') {
        const p = hasPattern(ctx, /dangerouslySetInnerHTML/i) || hasPattern(ctx, /\.innerHTML\s*=/i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'ssrf') {
        const p = hasPattern(ctx, /fetch\s*\(\s*req\.(?:body|query)\.[a-zA-Z0-9_]*url/i) || hasPattern(ctx, /axios/i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'no-hardcoded-secrets') {
        const p = hasPattern(ctx, /(?:AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|api_key\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"])/i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'no-sensitive-logs') {
        const p = hasPattern(ctx, /(?:console\.log|logger\.(?:info|debug|warn))\s*\([^)]*(?:password|token|secret|ssn|card|req\.body)/i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'debug-stack-traces') {
        const p = hasPattern(ctx, /stack\s*:\s*err\.stack/i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'unprotected-admin-routes') {
        const p = hasPattern(ctx, /['"]\/(?:api\/)?admin/i);
        if (p) location = { file: p.file, line: p.line };
      } else if (control.id === 'env-gitignored') {
        location = { file: '.gitignore', line: 1 };
      } else if (control.id === 'helmet' || control.id === 'rate-limit' || control.id === 'bcrypt' || control.id === 'input-validation') {
        // Look for main server or app file if available
        const mainFile = ctx.codeFiles.find((f) => /server\.(?:js|ts)|app\.(?:js|ts)|index\.(?:js|ts)/.test(f.relPath));
        if (mainFile) location = { file: mainFile.relPath, line: 1 };
      }

      findings.push({
        id: control.id,
        category: control.category,
        label: control.label,
        risk: control.riskIfMissing,
        impact: control.impact,
        file: location.file,
        line: location.line
      });
    }
  }

  return {
    findings,
    passed,
    totalChecks: filteredChecklist.length,
    timestamp: new Date().toISOString()
  };
}
