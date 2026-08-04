import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
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
    const rel = p.replace(/\\/g, '/');
    return ignore.some((pattern) => {
      if (pattern.startsWith('!')) return false;
      const norm = pattern.replace(/\\/g, '/').replace(/\/$/, '');
      if (norm.includes('*')) {
        const re = new RegExp(`^${norm.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}($|/)`);
        return re.test(rel);
      }
      return rel === norm || rel.startsWith(`${norm}/`);
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
