/**
 * Silent-catch guard (audit WEB-015).
 *
 * The web app answered "nothing happened" for things that *did* happen: uploads
 * that half-failed, Monaco models that leaked, terminals that were dead but
 * looked empty, settings shown as saved when the write failed. Silent catches
 * also defeat the e2e suite — "nothing" is a valid-looking state for a
 * Playwright assertion to pass against.
 *
 * The first pass replaced 28 of them with `reportError(...)`
 * (`src/lib/logger.ts`) in the highest-risk files: AIChatPage, EditorPane,
 * ToolsPage, MultiTerminalPanel, AndroidEmulatorsPanel.
 *
 * This test is a **ratchet**: it fails when a *new* empty catch appears, and it
 * also fails when a baselined one disappears — so the list can only shrink and
 * every remaining site is explicitly accounted for.
 *
 * Run: npx vitest run packages/web/tests/no-silent-catches.test.js
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const webSrc = join(webRoot, 'src');

/**
 * Remaining known-empty catches, as `path:line`. Delete an entry when you fix
 * the site — the second test below fails until you do.
 */
// M11-002: 'src/app/api/docker/containers/route.ts' was removed from KNOWN —
// the empty catch around the backend fetch is now handled via reportError().
const KNOWN = new Set([
  'src/app/preview/page.tsx:146',
  'src/app/preview/page.tsx:158',
  'src/components/ide/BottomPanel.tsx:492',
  'src/components/ide/IDEActivitySidebar.tsx:169',
  'src/components/ide/ModelSettingsModal.tsx:180',
  'src/components/ide/RemoteExplorerPanel.tsx:90',
  'src/components/ide/StepCards.tsx:135',
  'src/components/layout/Header.tsx:23',
  'src/components/pages/CommandsPage.tsx:35',
  'src/components/pages/PluginsPage.tsx:29',
  'src/components/pages/SessionDetailPage.tsx:43',
  'src/components/pages/SessionDetailPage.tsx:45',
  'src/components/pages/ToolsPage.tsx:74',
  'src/components/pages/ToolsPage.tsx:100',
  'src/lib/extensions/editorApi.ts:200',
  'src/lib/extensions/editorApi.ts:219',
  'src/lib/slashCommands.js:189',
  'src/lib/slashCommands.js:376',
  'src/lib/slashCommands.js:519',
  'src/lib/slashCommands.js:524',
  'src/lib/slashCommands.js:658',
  'src/store/ideStore.ts:674',
  'src/store/ideStore.ts:677',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** Every empty `catch {}` / `catch (e) {}`, with comments stripped first. */
function emptyCatches() {
  const found = new Set();
  for (const file of walk(webSrc)) {
    const clean = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    clean.split(/\r?\n/).forEach((line, i) => {
      if (/catch\s*(\([^)]*\))?\s*\{\s*\}/.test(line)) {
        found.add(`${relative(webRoot, file).replace(/\\/g, '/')}:${i + 1}`);
      }
    });
  }
  return found;
}

describe('no silent catches (WEB-015)', () => {
  it('has no new empty catch blocks', () => {
    const fresh = [...emptyCatches()].filter((site) => !KNOWN.has(site));
    expect(
      fresh,
      `new empty catch blocks — handle them with reportError() from src/lib/logger:\n${fresh.join('\n')}`
    ).toEqual([]);
  });

  it('has not left stale entries in the baseline', () => {
    const present = emptyCatches();
    const stale = [...KNOWN].filter((site) => !present.has(site));
    expect(stale, `these are gone (or moved a line) — remove them from KNOWN:\n${stale.join('\n')}`).toEqual([]);
  });
});
