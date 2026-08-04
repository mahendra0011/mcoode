import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { io as ioc } from 'socket.io-client';
import { attachSockets } from '../src/sockets.js';
import { connectDb } from '../src/db.js';
import { signTokens } from '../src/auth.js';

const SECRET = 'test-secret';

let httpServer;
let port;
let io;

const listen = (server) => new Promise((resolve) => {
  server.listen(0, () => resolve(server.address().port));
});

const connected = (...socks) => new Promise((resolve, reject) => {
  let remaining = socks.length;
  for (const s of socks) {
    s.once('connect', () => {
      remaining -= 1;
      if (remaining === 0) resolve();
    });
    s.once('connect_error', (err) => reject(new Error(err.message)));
  }
});

const authClient = (token) => ioc(`http://localhost:${port}`, {
  path: '/live', auth: { token }, reconnection: false, forceNew: true
});
const emitterClient = () => ioc(`http://localhost:${port}`, {
  path: '/live', reconnection: false, forceNew: true
});

const receives = (sock, event) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 4000);
  sock.once(event, (p) => {
    clearTimeout(t);
    resolve(p);
  });
});

beforeAll(async () => {
  await connectDb(null);
  httpServer = createServer();
  io = attachSockets(httpServer, { secret: SECRET });
  port = await listen(httpServer);
});

afterAll(async () => {
  io.close();
  httpServer.close();
});

describe('socket forwarding', () => {
  it('forwards CLI events to authenticated dashboard clients', async () => {
    const { access } = signTokens('user-1', { secret: SECRET });
    const dash = authClient(access);
    const cli = emitterClient();
    await connected(dash, cli);

    const got = receives(dash, 'agent:started');
    cli.emit('agent:started', { sessionId: 'p1', todoId: 't1', model: 'mock:mock' });
    expect((await got).todoId).toBe('t1');

    dash.close();
    cli.close();
  });

  it('forwards build:complete to dashboard clients', async () => {
    const { access } = signTokens('user-2', { secret: SECRET });
    const dash = authClient(access);
    const cli = emitterClient();
    await connected(dash, cli);

    const got = receives(dash, 'build:complete');
    cli.emit('build:complete', { sessionId: 'p2', done: 3, total: 3 });
    expect((await got).total).toBe(3);

    dash.close();
    cli.close();
  });

  it('forwards watch events to dashboard clients', async () => {
    const { access } = signTokens('user-3', { secret: SECRET });
    const dash = authClient(access);
    const cli = emitterClient();
    await connected(dash, cli);

    const got = receives(dash, 'watch:fix');
    cli.emit('watch:fix', { projectId: 'w1', file: 'src/a.js', outcome: 'auto-fixed' });
    expect((await got).outcome).toBe('auto-fixed');

    dash.close();
    cli.close();
  });

  it('rejects sockets with an invalid token', async () => {
    const bad = ioc(`http://localhost:${port}`, { path: '/live', auth: { token: 'not-a-jwt' }, reconnection: false });
    const rejected = new Promise((resolve) => {
      bad.once('connect_error', (err) => resolve(err.message));
      bad.once('connect', () => resolve(null));
    });
    expect(await rejected).toBe('invalid token');
    bad.close();
  });

  it('allows tokenless emitters (CLI agents)', async () => {
    const cli = emitterClient();
    await connected(cli);
    cli.close();
  });
});
