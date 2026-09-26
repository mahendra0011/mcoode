// mcode — comprehensive feature test suite (ESM).
// Runs EVERYTHING: vitest (cli/backend/shared), verify.mjs checks,
// CLI bundle smoke (connect/gen/plugin/help), and web typecheck.
// Run: node test-everything.mjs
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const results = [];
const check = (label, ok, detail = '') => {
  results.push({ label, ok: Boolean(ok) });
  console.log(`  ${ok ? '  PASS  ' : '  FAIL  '}${label}${ok ? '' : ` -- ${detail}`}`);
};

const run = (cmd, args, opts = {}) => {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', timeout: 280000, ...opts });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, out: String(err?.stdout || err?.message || err).slice(-800) };
  }
};

console.log('\nvitest (cli/backend/shared)'.padEnd(70, '-'));
const vt = run(process.execPath, ['./node_modules/vitest/vitest.mjs', 'run'], { cwd: process.cwd() });
check('vitest suite green', vt.ok, vt.out);

console.log('\nverify.mjs checks'.padEnd(70, '-'));
const vf = run(process.execPath, ['verify.mjs']);
check('verify.mjs ALL CHECKS PASSED', vf.ok && vf.out.includes('ALL CHECKS PASSED'), vf.out);

console.log('\nCLI bundle smoke'.padEnd(70, '-'));
check('dist bundle exists', existsSync('packages/cli/dist/mcode.mjs'));
for (const args of [['connect', '--help'], ['gen', '--help'], ['plugin', '--help'], ['login', '--help'], ['doctor', '--help']].map((a) => ['packages/cli/bin/mcode.js', ...a])) {
  const r = run(process.execPath, args);
  check(`mcode ${args.slice(1).join(' ')} exits 0`, r.ok, r.out);
}

console.log('\nweb typecheck'.padEnd(70, '-'));
const ts = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['--workspace=web', 'run', 'typecheck'], { shell: process.platform === 'win32' });
check('web tsc --noEmit clean', ts.ok, ts.out);

const passed = results.filter((r) => r.ok).length;
console.log(`\n${'='.repeat(55)}\n  ${passed} passed . ${results.length - passed} failed . ${results.length} total`);
console.log(`  ${passed === results.length ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}\n${'='.repeat(55)}`);
if (passed !== results.length) process.exit(1);
