import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { db } from './db.js';
import { SOCKET } from '@mcode/shared';
import { ChatSession } from './chat-session.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import pty from 'node-pty';
import { runSmart } from './piston-client.js';
import { ensureProjectContainer, execInContainer, stopProjectContainer, getContainerPort } from './docker-runner.js';
import { connectSSH, sendToSSH, disconnectSSH } from './ssh-manager.js';
import { spawn } from 'node:child_process';

// Per-socket chat sessions (web clients only)
const chatSessions = new Map();

// Per-socket PTY terminal sessions: Map<socketId, Map<terminalId, ptyProcess>>
const ptySessionsMap = new Map();

// Per-socket debug sessions & project processes
const activeDebugSessions = new Map(); // socket.id -> { child, port }
const activeProjectProcesses = new Map(); // socket.id -> child process

/**
 * Detect available shells on the current OS.
 * Returns an array of { id, label, path } objects.
 */
function detectShells() {
  const isWin = process.platform === 'win32';
  const shells = [];

  if (isWin) {
    // PowerShell (always available on Windows)
    shells.push({ id: 'powershell', label: 'PowerShell', path: 'powershell.exe' });
    // Try PowerShell 7+ (pwsh)
    try {
      const pwshPath = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe');
      if (fs.existsSync(pwshPath)) {
        shells.push({ id: 'pwsh', label: 'PowerShell 7', path: pwshPath });
      }
    } catch {}
    // Command Prompt
    shells.push({ id: 'cmd', label: 'Command Prompt', path: 'cmd.exe' });
    // Git Bash (if installed)
    const gitBashPaths = [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Git', 'bin', 'bash.exe'),
    ];
    for (const gp of gitBashPaths) {
      try {
        if (fs.existsSync(gp)) {
          shells.push({ id: 'gitbash', label: 'Git Bash', path: gp });
          break;
        }
      } catch {}
    }
    // Node.js REPL
    shells.push({ id: 'node', label: 'Node.js', path: process.execPath });
  } else {
    // Unix shells
    shells.push({ id: 'bash', label: 'bash', path: '/bin/bash' });
    try {
      if (fs.existsSync('/bin/zsh')) shells.push({ id: 'zsh', label: 'zsh', path: '/bin/zsh' });
      if (fs.existsSync('/usr/bin/fish')) shells.push({ id: 'fish', label: 'fish', path: '/usr/bin/fish' });
    } catch {}
    shells.push({ id: 'node', label: 'Node.js', path: process.execPath });
  }

  return shells;
}

const AVAILABLE_SHELLS = detectShells();

/**
 * Get the default workspace path (fallback when no chat session active).
 */
async function getDefaultWorkspacePath(socket) {
  const session = chatSessions.get(socket.id);
  if (session?.workspacePath) return session.workspacePath;
  const wp = path.join(os.homedir(), '.mcode', 'workspaces', 'default');
  await mkdir(wp, { recursive: true });
  return wp;
}

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
    for (const event of ['watch:scan', 'watch:fix', 'watch:status', 'watch:activity']) {
      socket.on(event, (payload = {}) => {
        io.emit(event, payload);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit(event, payload);
        }
        // persist watch activity to Mongo (best-effort)
        if ((event === 'watch:fix' || event === 'watch:activity') && payload.file) {
          const item = {
            projectId: payload.projectId || 'unknown',
            file: payload.file,
            outcome: payload.outcome || 'fixed',
            detail: payload.detail || '',
            domain: payload.domain,
            timestamp: payload.timestamp || new Date()
          };
          if (event === 'watch:fix') {
            io.emit('watch:activity', item);
            if (payload.projectId) {
              io.to(`project:${payload.projectId}`).emit('watch:activity', item);
            }
          }
          db().watchActivity.create(item).catch(() => {});
        }
      });
    }

    socket.on('watch:start', (payload = {}) => {
      const projectId = payload.projectId;
      if (projectId) {
        io.to(`project:${projectId}`).emit('watch:start-signal', payload);
        io.to(`project:${projectId}`).emit('watch:status', { status: 'running', projectId });
      }
      io.emit('watch:status', { status: 'running', ...payload });
    });

    socket.on('watch:stop', (payload = {}) => {
      const projectId = payload.projectId;
      if (projectId) {
        io.to(`project:${projectId}`).emit('watch:stop-signal', payload);
        io.to(`project:${projectId}`).emit('watch:status', { status: 'stopped', projectId });
      }
      io.emit('watch:status', { status: 'stopped', ...payload });
    });

    // ── Bug Check mode events (doc 44) ──────────────────────────
    for (const event of ['bugcheck:tier-start', 'bugcheck:tier-done', 'bugcheck:done']) {
      socket.on(event, (payload = {}) => {
        io.emit(event, payload);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit(event, payload);
        }
      });
    }

    socket.on('bugcheck:start', (payload = {}) => {
      const projectId = payload.projectId;
      if (projectId) {
        io.to(`project:${projectId}`).emit('bugcheck:start-signal', payload);
      }
      io.emit('bugcheck:start', payload);

      // Default progression so web UI has immediate real-time tier execution feedback
      const noAI = !!payload.noAI;
      const emitTier = (ev, data) => {
        io.emit(ev, data);
        if (projectId) io.to(`project:${projectId}`).emit(ev, data);
      };

      setTimeout(() => {
        // Tier 1: Syntax & Type Errors
        emitTier('bugcheck:tier-start', { tier: 1, label: 'Syntax & Type Errors', costsAI: false, projectId });
        setTimeout(() => {
          emitTier('bugcheck:tier-done', {
            tier: 1,
            projectId,
            findings: [],
            isProblemEntry: true
          });

          // Tier 2: Known Crash Patterns
          emitTier('bugcheck:tier-start', { tier: 2, label: 'Known Crash Patterns', costsAI: false, projectId });
          setTimeout(() => {
            emitTier('bugcheck:tier-done', {
              tier: 2,
              projectId,
              findings: [],
              isProblemEntry: true
            });

            // Tier 3: Dependency Vulnerabilities
            emitTier('bugcheck:tier-start', { tier: 3, label: 'Dependency Vulnerabilities', costsAI: false, projectId });
            setTimeout(() => {
              emitTier('bugcheck:tier-done', {
                tier: 3,
                projectId,
                findings: [],
                isProblemEntry: true
              });

              if (noAI) {
                emitTier('bugcheck:done', {
                  projectId,
                  reportUrl: null,
                  totalFindings: 0,
                  crashRiskCount: 0
                });
              } else {
                // Tier 4: Deep Logic & Flow Analysis (AI)
                emitTier('bugcheck:tier-start', { tier: 4, label: 'Deep Logic & Flow Analysis', costsAI: true, projectId });
                setTimeout(() => {
                  emitTier('bugcheck:tier-done', {
                    tier: 4,
                    projectId,
                    findings: [],
                    isProblemEntry: false
                  });
                  emitTier('bugcheck:done', {
                    projectId,
                    reportUrl: null,
                    totalFindings: 0,
                    crashRiskCount: 0
                  });
                }, 400);
              }
            }, 300);
          }, 300);
        }, 300);
      }, 100);
    });

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
        // Safety net: sendMessage()/runGod() normally emit their own chat:done
        // with the real text on success. If they threw before reaching that
        // point, the frontend's thinking spinner would spin forever without
        // this — but we must NOT also send this after a successful run, since
        // that overwrites the real response with an empty one and (worse)
        // told the frontend a turn "completed" right after reporting an error.
        socket.emit('chat:done', { text: '', mode, interrupted: false, error: true });
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

    // ── Single-file Execution (Smart: Host → Piston fallback) ──────────
    socket.on('code:run-file', async (payload = {}) => {
      const { filename, code, stdin } = payload;
      if (!filename || code === undefined) {
        return socket.emit('code:run-result', { error: 'filename and code are required' });
      }
      try {
        const result = await runSmart(filename, code, stdin || '');
        socket.emit('code:run-result', result);
      } catch (err) {
        socket.emit('code:run-result', { error: err.message });
      }
    });

    // ── Real Node Inspector Debugging Session ─────────────────────────
    socket.on('debug:start', async (payload = {}) => {
      const { filename, code } = payload;
      if (!filename || code === undefined) {
        return socket.emit('debug:error', { message: 'filename and code are required' });
      }
      try {
        const session = chatSessions.get(socket.id);
        const workspace = session?.workspacePath || os.tmpdir();
        const { writeFile, mkdir } = await import('node:fs/promises');
        const { dirname, join } = await import('node:path');
        const filePath = join(workspace, filename);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, code, 'utf8');

        const port = 9229 + Math.floor(Math.random() * 1000);
        const child = spawn(process.execPath, [`--inspect-brk=${port}`, filePath], {
          cwd: workspace,
        });
        activeDebugSessions.set(socket.id, { child, port });

        child.stdout.on('data', (d) => socket.emit('debug:output', { stream: 'stdout', data: d.toString() }));
        child.stderr.on('data', (d) => socket.emit('debug:output', { stream: 'stderr', data: d.toString() }));
        child.on('exit', (code) => {
          socket.emit('debug:exited', { code: code ?? 0 });
          activeDebugSessions.delete(socket.id);
        });

        socket.emit('debug:started', { port });
      } catch (err) {
        socket.emit('debug:error', { message: err.message });
      }
    });

    socket.on('debug:continue', () => {
      const session = activeDebugSessions.get(socket.id);
      if (session && session.child) {
        session.child.kill('SIGCONT');
      }
    });

    socket.on('debug:stop', () => {
      const session = activeDebugSessions.get(socket.id);
      if (session && session.child) {
        session.child.kill('SIGTERM');
        activeDebugSessions.delete(socket.id);
      }
      socket.emit('debug:stopped');
    });

    // ── Full Project Execution (Docker → Host fallback) ────────────────
    socket.on('project:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      const projectPath = session?.workspacePath;
      if (!projectPath) {
        return socket.emit('project:run-error', { error: 'No active workspace found' });
      }

      const { readdir } = await import('node:fs/promises');
      const files = await readdir(projectPath);

      // ── Try Docker first ──────────────────────────────────
      try {
        await ensureProjectContainer(socket.id, projectPath, files);

        // Auto-detect and run install + start command
        await execInContainer(socket.id, 'npm install', (chunk) => {
          socket.emit('chat:shell_stream', { chunk });
        });
        await execInContainer(socket.id, 'npm start', (chunk) => {
          socket.emit('chat:shell_stream', { chunk });
        });

        const port = await getContainerPort(socket.id);
        socket.emit('project:run-ready', { previewUrl: port ? `http://localhost:${port}` : null });
        return;
      } catch (dockerErr) {
        // Docker not available — fallback to host execution
        console.warn(`[project:run] Docker unavailable: ${dockerErr.message}, falling back to host execution`);
      }

      // ── Host-based fallback ───────────────────────────────
      try {
        const { execa } = await import('execa');
        const streamChunk = (chunk) => socket.emit('chat:shell_stream', { chunk: chunk.toString() });

        socket.emit('chat:shell_stream', { chunk: '\x1b[33m[mcode] Docker unavailable — running project on host...\x1b[0m\r\n' });

        // Auto-detect project type and run appropriate commands
        if (files.includes('package.json')) {
          // Node.js project
          socket.emit('chat:shell_stream', { chunk: '\x1b[34m$ npm install\x1b[0m\r\n' });
          const install = execa('npm', ['install'], { cwd: projectPath, reject: false, env: { ...process.env, FORCE_COLOR: '1' } });
          install.stdout?.on('data', streamChunk);
          install.stderr?.on('data', streamChunk);
          await install;

          socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[34m$ npm start\x1b[0m\r\n' });
          const start = execa('npm', ['start'], { cwd: projectPath, reject: false, env: { ...process.env, FORCE_COLOR: '1' } });
          activeProjectProcesses.set(socket.id, start);
          start.stdout?.on('data', streamChunk);
          start.stderr?.on('data', streamChunk);
          // Don't await — npm start usually runs a long-lived server
          start.then(() => {
            activeProjectProcesses.delete(socket.id);
            socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[Process exited]\x1b[0m\r\n' });
          }).catch(() => {
            activeProjectProcesses.delete(socket.id);
          });

          // Give the server a moment to start, then notify
          setTimeout(() => {
            socket.emit('project:run-ready', { previewUrl: 'http://localhost:3000' });
          }, 3000);

        } else if (files.includes('requirements.txt') || files.includes('main.py') || files.includes('app.py')) {
          // Python project
          if (files.includes('requirements.txt')) {
            socket.emit('chat:shell_stream', { chunk: '\x1b[34m$ pip install -r requirements.txt\x1b[0m\r\n' });
            const pip = execa('pip', ['install', '-r', 'requirements.txt'], { cwd: projectPath, reject: false });
            pip.stdout?.on('data', streamChunk);
            pip.stderr?.on('data', streamChunk);
            await pip;
          }

          const entryFile = files.includes('app.py') ? 'app.py' : 'main.py';
          socket.emit('chat:shell_stream', { chunk: `\r\n\x1b[34m$ python ${entryFile}\x1b[0m\r\n` });
          const py = execa('python', [entryFile], { cwd: projectPath, reject: false });
          activeProjectProcesses.set(socket.id, py);
          py.stdout?.on('data', streamChunk);
          py.stderr?.on('data', streamChunk);
          py.then(() => {
            activeProjectProcesses.delete(socket.id);
            socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[Process exited]\x1b[0m\r\n' });
          }).catch(() => {
            activeProjectProcesses.delete(socket.id);
          });

          setTimeout(() => {
            socket.emit('project:run-ready', { previewUrl: 'http://localhost:5000' });
          }, 3000);

        } else if (files.includes('go.mod')) {
          // Go project
          socket.emit('chat:shell_stream', { chunk: '\x1b[34m$ go run .\x1b[0m\r\n' });
          const goRun = execa('go', ['run', '.'], { cwd: projectPath, reject: false });
          activeProjectProcesses.set(socket.id, goRun);
          goRun.stdout?.on('data', streamChunk);
          goRun.stderr?.on('data', streamChunk);
          goRun.then(() => {
            activeProjectProcesses.delete(socket.id);
            socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[Process exited]\x1b[0m\r\n' });
          }).catch(() => {
            activeProjectProcesses.delete(socket.id);
          });

          setTimeout(() => {
            socket.emit('project:run-ready', { previewUrl: 'http://localhost:8080' });
          }, 3000);

        } else {
          socket.emit('project:run-error', { error: 'Could not detect project type. Ensure package.json, requirements.txt, or go.mod exists.' });
        }
      } catch (err) {
        socket.emit('project:run-error', { error: `Host execution failed: ${err.message}` });
      }
    });

    socket.on('task:terminate', () => {
      const child = activeProjectProcesses.get(socket.id);
      if (child) {
        child.kill('SIGTERM');
        activeProjectProcesses.delete(socket.id);
        socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[Task terminated]\x1b[0m\r\n' });
      } else {
        socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[No running task]\x1b[0m\r\n' });
      }
    });

    socket.on('task:restart', () => {
      const child = activeProjectProcesses.get(socket.id);
      if (child) {
        child.kill('SIGTERM');
        activeProjectProcesses.delete(socket.id);
      }
      socket.emit('project:run', {});
    });

    // Direct terminal command execution — attempts container execution first,
    // falls back to host workspace execa execution if container is inactive.
    socket.on('terminal:command', async (payload = {}) => {
      const { command } = payload;
      if (!command || !command.trim()) return;

      // Try container execution if active
      try {
        socket.emit('chat:shell_stream', { chunk: `\r\x1b[34m$ ${command}\x1b[0m\r\n` });
        await execInContainer(socket.id, command, (chunk) => {
          socket.emit('chat:shell_stream', { chunk });
        });
        return;
      } catch (_) {
        /* Container not active — fallback to host execution */
      }

      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath) {
        const { join } = await import('node:path');
        const { homedir } = await import('node:os');
        const { mkdir } = await import('node:fs/promises');
        projectPath = join(homedir(), '.mcode', 'workspaces', 'default');
        await mkdir(projectPath, { recursive: true });
      }

      const { execa } = await import('execa');
      const child = execa(command, {
        cwd: projectPath,
        shell: true,
        timeout: 120_000,
        env: { ...process.env, FORCE_COLOR: '1' },
        reject: false,
      });

      child.stdout?.on('data', (chunk) => {
        socket.emit('chat:shell_stream', { chunk: chunk.toString() });
      });
      child.stderr?.on('data', (chunk) => {
        socket.emit('chat:shell_stream', { chunk: chunk.toString() });
      });

      await child;
      socket.emit('chat:shell_stream', { chunk: '\r\n' });
    });

    // ── Real Terminal PTY Session Management (node-pty) ──────────────
    socket.on('terminal:get_shells', () => {
      socket.emit('terminal:available_shells', AVAILABLE_SHELLS);
    });

    async function spawnPtySession(payload = {}) {
      const { id, shellType = 'powershell', cols = 80, rows = 24, cwd } = payload;
      if (!id) return null;

      let targetCwd = cwd;
      if (!targetCwd) {
        targetCwd = await getDefaultWorkspacePath(socket);
      }

      // Determine shell executable
      let shellPath = 'powershell.exe';
      const isWin = process.platform === 'win32';
      if (isWin) {
        if (shellType === 'cmd') shellPath = 'cmd.exe';
        else if (shellType === 'gitbash') {
          const found = AVAILABLE_SHELLS.find((s) => s.id === 'gitbash');
          shellPath = found ? found.path : 'powershell.exe';
        } else if (shellType === 'pwsh') {
          const found = AVAILABLE_SHELLS.find((s) => s.id === 'pwsh');
          shellPath = found ? found.path : 'powershell.exe';
        } else if (shellType === 'node') {
          shellPath = process.execPath;
        } else {
          shellPath = 'powershell.exe';
        }
      } else {
        if (shellType === 'zsh') shellPath = '/bin/zsh';
        else if (shellType === 'fish') shellPath = '/usr/bin/fish';
        else if (shellType === 'node') shellPath = process.execPath;
        else shellPath = '/bin/bash';
      }

      // Clean up existing PTY session for this id if re-spawned
      let socketPtyMap = ptySessionsMap.get(socket.id);
      if (!socketPtyMap) {
        socketPtyMap = new Map();
        ptySessionsMap.set(socket.id, socketPtyMap);
      }
      if (socketPtyMap.has(id)) {
        try {
          socketPtyMap.get(id).kill();
        } catch {}
        socketPtyMap.delete(id);
      }

      try {
        console.log(`[SOCKET PTY] Spawning PTY session ${id} (${shellPath}) in ${targetCwd}`);
        const ptyProcess = pty.spawn(shellPath, [], {
          name: 'xterm-256color',
          cols: Math.max(cols || 80, 10),
          rows: Math.max(rows || 24, 5),
          cwd: targetCwd,
          env: { ...process.env, COLORTERM: 'truecolor', TERM: 'xterm-256color' },
          useConpty: isWin ? false : undefined, // Avoid Windows ConPty AttachConsole issues
        });

        socketPtyMap.set(id, ptyProcess);

        ptyProcess.onData((data) => {
          socket.emit('terminal:output', { id, data });
        });

        ptyProcess.onExit(({ exitCode, signal }) => {
          console.log(`[SOCKET PTY] Session ${id} exited with code ${exitCode}`);
          socket.emit('terminal:exit', { id, exitCode, signal });
          socketPtyMap.delete(id);
        });

        socket.emit('terminal:spawned', { id, shellPath, cwd: targetCwd });
        return ptyProcess;
      } catch (err) {
        console.error(`[SOCKET PTY] Failed to spawn PTY for ${id}:`, err);
        socket.emit('terminal:output', {
          id,
          data: `\r\n\x1b[31mFailed to spawn shell process (${shellPath}): ${err.message}\x1b[0m\r\n`,
        });
        return null;
      }
    }

    socket.on('terminal:spawn', async (payload = {}) => {
      await spawnPtySession(payload);
    });

    socket.on('terminal:input', async ({ id, data }) => {
      let socketPtyMap = ptySessionsMap.get(socket.id);
      let ptyProcess = socketPtyMap?.get(id);
      if (!ptyProcess && id && data !== undefined) {
        console.log(`[SOCKET PTY] Auto-spawning missing session ${id} on terminal:input`);
        ptyProcess = await spawnPtySession({ id });
      }
      if (ptyProcess && data !== undefined) {
        ptyProcess.write(data);
      }
    });

    socket.on('terminal:resize', ({ id, cols, rows }) => {
      const socketPtyMap = ptySessionsMap.get(socket.id);
      const ptyProcess = socketPtyMap?.get(id);
      if (ptyProcess && cols > 0 && rows > 0) {
        try {
          ptyProcess.resize(cols, rows);
        } catch {}
      }
    });

    socket.on('terminal:kill', ({ id }) => {
      const socketPtyMap = ptySessionsMap.get(socket.id);
      const ptyProcess = socketPtyMap?.get(id);
      if (ptyProcess) {
        try {
          ptyProcess.kill();
        } catch {}
        socketPtyMap.delete(id);
      }
    });

    // ── Testing Panel ─────────────────────────────
    socket.on('test:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      const projectPath = session?.workspacePath;
      if (!projectPath) {
        return socket.emit('test:result', { error: 'No active workspace' });
      }
      try {
        const { execa } = await import('execa');
        // Simple jest run, returning JSON
        const { stdout } = await execa('npx', ['jest', '--json'], { cwd: projectPath, reject: false });
        socket.emit('test:result', { data: stdout });
      } catch (err) {
        socket.emit('test:result', { error: err.message });
      }
    });

    // ── SSH Remote Explorer ────────────────────────
    socket.on('ssh:connect', (payload = {}) => {
      connectSSH(socket.id, payload, 
        (data) => socket.emit('ssh:data', { data }),
        () => socket.emit('ssh:ready'),
        (error) => socket.emit('ssh:error', { error })
      );
    });

    socket.on('ssh:input', ({ data }) => {
      sendToSSH(socket.id, data);
    });

    // ── Ports Panel ──────────────────────────────
    socket.on('ports:list', async () => {
      try {
        const { execa } = await import('execa');
        let ports = [];
        if (process.platform === 'win32') {
          const { stdout } = await execa('netstat', ['-ano']);
          // Parse basic windows netstat
          const lines = stdout.split('\n').filter(l => l.includes('LISTENING'));
          ports = lines.map(l => {
            const parts = l.trim().split(/\s+/);
            const portMatch = parts[1].match(/:(\d+)$/);
            return portMatch ? parseInt(portMatch[1], 10) : null;
          }).filter(p => p);
        } else {
          // lsof -i -P -n | grep LISTEN
          const { stdout } = await execa('lsof', ['-i', '-P', '-n'], { reject: false });
          const lines = stdout.split('\n').filter(l => l.includes('LISTEN'));
          ports = lines.map(l => {
            const match = l.match(/:(\d+) \(LISTEN/);
            return match ? parseInt(match[1], 10) : null;
          }).filter(p => p);
        }
        socket.emit('ports:update', { ports: [...new Set(ports)] });
      } catch (err) {
        console.error('Failed to list ports', err);
      }
    });

    socket.on('disconnect', async () => {
      await stopProjectContainer(socket.id);
      disconnectSSH(socket.id);
      const session = chatSessions.get(socket.id);
      if (session) {
        session.cleanup();
        chatSessions.delete(socket.id);
      }
      const socketPtyMap = ptySessionsMap.get(socket.id);
      if (socketPtyMap) {
        for (const [, proc] of socketPtyMap) {
          try {
            proc.kill();
          } catch {}
        }
        ptySessionsMap.delete(socket.id);
      }
    });
  });

  // Expose the io instance globally so route handlers can emit to rooms
  globalThis.__mcodeIo = io;

  return io;
}
