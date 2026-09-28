import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { cache } from './cache.js';

const FRONTEND_FRAMEWORKS = [
  { name: 'React', deps: ['react', 'react-dom'], files: ['src/main.jsx', 'src/main.tsx', 'src/App.jsx', 'src/App.tsx'] },
  { name: 'Vue', deps: ['vue', 'vue-router', 'pinia'], files: ['src/main.js', 'src/main.ts', 'src/App.vue', 'vite.config.js', 'vue.config.js', 'src/pages/App.vue', 'src/views/App.vue', 'src/components/App.vue'] },
  { name: 'Angular', deps: ['@angular/core'], files: ['angular.json', 'src/main.ts'] },
  { name: 'Svelte', deps: ['svelte'], files: ['svelte.config.js', 'src/app.html'] },
  { name: 'Next.js', deps: ['next'], files: ['next.config.js', 'next.config.mjs'] },
  { name: 'Nuxt', deps: ['nuxt'], files: ['nuxt.config.ts', 'nuxt.config.js'] },
  { name: 'SvelteKit', deps: ['@sveltejs/kit'], files: ['svelte.config.js', 'src/app.html'] },
];

const BACKEND_RUNTIMES = [
  { name: 'Node.js', deps: [], files: ['package.json'] },
  { name: 'Python', deps: [], files: ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py', 'manage.py'] },
  { name: 'Go', deps: [], files: ['go.mod', 'go.sum'] },
  { name: 'Rust', deps: [], files: ['Cargo.toml', 'Cargo.lock'] },
  { name: 'Ruby', deps: [], files: ['Gemfile', 'Gemfile.lock', 'config.ru'] },
  { name: 'Java', deps: [], files: ['pom.xml', 'build.gradle', 'build.gradle.kts'] },
  { name: 'Elixir', deps: [], files: ['mix.exs'] },
  { name: 'Deno', deps: [], files: ['deno.json', 'deno.jsonc'] },
  { name: '.NET', deps: [], files: ['*.csproj'] },
];

const DATABASES = [
  { name: 'PostgreSQL', deps: ['pg', 'pg-native', 'typeorm', 'prisma'] },
  { name: 'MySQL', deps: ['mysql', 'mysql2'] },
  { name: 'MongoDB', deps: ['mongoose', 'mongodb'] },
  { name: 'SQLite', deps: ['better-sqlite3', 'sqlite3'] },
  { name: 'Redis', deps: ['ioredis', 'redis', 'redis-om'] },
  { name: 'Prisma', deps: ['prisma', '@prisma/client'] },
  { name: 'Supabase', deps: ['@supabase/supabase-js'] },
  { name: 'Firebase', deps: ['firebase', 'firebase-admin'] },
];

const TEST_FRAMEWORKS = [
  { name: 'Jest', deps: ['jest'] },
  { name: 'Vitest', deps: ['vitest'] },
  { name: 'Cypress', deps: ['cypress'] },
  { name: 'Playwright', deps: ['@playwright/test'] },
  { name: 'Mocha', deps: ['mocha'] },
  { name: 'Pytest', deps: [], files: ['pytest.ini', 'conftest.py', 'tox.ini'] },
  { name: 'RSpec', deps: [], files: ['spec/', 'rspec' ] },
];

const BUILD_TOOLS = [
  { name: 'Vite', deps: ['vite'], files: ['vite.config.js', 'vite.config.ts'] },
  { name: 'Webpack', deps: ['webpack'], files: ['webpack.config.js', 'webpack.config.cjs'] },
  { name: 'Rollup', deps: ['rollup'], files: ['rollup.config.js'] },
  { name: 'Turborepo', deps: ['turbo'], files: ['turbo.json'] },
  { name: 'Nx', deps: ['nx'], files: ['nx.json'] },
];

/** Detect the tech stack from project files and package.json. */
export async function detectTechStack(projectPath) {
  // Cache for 120s — tech stack rarely changes mid-session
  return cache.wrap(`techstack:${projectPath}`, async () => {
  const result = {
    frontend: [],
    backend: [],
    databases: [],
    testFrameworks: [],
    buildTools: [],
    packageManager: 'npm',
    languages: [],
    rawDeps: [],
  };

  // Read package.json
  let pkg = null;
  try {
    pkg = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf8'));
  } catch { /* not a node project */ }

  if (pkg) {
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    result.rawDeps = Object.keys(allDeps);
    // 722: lockfiles beat a missing packageManager field (and bun.lockb).
    const { existsSync } = await import('node:fs');
    if (pkg.packageManager?.includes('pnpm') || existsSync(join(projectPath, 'pnpm-lock.yaml'))) {
      result.packageManager = 'pnpm';
    } else if (pkg.packageManager?.includes('yarn') || existsSync(join(projectPath, 'yarn.lock'))) {
      result.packageManager = 'yarn';
    } else if (pkg.packageManager?.includes('bun') || existsSync(join(projectPath, 'bun.lockb')) || existsSync(join(projectPath, 'bun.lock'))) {
      result.packageManager = 'bun';
    }
  }

  // Read top-level files
  let topFiles = [];
  try {
    topFiles = await readdir(projectPath);
  } catch { /* ignore */ }

  // Helper: check if any dep is in the dependency list
  const hasDep = (deps) => deps.some((d) => result.rawDeps.includes(d));
  const hasFile = (files) => files.some((f) => topFiles.includes(f) || topFiles.includes(f.split('/').pop()));

  // Detect frontend frameworks
  for (const fw of FRONTEND_FRAMEWORKS) {
    if (hasDep(fw.deps) || hasFile(fw.files)) {
      result.frontend.push(fw.name);
    }
  }

  // Detect backend runtimes
  for (const rt of BACKEND_RUNTIMES) {
    if ((rt.deps.length === 0 && hasFile(rt.files)) || (rt.deps.length > 0 && hasDep(rt.deps))) {
      result.backend.push(rt.name);
    }
  }

  // Detect databases
  for (const db of DATABASES) {
    if (hasDep(db.deps)) {
      result.databases.push(db.name);
    }
  }

  // Detect test frameworks
  for (const tf of TEST_FRAMEWORKS) {
    if ((tf.deps.length > 0 && hasDep(tf.deps)) || (tf.files?.some((f) => topFiles.includes(f)))) {
      result.testFrameworks.push(tf.name);
    }
  }

  // Detect build tools
  for (const bt of BUILD_TOOLS) {
    if (hasDep(bt.deps) || hasFile(bt.files)) {
      result.buildTools.push(bt.name);
    }
  }

  // Detect languages from file extensions
  const languageExts = await _scanLanguages(projectPath);
  result.languages = [...new Set(languageExts)];

  // Smart defaults: if Next.js detected, suggest React frontend
  if (result.frontend.includes('Next.js') && !result.frontend.includes('React')) {
    result.frontend.push('React');
  }

  return result;
  });
}

/** Quick recursive scan for source file extensions to detect languages. */
async function _scanLanguages(root, depth = 0, maxDepth = 3) {
  const langs = new Set();
  if (depth > maxDepth) return [...langs];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [...langs];
  }
  // 723: skip dependency/build output dirs — otherwise every vendored
  // language (Python, Go, C++) is falsely "detected" and I/O explodes.
  const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'vendor', 'target', '.git']);
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      const sub = await _scanLanguages(full, depth + 1, maxDepth);
      sub.forEach((l) => langs.add(l));
    } else if (entry.isFile()) {
      const ext = entry.name.split('.').pop().toLowerCase();
      const langMap = { js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', py: 'Python', go: 'Go', rs: 'Rust', rb: 'Ruby', java: 'Java', cs: 'C#', php: 'PHP', swift: 'Swift', kt: 'Kotlin' };
      if (langMap[ext]) langs.add(langMap[ext]);
    }
  }
  return [...langs];
}

/** Generate smart defaults based on detected tech stack. */
export function smartDefaults(stack) {
  const defaults = {
    testCommand: 'npm test',
    buildCommand: 'npm run build',
    lintCommand: 'npm run lint',
    devPort: 3000,
    domains: [],
  };

  if (stack.buildTools.includes('Vite')) defaults.devPort = 5173;
  if (stack.buildTools.includes('Next.js')) defaults.devPort = 3000;
  if (stack.frontend.includes('Vue')) defaults.devPort = 5173;

  // 724: route through the project's own package manager — raw `npx` in a
  // pnpm/yarn/bun workspace resolves the wrong tree (workspace: protocol).
  const pm = stack.packageManager && stack.packageManager !== 'npm' ? stack.packageManager : 'npm';
  const viaPm = (tool) => (pm === 'npm' ? `npx ${tool}` : `${pm} exec ${tool}`);
  if (stack.testFrameworks.includes('Vitest')) defaults.testCommand = viaPm('vitest run');
  if (stack.testFrameworks.includes('Jest')) defaults.testCommand = viaPm('jest');
  if (stack.testFrameworks.includes('Cypress')) defaults.testCommand = viaPm('cypress run');
  if (stack.testFrameworks.includes('Playwright')) defaults.testCommand = viaPm('playwright test');

  // Domain priority based on stack
  if (stack.databases.length > 0) defaults.domains.push('db');
  if (stack.backend.length > 0 || stack.frontend.length > 0) defaults.domains.unshift('backend', 'frontend');
  if (stack.buildTools.length > 0) defaults.domains.push('devops');
  defaults.domains.push('test', 'docs');

  return defaults;
}
