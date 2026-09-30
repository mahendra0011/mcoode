#!/usr/bin/env node
/**
 * Proves the injected guard actually blocks the routes it claims to.
 *
 * The guard runs inside a WebView, so a typo would not fail loudly — it would
 * just quietly let a phone user reach the CLI marketing page. Running the built
 * script against a fake `history` catches that here instead.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { ALLOWED_ROUTES, BLOCKED_ROUTES } from './routes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const script = fs.readFileSync(path.join(HERE, 'android-guard.js'), 'utf8');

const navigated = [];

// The guard runs in a browser, so it reaches for `window.location`. The sandbox
// has to model that shape or every lookup throws and every route looks blocked.
const history = {
  pushState(_s, _t, url) { navigated.push(url); },
  replaceState(_s, _t, url) { navigated.push(url); },
};
const location = {
  origin: 'https://mcode.example.com',
  href: 'https://mcode.example.com/login',
};
const window = { location, history };

const sandbox = { URL, window, location, history };

vm.createContext(sandbox);
new vm.Script(script).runInContext(sandbox);

/** Every blocked route must be refused, every allowed route must go through. */
for (const route of BLOCKED_ROUTES) sandbox.history.pushState({}, '', route);
for (const route of ALLOWED_ROUTES) sandbox.history.pushState({}, '', route);
sandbox.history.pushState({}, '', '/sessions/abc-123');

const blockedLeaked = BLOCKED_ROUTES.filter((r) => navigated.includes(r));
const allowedMissing = ALLOWED_ROUTES.filter((r) => !navigated.includes(r));

const checks = [
  { name: 'no placeholders left unsubstituted', pass: !script.includes('__ALLOWED__') && !script.includes('__BLOCKED__') },
  { name: 'CLI marketing page blocked', pass: !navigated.includes('/cli') },
  { name: 'CLI reference pages blocked', pass: BLOCKED_ROUTES.every((r) => !navigated.includes(r)) },
  { name: 'core screens reachable', pass: ['/ai/chat', '/mcode'].every((r) => navigated.includes(r)) },
  { name: 'auth reachable', pass: ['/login', '/signup', '/forgot-password'].every((r) => navigated.includes(r)) },
  { name: 'dynamic session route reachable', pass: navigated.includes('/sessions/abc-123') },
  { name: 'no blocked route leaked', pass: blockedLeaked.length === 0 },
  { name: 'no allowed route missing', pass: allowedMissing.length === 0 },
];

let failed = 0;
for (const c of checks) {
  if (!c.pass) failed++;
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`);
  if (!c.pass && c.name === 'no blocked route leaked') console.log(`      leaked: ${blockedLeaked.join(' ')}`);
  if (!c.pass && c.name === 'no allowed route missing') console.log(`      missing: ${allowedMissing.join(' ')}`);
}

console.log(`\n${checks.length - failed}/${checks.length} passed`);
console.log(`allowed: ${ALLOWED_ROUTES.length}  blocked: ${BLOCKED_ROUTES.length}`);
process.exit(failed ? 1 : 0);
