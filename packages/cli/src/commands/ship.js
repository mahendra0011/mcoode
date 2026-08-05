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