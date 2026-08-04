import { join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { ok, fail } from '../core/logger.js';

const GENERATORS = {
  route: {
    desc: 'Express route',
    match: (thing) => /^routes?\b|^api$/i.test(thing),
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
    write: async (dir, name) => {
      const file = join(dir, 'src', 'controllers', `${name}.js`);
      const content = `export async function index(req, res) {\n  res.json({ ok: true, controller: '${name}' });\n}\n`;
      await mkdir(join(dir, 'src', 'controllers'), { recursive: true });
      await writeFile(file, content, 'utf8');
      return file;
    }
  }
};

export async function genCommand(thing, name, { cwd = process.cwd() } = {}) {
  const gen = Object.values(GENERATORS).find((g) => g.match(thing));
  if (!gen) {
    fail(`no generator for "${thing}". Available: ${Object.keys(GENERATORS).join(', ')}`);
    process.exit(1);
  }
  if (!name) {
    fail(`usage: mcode gen ${thing} <name>`);
    process.exit(1);
  }
  const file = await gen.write(cwd, kebabToPascal(name));
  ok(`generated ${file}`);
}

function kebabToPascal(name) {
  return name.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/-/g, '');
}
