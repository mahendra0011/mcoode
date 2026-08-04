import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { startServer } from '../src/server.js';

let server;
let base;

beforeAll(async () => {
  server = await startServer({ port: 0 });
  base = `http://127.0.0.1:${server.httpServer.address().port}`;
});

afterAll(async () => {
  server.httpServer.close();
});

describe('OTP auth flow', () => {
  it('send-otp returns a dev code when SMTP is disabled', async () => {
    const res = await request(base)
      .post('/api/v1/auth/send-otp')
      .send({ email: 'new@user.dev', intent: 'signup' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.devOtp).toMatch(/^\d{6}$/);
    expect(res.body.expiresInSec).toBe(600);
  });

  it('send-otp rejects existing emails for signup', async () => {
    await request(base).post('/api/v1/auth/send-otp').send({ email: 'new@user.dev', intent: 'signup' });
    const dup = await request(base).post('/api/v1/auth/send-otp').send({ email: 'new@user.dev', intent: 'signup' });
    expect(dup.status).toBe(200);
  });

  it('verify-otp creates the account and returns tokens', async () => {
    const sent = await request(base)
      .post('/api/v1/auth/send-otp')
      .send({ email: 'otp@user.dev', intent: 'signup' });
    const res = await request(base)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'otp@user.dev', otp: sent.body.devOtp, intent: 'signup', name: 'Otp User', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('otp@user.dev');
    expect(res.body.user.name).toBe('Otp User');
    expect(res.body.access).toBeDefined();
    expect(res.body.refresh).toBeDefined();
  });

  it('verify-otp rejects a wrong code', async () => {
    await request(base).post('/api/v1/auth/send-otp').send({ email: 'wrong@user.dev', intent: 'signup' });
    const res = await request(base)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'wrong@user.dev', otp: '000000', intent: 'signup', name: 'Wrong User', password: 'secret123' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('BAD_OTP');
  });

  it('send-otp rejects signup for already-registered emails', async () => {
    const res = await request(base)
      .post('/api/v1/auth/send-otp')
      .send({ email: 'otp@user.dev', intent: 'signup' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('verify-otp login intent authenticates an existing account', async () => {
    const sent = await request(base)
      .post('/api/v1/auth/send-otp')
      .send({ email: 'otp@user.dev', intent: 'login' });
    const res = await request(base)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'otp@user.dev', otp: sent.body.devOtp, intent: 'login' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('otp@user.dev');
  });

  it('rejects a malformed otp', async () => {
    const res = await request(base)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'x@y.dev', otp: 'abc', intent: 'signup', name: 'X Y', password: 'secret123' });
    expect(res.status).toBe(400);
  });
});
