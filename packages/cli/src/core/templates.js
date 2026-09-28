import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
// Resolve the bundled template directory. Three shapes are supported:
//   source : src/core/templates.js → ../../templates/
//   bundle : dist/mcode.mjs        → ../templates/  (build copies them next to the bundle)
//   exotic : __dirname probes, then the repo path.
//
// NOTE: `__dirname` must NOT be the primary probe — bundlers/transforms (and
// vitest's SSR runtime) can define it even in ESM, which previously pointed
// TEMPLATE_DIR at a non-existent `src/templates/` and made `mcode init` report
// "template not bundled" for perfectly good templates.
let TEMPLATE_DIR;
if (typeof import.meta.url === 'string') {
  const candidates = [
    fileURLToPath(new URL('../templates/', import.meta.url)),
    fileURLToPath(new URL('../../templates/', import.meta.url)),
    fileURLToPath(new URL('./templates/', import.meta.url))
  ];
  TEMPLATE_DIR = candidates.find((dir) => existsSync(dir))
    || join(process.cwd(), 'packages', 'cli', 'templates');
} else if (typeof __dirname !== 'undefined') {
  TEMPLATE_DIR = existsSync(join(__dirname, 'templates'))
    ? join(__dirname, 'templates')
    : join(__dirname, '..', 'templates');
} else {
  TEMPLATE_DIR = join(process.cwd(), 'packages', 'cli', 'templates');
}

export const TEMPLATES = {
  express: {
    name: 'express',
    description: 'Minimal Express API with ESM + vitest setup (helmet + cors + rate-limit on)',
    // SEC/MF-008: security middleware ships with the template, so the deps must
    // too — a scaffold that fails to boot teaches users to delete middleware.
    deps: ['express', 'helmet', 'cors', 'express-rate-limit'],
    devDeps: ['vitest'],
    hooks: {}
  },
  fastify: {
    name: 'fastify',
    description: 'Minimal Fastify API with ESM + vitest setup (helmet + cors + rate-limit on)',
    deps: ['fastify', '@fastify/helmet', '@fastify/cors', '@fastify/rate-limit'],
    devDeps: ['vitest'],
    hooks: {}
  },
  'react-vite': {
    name: 'react-vite',
    description: 'React SPA powered by Vite',
    deps: ['react', 'react-dom'],
    devDeps: ['vite', '@vitejs/plugin-react'],
    hooks: {}
  },
  'full-stack': {
    name: 'full-stack',
    description: 'React + Vite frontend with an Express API backend (helmet + cors + rate-limit on)',
    deps: ['express', 'helmet', 'cors', 'express-rate-limit', 'react', 'react-dom'],
    devDeps: ['vite', '@vitejs/plugin-react', 'vitest', 'concurrently'],
    hooks: {
      postWrite: async ({ dir }) => {
        const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));
        pkg.scripts = {
          ...pkg.scripts,
          dev: 'concurrently "npm:dev:server" "npm:dev:web"',
          'dev:server': 'node --watch server.js',
          'dev:web': 'vite'
        };
        await writeFile(join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
      }
    }
  }
};

/**
 * MF-008: the safety net behind "every template ships a .gitignore".
 *
 * A scaffold without `.gitignore` is a secret-leak waiting to happen: the user
 * fills `.env` with real keys, runs `git add .` and commits `node_modules/`
 * plus the secrets. If a template (or a future one) forgets the file, we write
 * a minimal one instead of shipping the trap.
 */
export const FALLBACK_GITIGNORE = `# dependencies
node_modules/

# build output
dist/
build/
out/

# env / secrets — NEVER commit real values
.env
.env.*
!.env.example

# logs / coverage
*.log
coverage/

# mcode local state
.mcode/
`;

/** Copy a bundled template directory into `targetDir` (non-destructive). */
export async function applyTemplate(name, targetDir, { overwrite = false } = {}) {
  const meta = TEMPLATES[name];
  if (!meta) throw new Error(`Unknown template "${name}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  const src = join(TEMPLATE_DIR, name);
  if (!(await stat(src).catch(() => null))) {
    throw new Error(`Template files for "${name}" not bundled`);
  }
  const copied = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      const rel = relative(src, abs);
      const dest = join(targetDir, rel);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        const content = await readFile(abs, 'utf8');
        const exists = await stat(dest).catch(() => null);
        if (exists && !overwrite) continue;
        await mkdir(join(targetDir, relative(src, join(dir, '.'))), { recursive: true });
        await writeFile(dest, content, 'utf8');
        copied.push(rel);
      }
    }
  };
  await walk(src);
  // MF-008: never hand back a project without secret hygiene.
  if (!(await stat(join(targetDir, '.gitignore')).catch(() => null))) {
    await writeFile(join(targetDir, '.gitignore'), FALLBACK_GITIGNORE, 'utf8');
    copied.push('.gitignore');
  }
  await meta.hooks?.postWrite?.({ dir: targetDir });
  return { meta, files: copied };
}

export function listTemplates() {
  return Object.values(TEMPLATES);
}

/** List the files a template WOULD write (no disk writes, no hooks). */
export async function previewTemplate(name) {
  const meta = TEMPLATES[name];
  if (!meta) throw new Error(`Unknown template "${name}". Available: ${Object.keys(TEMPLATES).join(', ')}`);
  const src = join(TEMPLATE_DIR, name);
  if (!(await stat(src).catch(() => null))) {
    throw new Error(`Template files for "${name}" not bundled`);
  }
  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) await walk(abs);
      else files.push(relative(src, abs));
    }
  };
  await walk(src);
  return { meta, files: files.sort() };
}
