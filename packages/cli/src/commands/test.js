import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { execa } from 'execa';
import { ok, fail, info } from '../core/logger.js';
import { isGitRepo, changedFiles } from '../core/git.js';

export async function testCommand({ changed = false, cwd = process.cwd() } = {}) {
  const pkgPath = join(cwd, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  } catch {
    fail('no package.json found in this directory');
    process.exit(1);
  }
  const script = pkg.scripts?.test;
  if (!script) {
    fail('no "test" script defined');
    process.exit(1);
  }
  if (changed) {
    if (!(await isGitRepo(cwd))) {
      fail('--changed requires a git repository');
      process.exit(1);
    }
    const files = await changedFiles(cwd);
    if (files.length === 0) {
      ok('no changed files to test');
      return;
    }
    info(`testing ${files.length} changed file(s)`);
  }
  ok(`running \u2192 ${script}`);
  try {
    await execa('npm', ['test'], { cwd, stdio: 'inherit' });
  } catch (err) {
    process.exit(err.exitCode ?? 1);
  }
}
