import { io } from 'socket.io-client';

const API = 'http://localhost:3100';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tokenRes = await fetch(API + '/api/v1/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'dbg', email: 'dbg@mcode.dev', password: 'dbgtest123' })
}).then((r) => r.json());

// tokenless "CLI" emitter
const cli = io(API, { path: '/live', timeout: 2000, transports: ['websocket', 'polling'] });
cli.on('connect', () => console.log('CLI socket: CONNECTED (tokenless)'));
cli.on('connect_error', (e) => console.log('CLI socket error:', e.message));

// token "dashboard" listener
const dash = io(API, { path: '/live', auth: { token: tokenRes.access }, timeout: 2000 });
dash.on('connect', () => {
  console.log('DASH socket: CONNECTED');
  dash.emit('session:join', { sessionId: 'test-proj-1' });
});
dash.on('session:start', (p) => console.log('DASH received session:start:', JSON.stringify(p)));
dash.on('agent:started', (p) => console.log('DASH received agent:started:', JSON.stringify(p)));

await sleep(1500);
console.log('--- emitting as CLI ---');
cli.emit('session:start', { sessionId: 'test-proj-1', projectName: 'dbg' });
cli.emit('agent:started', { sessionId: 'test-proj-1', todoId: 't1', model: 'mock:mock', domain: 'frontend' });

await sleep(1500);
console.log('done');
cli.close();
dash.close();
process.exit(0);
