import { io } from 'socket.io-client';
import { appendFile } from 'node:fs/promises';

const log = 'C:/Users/mahen/AppData/Local/Temp/opencode/evt.log';
const seen = new Set();

const socket = io('http://127.0.0.1:3100', { path: '/live', reconnection: true });
const EVENTS = ['session:start', 'plan:generated', 'agent:started', 'agent:step', 'agent:file', 'agent:done', 'agent:failed', 'integration:pass', 'build:complete', 'toast'];
for (const e of EVENTS) {
  socket.on(e, (p) => {
    const key = JSON.stringify(p);
    if (seen.has(key)) return;
    seen.add(key);
    appendFile(log, `${e} ${key.slice(0, 140)}\n`).catch(() => {});
  });
}
socket.on('connect', () => appendFile(log, 'CONNECTED\n'));
console.log('listening');