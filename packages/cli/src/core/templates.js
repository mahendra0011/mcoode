import { readdir, readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Works in both bundled (CJS, __dirname defined) and source (ESM) contexts.
const TEMPLATE_DIR = typeof __dirname !== 'undefined'
  ? join(__dirname, '..', 'templates')
  : fileURLToPath(new URL('../../templates/', import.meta.url));

export const TEMPLATES = {
  express: {
    name: 'express',
    description: 'Minimal Express API with ESM + vitest setup',
    deps: ['express'],
    devDeps: ['vitest'],
    hooks: {}
  },
  fastify: {
    name: 'fastify',
    description: 'Minimal Fastify API with ESM + vitest setup',
    deps: ['fastify'],
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
    description: 'React + Vite frontend with an Express API backend',
    deps: ['express', 'react', 'react-dom'],
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
  await meta.hooks?.postWrite?.({ dir: targetDir });
  return { meta, files: copied };
}

export function listTemplates() {
  return Object.values(TEMPLATES);
}
