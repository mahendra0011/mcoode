import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { execa } from 'execa';
import { ok, fail } from '../core/logger.js';

export async function runCommand(script, { cwd = process.cwd() } = {}) {
  const pkgPath = join(cwd, 'package.json');
  let pkg;
  try {
    const raw = await readFile(pkgPath, 'utf8');
    try {
      pkg = JSON.parse(raw);
    } catch (parseErr) {
      fail(`failed to parse package.json: ${parseErr.message}`);
      process.exit(1);
    }
  } catch (readErr) {
    fail('no package.json found in this directory');
    process.exit(1);
  }
  const cmd = pkg.scripts?.[script];
  if (!cmd) {
    const available = Object.keys(pkg.scripts || {}).join(', ') || 'none';
    fail(`script "${script}" not found (available: ${available})`);
    process.exit(1);
  }

  // Detect package manager from lockfiles
  let pm = 'npm';
  const { existsSync } = await import('node:fs');
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) pm = 'pnpm';
  else if (existsSync(join(cwd, 'yarn.lock'))) pm = 'yarn';
  else if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) pm = 'bun';

  ok(`${pm} run ${script} \u2192 ${cmd}`);
  try {
    await execa(pm, ['run', script], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
  } catch (err) {
    process.exit(err.exitCode ?? 1);
  }
}
