import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execa } from 'execa';

export async function isGitRepo(cwd = process.cwd()) {
  try {
    await execa('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
    return true;
  } catch {
    return false;
  }
}

export async function changedFiles(cwd = process.cwd()) {
  const { stdout } = await execa('git', ['status', '--porcelain'], { cwd });
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((f) => f && !f.endsWith('/'));
}

/** Get per-file diff stats (added/deleted lines) using `git diff --numstat`.
 *  Returns array of { file, added, deleted, status }. */
export async function diffStats(cwd = process.cwd()) {
  const { stdout } = await execa('git', ['diff', '--numstat'], { cwd });
  const files = stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [added, deleted, rest] = line.split('\t');
      return {
        file: rest || '',
        added: Number(added) || 0,
        deleted: Number(deleted) || 0,
        status: Number(added) > 0 && Number(deleted) > 0 ? 'modified' : Number(added) > 0 ? 'added' : 'deleted',
      };
    })
    .filter((f) => f.file);
  return files;
}

/** Get the full unified diff for a specific file (or all files). */
export async function gitDiff(cwd = process.cwd(), file = null) {
  const args = ['diff'];
  if (file) args.push('--', file);
  const { stdout } = await execa('git', args, { cwd });
  return stdout;
}

export async function repoRoot(cwd = process.cwd()) {
  try {
    const { stdout } = await execa('git', ['rev-parse', '--show-toplevel'], { cwd });
    return stdout.trim();
  } catch {
    return cwd;
  }
}

/** Read the dependency imports of a JS file (via acorn-compatible regex) so
 *  the watch daemon can build a quick import graph without a full parser dep. */
export function extractImports(source) {
  const imports = new Set();
  const re = /(?:import\s+(?:[^'"]*?\s+from\s+)?|from\s+|require\s*\()\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) imports.add(m[1]);
  return [...imports];
}

export async function walkTree(root, { ignore = [], maxDepth = 12 } = {}) {
  const { stat: fsStat } = await import('node:fs/promises');
  const results = [];
  const isIgnored = (p) => {
    const rel = relative(root, p).replace(/\\/g, '/');
    return ignore.some((pattern) => {
      if (pattern.startsWith('!')) return false;
      const norm = pattern.replace(/\\/g, '/').replace(/\/$/, '');
      if (norm.includes('*')) {
        const re = new RegExp(`^${norm.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}($|/)`);
        return re.test(rel);
      }
      return rel === norm || rel.startsWith(`${norm}/`) || rel.includes(`/${norm}/`);
    });
  };
  const walk = async (dir, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (isIgnored(full)) continue;
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else {
        try {
          const st = await fsStat(full);
          results.push({ path: full, size: st.size, mtimeMs: st.mtimeMs });
        } catch {
          /* unreadable file */
        }
      }
    }
  };
  await walk(root, 0);
  return results;
}
