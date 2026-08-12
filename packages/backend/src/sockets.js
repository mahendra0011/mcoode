import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { db } from './db.js';
import { SOCKET } from '@mcode/shared';
import { ChatSession } from './chat-session.js';

// Per-socket chat sessions (web clients only)
const chatSessions = new Map();

/**
 * Socket.IO server — clients connect with `{ path: '/live' }`, which maps to
 * the default namespace '/' (path is the engine.io URL path, not a namespace).
 * CLI agents connect without a token and only EMIT; web clients
 * authenticate so they can join rooms.
 */
export function attachSockets(httpServer, { secret, ioOptions = {} }) {
  const io = new Server(httpServer, {
    path: '/live',
    cors: {
      origin: (origin, callback) => {
        // Allow all localhost dev ports (Vite may use 5173-5177+)
        if (!origin || origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true
    },
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
    console.log('[SOCKET] connection:', socket.id, 'role:', socket.role, 'url:', socket.handshake.url);
    socket.on('terminal:command', (payload) => {
      console.log('[SOCKET] terminal:command received:', JSON.stringify(payload));
    });
    socket.on('session:join', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
    });
    socket.on('project:join', ({ projectId }) => {
      socket.join(`project:${projectId}`);
    });

    // Authenticated users join their personal room for design generation streaming
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Design generation events (streaming)
    socket.on('design:generate', (payload = {}) => {
      // The actual generation is handled by the REST endpoint POST /api/v1/design/generate
      // which emits 'design:stream' and 'design:done' to the user's room
      // This socket event is kept for future use (e.g., canceling generation)
    });

    // CLI → server events, broadcast to connected web clients.
    // (Room-based fan-out is optional; web clients don't always join rooms yet.)
    for (const event of ['session:start', 'plan:generated', 'agent:started', 'agent:step', 'agent:file', 'agent:done', 'agent:failed', 'agent:needs_review', 'integration:pass', 'build:complete', 'toast']) {
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

    // ── Web Chat / Agent events (authenticated users only) ─────────
    // These bridge the CLI's ChatAgent to web clients via Socket.IO.
    // CLI agents emit events without a token (role='emitter') and don't use chat.

    socket.on('chat:start', async (payload = {}) => {
      // Only authenticated users can start chats
      if (!socket.userId) {
        socket.emit('chat:error', { message: 'authentication required for chat' });
        return;
      }

      const { workspaceId, modelRef } = payload;

      // Resolve workspace path
      let workspacePath = null;
      if (workspaceId) {
        const ws = await db().workspace.findOne({ _id: workspaceId, userId: socket.userId });
        if (ws) workspacePath = ws.diskPath;
      }
      // Fallback: user's home workspace dir (auto-created)
      if (!workspacePath) {
        const { join } = await import('node:path');
        const { homedir } = await import('node:os');
        const { mkdir } = await import('node:fs/promises');
        workspacePath = join(homedir(), '.mcode', 'workspaces', 'default');
        await mkdir(workspacePath, { recursive: true });
      }

      // Create or reuse chat session for this socket.
      // When only modelRef changes (workspace stays the same) we reuse the
      // existing ChatSession so conversation context / history is preserved.
      let session = chatSessions.get(socket.id);
      if (session) {
        if (session.workspacePath === workspacePath) {
          // Same workspace — update the model override on the existing session
          // so conversation context and history are preserved across model switches
          session.modelRef = modelRef;
          if (session.router) {
            session.router.modelOverride = modelRef;
          }
          socket.emit(SOCKET.SERVER_TO_CLIENT.CHAT_READY, {
            models: session.providers?.map((p) => ({ id: p.id, displayName: p.displayName })) || []
          });
          return;
        }
        // Workspace changed — discard the old session and create a fresh one
        session.cleanup();
      }

      session = new ChatSession({
        userId: socket.userId,
        secret,
        workspacePath,
        modelRef,
        onEvent: (event, payload) => socket.emit(event, payload)
      });
      chatSessions.set(socket.id, session);

      const ok = await session.start();
      if (ok) {
        socket.emit(SOCKET.SERVER_TO_CLIENT.CHAT_READY, {
          models: session.providers?.map((p) => ({ id: p.id, displayName: p.displayName })) || []
        });
      }
    });

    socket.on('chat:send', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      if (!session) {
        socket.emit('chat:error', { message: 'chat session not started — send chat:start first' });
        return;
      }
      const { prompt, mode = 'chat' } = payload;
      if (!prompt) return;
      try {
        if (mode === 'god') {
          await session.runGod(prompt);
        } else {
          await session.sendMessage(prompt, mode);
        }
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      } finally {
        // Always emit chat:done so the frontend stops the thinking spinner,
        // even if the agent threw an error or the session was interrupted.
        socket.emit('chat:done', { text: '', mode, interrupted: false });
      }
    });

    socket.on('chat:permission_answer', (payload = {}) => {
      const session = chatSessions.get(socket.id);
      if (session) session.handlePermissionAnswer(payload);
    });

    socket.on(SOCKET.CLIENT_TO_SERVER.CHAT_UNDO, async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      if (session && session.undoStack) {
        try {
          const revertedFile = await session.undoStack.undo(payload?.undoId);
          socket.emit(SOCKET.SERVER_TO_CLIENT.CHAT_UNDO_RESULT, { ok: true, file: revertedFile });
        } catch (e) {
          socket.emit(SOCKET.SERVER_TO_CLIENT.CHAT_UNDO_RESULT, { ok: false, error: e.message });
        }
      } else {
        socket.emit(SOCKET.SERVER_TO_CLIENT.CHAT_UNDO_RESULT, { ok: false, error: 'no active session or undo stack' });
      }
    });

    socket.on('chat:interrupt', () => {
      const session = chatSessions.get(socket.id);
      if (session) session.interrupt();
    });

    // Direct terminal command execution — runs a shell command in the
    // workspace and streams stdout/stderr chunks back as chat:shell_stream.
    // This lets the user type commands directly into the IDE terminal
    // (e.g. `npm install lodash`) without going through the AI agent.
    socket.on('terminal:command', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      // Fall back to a default workspace so the terminal is usable
      // even before a chat session has been started via chat:start.
      if (!projectPath) {
        const { join } = await import('node:path');
        const { homedir } = await import('node:os');
        const { mkdir } = await import('node:fs/promises');
        projectPath = join(homedir(), '.mcode', 'workspaces', 'default');
        await mkdir(projectPath, { recursive: true });
      }
      const { command } = payload;
      if (!command || !command.trim()) return;

      // Echo the command prompt so it appears in the terminal
      const promptChunk = `\r\x1b[34m$ ${command}\x1b[0m\r\n`;
      console.log('[SOCKET] emitting prompt chunk:', JSON.stringify(promptChunk));
      socket.emit('chat:shell_stream', { chunk: promptChunk });

      const { execa } = await import('execa');
      const child = execa(command, {
        cwd: projectPath,
        shell: true,
        timeout: 120_000,
        env: { ...process.env, FORCE_COLOR: '1' },
        reject: false,
      });

      child.stdout?.on('data', chunk => {
        const s = chunk.toString();
        console.log('[SOCKET] stdout chunk:', JSON.stringify(s));
        socket.emit('chat:shell_stream', { chunk: s });
      });
      child.stderr?.on('data', chunk => {
        const s = chunk.toString();
        console.log('[SOCKET] stderr chunk:', JSON.stringify(s));
        socket.emit('chat:shell_stream', { chunk: s });
      });

      await child;
      console.log('[SOCKET] command done, emitting trailing newline');
      socket.emit('chat:shell_stream', { chunk: '\r\n' });
    });

    socket.on('disconnect', () => {
      const session = chatSessions.get(socket.id);
      if (session) {
        session.cleanup();
        chatSessions.delete(socket.id);
      }
    });
  });

  // Expose the io instance globally so route handlers can emit to rooms
  globalThis.__mcodeIo = io;

  return io;
}
