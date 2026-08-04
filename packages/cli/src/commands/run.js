import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { execa } from 'execa';
import { ok, fail } from '../core/logger.js';

export async function runCommand(script, { cwd = process.cwd() } = {}) {
  const pkgPath = join(cwd, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  } catch {
    fail('no package.json found in this directory');
    process.exit(1);
  }
  const cmd = pkg.scripts?.[script];
  if (!cmd) {
    const available = Object.keys(pkg.scripts || {}).join(', ') || 'none';
    fail(`script "${script}" not found (available: ${available})`);
    process.exit(1);
  }
  ok(`npm run ${script} \u2192 ${cmd}`);
  try {
    await execa('npm', ['run', script], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
  } catch (err) {
    process.exit(err.exitCode ?? 1);
  }
}
