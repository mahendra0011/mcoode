import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLI_VERSION } from '../src/core/version.js';

// MF-006: one source of truth for the version — the CLI can never drift from
// the published package version again (three hardcoded '2.4.6' literals before).
describe('MF-006 CLI version', () => {
  it('equals packages/cli/package.json version', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(CLI_VERSION).toBe(pkg.version);
    expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('no CLI source file hardcodes the current version literal', async () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    const literal = new RegExp(`(?<![0-9A-Za-z_.])${pkg.version.replace(/\./g, '\\.')}(?![0-9A-Za-z_.])`);
    const { readdir } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
    const versionFile = join(srcDir, 'core', 'version.js');

    /** @param {string} dir @returns {Promise<string[]>} */
    async function walk(dir) {
      const out = [];
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) out.push(...(await walk(full)));
        else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
      }
      return out;
    }

    const offenders = [];
    for (const file of await walk(srcDir)) {
      if (file === versionFile) continue; // the single source of truth
      if (literal.test(readFileSync(file, 'utf8'))) offenders.push(file.replace(srcDir, 'src'));
    }
    expect(offenders).toEqual([]);
  });
});
