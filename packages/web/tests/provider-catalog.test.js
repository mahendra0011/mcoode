/**
 * Provider-catalog drift guard (audit WEB-029).
 *
 * The web used to carry two independent hard-coded provider catalogs
 * (`SettingsPage.DEFAULT_SETTINGS_PROVIDERS` and
 * `ModelSelector.FALLBACK_PROVIDERS`), each substituted silently when the live
 * fetch failed. They are now one list in `src/lib/providerCatalog.ts`.
 *
 * The CLI is the thing that actually routes a request, so it is the only real
 * source of truth. This test parses the CLI's provider registry and asserts the
 * web's fallback list is a **subset** of it â€” otherwise the UI can offer a
 * provider the mcode CLI has never heard of, and picking it silently fails.
 *
 * It also asserts there is exactly one fallback list in `src`, so a future
 * second copy cannot quietly reappear.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const webSrc = join(webRoot, 'src');
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const cliProvidersDir = join(repoRoot, 'packages', 'cli', 'src', 'providers');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Provider ids the CLI can actually construct an adapter for.
 *
 * Read across the whole `providers/` directory, not just `index.js`: the first
 * first-party adapters (`anthropic.js`, `google.js`, `mock.js`) declare their ids
 * in their own modules and are only *registered* from `index.js`, so a
 * single-file parse misses exactly the two providers the web most obviously needs.
 * They also spell the id as a constructor default (`{ id = 'anthropic' }`) rather
 * than an object property, hence the `id(?::|=)` pattern.
 */
function cliProviderIds() {
  const ids = new Set();
  for (const file of walk(cliProvidersDir)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bid\s*[=:]\s*'([a-z0-9_]+)'/g)) ids.add(m[1]);
  }
  return ids;
}

/** The fallback list as declared in lib/providerCatalog.ts. */
function webFallbackIds() {
  const src = readFileSync(join(webSrc, 'lib', 'providerCatalog.ts'), 'utf8');
  const block = src.slice(src.indexOf('FALLBACK_PROVIDERS'));
  const ids = [];
  // Each provider entry starts at the top level of the array with `id: '...'`.
  for (const m of block.matchAll(/^\s{4}id:\s*'([a-z0-9_-]+)',/gm)) ids.push(m[1]);
  return ids;
}

describe('provider catalog does not drift from the CLI (WEB-029)', () => {
  const cliIds = cliProviderIds();
  const webIds = webFallbackIds();

  it('parses both catalogs', () => {
    expect(cliIds.size, 'no provider ids parsed from the CLI registry').toBeGreaterThan(50);
    expect(webIds.length, 'no provider ids parsed from lib/providerCatalog.ts').toBeGreaterThan(0);
  });

  it('every fallback provider exists in the CLI catalog', () => {
    const unknown = webIds.filter((id) => !cliIds.has(id));
    expect(
      unknown,
      `these providers are offered by the web but the mcode CLI cannot route them:\n  ${unknown.join('\n  ')}`,
    ).toEqual([]);
  });

  it('the default provider is one the CLI knows', () => {
    const defaultId = /DEFAULT_PROVIDER_ID\s*=\s*'([a-z0-9_-]+)'/.exec(
      readFileSync(join(webSrc, 'lib', 'providerCatalog.ts'), 'utf8'),
    )?.[1];
    expect(defaultId, 'DEFAULT_PROVIDER_ID not found').toBeTruthy();
    expect(cliIds.has(defaultId), `${defaultId} is not a CLI provider`).toBe(true);
  });

  it('there is exactly ONE fallback provider list in src', () => {
    const offenders = [];
    for (const file of walk(webSrc)) {
      const src = readFileSync(file, 'utf8');
      // A locally-declared array of providers, outside the shared module.
      if (file.endsWith(join('lib', 'providerCatalog.ts'))) continue;
      for (const name of ['FALLBACK_PROVIDERS', 'DEFAULT_SETTINGS_PROVIDERS']) {
        if (new RegExp(`(const|let|var)\\s+${name}\\b`).test(src)) {
          offenders.push(`${relative(webRoot, file).replace(/\\/g, '/')}: ${name}`);
        }
      }
    }
    expect(
      offenders,
      'a second hard-coded provider list appeared â€” import FALLBACK_PROVIDERS from ' +
        'src/lib/providerCatalog.ts instead:\n' + offenders.join('\n'),
    ).toEqual([]);
  });
});
