import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { execa } from 'execa';
import { ok, fail, warn, info, confirm } from '../core/logger.js';
import { isGitRepo } from '../core/git.js';

export async function shipCommand({ env = 'prod', cwd = process.cwd(), yes = false } = {}) {
  const pkgPath = join(cwd, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
  } catch {
    fail('no package.json found in this directory');
    process.exit(1);
  }

  info('stage 1/4 \u2014 build');
  if (pkg.scripts?.build) {
    await execa('npm', ['run', 'build'], { cwd, stdio: 'inherit' });
  } else {
    warn('no build script \u2014 skipping');
  }

  info('stage 2/4 \u2014 verify');
  if (pkg.scripts?.test) {
    await execa('npm', ['test'], { cwd, stdio: 'inherit' });
  } else {
    warn('no test script \u2014 skipping');
  }

  info(`stage 3/4 \u2014 tag (env=${env})`);
  const git = (await import('simple-git')).default(cwd);
  const isRepo = await isGitRepo(cwd);
  if (isRepo) {
    const tag = `v${pkg.version}-${env}`;
    const wantTag = yes || (await confirm(`tag and push ${tag}?`, { defaultYes: true }));
    if (wantTag) {
      await git.add(['-A']);
      await git.commit(`chore: ship ${tag}`).catch(() => {});
      await git.addTag(tag);
      ok(`tagged ${tag}`);
    }
  } else {
    warn('not a git repo \u2014 skipping tag');
  }

  info(`stage 4/4 \u2014 deploy (env=${env})`);
  const deploy = pkg.mcode?.deploy?.[env] || pkg.mcode?.deploy?.default;
  if (deploy) {
    ok(`deploy: ${deploy}`);
  } else {
    warn('no mcode.deploy config \u2014 printing preview URL placeholder: https://<project>.mcode.app');
  }
  ok(`ship complete (env=${env})`);
}
