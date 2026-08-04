import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { db } from './db.js';

/**
 * Socket.IO server — clients connect with `{ path: '/live' }`, which maps to
 * the default namespace '/' (path is the engine.io URL path, not a namespace).
 * CLI agents connect without a token and only EMIT; dashboard clients
 * authenticate so they can join rooms.
 */
export function attachSockets(httpServer, { secret, ioOptions = {} }) {
  const io = new Server(httpServer, {
    path: '/live',
    cors: { origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true },
    ...ioOptions
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      socket.userId = null;
      socket.role = 'emitter';
      return next();
    }
    try {
      const payload = verifyToken(token, secret);
      socket.userId = payload.sub;
      socket.role = 'listener';
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('session:join', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
    });
    socket.on('project:join', ({ projectId }) => {
      socket.join(`project:${projectId}`);
    });

    // CLI → server events, broadcast to connected dashboard clients.
    // (Room-based fan-out is optional; the dashboard never joins rooms yet.)
    for (const event of ['session:start', 'plan:generated', 'agent:started', 'agent:step', 'agent:done', 'agent:failed', 'agent:needs_review', 'integration:pass', 'build:complete', 'toast']) {
      socket.on(event, (payload = {}) => {
        io.emit(event, payload);
        // best-effort persistence for build results
        if (event === 'build:complete' && payload.sessionId) {
          db().session.create({
            userId: socket.userId,
            projectName: payload.projectName || 'mcode build',
            mode: 'god',
            status: 'completed',
            plan: payload.plan || null,
            results: payload
          }).catch(() => {});
        }
      });
    }
    for (const event of ['watch:scan', 'watch:fix', 'watch:status']) {
      socket.on(event, (payload = {}) => {
        io.emit(event, payload);
        // persist watch activity to Mongo (best-effort)
        if (event === 'watch:fix' && payload.file) {
          db().watchActivity.create({
            projectId: payload.projectId || 'unknown',
            file: payload.file,
            outcome: payload.outcome || 'no-issues',
            detail: payload.detail || '',
            timestamp: new Date()
          }).catch(() => {});
        }
      });
    }

    socket.on('disconnect', () => {});
  });

  return io;
}
