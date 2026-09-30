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

// The guard replaces history.pushState, so call the new one.
sandbox.history.pushState({}, '', '/cli');
sandbox.history.pushState({}, '', '/ai');
sandbox.history.pushState({}, '', '/');
sandbox.history.pushState({}, '', '/ai/chat');
sandbox.history.pushState({}, '', '/mcode');
sandbox.history.pushState({}, '', '/sessions/abc');
sandbox.history.replaceState({}, '', '/cli/');

const results = [
  { name: 'injected script parses', pass: true },
  { name: 'blocked /cli', pass: !pushed.includes('/cli') },
  { name: 'blocked /ai', pass: !pushed.includes('/ai') },
  { name: 'blocked /', pass: !pushed.includes('/') },
  { name: 'blocked /cli/ (trailing slash)', pass: !pushed.includes('/cli/') },
  { name: 'allowed /ai/chat', pass: pushed.includes('/ai/chat') },
  { name: 'allowed /mcode', pass: pushed.includes('/mcode') },
  { name: 'allowed /sessions/abc', pass: pushed.includes('/sessions/abc') },
  { name: 'isAllowed(/ai/chat)', pass: isAllowed('http://localhost:3000/ai/chat') },
  { name: 'isAllowed(/cli)', pass: !isAllowed('http://localhost:3000/cli') },
  { name: 'routes configured', pass: BLOCKED_ROUTES.size === 3 && ALLOWED_ROUTES.size > 10 },
];

let failed = 0;
for (const r of results) {
  if (!r.pass) failed++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);