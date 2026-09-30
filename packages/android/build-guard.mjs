#!/usr/bin/env node
/**
 * Builds the WebView guard script from web-guard.js + routes.js.
 *
 * The guard is a plain .js file with two placeholders so it can be read as a
 * normal module (and so a stray run cannot execute browser code). This script
 * substitutes the route lists and writes a self-contained file that
 * MainActivity injects into the WebView.
 *
 *   node build-guard.js
 *
 * Output: android-guard.js — regenerated whenever routes.js changes, so the
 * allow-list has exactly one source of truth.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, 'web-guard.js');
const OUT = path.join(HERE, 'android-guard.js');

const { ALLOWED_ROUTES, BLOCKED_ROUTES } = await import('./routes.mjs');

const template = fs.readFileSync(TEMPLATE, 'utf8');

if (!template.includes('__ALLOWED__') || !template.includes('__BLOCKED__')) {
  console.error('web-guard.js is missing the __ALLOWED__ / __BLOCKED__ placeholders');
  process.exit(1);
}

const built = template
  .replace('__ALLOWED__', JSON.stringify(ALLOWED_ROUTES))
  .replace('__BLOCKED__', JSON.stringify(BLOCKED_ROUTES));

// Fail loudly rather than shipping a guard that silently allows everything.
if (built.includes('__ALLOWED__') || built.includes('__BLOCKED__')) {
  console.error('placeholder substitution failed');
  process.exit(1);
}

fs.writeFileSync(OUT, built, 'utf8');

// MainActivity injects the guard from the Android assets folder, so the built
// file has to land there as well as at the package root.
const ASSETS = path.join(HERE, 'android', 'app', 'src', 'main', 'assets');
const ASSET_COPY = path.join(ASSETS, 'android-guard.js');
let copiedToAssets = false;

if (fs.existsSync(ASSETS)) {
  fs.writeFileSync(ASSET_COPY, built, 'utf8');
  copiedToAssets = true;
}

console.log(`Built android-guard.js`);
console.log(`  allowed (${ALLOWED_ROUTES.length}): ${ALLOWED_ROUTES.join(' ')}`);
console.log(`  blocked (${BLOCKED_ROUTES.length}): ${BLOCKED_ROUTES.join(' ')}`);
if (!copiedToAssets) {
  console.log('  (android/ not generated yet — run `npx cap add android`)');
}
