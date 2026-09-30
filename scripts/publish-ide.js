#!/usr/bin/env node
/**
 * Copies the built Windows installer into the website's static downloads folder.
 *
 *   cd packages/desktop && npm run dist      # build the .exe
 *   npm run publish:ide                       # then copy it for the website
 *
 * The website serves it from /downloads/mcode-setup.exe, so the URL stays the
 * same no matter which version was just built.
 *
 * The installer is ~107 MB, so it is deliberately NOT committed — this script
 * has to run before the web app is built or mounted for a download to exist.
 *
 * ESM, because the repo root package.json sets "type": "module".
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'packages', 'desktop', 'dist');
const OUT_DIR = path.join(ROOT, 'packages', 'web', 'public', 'downloads');
const OUT_FILE = path.join(OUT_DIR, 'mcode-setup.exe');

/** Prefer the NSIS installer; fall back to the single-file portable build. */
function findInstaller() {
  if (!fs.existsSync(DIST_DIR)) return null;

  const entries = fs.readdirSync(DIST_DIR).filter((f) => f.toLowerCase().endsWith('.exe'));

  const nsis = entries.find((f) => f.toLowerCase().includes('setup'));
  const portable = entries.find((f) => !f.toLowerCase().includes('setup') && f !== 'mcode.exe');
  const chosen = nsis || portable;

  return chosen ? path.join(DIST_DIR, chosen) : null;
}

const installer = findInstaller();

if (!installer) {
  console.error(
    'No installer found in packages/desktop/dist.\n' +
      'Build one first:\n\n  cd packages/desktop && npm run dist\n'
  );
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.copyFileSync(installer, OUT_FILE);

const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
console.log(`Published ${path.basename(installer)} -> ${path.relative(ROOT, OUT_FILE)} (${mb} MB)`);
console.log('The website will now serve it at /downloads/mcode-setup.exe');