import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

/**
 * Comprehend codebase context (doc 27 pattern reused).
 */
export async function comprehendCodebase(projectPath = process.cwd(), { router = null, bus = null } = {}) {
  const out = [];

  try {
    const { detectTechStack, smartDefaults } = await import('../techstack.js');
    const stack = await detectTechStack(projectPath);
    const defaults = smartDefaults(stack);
    out.push(`--- tech stack ---\nfrontend: ${stack.frontend?.join(', ') || 'none'}\nbackend: ${stack.backend?.join(', ') || 'none'}\ndatabases: ${stack.databases?.join(', ') || 'none'}\ntest frameworks: ${stack.testFrameworks?.join(', ') || 'none'}\nbuild tools: ${stack.buildTools?.join(', ') || 'none'}\nlanguages: ${stack.languages?.join(', ') || 'none'}\npackage manager: ${stack.packageManager || 'npm'}\nsmart defaults: test=${defaults.testCommand}, build=${defaults.buildCommand}, port=${defaults.devPort}`);
  } catch {}

  try {
    const pkg = await readFile(join(projectPath, 'package.json'), 'utf8');
    out.push('--- package.json ---\n' + pkg.slice(0, 2000));
  } catch {}

  try {
    const readme = await readFile(join(projectPath, 'README.md'), 'utf8');
    out.push('--- README.md ---\n' + readme.slice(0, 1500));
  } catch {}

  try {
    const tree = await readdir(projectPath);
    out.push('--- top-level files ---\n' + tree.filter((f) => !f.startsWith('.')).join('\n'));
  } catch {}

  const repoContext = out.join('\n\n');
  return { repoContext };
}

/**
 * Explain code or concepts in the project without modifying code or judging quality.
 *
 * @param {string} question - Question to answer
 * @param {object} options
 * @param {string} [options.projectPath]
 * @param {object} [options.router]
 * @param {object} [options.bus]
 * @param {string} [options.targetFile]
 * @returns {Promise<string>} Plain conversational explanation
 */
export async function runExplain(question, { projectPath = process.cwd(), router = null, bus = null, targetFile = null } = {}) {
  let context;
  if (targetFile) {
    const filePath = resolve(projectPath, targetFile);
    context = await readFile(filePath, 'utf8');
  } else {
    const { repoContext } = await comprehendCodebase(projectPath, { router, bus });
    context = repoContext;
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

  let assignment = await r.pick('general');
  if (!assignment) {
    assignment = await r.pick('planning') || await r.pick('backend');
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
        content: `Explain code clearly to someone new to this codebase. Be concrete —
reference actual function/file names, walk through the logic step by step where
helpful, and explain WHY something is designed a certain way when it's not obvious,
not just WHAT it does. No code changes, no opinions on quality — pure explanation.`
      },
      {
        role: 'user',
        content: `${question}\n\nContext:\n${context}`
      }
    ]
  });

  return String(raw.text || '').trim();
}

/**
 * Generate full onboarding walkthrough of the project and persist to .mcode/reports/project-tour.md
 *
 * @param {string} projectPath
 * @param {object} options
 * @returns {Promise<string>} Generated markdown tour
 */
export async function generateProjectTour(projectPath = process.cwd(), { router = null, bus = null } = {}) {
  const { repoContext } = await comprehendCodebase(projectPath, { router, bus });

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

  let assignment = await r.pick('general');
  if (!assignment) {
    assignment = await r.pick('planning') || await r.pick('docs');
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
        content: `Write a new-developer onboarding tour of this codebase: what the project
does, the overall architecture, the 5-8 most important files/modules to understand
first (with why each matters), and common gotchas/conventions a newcomer should
know. Markdown, well-organized with headers.`
      },
      {
        role: 'user',
        content: repoContext
      }
    ]
  });

  const tourContent = String(raw.text || '').trim();

  // Save durable artifact under .mcode/reports/project-tour.md
  try {
    const reportsDir = join(projectPath, '.mcode', 'reports');
    await mkdir(reportsDir, { recursive: true });
    await writeFile(join(reportsDir, 'project-tour.md'), tourContent, 'utf8');
  } catch (err) {
    console.warn(`[explain:tour] Failed to write report file: ${err.message}`);
  }

  return tourContent;
}
