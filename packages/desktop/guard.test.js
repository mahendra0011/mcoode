'use strict';

/**
 * Validates the script that guards.js injects into the page.
 *
 * The guard runs in the browser, so a syntax error there would fail silently at
 * runtime — it has to be checked here instead. This also exercises the blocking
 * logic against a fake `history` to prove pushState really refuses the routes.
 */

const vm = require('node:vm');

const { BLOCKED_ROUTES, ALLOWED_ROUTES } = require('./config');
const { isAllowed, buildGuardScript } = require('./guards');

// buildGuardScript() returns the string exactly as Electron would run it, so a
// template-literal escaping mistake is caught here rather than in the renderer.
const script = buildGuardScript(BLOCKED_ROUTES);

// A stand-in for the browser globals the guard touches.
const pushed = [];
const sandbox = {
  location: { origin: 'http://localhost:3000' },
  URL,
  history: {
    pushState(_s, _t, url) { pushed.push(url); },
    replaceState(_s, _t, url) { pushed.push(url); },
  },
};

vm.createContext(sandbox);
new vm.Script(script).runInContext(sandbox);

// Drive every configured route through the guard instead of hard-coding a few.
// The assertions below then stay correct when the route lists change, which is
// what kept this test honest when /cli moved from blocked to allowed.
for (const route of BLOCKED_ROUTES) sandbox.history.pushState({}, '', route);
for (const route of ALLOWED_ROUTES) sandbox.history.pushState({}, '', route);
sandbox.history.pushState({}, '', '/sessions/abc');
sandbox.history.replaceState({}, '', '/');

const leaked = [...BLOCKED_ROUTES].filter((r) => pushed.includes(r));
const missing = [...ALLOWED_ROUTES].filter((r) => !pushed.includes(r));

const results = [
  { name: 'injected script parses', pass: true },
  { name: 'no blocked route leaked', pass: leaked.length === 0 },
  { name: 'no allowed route missing', pass: missing.length === 0 },
  { name: 'allowed /ai/chat', pass: pushed.includes('/ai/chat') },
  { name: 'allowed /mcode', pass: pushed.includes('/mcode') },
  { name: 'allowed /sessions/abc', pass: pushed.includes('/sessions/abc') },
  { name: 'isAllowed(/ai/chat)', pass: isAllowed('http://localhost:3000/ai/chat') },
  // /cli is a marketing page, so the shell blocks it even though the global
  // command palette links to it.
  { name: 'CLI marketing page blocked', pass: !isAllowed('http://localhost:3000/cli') },
  { name: 'marketing / blocked', pass: !isAllowed('http://localhost:3000/') },
  { name: 'marketing /ai blocked', pass: !isAllowed('http://localhost:3000/ai') },
  { name: 'route lists populated', pass: BLOCKED_ROUTES.size === 3 && ALLOWED_ROUTES.size > 10 },
];

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);