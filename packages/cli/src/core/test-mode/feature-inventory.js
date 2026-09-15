/**
 * Test Mode — feature inventory (doc 48, Step 2).
 *
 * Reuses the ModelRouter (doc 27) with a testing-specific extraction pass on
 * top of a lightweight repo-context build (mirrors runGod's detectTechStack
 * pass in chat-session/orchestrator). The result drives the full test plan —
 * both the traditional test types and the autonomous exploratory agent.
 *
 * If no AI model is usable (mock provider, missing keys, bad JSON), a
 * deterministic heuristic inventory is produced by scanning the repo for
 * API routes and page routes, so the mode always yields a usable plan.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const INVENTORY_SYSTEM = `TEST_MODE_INVENTORY
You are mcode's test-mode inventory agent. Given a codebase summary, enumerate
every distinct user-facing feature and backend endpoint that should be tested.

Respond with ONLY a JSON object (no markdown fence, no commentary) shaped like:
{ "features": [
  { "id": "f1", "name": "Login", "layer": "backend", "route": "POST /api/auth/login",
    "successCriteria": "returns 200 with a JWT when credentials are valid",
    "requiresAuth": false }
] }

Rules:
- layer is one of: frontend | backend | both
- route is the URL/path a test would target (page path or METHOD /api/path)
- successCriteria describes what a PASSING test of this feature looks like
- requiresAuth is true when the feature needs a logged-in session
- Be exhaustive but dedupe; 5-40 features is the sweet spot`;

const JSON_RE = /```json\s*([\s\S]*?)```|```\s*([\s\S]*?)```/;

/** Extract a JSON value (object or array) from loose model output. */
export function parseInventoryOutput(text) {
  const raw = String(text || '').trim();
  const match = JSON_RE.exec(raw);
  const candidate = match?.[1] || match?.[2] || raw;
  const starts = [candidate.indexOf('{'), candidate.indexOf('[')].filter((i) => i !== -1);
  if (starts.length === 0) throw new Error('no JSON found in inventory output');
  const start = Math.min(...starts);
  const openCh = candidate[start];
  const closeCh = openCh === '{' ? '}' : ']';
  let end = start;
  while ((end = candidate.indexOf(closeCh, end)) !== -1) {
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      end += 1;
    }
  }
  throw new Error('no valid JSON in inventory output');
}

/** Build a compact repo summary (same shape runGod feeds the planner). */
export async function buildRepoContext(projectPath) {
  try {
    const { detectTechStack, smartDefaults } = await import('../techstack.js');
    const stack = await detectTechStack(projectPath);
    const defaults = smartDefaults(stack);
    return `--- tech stack ---
frontend: ${stack.frontend.join(', ') || 'none'}
backend: ${stack.backend.join(', ') || 'none'}
databases: ${stack.databases.join(', ') || 'none'}
test frameworks: ${stack.testFrameworks.join(', ') || 'none'}
build tools: ${stack.buildTools.join(', ') || 'none'}
languages: ${stack.languages.join(', ')}
package manager: ${stack.packageManager}
smart defaults: test=${defaults.testCommand}, build=${defaults.buildCommand}, port=${defaults.devPort}`;
  } catch {
    return '--- tech stack --- (detection failed)';
  }
}

/** Best-effort fallback inventory when no AI is usable — scan routes + pages. */
export async function heuristicInventory(projectPath) {
  const features = [];
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.mcode']);

  async function walk(dir, depth = 0) {
    if (depth > 4) return [];
    const out = [];
    let entries = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) out.push(...(await walk(full, depth + 1)));
      else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(e.name)) out.push(full);
    }
    return out;
  }

  const codeFiles = await walk(projectPath);
  let id = 1;
  for (const file of codeFiles) {
    let content = '';
    try {
      content = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    const rel = relative(projectPath, file).replace(/\\/g, '/');
    // Express/Fastify-style endpoints
    const routeRe = /\.(get|post|put|patch|delete|all)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;
    let m;
    while ((m = routeRe.exec(content)) !== null) {
      if (m[2] === '/' || m[2].includes(':')) continue;
      features.push({
        id: `f${id++}`,
        name: `${m[1].toUpperCase()} ${m[2]}`,
        layer: 'backend',
        route: `${m[1].toUpperCase()} ${m[2]}`,
        successCriteria: 'endpoint responds without a 5xx and returns the documented shape',
        requiresAuth: /auth|jwt|session|token/i.test(rel),
        file: rel
      });
    }
    // Next.js / app-router page routes
    const pageMatch = rel.match(/(?:app|pages|src\/pages)\/(.+)\bpage\.[jt]sx?$/);
    if (pageMatch) {
      const route = ('/' + pageMatch[1].replace(/\/index$/, '')).replace(/\/+$/, '') || '/';
      features.push({
        id: `f${id++}`,
        name: `Page ${route}`,
        layer: 'frontend',
        route,
        successCriteria: 'page loads without console errors and renders its main content',
        requiresAuth: /dashboard|account|admin|profile|settings/i.test(route),
        file: rel
      });
    }
    if (features.length >= 40) break;
  }
  if (features.length === 0) {
    features.push({
      id: 'f1',
      name: 'App loads',
      layer: 'frontend',
      route: '/',
      successCriteria: 'app root loads with no console errors',
      requiresAuth: false
    });
  }
  return features;
}

function normalizeFeature(f, i) {
  return {
    id: String(f.id || `f${i + 1}`),
    name: String(f.name || `feature-${i + 1}`),
    layer: ['frontend', 'backend', 'both'].includes(f.layer) ? f.layer : 'both',
    route: String(f.route || f.path || '/'),
    successCriteria: String(f.successCriteria || f.criteria || 'feature works as expected'),
    requiresAuth: Boolean(f.requiresAuth)
  };
}

/**
 * Build the testable feature inventory for the project.
 * @param {string} projectPath
 * @param {{ router?: object, bus?: EventEmitter, repoContext?: string }} ctx
 */
export async function buildFeatureInventory(projectPath, { router = null, bus = null, repoContext = null } = {}) {
  if (!repoContext) repoContext = await buildRepoContext(projectPath);

  if (router) {
    try {
      const assignment = await router.pick('test');
      if (assignment?.provider) {
        bus?.emit('MESSAGE', { kind: 'system', text: `inventory scan with ${assignment.provider.id}:${assignment.model.id}...` });
        const raw = await assignment.provider.complete(assignment.model.id, {
          messages: [
            { role: 'system', content: INVENTORY_SYSTEM },
            { role: 'user', content: `PROJECT CONTEXT:\n${repoContext}\n\nPROJECT PATH: ${projectPath}` }
          ],
          temperature: 0.2
        });
        const parsed = parseInventoryOutput(raw?.text);
        const features = Array.isArray(parsed) ? parsed : parsed.features;
        if (Array.isArray(features) && features.length > 0) {
          return features.map((f, i) => normalizeFeature(f, i));
        }
      }
    } catch (err) {
      bus?.emit('MESSAGE', { kind: 'warn', text: `AI inventory failed (${err.message}) — falling back to route scan` });
    }
  }

  return heuristicInventory(projectPath);
}

/** Walk helper exported for tests. */
export async function _exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
