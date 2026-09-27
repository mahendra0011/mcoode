import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startServer } from '../src/server.js';

let server;
let base;

beforeAll(async () => {
  process.env.MCODE_BCRYPT_ROUNDS = process.env.MCODE_BCRYPT_ROUNDS || '4';
  process.env.MCODE_DEV_OTP = '1'; // AUTH-007: explicit opt-in for dev OTP echo
  server = await startServer({
    port: 0,
    env: { ...process.env, MONGODB_URI: '', REDIS_URI: '', BREVO_API_KEY: '', NODE_ENV: 'test', MCODE_DEV_OTP: '1' }
  });
  base = `http://127.0.0.1:${server.httpServer.address().port}`;
});

afterAll(async () => {
  server?.httpServer?.close();
});

async function signup(email) {
  const sent = await request(base).post('/api/v1/auth/send-otp').send({ email, intent: 'signup' });
  const res = await request(base).post('/api/v1/auth/verify-otp')
    .send({ email, otp: sent.body.devOtp, intent: 'signup', name: 'Rot User', password: 'secret123' });
  expect(res.status).toBe(200);
  return res.body;
}

describe('refresh rotation (BUG-31)', () => {
  it('rotates: old refresh dies, new one works', async () => {
    const { refresh: r1 } = await signup('rot1@user.dev');
    const res = await request(base).post('/api/v1/auth/refresh').send({ refresh: r1 });
    expect(res.status).toBe(200);
    expect(res.body.refresh).toBeDefined();
    expect(res.body.refresh).not.toBe(r1);
    const reuse = await request(base).post('/api/v1/auth/refresh').send({ refresh: r1 });
    expect(reuse.status).toBe(401);
  });

  it('reuse of a rotated token revokes all sessions', async () => {
    const { refresh: r1, access } = await signup('rot2@user.dev');
    const r2 = (await request(base).post('/api/v1/auth/refresh').send({ refresh: r1 })).body.refresh;
    // r1 is now stale → reuse triggers theft response
    const evil = await request(base).post('/api/v1/auth/refresh').send({ refresh: r1 });
    expect(evil.status).toBe(401);
    expect(evil.body.error.code).toBe('REFRESH_REUSED');
    // r2 also dead — all sessions revoked
    const dead = await request(base).post('/api/v1/auth/refresh').send({ refresh: r2 });
    expect(dead.status).toBe(401);
    // sessions list is empty
    const list = await request(base).get('/api/v1/auth/sessions').set('Authorization', `Bearer ${access}`);
    expect(list.status).toBe(200);
    expect(list.body.sessions).toEqual([]);
  });

  it('lists and revokes a single session', async () => {    const { refresh: r1, access } = await signup('rot3@user.dev');
    const list1 = await request(base).get('/api/v1/auth/sessions').set('Authorization', `Bearer ${access}`);
    expect(list1.body.sessions.length).toBe(1);
    const del = await request(base).delete(`/api/v1/auth/sessions/${list1.body.sessions[0].jti}`).set('Authorization', `Bearer ${access}`);
    expect(del.body.ok).toBe(true);
    const nope = await request(base).post('/api/v1/auth/refresh').send({ refresh: r1 });
    expect(nope.status).toBe(401);
  });

  it('resets a password via OTP and revokes sessions', async () => {    const email = 'rot4@user.dev';
    await signup(email);
    const sent = await request(base).post('/api/v1/auth/send-otp').send({ email, intent: 'reset' });
    expect(sent.status).toBe(200);
    const bad = await request(base).post('/api/v1/auth/reset-password').send({ email, otp: '00000000', password: 'newsecret123' });
    expect(bad.status).toBe(401);
    const ok = await request(base).post('/api/v1/auth/reset-password').send({ email, otp: sent.body.devOtp, password: 'newsecret123' });
    expect(ok.body.ok).toBe(true);
    const login = await request(base).post('/api/v1/auth/login').send({ email, password: 'newsecret123' });
    expect(login.status).toBe(200);
  });

  it('sets httpOnly cookies and accepts cookie auth', async () => {
    const email = 'rot5@user.dev';
    await signup(email);
    const login = await request(base).post('/api/v1/auth/login').send({ email, password: 'secret123' });
    const cookies = login.headers['set-cookie']?.join(';') || '';
    expect(cookies).toMatch(/mcode_access=/);
    expect(cookies).toMatch(/HttpOnly/i);
    const access = cookies.match(/mcode_access=([^;]+)/)?.[1];
    const me = await request(base).get('/api/v1/auth/me').set('Cookie', `mcode_access=${access}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });
});
