import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';

// CLI-004 regression: ship must NEVER stage untracked files (secrets).
describe('shipCommand', () => {
  let cwd;
  const git = (args) => execa('git', args, { cwd, reject: false });

  beforeAll(async () => {
    cwd = await mkdtemp(join(tmpdir(), 'mcode-ship-test-'));
    await writeFile(join(cwd, 'package.json'), JSON.stringify({ name: 't', version: '1.0.0' }), 'utf8');
    await git(['init', '-b', 'main']);
    await git(['config', 'user.email', 't@t.dev']);
    await git(['config', 'user.name', 't']);
    await git(['add', 'package.json']);
    await git(['commit', '-m', 'init', '--quiet']);
  });

  afterAll(async () => {
    await rm(cwd, { recursive: true, force: true }).catch(() => {});
  });

  it('tags without staging untracked secret files', async () => {
    const { shipCommand } = await import('../src/commands/ship.js');
    await writeFile(join(cwd, '.env.local'), 'SECRET=live-secret-value', 'utf8');
    await writeFile(join(cwd, 'note.txt'), 'tracked change', 'utf8');
    await git(['add', 'note.txt']);

    await shipCommand({ env: 'prod', cwd, yes: true });

    const tracked = (await git(['ls-files'])).stdout.split('\n').map((s) => s.trim());
    expect(tracked).not.toContain('.env.local');

    const tags = (await git(['tag', '--list'])).stdout;
    expect(tags).toContain('v1.0.0-prod');
  }, 120000);
});
