import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../src/server.js';
import { db } from '../src/db.js';

let server;
let base;
let token;
let wsId;
const diskPath = mkdtempSync(join(tmpdir(), 'mcode-diff-test-'));

beforeAll(async () => {
  process.env.MCODE_BCRYPT_ROUNDS = process.env.MCODE_BCRYPT_ROUNDS || '4';
  server = await startServer({
    port: 0,
    env: { ...process.env, MONGODB_URI: '', REDIS_URI: '', BREVO_API_KEY: '', NODE_ENV: 'test' }
  });
  base = `http://127.0.0.1:${server.httpServer.address().port}`;
  const sent = await request(base).post('/api/v1/auth/send-otp').send({ email: 'diff@user.dev', intent: 'signup' });
  const verified = await request(base).post('/api/v1/auth/verify-otp')
    .send({ email: 'diff@user.dev', otp: sent.body.devOtp, intent: 'signup', name: 'Diff User', password: 'secret123' });
  token = verified.body.access;
  const userId = verified.body.user.id;
  await mkdir(diskPath, { recursive: true });
  await writeFile(join(diskPath, 'a.txt'), 'one\ntwo\n', 'utf8');
  const git = (await import('simple-git')).default(diskPath);
  await git.init();
  await git.addConfig('user.name', 't');
  await git.addConfig('user.email', 't@t.t');
  await git.add('.');
  await git.commit('init');
  await writeFile(join(diskPath, 'a.txt'), 'one\nTWO\nthree\n', 'utf8');
  const ws = await db().workspace.create({ userId, name: 'difftest', diskPath });
  wsId = ws._id;
});

afterAll(async () => {
  server?.httpServer?.close();
});

describe('workspace git diff (per-hunk accept API)', () => {
  it('returns a unified diff for a dirty file', async () => {
    const res = await request(base).get(`/api/v1/workspaces/${wsId}/diff`).query({ path: 'a.txt' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.diff).toMatch(/@@/);
    expect(res.body.diff).toMatch(/\+TWO/);
  });

  it('rejects path traversal', async () => {
    const res = await request(base).get(`/api/v1/workspaces/${wsId}/diff`).query({ path: '../../etc/passwd' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('requires ownership', async () => {
    const res = await request(base).get('/api/v1/workspaces/does-not-exist/diff')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('applies selected hunks server-side', async () => {
    const diffRes = await request(base).get(`/api/v1/workspaces/${wsId}/diff`).query({ path: 'a.txt' })
      .set('Authorization', `Bearer ${token}`);
    expect(diffRes.status).toBe(200);
    // Parse hunks the same way the web client does (one hunk here).
    const hunks = [];
    const re = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm;
    let m;
    while ((m = re.exec(diffRes.body.diff)) !== null) {
      hunks.push({ oldStart: Number(m[1]), lines: [] });
    }
    expect(hunks.length).toBeGreaterThan(0);
    // Fill hunk lines from the diff body.
    const lines = String(diffRes.body.diff).split('\n');
    let hi = -1;
    for (const line of lines) {
      if (line.startsWith('@@')) { hi++; continue; }
      if (hi >= 0 && hunks[hi] && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
        hunks[hi].lines.push(line);
      }
    }
    const apply = await request(base).post(`/api/v1/workspaces/${wsId}/hunks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ path: 'a.txt', hunks, selected: hunks.map(() => true) });
    expect(apply.status).toBe(200);
    expect(apply.body.applied).toBe(hunks.length);
    const file = await request(base).get(`/api/v1/workspaces/${wsId}/file`).query({ path: 'a.txt' })
      .set('Authorization', `Bearer ${token}`);
    expect(file.body.content).toContain('TWO');
  });

  it('validates hunks payload shape', async () => {
    const res = await request(base).post(`/api/v1/workspaces/${wsId}/hunks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ path: 'a.txt', hunks: [{ oldStart: 1 }], selected: [true, false] });
    expect(res.status).toBe(400);
  });
});
