/**
 * The Electron bridge must stay deleted (audit WEB-027).
 *
 * `lib/electron-nav.ts` and `types/electron.d.ts` were removed because there is
 * no `packages/desktop` package in this repository — nothing can inject
 * `window.mcodeElectron`, so every branch that read it was unreachable code that
 * made the app look desktop-aware.
 *
 * This is its own test rather than part of another guard because **`tsc` cannot
 * catch a regression here**: `tsconfig.json` sets `allowJs: true` but not
 * `checkJs`, so a plain `.js` file referencing a global with no type declaration
 * type-checks cleanly. A live `window.mcodeElectron?.backendUrl` reference in
 * `lib/axios.js` survived the deletion and a full green typecheck for exactly
 * that reason. Only a text guard closes the hole.
 *
 * Comments are stripped before scanning — the fixes are documented by naming
 * what they removed, and a guard that flags its own explanation is useless.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const webSrc = join(webRoot, 'src');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Source with block and line comments removed. */
function code(file) {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('the deleted Electron bridge stays deleted (WEB-027)', () => {
  it('has no executable mcodeElectron reference in src', () => {
    const offenders = [];
    for (const file of walk(webSrc)) {
      const src = code(file);
      if (!src.includes('mcodeElectron')) continue;
      const line = src.split('\n').findIndex((l) => l.includes('mcodeElectron')) + 1;
      offenders.push(`${relative(webRoot, file).replace(/\\/g, '/')}:${line}`);
    }
    expect(
      offenders,
      'the Electron bridge was deleted (there is no packages/desktop in this repo) — ' +
        'but these still reference window.mcodeElectron in executable code:\n' + offenders.join('\n'),
    ).toEqual([]);
  });

  it('has no import of the deleted electron-nav module', () => {
    const imports = [];
    for (const file of walk(webSrc)) {
      if (/from\s+['"][^'"]*electron-nav['"]/.test(readFileSync(file, 'utf8'))) {
        imports.push(relative(webRoot, file).replace(/\\/g, '/'));
      }
    }
    expect(imports, `lib/electron-nav.ts was deleted; these still import it:\n${imports.join('\n')}`).toEqual([]);
  });

  it('the bridge files do not exist', () => {
    for (const gone of ['lib/electron-nav.ts', 'types/electron.d.ts']) {
      expect(existsSync(join(webSrc, gone)), `${gone} came back`).toBe(false);
    }
  });
});
