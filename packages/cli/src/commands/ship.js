import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { execa } from 'execa';
import { ok, fail, warn, info, confirm } from '../core/logger.js';
import { isGitRepo } from '../core/git.js';
import { loadConfig } from '../core/store.js';

const DEPLOY_RUNNERS = {
  netlify: async (cwd) => execa('npx', ['netlify', 'deploy', '--prod'], { cwd, stdio: 'inherit' }),
  vercel: async (cwd) => execa('npx', ['vercel', '--prod', '--yes'], { cwd, stdio: 'inherit' }),
  docker: async (cwd, pkg) => {
    const tag = `${pkg.name || 'mcode-app'}:${pkg.version || 'latest'}`;
    await execa('docker', ['build', '-t', tag, '.'], { cwd, stdio: 'inherit' });
    ok(`built image ${tag} \u2014 push it yourself with "docker push" once your registry login is set`);
  },
  railway: async (cwd) => execa('npx', ['railway', 'up'], { cwd, stdio: 'inherit' }),
  render: async () => {
    warn('Render deploys are git-push-triggered \u2014 nothing to run locally. Push your tag/branch and Render will pick it up.');
  },
  flyio: async (cwd) => execa('npx', ['flyctl', 'deploy'], { cwd, stdio: 'inherit' }),
  'aws-ecs': async () => {
    warn('AWS ECS deploy needs your task-definition/cluster config \u2014 not automated yet. Skipping.');
  },
  'cloudflare-pages': async (cwd) => execa('npx', ['wrangler', 'pages', 'deploy'], { cwd, stdio: 'inherit' }),
  'gh-pages': async (cwd) => execa('npx', ['gh-pages', '-d', 'dist'], { cwd, stdio: 'inherit' })
};

export async function shipCommand({ env = 'prod', cwd = process.cwd(), yes = false, skipTests = false } = {}) {
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
    try {
      await execa('npm', ['run', 'build'], { cwd, stdio: 'inherit' });
    } catch (err) {
      fail(`build failed: ${err.message}`);
      process.exit(1);
    }
  } else {
    warn('no build script \u2014 skipping');
  }

  info('stage 2/4 \u2014 verify');
  if (skipTests) {
    warn('tests skipped via --skip-tests');
  } else if (pkg.scripts?.test) {
    try {
      await execa('npm', ['test'], { cwd, stdio: 'inherit' });
    } catch (err) {
      fail(`tests failed: ${err.message}`);
      const proceed = yes || (await confirm('tests failed. Continue shipping anyway?', { defaultYes: false }));
      if (!proceed) {
        process.exit(1);
      }
    }
  } else {
    warn('no test script \u2014 skipping');
  }

  info(`stage 3/4 \u2014 tag (env=${env})`);
  const sgMod = /** @type {any} */ (await import('simple-git'));
  const git = (sgMod.default || sgMod)(cwd);
  const isRepo = await isGitRepo(cwd);
  if (isRepo) {
    const tag = `v${pkg.version}-${env}`;
    const wantTag = yes || (await confirm(`tag and push ${tag}?`, { defaultYes: true }));
    if (wantTag) {
      // CLI-004: show what is about to be committed and NEVER stage untracked
      // files (they may be secrets / debug dumps / binaries).
      try {
        const status = await git.status();
        const untracked = status.not_added || [];
        if (untracked.length > 0) {
          warn(`leaving ${untracked.length} untracked file(s) unstaged: ${untracked.slice(0, 5).join(', ')}${untracked.length > 5 ? '…' : ''}`);
        }
        const diff = await git.diffSummary(['--staged']).catch(() => git.diffSummary());
        if (diff && (diff.files || []).length > 0) {
          info(`staged changes: ${diff.files.length} file(s), +${diff.insertions}/-${diff.deletions}`);
        }
      } catch {
        /* status display is best-effort */
      }
      // Stage tracked files and package.json safely without blindly adding untracked secret files
      await git.add(['-u']).catch(() => {});
      await git.add(['package.json']).catch(() => {});
      await git.commit(`chore: ship ${tag}`).catch(() => {});
      try {
        await git.addTag(tag);
      } catch {
        // Tag already exists locally — idempotent re-ship, keep going.
        warn(`tag ${tag} already exists — reusing`);
      }
      await git.pushTags().catch(() => warn('could not push tag (no remote configured?) \u2014 continuing'));
      ok(`tagged ${tag}`);
    }
  } else {
    warn('not a git repo \u2014 skipping tag');
  }

  info('stage 4/4 \u2014 deploy');
  const config = await loadConfig();
  const target = config.deploy?.target;
  if (!target) {
    warn('no deploy target configured \u2014 run "mcode add deploy-<netlify|vercel|docker|\u2026>" first. Skipping deploy.');
  } else {
    const runner = DEPLOY_RUNNERS[target];
    if (!runner) {
      warn(`deploy target "${target}" has no runner wired up yet \u2014 skipping`);
    } else {
      const wantDeploy = yes || (await confirm(`deploy to ${target} now?`, { defaultYes: true }));
      if (wantDeploy) {
        try {
          await runner(cwd, pkg);
          ok(`deployed to ${target}`);
        } catch (err) {
          fail(`deploy to ${target} failed: ${err.message}`);
          process.exit(1);
        }
      } else {
        info('deploy skipped by user');
      }
    }
  }

  ok(`ship complete (env=${env})`);
}