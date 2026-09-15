import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execa } from 'execa';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage',
  '.cache', '.turbo', 'out', '.mcode', '.zcode'
]);

const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte']);

/**
 * Recursively list code files in a project
 */
async function getProjectCodeFiles(dir, baseDir = dir) {
  const files = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.env') continue;
      if (IGNORE_DIRS.has(entry.name)) continue;

      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await getProjectCodeFiles(fullPath, baseDir);
        files.push(...nested);
      } else if (entry.isFile() && CODE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch {
    // skip unreadable
  }
  return files;
}

/**
 * Check for unused dependencies via static scan across all project files
 */
async function findUnusedDependencies(projectPath, codeFiles) {
  const findings = [];
  const pkgPath = join(projectPath, 'package.json');
  if (!existsSync(pkgPath)) return findings;

  let pkg = {};
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  } catch {
    return findings;
  }

  const dependencies = Object.keys(pkg.dependencies || {});
  if (dependencies.length === 0) return findings;

  // Read all code files content into memory
  const codeContents = [];
  for (const file of codeFiles) {
    try {
      const content = await readFile(file, 'utf8');
      codeContents.push(content);
    } catch {}
  }
  const combined = codeContents.join('\n');

  for (const dep of dependencies) {
    // Look for import ... from 'dep' or require('dep')
    const importRegex = new RegExp(`from\\s+['"]${dep}(?:/.*)?['"]|require\\(['"]${dep}(?:/.*)?['"]\\)`, 'm');
    if (!importRegex.test(combined)) {
      findings.push({
        id: `unused-dep-${dep}`,
        category: 'unused-dependency',
        file: 'package.json',
        issue: `"${dep}" in package.json appears unused across project code`,
        currentLines: 1,
        estimatedCleanLines: 0,
        costsAI: false,
      });
    }
  }

  return findings;
}

/**
 * Check for duplicate or near-identical files
 */
async function findDuplicateFiles(projectPath, codeFiles) {
  const findings = [];
  const fileHashes = new Map();

  for (const file of codeFiles) {
    try {
      const content = await readFile(file, 'utf8');
      if (content.length < 50) continue; // skip trivial files

      // Normalize whitespace for fuzzy match
      const normalized = content.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
      const hash = createHash('sha256').update(normalized).digest('hex');

      const relPath = relative(projectPath, file).replace(/\\/g, '/');
      if (fileHashes.has(hash)) {
        const original = fileHashes.get(hash);
        const lineCount = content.split('\n').length;
        findings.push({
          id: `duplicate-${relPath}`,
          category: 'duplicate-logic',
          file: relPath,
          issue: `Duplicate file content identical to ${original} (${lineCount} lines)`,
          currentLines: lineCount,
          estimatedCleanLines: 0,
          costsAI: false,
        });
      } else {
        fileHashes.set(hash, relPath);
      }
    } catch {}
  }

  return findings;
}

/**
 * Detect 3+ consecutive lines of commented-out code (not JSDoc or comments)
 */
async function findCommentedOutCode(projectPath, codeFiles) {
  const findings = [];
  const codeKeywords = /\b(const|let|var|function|return|import|export|if|else|switch|case|class|async|await|try|catch)\b|[;{}()=>]/;

  for (const file of codeFiles) {
    try {
      const content = await readFile(file, 'utf8');
      const lines = content.split('\n');
      const relPath = relative(projectPath, file).replace(/\\/g, '/');

      let streakStart = -1;
      let streakCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        const isSingleLineComment = trimmed.startsWith('//') && !trimmed.startsWith('///') && !trimmed.startsWith('// TODO') && !trimmed.startsWith('// FIXME');
        
        if (isSingleLineComment) {
          const commentBody = trimmed.slice(2).trim();
          if (codeKeywords.test(commentBody) && commentBody.length > 5) {
            if (streakStart === -1) streakStart = i + 1;
            streakCount++;
          } else {
            if (streakCount >= 3) {
              findings.push({
                id: `commented-code-${relPath}-${streakStart}`,
                category: 'dead-alternate',
                file: relPath,
                startLine: streakStart,
                endLine: streakStart + streakCount - 1,
                issue: `Commented-out dead code block (${streakCount} lines)`,
                currentLines: streakCount,
                estimatedCleanLines: 0,
                costsAI: false,
              });
            }
            streakStart = -1;
            streakCount = 0;
          }
        } else {
          if (streakCount >= 3) {
            findings.push({
              id: `commented-code-${relPath}-${streakStart}`,
              category: 'dead-alternate',
              file: relPath,
              startLine: streakStart,
              endLine: streakStart + streakCount - 1,
              issue: `Commented-out dead code block (${streakCount} lines)`,
              currentLines: streakCount,
              estimatedCleanLines: 0,
              costsAI: false,
            });
          }
          streakStart = -1;
          streakCount = 0;
        }
      }

      if (streakCount >= 3) {
        findings.push({
          id: `commented-code-${relPath}-${streakStart}`,
          category: 'dead-alternate',
          file: relPath,
          startLine: streakStart,
          endLine: streakStart + streakCount - 1,
          issue: `Commented-out dead code block (${streakCount} lines)`,
          currentLines: streakCount,
          estimatedCleanLines: 0,
          costsAI: false,
        });
      }
    } catch {}
  }

  return findings;
}

/**
 * Scan for unused exports via static regex export/import resolution
 */
async function findUnusedExports(projectPath, codeFiles) {
  const findings = [];
  const exportRegex = /export\s+(?:const|let|var|function\*?|class)\s+([a-zA-Z0-9_$]+)/g;
  const fileExports = [];
  const fileContents = [];

  for (const file of codeFiles) {
    try {
      const content = await readFile(file, 'utf8');
      fileContents.push({ file, content });
      let match;
      while ((match = exportRegex.exec(content)) !== null) {
        fileExports.push({
          file,
          name: match[1],
          line: content.slice(0, match.index).split('\n').length,
        });
      }
    } catch {}
  }

  for (const exp of fileExports) {
    const isImported = fileContents.some(({ file, content }) => {
      if (file === exp.file) return false;
      return content.includes(exp.name);
    });
    if (!isImported) {
      const relPath = relative(projectPath, exp.file).replace(/\\/g, '/');
      findings.push({
        id: `unused-export-${relPath}-${exp.line}-${exp.name}`,
        category: 'unused-export',
        file: relPath,
        startLine: exp.line,
        issue: `Unused export "${exp.name}" — never imported`,
        currentLines: 1,
        estimatedCleanLines: 0,
        costsAI: false,
      });
    }
  }

  return findings;
}

/**
 * Tier 1 (no AI) — Dead code & unused-anything detection
 * @param {string} projectPath
 */
export async function findDeadCode(projectPath = process.cwd()) {
  const codeFiles = await getProjectCodeFiles(projectPath);
  const findings = [];

  const [unusedDeps, duplicateFiles, commentedCode, unusedExports] = await Promise.all([
    findUnusedDependencies(projectPath, codeFiles),
    findDuplicateFiles(projectPath, codeFiles),
    findCommentedOutCode(projectPath, codeFiles),
    findUnusedExports(projectPath, codeFiles),
  ]);

  findings.push(...unusedDeps);
  findings.push(...duplicateFiles);
  findings.push(...commentedCode);
  findings.push(...unusedExports);

  return findings;
}
