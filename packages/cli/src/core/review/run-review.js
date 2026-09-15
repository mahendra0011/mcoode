import { execa } from 'execa';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const JSON_ARRAY_RE = /```(?:json)?\s*([\s\S]*?)```|(\[[\s\S]*\])/;

/**
 * Parses JSON array from model output robustly.
 */
function parseJsonArray(text) {
  const raw = String(text || '').trim();
  const match = JSON_ARRAY_RE.exec(raw);
  const candidate = match?.[1] || match?.[2] || raw;
  const start = candidate.indexOf('[');
  if (start === -1) {
    throw new Error('no JSON array found in review output');
  }
  let end = candidate.lastIndexOf(']');
  if (end === -1 || end < start) {
    throw new Error('no valid JSON array closing bracket found');
  }
  const slice = candidate.slice(start, end + 1);
  return JSON.parse(slice);
}

/**
 * Fetch uncommitted git diff (both staged and unstaged changes).
 */
export async function getUncommittedDiff(cwd = process.cwd()) {
  try {
    const res = await execa('git', ['diff', 'HEAD'], { cwd, reject: false });
    if (res.stdout && res.stdout.trim()) {
      return res.stdout;
    }
    const unstaged = await execa('git', ['diff'], { cwd, reject: false });
    if (unstaged.stdout && unstaged.stdout.trim()) {
      return unstaged.stdout;
    }
    const cached = await execa('git', ['diff', '--cached'], { cwd, reject: false });
    if (cached.stdout && cached.stdout.trim()) {
      return cached.stdout;
    }
  } catch {}
  return '';
}

/**
 * Fetch GitHub PR diff using `gh pr diff <prNumber>`.
 */
export async function getPRDiff(target, cwd = process.cwd()) {
  try {
    const res = await execa('gh', ['pr', 'diff', String(target)], { cwd, reject: false });
    if (res.exitCode === 0 && res.stdout.trim()) {
      return res.stdout;
    }
  } catch {}

  try {
    const res = await execa('git', ['diff', `origin/main...HEAD`], { cwd, reject: false });
    if (res.stdout.trim()) return res.stdout;
  } catch {}

  return `Diff for PR #${target} could not be retrieved via gh CLI or git.`;
}

/**
 * Fetch content of a specific file.
 */
export async function getFileContent(target, cwd = process.cwd()) {
  const fullPath = resolve(cwd, target);
  return await readFile(fullPath, 'utf8');
}

/**
 * Run code review using the reviewer domain on router.
 *
 * @param {object} options
 * @param {'diff'|'pr'|'file'} [options.scope='diff']
 * @param {string} [options.target] - PR number or file path
 * @param {object} options.router - ModelRouter instance
 * @param {string} [options.projectPath] - Project root directory
 * @returns {Promise<Array<{ file: string, line: number, severity: string, category: string, comment: string }>>}
 */
export async function runReview({ scope = 'diff', target = null, router = null, projectPath = process.cwd() } = {}) {
  const actualScope = scope === 'pr' ? 'pr' : target && scope !== 'diff' ? 'file' : 'diff';

  const diff = actualScope === 'diff' ? await getUncommittedDiff(projectPath)
             : actualScope === 'pr' ? await getPRDiff(target, projectPath)
             : await getFileContent(target, projectPath);

  if (!diff || !diff.trim()) {
    return [];
  }

  let r = router;
  if (!r) {
    const { ModelRouter } = await import('../router.js');
    const { loadVault } = await import('../vault.js');
    const { loadConfig } = await import('../store.js');
    const secrets = await loadVault();
    const config = await loadConfig();
    r = new ModelRouter({ secrets, config });
    await r.init?.();
  }

  let assignment = await r.pick('reviewer');
  if (!assignment) {
    assignment = await r.pick('general') || await r.pick('planning');
  }

  if (!assignment) {
    const { MockProvider } = await import('../../providers/mock.js');
    const mock = new MockProvider();
    assignment = { provider: mock, model: { id: 'mock' } };
  }

  const raw = await assignment.provider.complete(assignment.model.id, {
    messages: [
      {
        role: 'system',
        content: `Review this code like a senior engineer leaving PR comments. For each
issue: file, line, severity, category (bug|style|perf|security|maintainability),
and a specific, actionable comment — not vague praise/criticism. Also note genuinely
good decisions worth calling out (category: "praise"), not just problems.
JSON array of { "file", "line", "severity", "category", "comment" }.`
      },
      {
        role: 'user',
        content: actualScope === 'file'
          ? `File: ${target}\n\nContent:\n${diff}`
          : actualScope === 'pr'
          ? `PR #${target} diff:\n${diff}`
          : `Uncommitted diff:\n${diff}`
      }
    ]
  });

  try {
    return parseJsonArray(raw.text);
  } catch (err) {
    if (typeof raw.text === 'string' && raw.text.trim()) {
      return [
        {
          file: target || 'project',
          line: 1,
          severity: 'info',
          category: 'style',
          comment: raw.text.trim().slice(0, 200)
        }
      ];
    }
    return [];
  }
}
