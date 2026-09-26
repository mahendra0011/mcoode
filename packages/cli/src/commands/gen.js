import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { ok, fail } from '../core/logger.js';

const GENERATORS = {
  route: {
    desc: 'Express route',
    match: (thing) => /^routes?\b/i.test(thing),
    target: (dir, name) => join(dir, 'src', 'routes', `${name}.js`),
    write: async (dir, name) => {
      const file = join(dir, 'src', 'routes', `${name}.js`);
      const content = `import { Router } from 'express';\n\nconst router = Router();\n\nrouter.get('/', (req, res) => {\n  res.json({ ok: true, route: '${name}' });\n});\n\nexport default router;\n`;
      await mkdir(join(dir, 'src', 'routes'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  },
  component: {
    desc: 'React component',
    match: (thing) => /^component/i.test(thing),
    target: (dir, name) => join(dir, 'src', 'components', `${name}.jsx`),
    write: async (dir, name) => {
      const file = join(dir, 'src', 'components', `${name}.jsx`);
      const content = `export function ${name}({ children }) {\n  return (\n    <section>\n      {children}\n    </section>\n  );\n}\n`;
      await mkdir(join(dir, 'src', 'components'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  },
  controller: {
    desc: 'Express controller',
    match: (thing) => /^controller/i.test(thing),
    target: (dir, name) => join(dir, 'src', 'controllers', `${name}.js`),
    write: async (dir, name) => {
      const file = join(dir, 'src', 'controllers', `${name}.js`);
      const content = `export async function index(req, res) {\n  res.json({ ok: true, controller: '${name}' });\n}\n`;
      await mkdir(join(dir, 'src', 'controllers'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  },
  page: {
    desc: 'React page',
    match: (thing) => /^pages?$/i.test(thing),
    target: (dir, name) => join(dir, 'src', 'pages', `${name}.jsx`),
    write: async (dir, name) => {
      const file = join(dir, 'src', 'pages', `${name}.jsx`);
      const content = `export function ${name}() {\n  return (\n    <main>\n      <h1>${name}</h1>\n    </main>\n  );\n}\n`;
      await mkdir(join(dir, 'src', 'pages'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  },
  api: {
    desc: 'Express API router (CRUD stub)',
    match: (thing) => /^api$/i.test(thing),
    target: (dir, name) => join(dir, 'src', 'api', `${name}.js`),
    write: async (dir, name) => {
      const file = join(dir, 'src', 'api', `${name}.js`);
      const content = `import { Router } from 'express';\n\nconst router = Router();\n\nrouter.get('/', (req, res) => res.json({ ok: true, resource: '${name}' }));\nrouter.post('/', (req, res) => res.status(201).json({ ok: true }));\n\nexport default router;\n`;
      await mkdir(join(dir, 'src', 'api'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  },
  hook: {
    desc: 'React hook',
    match: (thing) => /^hooks?$/i.test(thing),
    target: (dir, name) => join(dir, 'src', 'hooks', `use${name}.js`),
    write: async (dir, name) => {
      const file = join(dir, 'src', 'hooks', `use${name}.js`);
      const content = `import { useState } from 'react';\n\nexport function use${name}(initial = null) {\n  const [value, setValue] = useState(initial);\n  return [value, setValue];\n}\n`;
      await mkdir(join(dir, 'src', 'hooks'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  },
  test: {
    desc: 'Vitest test file',
    match: (thing) => /^tests?$/i.test(thing),
    target: (dir, name) => join(dir, 'tests', `${name}.test.js`),
    write: async (dir, name) => {
      const file = join(dir, 'tests', `${name}.test.js`);
      const content = `import { describe, it, expect } from 'vitest';\n\ndescribe('${name}', () => {\n  it('works', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
      await mkdir(join(dir, 'tests'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  }
};

export async function genCommand(thing, name, { cwd = process.cwd(), dryRun = false, force = false } = {}) {
  const gen = Object.values(GENERATORS).find((g) => g.match(thing));
  if (!gen) {
    fail(`no generator for "${thing}". Available: ${Object.keys(GENERATORS).join(', ')}`);
    process.exit(1);
  }
  if (!name) {
    fail(`usage: mcode gen ${thing} <name> [--dry-run] [--force]`);
    process.exit(1);
  }
  const target = gen.target(cwd, kebabToPascal(name));
  if (dryRun) {
    ok(`would generate ${target} (${gen.desc}) — no files written`);
    return target;
  }
  if (!force) {
    const { existsSync } = await import('node:fs');
    if (existsSync(target)) {
      fail(`${target} already exists — re-run with --force to overwrite`);
      process.exit(1);
    }
  }
  const file = await gen.write(cwd, kebabToPascal(name));
  ok(`generated ${file}`);
}

function kebabToPascal(name) {
  return name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/-/g, '');
}
