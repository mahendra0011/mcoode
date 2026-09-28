import { describe, it, expect, afterAll } from 'vitest';
import { mkdtemp, rm, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const { TEMPLATES, applyTemplate, previewTemplate, FALLBACK_GITIGNORE } =
  await import('../src/core/templates.js');

const TEMPLATE_DIR = fileURLToPath(new URL('../templates/', import.meta.url));
const SERVER_TEMPLATES = ['express', 'fastify', 'full-stack'];
const tmpDirs = [];

async function scratch(tag) {
  const dir = await mkdtemp(join(tmpdir(), `mcode-init-${tag}-`));
  tmpDirs.push(dir);
  return dir;
}

afterAll(async () => {
  for (const dir of tmpDirs) await rm(dir, { recursive: true, force: true }).catch(() => {});
});

// MF-008: `mcode init` must never scaffold a project that leaks secrets.
describe('MF-008 init template hygiene', () => {
  it('every template ships a .gitignore that ignores .env and node_modules', async () => {
    for (const name of Object.keys(TEMPLATES)) {
      const gitignore = await readFile(join(TEMPLATE_DIR, name, '.gitignore'), 'utf8')
        .catch(() => { throw new Error(`template "${name}" has no .gitignore`); });
      const lines = gitignore.split('\n').map((l) => l.trim());
      expect(lines, `${name} must ignore node_modules/`).toContain('node_modules/');
      expect(lines, `${name} must ignore .env`).toContain('.env');
      expect(lines, `${name} must keep .env.example tracked`).toContain('!.env.example');
    }
  });

  it('every template ships a .env.example with no real values', async () => {
    for (const name of Object.keys(TEMPLATES)) {
      const raw = await readFile(join(TEMPLATE_DIR, name, '.env.example'), 'utf8')
        .catch(() => { throw new Error(`template "${name}" has no .env.example`); });
      expect(raw.length).toBeGreaterThan(0);
      // Any uncommented assignment must be a non-secret placeholder.
      for (const line of raw.split('\n')) {
        if (line.startsWith('#') || !line.includes('=')) continue;
        const [, value] = line.split(/=(.*)/s);
        expect(value, `${name}: ${line}`).not.toMatch(/^[A-Za-z0-9_\-]{20,}$/);
      }
    }
  });

  it('server templates enable helmet + cors + rate limiting by default', async () => {
    for (const name of SERVER_TEMPLATES) {
      const files = (await previewTemplate(name)).files.filter((f) => /server\.js$/.test(f));
      expect(files.length, `${name} has no server.js`).toBeGreaterThan(0);
      const src = await readFile(join(TEMPLATE_DIR, name, files[0]), 'utf8');
      expect(src, `${name}: helmet`).toMatch(/helmet/);
      expect(src, `${name}: cors`).toMatch(/cors/);
      expect(src, `${name}: rate limit`).toMatch(/rate-?limit/i);
      // CORS must not default to "reflect any origin".
      expect(src).not.toMatch(/origin:\s*true\b/);
    }
  });

  it('the security middleware deps are installed with the template', () => {
    expect(TEMPLATES.express.deps).toEqual(expect.arrayContaining(['helmet', 'cors', 'express-rate-limit']));
    expect(TEMPLATES['full-stack'].deps).toEqual(expect.arrayContaining(['helmet', 'cors', 'express-rate-limit']));
    expect(TEMPLATES.fastify.deps).toEqual(
      expect.arrayContaining(['@fastify/helmet', '@fastify/cors', '@fastify/rate-limit'])
    );
  });

  it('applyTemplate writes .gitignore + .env.example into a fresh project', async () => {
    for (const name of Object.keys(TEMPLATES)) {
      const dir = await scratch(name);
      const { files } = await applyTemplate(name, dir);
      expect(files, `${name}: .gitignore not reported`).toContain('.gitignore');
      expect(files, `${name}: .env.example not reported`).toContain('.env.example');
      expect((await readdir(dir))).toEqual(expect.arrayContaining(['.gitignore', '.env.example']));
    }
  });

  it('a pre-existing .gitignore is never clobbered by the safety net', async () => {
    const dir = await scratch('preexisting');
    const mine = '# my own rules\nsecrets/\n';
    await writeFile(join(dir, '.gitignore'), mine, 'utf8');
    await applyTemplate('react-vite', dir, { overwrite: false });
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toBe(mine);
  });

  it('applyTemplate copies the template .gitignore verbatim (safety net unused)', async () => {
    const dir = await scratch('copy');
    const { files } = await applyTemplate('express', dir);
    expect(files).toContain('.gitignore');
    const shipped = await readFile(join(TEMPLATE_DIR, 'express', '.gitignore'), 'utf8');
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toBe(shipped);
  });

  it('FALLBACK_GITIGNORE itself is secret-safe', async () => {
    expect(FALLBACK_GITIGNORE.split('\n').map((l) => l.trim())).toEqual(
      expect.arrayContaining(['node_modules/', '.env', '!.env.example'])
    );
    // And it is only a fallback: templates ship their richer file.
    for (const name of Object.keys(TEMPLATES)) {
      const shipped = await readFile(join(TEMPLATE_DIR, name, '.gitignore'), 'utf8');
      expect(shipped).not.toBe(FALLBACK_GITIGNORE);
    }
  });

  it('previewTemplate lists the new hygiene files without touching disk', async () => {
    const dir = await scratch('preview');
    const before = await readdir(dir);
    const files = (await previewTemplate('express')).files;
    expect(files).toEqual(expect.arrayContaining(['.gitignore', '.env.example']));
    expect(await readdir(dir)).toEqual(before);
    expect(await stat(join(dir, '.gitignore')).catch(() => null)).toBeNull();
  });
});
