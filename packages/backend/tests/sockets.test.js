import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { io as ioc } from 'socket.io-client';
import { attachSockets } from '../src/sockets.js';
import { connectDb } from '../src/db.js';
import { signTokens } from '../src/auth.js';

const SECRET = 'test-secret';
// M11-005: CLI emitters authenticate with this shared secret. It must be set
// before attachSockets() is called, since the handshake middleware reads it.
const CLI_SECRET = 'test-cli-secret';

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
// M11-005: a tokenless socket is now REJECTED. A legitimate CLI emitter must
// present CLI_SHARED_SECRET, which is what `cliEmitterClient` does below.
const emitterClient = (cliSecret) => ioc(`http://localhost:${port}`, {
  path: '/live', auth: cliSecret ? { cliSecret } : {}, reconnection: false, forceNew: true
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
  // M11-005: set the CLI secret before attaching, so emitters can authenticate.
  process.env.CLI_SHARED_SECRET = CLI_SECRET;
  httpServer = createServer();
  io = attachSockets(httpServer, { secret: SECRET });
  port = await listen(httpServer);
});

afterAll(async () => {
  io.close();
  httpServer.close();
  delete process.env.CLI_SHARED_SECRET;
});

describe('socket forwarding', () => {
  it('forwards CLI events to authenticated web clients', async () => {
    const { access } = signTokens('user-1', { secret: SECRET });
    const dash = authClient(access);
    const cli = emitterClient(CLI_SECRET);
    await connected(dash, cli);

    const got = receives(dash, 'agent:started');
    cli.emit('agent:started', { sessionId: 'p1', todoId: 't1', model: 'mock:mock' });
    expect((await got).todoId).toBe('t1');

    dash.close();
    cli.close();
  });

  it('forwards build:complete to web clients', async () => {
    const { access } = signTokens('user-2', { secret: SECRET });
    const dash = authClient(access);
    const cli = emitterClient(CLI_SECRET);
    await connected(dash, cli);

    const got = receives(dash, 'build:complete');
    cli.emit('build:complete', { sessionId: 'p2', done: 3, total: 3 });
    expect((await got).total).toBe(3);

    dash.close();
    cli.close();
  });

  it('forwards watch events to web clients', async () => {
    const { access } = signTokens('user-3', { secret: SECRET });
    const dash = authClient(access);
    const cli = emitterClient(CLI_SECRET);
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

  // M11-005: a CLI emitter authenticates with CLI_SHARED_SECRET.
  it('allows CLI emitters that present the shared secret', async () => {
    const cli = emitterClient(CLI_SECRET);
    await connected(cli);
    cli.close();
  });

  // M11-005: the regression this finding describes. Previously a tokenless
  // handshake called next() and connected successfully, which made the
  // cross-tenant diskPath IDOR (M11-004) reachable without logging in.
  it('rejects sockets with no token and no CLI secret', async () => {
    const anon = emitterClient();
    const rejected = new Promise((resolve) => {
      anon.once('connect_error', (err) => resolve(err.message));
      anon.once('connect', () => resolve(null));
    });
    expect(await rejected).toBe('authentication required');
    anon.close();
  });

  // M11-005: a wrong CLI secret must not be treated as an emitter either.
  it('rejects sockets presenting an incorrect CLI secret', async () => {
    const bad = emitterClient('not-the-right-secret');
    const rejected = new Promise((resolve) => {
      bad.once('connect_error', (err) => resolve(err.message));
      bad.once('connect', () => resolve(null));
    });
    expect(await rejected).toBe('authentication required');
    bad.close();
  });

  // M11-006: a token signed with the wrong key must be refused.
  it('rejects a token signed with a different secret', async () => {
    const { access } = signTokens('user-x', { secret: 'a-different-secret' });
    const sock = authClient(access);
    const rejected = new Promise((resolve) => {
      sock.once('connect_error', (err) => resolve(err.message));
      sock.once('connect', () => resolve(null));
    });
    expect(await rejected).toBe('invalid token');
    sock.close();
  });

  // M11-006: a token whose header claims a non-HS256 algorithm must be
  // refused before the signature is considered.
  it('rejects an alg=none token (algorithm confusion)', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const noneTok = `${b64({ alg: 'none' })}.${b64({ sub: 'attacker' })}.`;
    const sock = authClient(noneTok);
    const rejected = new Promise((resolve) => {
      sock.once('connect_error', (err) => resolve(err.message));
      sock.once('connect', () => resolve(null));
    });
    expect(await rejected).toBe('invalid token');
    sock.close();
  });
});
