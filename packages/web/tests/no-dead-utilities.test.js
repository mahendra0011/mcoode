/**
 * Dead Tailwind utility guard (audit WEB-006 / WEB-017).
 *
 * Two classes of silent no-op this catches:
 *
 *  1. **Non-existent scale values.** `duration-250` was the *only* non-default
 *    `duration-*` / `delay-*` token in the whole `src` tree, and it generated
 *    nothing: the project is on Tailwind v3 and the default scale is
 *    75/100/150/200/300/500/700/1000. The God-mode toggle's colour transition
 *    therefore did not animate at all while *looking* like it did.
 *  2. **v4-only utilities.** `animate-in`, `fade-in-*`, `zoom-in-*` and
 *    `slide-in-from-*` come from `tailwindcss-animate` / `tw-animate-css` in
 *    stock Tailwind v3. The reference docs are a **v4.2.2** build, so code copied
 *    from them compiles and does nothing — 10 call sites were silently unanimated.
 *    They are now defined by the local `zcodeEnterExit` plugin in
 *    `tailwind.config.js`; this test is what keeps that plugin honest by loading
 *    it and diffing the utilities it actually produces against the ones in use.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const webSrc = join(webRoot, 'src');
const tailwindConfig = join(webRoot, 'tailwind.config.js');

/** Tailwind v3's default `transitionDuration` / `transitionDelay` scale. */
const DEFAULT_DURATIONS = new Set([
  '0', '75', '100', '150', '200', '300', '500', '700', '1000',
]);

/** Enter/exit utility families that need a plugin to exist. */
const PLUGIN_FAMILIES = [
  'animate-in', 'animate-out',
  'fade-in', 'fade-out',
  'zoom-in', 'zoom-out',
  'slide-in-from', 'slide-out-to',
  'spin-slow',
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * All Tailwind-looking tokens that appear inside a `className` / `class` attribute
 * **value**, not merely on a line that happens to contain one.
 *
 * Both restrictions matter, because these files are full of documentation that
 * quotes the reference CSS by name. `McodeStartupTab` renders
 * `<td className="..."><code>#loading</code> fade-out</td>` — a *table cell of
 * prose* describing the ZCode app's startup timing. Matching on the whole line
 * would flag that documentation as a dead class, and a guard that cries wolf
 * gets deleted. So the value is extracted first, and only the value is scanned.
 */
function classTokens() {
  const tokens = new Map(); // token -> `file:line`
  // className="..." / className={'...'} / class="..."
  const ATTR = /(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{'([^']*)'\})/g;

  for (const file of walk(webSrc)) {
    const src = readFileSync(file, 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      const at = `${relative(webRoot, file).replace(/\\/g, '/')}:${i + 1}`;
      ATTR.lastIndex = 0;

      for (const attr of line.matchAll(ATTR)) {
        const value = attr[1] ?? attr[2] ?? attr[3] ?? attr[4];
        if (!value) continue;

        for (const m of value.matchAll(/(?:duration|delay)-(\d+)\b/g)) {
          if (!DEFAULT_DURATIONS.has(m[1])) tokens.set(m[0], at);
        }
        for (const family of PLUGIN_FAMILIES) {
          // The `(?![-\w])` exclusion is intentionally absent: `zoom-in-95` and
          // `slide-in-from-left-2` are these utilities with a scale suffix.
          const re = new RegExp(`(?<![\\w-])(${family}(?:-[a-z0-9]+)*)(?![\\w])`, 'g');
          for (const m of value.matchAll(re)) tokens.set(m[1], at);
        }
      }
    });
  }
  return tokens;
}

/** The utility classes the local Tailwind plugin actually emits. */
async function pluginUtilities() {
  const mod = await import(tailwindConfig);
  const config = mod.default ?? mod;
  const produced = new Set();
  for (const plugin of config.plugins ?? []) {
    if (typeof plugin !== 'function') continue;
    plugin({ addUtilities: (utils) => { for (const k of Object.keys(utils)) produced.add(k.slice(1)); } });
  }
  return produced;
}

describe('no dead Tailwind utilities (WEB-006 / WEB-017)', () => {
  const tokens = classTokens();

  it('uses only real duration/delay scale values', () => {
    const bad = [...tokens].filter(([t]) => t.startsWith('duration-') || t.startsWith('delay-'));
    expect(
      bad,
      `non-existent duration/delay classes (Tailwind v3 scale is 0/75/100/150/200/300/500/700/1000):\n` +
        bad.map(([t, at]) => `  ${t}  ${at}`).join('\n'),
    ).toEqual([]);
  });

  it('every enter/exit utility in use is produced by the tailwind plugin', async () => {
    const produced = await pluginUtilities();
    const families = new Set(PLUGIN_FAMILIES);
    const bad = [...tokens]
      .filter(([t]) => families.has(t.split(/-\d/)[0]))
      .filter(([t]) => !produced.has(t));
    expect(
      bad,
      'these utilities are used but the tailwind.config.js plugin does not emit them, ' +
        'so they generate nothing (this is the WEB-006 failure mode):\n' +
        bad.map(([t, at]) => `  ${t}  ${at}`).join('\n'),
    ).toEqual([]);
  });
});
