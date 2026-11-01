import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { db } from './db.js';
import { SOCKET } from '@mcode/shared';
import { ChatSession } from './chat-session.js';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createPtySession, writeToPty, resizePty, killPty, killAllPty, adoptOrphan } from './pty-manager.js';
import { runSmart } from './piston-client.js';
import { ensureProjectContainer, execInContainer, stopProjectContainer, getContainerPort } from './docker-runner.js';
import { connectSSH, sendToSSH, disconnectSSH } from './ssh-manager.js';
import { spawn } from 'node:child_process';

// Per-socket chat sessions (web clients only)
const chatSessions = new Map();

// PTY terminal sessions live in pty-manager.js (single owner).
// (Removed duplicate local ptySessionsMap — BUG-34.)

const { join } = path;
const { resolve: pathResolve, relative: pathRelative, isAbsolute: pathIsAbsolute } = path;
const WORKSPACE_ROOT = path.join(os.homedir(), 'mcode-workspaces');

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
    if (fs.existsSync('/bin/bash')) shells.push({ id: 'bash', label: 'bash', path: '/bin/bash' });
    if (fs.existsSync('/bin/sh')) shells.push({ id: 'sh', label: 'sh', path: '/bin/sh' });
    if (fs.existsSync('/bin/ash')) shells.push({ id: 'ash', label: 'ash', path: '/bin/ash' });
    if (fs.existsSync('/bin/zsh')) shells.push({ id: 'zsh', label: 'zsh', path: '/bin/zsh' });
    if (fs.existsSync('/usr/bin/fish')) shells.push({ id: 'fish', label: 'fish', path: '/usr/bin/fish' });
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
 * BKD-001: real bugcheck tier implementations (static analysis, no AI).
 * Each returns an array of findings: { tier, file, line, rule, message, severity }.
 * All tools run with tight timeouts and degrade to [] when unavailable.
 */
const BUGCHECK_MAX_FINDINGS = 50;

function bugcheckBin(projectPath, name) {
  const exe = process.platform === 'win32' ? `${name}.cmd` : name;
  return path.join(projectPath, 'node_modules', '.bin', exe);
}

async function bugcheckBinExists(projectPath, name) {
  try {
    await fs.promises.stat(bugcheckBin(projectPath, name));
    return true;
  } catch {
    return false;
  }
}

/** Tier 1: ESLint (errors only) + tsc --noEmit error lines. */
async function runBugcheckTier1(projectPath) {
  const findings = [];
  const { execa } = await import('execa');
  if (await bugcheckBinExists(projectPath, 'eslint')) {
    try {
      const { stdout } = await execa(bugcheckBin(projectPath, 'eslint'), ['.', '--format', 'json'], {
        cwd: projectPath, timeout: 90_000, reject: false,
      });
      const reports = JSON.parse(stdout || '[]');
      for (const r of reports) {
        const rel = path.relative(projectPath, r.filePath);
        for (const msg of (r.messages || []).filter((x) => x.severity === 2)) {
          findings.push({ tier: 1, file: rel, line: msg.line || 0, rule: msg.ruleId || 'eslint', message: msg.message, severity: 'high' });
          if (findings.length >= BUGCHECK_MAX_FINDINGS) return findings;
        }
      }
    } catch {
      // eslint unavailable/failed - tsc below is the backstop
    }
  }
  if (await bugcheckBinExists(projectPath, 'tsc')) {
    try {
      const { stdout, stderr } = await execa(bugcheckBin(projectPath, 'tsc'), ['--noEmit', '--pretty', 'false'], {
        cwd: projectPath, timeout: 90_000, reject: false,
      });
      for (const line of String(stdout + stderr).split('\n')) {
        const mt = /(.+?)\((\d+),\d+\):\s*error\s*(TS\d+):\s*(.*)/.exec(line);
        if (mt) {
          findings.push({ tier: 1, file: mt[1], line: Number(mt[2]), rule: mt[3], message: mt[4], severity: 'high' });
          if (findings.length >= BUGCHECK_MAX_FINDINGS) break;
        }
      }
    } catch {
      /* tsc unavailable — eslint results stand */
    }
  }
  return findings;
}

/** Tier 2: known crash-prone patterns via bounded source scan. */
async function runBugcheckTier2(projectPath) {
  const findings = [];
  const PATTERNS = [
    { re: /\beval\s*\(/, rule: 'no-eval', message: 'eval() enables code injection', severity: 'high' },
    { re: /new\s+Function\s*\(/, rule: 'no-new-function', message: 'new Function() enables code injection', severity: 'high' },
    { re: /exec\w*\(\s*[`'"][^`'"]*\$\{/, rule: 'shell-injection', message: 'possible shell injection via template-built command', severity: 'high' },
    { re: /JSON\.parse\s*\(\s*req\./, rule: 'unsafe-json-parse', message: 'unvalidated JSON.parse on request data (throws on malformed input)', severity: 'medium' },
    { re: /process\.exit\s*\(/, rule: 'process-exit', message: 'process.exit() in library code crashes the host', severity: 'medium' },
    { re: /\.innerHTML\s*=\s*[^'"]*\+/, rule: 'xss-concat', message: 'innerHTML built via concatenation (XSS risk)', severity: 'medium' },
  ];
  const stack = [projectPath];
  let filesSeen = 0;
  while (stack.length && filesSeen < 500 && findings.length < BUGCHECK_MAX_FINDINGS) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(e.name)) {
        filesSeen++;
        let src;
        try {
          const st = await fs.promises.stat(full);
          if (st.size > 200_000) continue;
          src = await fs.promises.readFile(full, 'utf8');
        } catch {
          continue;
        }
        const rel = path.relative(projectPath, full);
        const lines = src.split('\n');
        for (let i = 0; i < lines.length && findings.length < BUGCHECK_MAX_FINDINGS; i++) {
          for (const p of PATTERNS) {
            if (p.re.test(lines[i])) {
              findings.push({ tier: 2, file: rel, line: i + 1, rule: p.rule, message: p.message, severity: p.severity });
              break;
            }
          }
        }
      }
    }
  }
  return findings;
}

/** Tier 3: `npm audit --json` (best-effort; [] when offline/no package.json). */
async function runBugcheckTier3(projectPath) {
  const findings = [];
  try {
    await fs.promises.stat(path.join(projectPath, 'package.json'));
  } catch {
    return findings;
  }
  try {
    const { execa } = await import('execa');
    const { stdout } = await execa('npm', ['audit', '--json'], {
      cwd: projectPath, timeout: 60_000, reject: false,
    });
    const data = JSON.parse(stdout || '{}');
    const advisories = data.advisories || data.vulnerabilities || {};
    for (const [name, adv] of Object.entries(advisories)) {
      const sev = String(adv.severity || 'medium').toLowerCase();
      findings.push({
        tier: 3, file: 'package.json', line: 0, rule: `npm-audit:${name}`,
        message: `${adv.title || name} (${adv.severity || 'unknown'}${adv.url ? ` — ${adv.url}` : ''})`,
        severity: sev === 'critical' || sev === 'high' ? 'high' : 'medium',
      });
      if (findings.length >= 30) break;
    }
  } catch {
    /* offline or npm missing — honest empty, not fake clean */
  }
  return findings;
}

/**
 * Socket.IO server — clients connect with `{ path: '/live' }`, which maps to
 * the default namespace '/' (path is the engine.io URL path, not a namespace).
 * CLI agents connect without a token and only EMIT; web clients
 * authenticate so they can join rooms.
 */
export function attachSockets(httpServer, { secret, env = process.env, ioOptions = {} }) {
  const allowedOrigins = String(env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    path: '/live',
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, Electron, CLI emitter)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Allow local dev origins when not in production
        if (env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS blocked: origin not allowed for socket connection'));
      },
      credentials: true
    },
    ...ioOptions
  });

  // SEC-008: CLI → backend emitter auth. When CLI_SHARED_SECRET is configured,
  // unauthenticated sockets may connect (backward compat) but their broadcast
  // events are dropped unless they present the shared secret.
  const cliSecret = String(env.CLI_SHARED_SECRET || env.MCODE_CLI_SECRET || '');
  let noSecretWarned = false;
  // BKD-006: GLOBAL rate limiting (per userId, or per IP when unauthenticated)
  // plus a per-IP connection cap. Per-socket buckets alone let an attacker
  // multiply their budget by opening N connections.
  const GLOBAL_RATE_WINDOW_MS = 60_000;
  const GLOBAL_RATE_MULTIPLIER = 5; // global budget = 5x the per-socket budget
  const MAX_CONN_PER_IP = 20;
  const globalBuckets = new Map(); // `${key}:${event}` -> { windowStart, count }
  const connByIp = new Map(); // ip -> live connection count
  const socketIp = (socket) => String(socket.handshake.address || socket.handshake.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown');
  const globalCheckRate = (key, event, max) => {
    if (!max) return true;
    const now = Date.now();
    // SOCK-036: opportunistic sweep so idle keys never accumulate.
    if (globalBuckets.size > 5000) {
      for (const [k, v] of globalBuckets) {
        if (now - v.windowStart > GLOBAL_RATE_WINDOW_MS) globalBuckets.delete(k);
        if (globalBuckets.size <= 4000) break;
      }
    }
    const gkey = `${key}:${event}`;
    const row = globalBuckets.get(gkey) || { windowStart: now, count: 0 };
    if (now - row.windowStart > GLOBAL_RATE_WINDOW_MS) {
      row.windowStart = now;
      row.count = 0;
    }
    row.count += 1;
    globalBuckets.set(gkey, row);
    return row.count <= max * GLOBAL_RATE_MULTIPLIER;
  };
  /**
   * M11-005: a socket must present EITHER a valid user JWT or the CLI shared
   * secret. Previously a tokenless handshake called `next()` unconditionally,
   * so an anonymous socket connected successfully and 28 of 40 handlers had
   * no `requireAuth` — making the cross-tenant diskPath IDOR (M11-004)
   * reachable without logging in.
   *
   * The CLI emitter is a legitimate non-user client, so it is admitted on
   * `CLI_SHARED_SECRET` alone and marked `emitterAuthed`; `requireEmitterAuth`
   * then gates the CLI->server event surface it is actually allowed to use.
   */
  io.use((/** @type {import('socket.io').Socket & { userId?: string|null, role?: string, emitterAuthed?: boolean }} */ socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      socket.userId = null;
      socket.role = 'emitter';
      const presented = String(socket.handshake.auth?.cliSecret || socket.handshake.headers?.['x-cli-secret'] || '');
      socket.emitterAuthed = Boolean(cliSecret && presented && presented === cliSecret);
      if (socket.emitterAuthed) return next();

      // M11-005: no token AND no valid CLI secret -> refuse the connection.
      if (cliSecret) {
        console.warn('[SOCKET] rejected: no token and missing/invalid CLI_SHARED_SECRET');
      } else if (!noSecretWarned) {
        noSecretWarned = true;
        console.warn('[SOCKET] rejected anonymous socket: CLI_SHARED_SECRET not configured and no user token presented (set it in backend .env)');
      }
      return next(new Error('authentication required'));
    }
    try {
      // M11-006: pin HS256 so a token cannot negotiate its own algorithm.
      const payload = verifyToken(token, secret, { algorithms: ['HS256'] });
      socket.userId = payload.sub;
      socket.role = 'listener';
      socket.emitterAuthed = true;
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  /**
   * @typedef {import('socket.io').Socket & {
   *   userId?: string|null, role?: string, emitterAuthed?: boolean, rateKey?: string
   * }} McodeSocket
   */
  io.on('connection', (/** @type {McodeSocket} */ socket) => {
    console.log('[SOCKET] connection:', socket.id, 'role:', socket.role, 'url:', socket.handshake.url);
    // SECURITY: private per-user room — authed relay traffic (agent progress,
    // watch results, …) goes to its owner only, never to every client.
    if (socket.userId) socket.join(`user:${socket.userId}`);
    // Authenticated web listeners (shared-secret CLI emitters relay here).
    if (socket.role === 'listener') socket.join('web');
    // BKD-006: per-IP connection cap + per-key identity for global budgets.
    const ip = socketIp(socket);
    socket.rateKey = socket.userId ? `user:${socket.userId}` : `ip:${ip}`;
    connByIp.set(ip, (connByIp.get(ip) || 0) + 1);
    if (connByIp.get(ip) > MAX_CONN_PER_IP) {
      connByIp.set(ip, connByIp.get(ip) - 1);
      socket.emit('error', { code: 'TOO_MANY_CONNECTIONS', message: `too many connections from ${ip} — slow down` });
      socket.disconnect(true);
      return;
    }
    socket.on('disconnect', () => {
      connByIp.set(ip, Math.max(0, (connByIp.get(ip) || 1) - 1));
      // SOCK-036: prune per-socket rate-limit buckets on disconnect
      if (typeof buckets !== 'undefined') buckets.clear();
    });
    // Per-socket token buckets (BUG-37): cheap DoS guard for expensive events.
    // Limits are per minute; over-limit callers get a `rate_limited` error.
    const buckets = new Map();
    const SOCKET_LIMITS = {
      'chat:send': 20,
      'terminal:command': 60,
      'code:run-file': 30,
      'project:run': 10,
      'test:run': 20,
      'debug:start': 20,
      'debug:evaluate': 60,
      'terminal:spawn': 20,
    };
    const checkRate = (event) => {
      const max = SOCKET_LIMITS[event];
      if (!max) return true;
      if (!globalCheckRate(socket.rateKey, event, max)) {
        socket.emit('error', { code: 'RATE_LIMITED', message: `${event} rate-limited globally — slow down` });
        return false;
      }
      const now = Date.now();
      const row = buckets.get(event) || { windowStart: now, count: 0 };
      if (now - row.windowStart > 60_000) {
        row.windowStart = now;
        row.count = 0;
      }
      row.count += 1;
      buckets.set(event, row);
      if (row.count > max) {
        socket.emit('error', { code: 'RATE_LIMITED', message: `${event} rate-limited — slow down` });
        return false;
      }
      return true;
    };
    const requireAuth = (event) => {
      if (!socket.userId) {
        socket.emit('error', { code: 'UNAUTH', message: `${event} requires authentication` });
        return false;
      }
      return true;
    };
    /** SECURITY: authed relays are scoped to the sender's identity.
     *  - A user-JWT socket (web dashboard) relays only to its own private
     *    room: the previous io.emit() broadcast every user's agent/watch/
     *    bugcheck results to all connected clients.
     *  - A shared-secret CLI emitter owns no user identity, so its relay
     *    stays visible to all authenticated dashboards (the `web` room),
     *    which is the pre-existing behavior for that connection class. */
    const relayEvent = (event, payload) => {
      if (socket.userId) io.to(`user:${socket.userId}`).emit(event, payload);
      else if (socket.emitterAuthed) io.to('web').emit(event, payload);
      else socket.emit(event, payload);
    };
    socket.on('terminal:command', (payload) => {
      // SOCK-037: sanitize control characters before logging
      // eslint-disable-next-line no-control-regex -- matching control chars is the point here
      const safe = JSON.stringify(payload).replace(/[\x00-\x1f\x7f]/g, '?').slice(0, 500);
      console.log('[SOCKET] terminal:command received:', safe);
    });
    socket.on('session:join', ({ sessionId }) => {
      socket.join(`session:${sessionId}`);
    });
    socket.on('project:join', async ({ projectId } = {}) => {
      // SECURITY: project rooms carry audit/security/watch results — joining
      // another user's room let any connected client read them. Only owners.
      if (!socket.userId || !projectId) return;
      try {
        const ws = await db().workspace.findOne({
          _id: String(projectId),
          userId: socket.userId
        });
        if (!ws) return;
        socket.join(`project:${projectId}`);
      } catch {
        /* malformed projectId — do not join */
      }
    });

    /**
     * M11-004: resolve a workspace path from a client-supplied projectId,
     * ALWAYS scoped to the caller.
     *
     * Eight handlers previously did `workspace.findOne({ _id: projectId })`
     * with no `userId` filter and then ran a tool against `ws.diskPath`.
     * Three of them (clean:run, migrate:run, security:fix-selected) WRITE to
     * that directory, so the unscoped lookup let any caller point them at
     * another user's source tree by id alone.
     *
     * The correct scoped pattern already existed at chat:start and
     * spawnPtySession; this helper makes it the only way to resolve a path.
     *
     * @returns {Promise<string|null>} the owned diskPath, or null when the
     *   workspace does not exist or is not owned by this socket's user.
     */
    async function resolveOwnedWorkspace(socket, projectId) {
      if (!projectId) return null;
      if (!socket.userId) return null; // fail closed for anonymous sockets
      try {
        const ws = await db().workspace.findOne({
          _id: String(projectId),
          userId: socket.userId,
        });
        return ws?.diskPath || null;
      } catch {
        return null;
      }
    }

    const requireEmitterAuth = (event) => {
      if (socket.role === 'emitter' && cliSecret && !socket.emitterAuthed) {
        socket.emit('error', { code: 'EMITTER_UNAUTH', message: `${event} requires CLI_SHARED_SECRET` });
        return false;
      }
      return true;
    };
    // CLI → server events, broadcast to connected web clients.
    // (Room-based fan-out is optional; web clients don't always join rooms yet.)
    for (const event of ['session:start', 'plan:generated', 'agent:started', 'agent:step', 'agent:file', 'agent:done', 'agent:failed', 'agent:needs_review', 'integration:pass', 'build:complete', 'toast']) {
      socket.on(event, async (payload = {}) => {
        if (!requireEmitterAuth(event)) return;
        relayEvent(event, payload);
        // persistence for build results
        if (event === 'build:complete' && payload.sessionId) {
          try {
            await db().session.create({
              userId: socket.userId,
              projectName: payload.projectName || 'mcode build',
              mode: 'god',
              status: 'completed',
              plan: payload.plan || null,
              results: payload
            });
          } catch (err) {
            console.error('[SOCKET] Failed to persist build:complete session:', err.message);
          }
        }
      });
    }
    for (const event of ['watch:scan', 'watch:fix', 'watch:status', 'watch:activity']) {
      socket.on(event, async (payload = {}) => {
        if (!requireEmitterAuth(event)) return;
        relayEvent(event, payload);
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
            relayEvent('watch:activity', item);
            if (payload.projectId) {
              io.to(`project:${payload.projectId}`).emit('watch:activity', item);
            }
          }
          try {
            await db().watchActivity.create(item);
          } catch {
            /* best-effort persistence — event was already broadcast */
          }
        }
      });
    }

    socket.on('watch:start', (payload = {}) => {
      if (!requireEmitterAuth('watch:start')) return;
      const projectId = payload.projectId;
      if (projectId) {
        io.to(`project:${projectId}`).emit('watch:start-signal', payload);
        io.to(`project:${projectId}`).emit('watch:status', { status: 'running', projectId });
      }
      relayEvent('watch:status', { status: 'running', ...payload });
    });

    socket.on('watch:stop', (payload = {}) => {
      if (!requireEmitterAuth('watch:stop')) return;
      const projectId = payload.projectId;
      if (projectId) {
        io.to(`project:${projectId}`).emit('watch:stop-signal', payload);
        io.to(`project:${projectId}`).emit('watch:status', { status: 'stopped', projectId });
      }
      relayEvent('watch:status', { status: 'stopped', ...payload });
    });

    // ── Bug Check mode events (doc 44) ──────────────────────────
    for (const event of ['bugcheck:tier-start', 'bugcheck:tier-done', 'bugcheck:done']) {
      socket.on(event, (payload = {}) => {
        if (!requireEmitterAuth(event)) return;
        relayEvent(event, payload);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit(event, payload);
        }
      });
    }

    // BKD-001: REAL static analysis (was a hardcoded setTimeout cascade that
    // always reported "0 findings"). Tiers 1-3 run actual tools; tier 4 is
    // reported honestly as unavailable when no AI path is wired.
    socket.on('bugcheck:start', async (payload = {}) => {
      if (!requireEmitterAuth('bugcheck:start')) return;
      const projectId = payload.projectId;
      if (projectId) {
        io.to(`project:${payload.projectId}`).emit('bugcheck:start-signal', payload);
      }
      relayEvent('bugcheck:start', payload);

      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      const noAI = !!payload.noAI;
      const emitTier = (ev, data) => {
        relayEvent(ev, data);
        if (projectId) io.to(`project:${projectId}`).emit(ev, data);
      };

      try {
        emitTier('bugcheck:tier-start', { tier: 1, label: 'Syntax & Type Errors', costsAI: false, projectId });
        const t1 = await runBugcheckTier1(projectPath);
        emitTier('bugcheck:tier-done', { tier: 1, projectId, findings: t1, isProblemEntry: true });

        emitTier('bugcheck:tier-start', { tier: 2, label: 'Known Crash Patterns', costsAI: false, projectId });
        const t2 = await runBugcheckTier2(projectPath);
        emitTier('bugcheck:tier-done', { tier: 2, projectId, findings: t2, isProblemEntry: true });

        emitTier('bugcheck:tier-start', { tier: 3, label: 'Dependency Vulnerabilities', costsAI: false, projectId });
        const t3 = await runBugcheckTier3(projectPath);
        emitTier('bugcheck:tier-done', { tier: 3, projectId, findings: t3, isProblemEntry: true });

        const staticFindings = [...t1, ...t2, ...t3];
        const crashRiskCount = staticFindings.filter((f) => f.severity === 'high').length;

        if (noAI) {
          emitTier('bugcheck:done', { projectId, reportUrl: null, totalFindings: staticFindings.length, crashRiskCount });
          return;
        }
        // Tier 4: Deep Logic & Flow Analysis (AI) — no model is wired into the
        // backend for this; report honestly instead of faking "all clear".
        emitTier('bugcheck:tier-start', { tier: 4, label: 'Deep Logic & Flow Analysis', costsAI: true, projectId });
        emitTier('bugcheck:tier-done', {
          tier: 4,
          projectId,
          findings: [],
          isProblemEntry: false,
          note: 'AI deep analysis is not wired to a model in this backend build — use chat/god mode for AI review. Tiers 1-3 above are real static results.'
        });
        emitTier('bugcheck:done', { projectId, reportUrl: null, totalFindings: staticFindings.length, crashRiskCount });
      } catch (err) {
        socket.emit('chat:error', { message: `Bug check failed: ${err.message}` });
        emitTier('bugcheck:done', { projectId, reportUrl: null, totalFindings: 0, crashRiskCount: 0, error: err.message });
      }
    });

    // ── Security Checkup Mode (doc 47) ───────────────────────────
    socket.on('security:check', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      try {
        const { runSecurityCheck, saveReport } = await import('mcode-cli/security-checkup');
        const results = await runSecurityCheck({ projectPath, category: payload.category });
        const { reportFileName } = saveReport(results, projectPath);
        const reportUrl = `/api/v1/workspaces/report/${reportFileName}`;
        socket.emit('security:findings', { ...results, reportUrl });
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit('security:findings', { ...results, reportUrl });
        }
      } catch (err) {
        socket.emit('chat:error', { message: `Security checkup failed: ${err.message}` });
      }
    });

    socket.on('security:fix-selected', async ({ ids, projectId }) => {
      if (!ids || ids.length === 0) return;
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      const { CHECKLIST, fixFinding, reCheckSelected, runSecurityCheck, saveReport } = await import('mcode-cli/security-checkup');
      const planSummary = ids
        .map((id) => {
          const c = CHECKLIST.find((item) => item.id === id);
          return c ? `• ${c.label}` : `• ${id}`;
        })
        .join('\n');

      // Permission gate (doc 33 kind discriminator)
      const permitted = await new Promise((resolve) => {
        if (session?.config?.allowShellAll || session?.config?.permissionMode === 'full') {
          return resolve(true);
        }
        const requestId = `secfix-perm-${Date.now()}`;
        const onAnswer = (payload = {}) => {
          if (payload.requestId === requestId) {
            socket.off('chat:permission_answer', onAnswer);
            resolve(payload.answer === 'yes' || payload.answer === 'always');
          }
        };
        socket.on('chat:permission_answer', onAnswer);
        setTimeout(() => {
          socket.off('chat:permission_answer', onAnswer);
          resolve(false);
        }, 60000);

        socket.emit('chat:permission', {
          requestId,
          status: 'running',
          kind: 'security-fix',
          count: ids.length,
          planSummary
        });
      });

      if (!permitted) return;

      const todos = ids.map((id) => ({
        id: `secfix-${id}`,
        title: `Fix: ${CHECKLIST.find((c) => c.id === id)?.label || id}`,
        domain: 'security'
      }));

      for (const todo of todos) {
        const id = todo.id.replace('secfix-', '');
        const finding = CHECKLIST.find((c) => c.id === id);
        await fixFinding(finding || id, projectPath);
      }

      const reVerified = await reCheckSelected(ids, projectPath);
      const freshResults = await runSecurityCheck({ projectPath });
      const { reportFileName } = saveReport(freshResults, projectPath);
      const reportUrl = `/api/v1/workspaces/report/${reportFileName}`;

      socket.emit('security:fix-complete', {
        results: reVerified,
        updatedFindings: freshResults.findings,
        reportUrl
      });
      if (projectId) {
        io.to(`project:${projectId}`).emit('security:fix-complete', {
          results: reVerified,
          updatedFindings: freshResults.findings,
          reportUrl
        });
      }
    });

    // ── Test Mode (doc 48) — autonomous self-healing testing agent ──
    socket.on('test:mode:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      if (!session) {
        socket.emit('chat:error', { message: 'chat session not started — send chat:start first' });
        return;
      }
      if (!socket.userId) {
        socket.emit('chat:error', { message: 'authentication required for test mode' });
        return;
      }
      try {
        await session.runTestMode(payload.prompt || '', {
          types: Array.isArray(payload.types) ? payload.types : null,
          targetUrl: payload.targetUrl || null,
          allowRemote: Boolean(payload.allowRemote)
        });
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
        socket.emit('chat:done', { text: '', mode: 'test', interrupted: false, error: true });
      }
    });

    // ── Review Mode (doc 49) — senior dev code review ──────────────
    socket.on('review:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      try {
        const { runReview } = await import('mcode-cli/review');
        const findings = await runReview({
          scope: payload.scope || 'diff',
          target: payload.target || null,
          router: session?.router || null,
          projectPath
        });
        socket.emit('review:result', { findings });
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit('review:result', { findings });
        }
      } catch (err) {
        socket.emit('chat:error', { message: `review failed: ${err.message}` });
        socket.emit('review:result', { findings: [] });
      }
    });

    // ── Migrate Mode (doc 51) ──────────────────────────────────────
    socket.on('migrate:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      try {
        const { runMigrate } = await import('mcode-cli/migrate');
        const { EventEmitter } = await import('node:events');
        const bus = new EventEmitter();

        bus.on('MIGRATE_STATUS', (evt) => {
          socket.emit('migrate:status', evt);
          if (payload.projectId) {
            io.to(`project:${payload.projectId}`).emit('migrate:status', evt);
          }
        });

        bus.on('MIGRATE_PASS_RESULT', (evt) => {
          socket.emit('migrate:pass_result', evt);
          if (payload.projectId) {
            io.to(`project:${payload.projectId}`).emit('migrate:pass_result', evt);
          }
        });

        const result = await runMigrate(payload.prompt, {
          projectPath,
          router: session?.router || null,
          bus,
          yes: true,
          maxPasses: payload.maxPasses || 5
        });

        socket.emit('migrate:complete', result);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit('migrate:complete', result);
        }
      } catch (err) {
        socket.emit('chat:error', { message: `Migration failed: ${err.message}` });
        socket.emit('migrate:complete', { equivalent: false, error: err.message });
      }
    });

    // ── Audit Mode (doc 52) ────────────────────────────────────────
    socket.on('audit:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      try {
        const { runAudit, generateAuditPDF } = await import('mcode-cli/audit-mode');
        const categories = payload.category ? [payload.category] : undefined;
        const result = await runAudit(projectPath, { categories });

        let pdfUrl = null;
        if (payload.pdf) {
          const { join } = await import('node:path');
          const dateStr = new Date().toISOString().slice(0, 10);
          const pdfFileName = `audit-${dateStr}.pdf`;
          const pdfPath = join(projectPath, '.mcode', 'reports', pdfFileName);
          await generateAuditPDF(result, pdfPath);
          pdfUrl = `/api/v1/workspaces/report/${pdfFileName}`;
        }

        const reportUrl = result.reportFileName ? `/api/v1/workspaces/report/${result.reportFileName}` : null;

        const responsePayload = {
          ...result,
          reportUrl,
          pdfUrl
        };

        socket.emit('audit:result', responsePayload);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit('audit:result', responsePayload);
        }
      } catch (err) {
        socket.emit('chat:error', { message: `Audit failed: ${err.message}` });
        socket.emit('audit:result', { grades: {}, overallGrade: 'F', error: err.message });
      }
    });

    // ── Pair Mode Structural Suggestion on natural idle pause (doc 53) ────
    socket.on('pair:idle', async (payload = {}) => {
      const { fileContent = '', cursorLine = 1, filePath = '', recentEdits = [] } = payload;
      if (!fileContent) return;

      try {
        const session = chatSessions.get(socket.id);
        const { checkForStructuralSuggestion } = await import('./routes/pair.js');
        const suggestion = await checkForStructuralSuggestion(
          { fileContent, cursorLine, filePath, recentEdits },
          { router: session?.router || null }
        );
        if (suggestion) {
          socket.emit('pair:suggestion', suggestion);
        }
      } catch {
        // Silently skip structural error
      }
    });

    // ── Clean Mode (doc 55) — Dead code & AI bloat detection + removal ──
    for (const event of ['clean:scan-start', 'clean:tier1-done', 'clean:tier2-done', 'clean:findings', 'clean:status', 'clean:pass-result', 'clean:done']) {
      socket.on(event, (payload = {}) => {
        if (!requireEmitterAuth(event)) return;
        relayEvent(event, payload);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit(event, payload);
        }
      });
    }

    socket.on('clean:scan', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      try {
        const { findDeadCode, findBloat } = await import('mcode-cli/clean');
        socket.emit('clean:scan-start', { projectPath });
        if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:scan-start', { projectPath });

        const tier1Findings = await findDeadCode(projectPath);
        socket.emit('clean:tier1-done', { findings: tier1Findings });
        if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:tier1-done', { findings: tier1Findings });

        let tier2Findings = [];
        if (!payload.deadCodeOnly) {
          try {
            tier2Findings = await findBloat(projectPath, {
              projectPath,
              thresholdLines: payload.thresholdLines || 30,
              router: session?.router || null
            });
          } catch (err) {
            console.warn('[clean:scan] tier 2 warning:', err.message);
          }
        }
        socket.emit('clean:tier2-done', { findings: tier2Findings });
        if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:tier2-done', { findings: tier2Findings });

        const allFindings = [...tier1Findings, ...tier2Findings];
        const totalLinesRemovable = allFindings.reduce((sum, f) => {
          const diff = Math.max(0, (f.currentLines || 1) - (f.estimatedCleanLines || 0));
          return sum + diff;
        }, 0);

        socket.emit('clean:findings', { findings: allFindings, totalLinesRemovable });
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit('clean:findings', { findings: allFindings, totalLinesRemovable });
        }
      } catch (err) {
        socket.emit('chat:error', { message: `Clean scan failed: ${err.message}` });
        socket.emit('clean:findings', { findings: [], totalLinesRemovable: 0, error: err.message });
      }
    });

    socket.on('clean:run', async (payload = {}) => {
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      if (!projectPath && payload.projectId) {
          projectPath = (await resolveOwnedWorkspace(socket, payload.projectId)) || projectPath;
      }
      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      try {
        const { runClean } = await import('mcode-cli/clean');
        const { EventEmitter } = await import('node:events');
        const bus = new EventEmitter();

        bus.on('CLEAN_STATUS', (evt) => {
          socket.emit('clean:status', evt);
          if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:status', evt);
        });

        bus.on('CLEAN_ITEM_DONE', (evt) => {
          socket.emit('clean:item-done', evt);
          if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:item-done', evt);
        });

        bus.on('CLEAN_PASS_RESULT', (evt) => {
          socket.emit('clean:pass-result', evt);
          if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:pass-result', evt);
        });

        bus.on('CLEAN_COMPLETE', (evt) => {
          socket.emit('clean:done', evt);
          if (payload.projectId) io.to(`project:${payload.projectId}`).emit('clean:done', evt);
        });

        const result = await runClean(projectPath, {
          selectedFindings: payload.selectedFindings || [],
          bus,
          router: session?.router || null
        });

        socket.emit('clean:done', result);
        if (payload.projectId) {
          io.to(`project:${payload.projectId}`).emit('clean:done', result);
        }
      } catch (err) {
        socket.emit('chat:error', { message: `Clean execution failed: ${err.message}` });
        socket.emit('clean:done', { ok: false, error: err.message });
      }
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

      const { workspaceId, modelRef, outputLength } = payload;

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
          if (outputLength) {
            session.outputLength = outputLength;
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
        env,
        workspacePath,
        modelRef,
        outputLength: outputLength || 'xhigh',
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
      if (!checkRate('chat:send')) return;
      const session = chatSessions.get(socket.id);
      if (!session) {
        socket.emit('chat:error', { message: 'chat session not started — send chat:start first' });
        return;
      }
      const { prompt, mode = 'chat', outputLength } = payload;
      if (!prompt && mode !== 'test') return;
      try {
        if (mode === 'god') {
          await session.runGod(prompt);
        } else if (mode === 'test') {
          await session.runTestMode(prompt, {
            types: payload.types || null,
            targetUrl: payload.targetUrl || null,
            allowRemote: Boolean(payload.allowRemote)
          });
        } else {
          await session.sendMessage(prompt, mode, { outputLength });
        }
      } catch (err) {
        console.error('[chat:send] handler error:', err.message);
        // SOCK-045: only send chat:done if the session hasn't already emitted
        // one (double-emit would overwrite the real response with an empty one).
        // FIX: tell the client WHY it failed — the old bare chat:done showed a
        // spinner that ended with no explanation.
        socket.emit(SOCKET.SERVER_TO_CLIENT.CHAT_ERROR, { message: err.message || 'chat failed' });
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
      if (!checkRate('code:run-file')) return;
      if (!requireAuth('code:run-file')) return;
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
      if (!checkRate('debug:start')) return;
      if (!requireAuth('debug:start')) return;
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
        // SOCK-039: validate CWD stays within workspace
        const resolvedWs = path.resolve(workspace);
        const resolvedFile = path.resolve(filePath);
        if (!resolvedFile.startsWith(resolvedWs + path.sep) && resolvedFile !== resolvedWs) {
          return socket.emit('debug:error', { message: 'filename must stay within workspace' });
        }
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, code, 'utf8');

        // 041: probe candidates until a free inspector port is found
        // instead of gambling on one random draw.
        const { default: net } = await import('node:net');
        const probeFree = (p) => new Promise((resolve) => {
          const s = net.createServer();
          s.once('error', () => resolve(false));
          s.once('listening', () => s.close(() => resolve(true)));
          s.listen(p, '127.0.0.1');
        });
        let port = 0;
        for (let i = 0; i < 5 && !port; i++) {
          const cand = 9229 + Math.floor(Math.random() * 1000);
          if (await probeFree(cand)) port = cand;
        }
        if (!port) {
          return socket.emit('debug:error', { message: 'no free inspector port found — try again' });
        }
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

    socket.on('debug:stop', async () => {
      if (!requireAuth('debug:stop')) return;
      const session = activeDebugSessions.get(socket.id);
      if (session && session.child) {
        // 042: tree-kill (taskkill on Windows) instead of bare SIGTERM.
        const { killTree } = await import('./kill-tree.js');
        killTree(session.child);
        activeDebugSessions.delete(socket.id);
      }
      socket.emit('debug:stopped');
    });

    // ── CDP evaluate in the paused debuggee (Variables pane) ──────────
    socket.on('debug:evaluate', async (payload = {}) => {
      if (!checkRate('debug:evaluate')) return;
      if (!requireAuth('debug:evaluate')) return;
      const session = activeDebugSessions.get(socket.id);
      if (!session) {
        return socket.emit('debug:error', { message: 'no active debug session — start one first' });
      }
      const expression = String(payload.expression || '');
      if (!expression) {
        return socket.emit('debug:evaluate-result', { error: 'expression is required' });
      }
      try {
        const { evaluateInDebugger } = await import('./debug-eval.js');
        const session = activeDebugSessions.get(socket.id);
        if (!session) throw new Error('no active debug session — start one first');
        const result = await evaluateInDebugger(session.port, expression);
        socket.emit('debug:evaluate-result', { expression, result });
      } catch (err) {
        socket.emit('debug:evaluate-result', { expression, error: err.message });
      }
    });

    // ── Full Project Execution (Docker → Host fallback) ────────────────
    // FIX (task:restart): the run logic is a named function so both handlers
    // drive it. Restart used to `socket.emit('project:run')` — a server→
    // client event the client never listens for — so Restart was dead code.
    async function runProject(payload = {}) {
      if (!checkRate('project:run')) return;
      if (!requireAuth('project:run')) return;
      const session = chatSessions.get(socket.id);
      let projectPath = session?.workspacePath;
      let activeWs = null;

      if (!projectPath && payload?.workspaceId) {
        const wsId = String(payload.workspaceId || '');
        // SECURITY: scope the lookup to the authenticated user — accepting
        // any workspaceId let one client run code inside another user's
        // workspace tree.
        try {
          activeWs = await db().workspace.findOne({ _id: wsId, userId: socket.userId });
          if (activeWs?.diskPath) projectPath = activeWs.diskPath;
        } catch {}
        // Directory fallback only for well-formed ids: `join(WORKSPACE_ROOT,
        // workspaceId)` with free-form input allowed ../ traversal into
        // arbitrary directories on the host.
        if (!projectPath && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(wsId)) {
          const candidate = join(WORKSPACE_ROOT, wsId);
          try {
            const { stat } = await import('node:fs/promises');
            const s = await stat(candidate);
            if (s.isDirectory()) projectPath = candidate;
          } catch {}
        }
      }

      if (!projectPath && socket.userId) {
        try {
          const workspaces = await db().workspace.find({ userId: socket.userId });
          if (Array.isArray(workspaces) && workspaces.length > 0) {
            workspaces.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
            activeWs = workspaces[0];
            projectPath = activeWs.diskPath;
          }
        } catch {}
      }

      if (!projectPath) {
        projectPath = await getDefaultWorkspacePath(socket);
      }

      if (!projectPath) {
        return socket.emit('project:run-error', { error: 'No active workspace found' });
      }

      const { readdir } = await import('node:fs/promises');
      const files = await readdir(projectPath);

      // ── Try Docker first ──────────────────────────────────
      try {
        await ensureProjectContainer(socket.id, projectPath, files);

        // Auto-detect and run install + start command. Install is bounded and
        // awaited; the dev server is NOT — `npm start` blocks forever and
        // awaiting it meant `project:run-ready` was never emitted under
        // Docker (the exec stream never 'end's while the server runs).
        await execInContainer(socket.id, 'npm install', (chunk) => {
          socket.emit('chat:shell_stream', { chunk });
        });

        execInContainer(socket.id, 'npm start', (chunk) => {
          socket.emit('chat:shell_stream', { chunk });
        }).catch((startErr) => {
          socket.emit('chat:shell_stream', { chunk: `\r\n\x1b[31m[start] ${startErr.message}\x1b[0m\r\n` });
        });

        let port = await getContainerPort(socket.id);
        if (!port) port = await getContainerPort(socket.id); // extend the 3s poll once more
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
        if (files.includes('index.html') || files.includes('index.htm')) {
          const wsId = activeWs?._id || payload?.workspaceId || projectPath.split(/[\\/]/).filter(Boolean).pop();
          const previewUrl = `/api/v1/workspaces/${wsId}/preview/index.html`;

          // Also attempt to start static port 5500 server as optional local listener
          try {
            const { createServer } = await import('node:http');
            const { readFile, stat } = await import('node:fs/promises');
            const { join, extname } = await import('node:path');

            const mimeTypes = {
              '.html': 'text/html; charset=utf-8',
              '.htm': 'text/html; charset=utf-8',
              '.css': 'text/css; charset=utf-8',
              '.js': 'application/javascript; charset=utf-8',
              '.mjs': 'application/javascript; charset=utf-8',
              '.json': 'application/json; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
              '.ico': 'image/x-icon',
              '.webp': 'image/webp',
              '.woff': 'font/woff',
              '.woff2': 'font/woff2',
              '.ttf': 'font/ttf'
            };

            const staticServer = createServer(async (req, res) => {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
              res.setHeader('X-Frame-Options', 'ALLOWALL');

              try {
                let reqPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
                if (reqPath === '/' || !reqPath) reqPath = '/index.html';
                let filePath = join(projectPath, reqPath);

                // SECURITY: contain every request inside projectPath — without
                // this check `..%2f` (URL-decoded to ../) read files anywhere
                // on the host the server runs on.
                const root = pathResolve(projectPath);
                const resolved = pathResolve(filePath);
                const relToRoot = pathRelative(root, resolved);
                if (!relToRoot || relToRoot.startsWith('..') || pathIsAbsolute(relToRoot)) {
                  res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
                  res.end('Forbidden');
                  return;
                }

                let fileStat = null;
                try { fileStat = await stat(filePath); } catch {}
                if (fileStat && fileStat.isDirectory()) {
                  filePath = join(filePath, 'index.html');
                }

                const content = await readFile(filePath);
                const ext = extname(filePath).toLowerCase();
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                res.end(content);
              } catch {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('File Not Found');
              }
            });

            const existing = activeProjectProcesses.get(socket.id);
            if (existing && typeof existing.close === 'function') {
              try { existing.close(); } catch {}
            }

            // Loopback only — this listener previously bound all interfaces
            // so anyone on the LAN could browse the user's project files.
            staticServer.listen(5500, '127.0.0.1', () => {
              activeProjectProcesses.set(socket.id, {
                close: () => staticServer.close(),
                kill: () => staticServer.close()
              });
            });
            // Don't let EADDRINUSE crash the backend; log it loudly instead of
            // the old silent `staticServer.on('error', () => {})`.
            staticServer.on('error', (err) => {
              console.warn(`[project:run] static preview server error: ${err.message}`);
            });
          } catch {}

          socket.emit('chat:shell_stream', { chunk: `\r\n\x1b[32m[mcode] Static Web Preview ready at ${previewUrl}\x1b[0m\r\n` });
          socket.emit('project:run-ready', { previewUrl });
          return;

        } else if (files.includes('package.json')) {
          // Node.js project — run on PORT 3001 so it never collides with mcode (port 3000)
          socket.emit('chat:shell_stream', { chunk: '\x1b[34m$ npm install\x1b[0m\r\n' });
          const install = execa('npm', ['install'], { cwd: projectPath, reject: false, env: { ...process.env, FORCE_COLOR: '1' } });
          install.stdout?.on('data', streamChunk);
          install.stderr?.on('data', streamChunk);
          await install;

          socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[34m$ npm start\x1b[0m\r\n' });
          const start = execa('npm', ['start'], {
            cwd: projectPath,
            reject: false,
            env: { ...process.env, PORT: '3001', FORCE_COLOR: '1' }
          });
          activeProjectProcesses.set(socket.id, start);

          let detectedPort = null;
          const checkOutputForPort = (data) => {
            const str = data.toString();
            streamChunk(str);
            const portMatch = str.match(/localhost:(\d+)/i) || str.match(/127\.0\.0\.1:(\d+)/i) || str.match(/port\s*[:=]?\s*(\d+)/i);
            if (portMatch && !detectedPort) {
              detectedPort = portMatch[1];
              socket.emit('project:run-ready', { previewUrl: `http://localhost:${detectedPort}` });
            }
          };

          start.stdout?.on('data', checkOutputForPort);
          start.stderr?.on('data', checkOutputForPort);
          start.then(() => {
            activeProjectProcesses.delete(socket.id);
            socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[Process exited]\x1b[0m\r\n' });
          }).catch(() => {
            activeProjectProcesses.delete(socket.id);
          });

          // Fallback if port wasn't explicitly output
          setTimeout(() => {
            if (!detectedPort) {
              socket.emit('project:run-ready', { previewUrl: 'http://localhost:3001' });
            }
          }, 3000);
          return;

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
    }

    socket.on('project:run', (payload = {}) => {
      if (!requireAuth('project:run')) return;
      runProject(payload);
    });

    socket.on('task:terminate', async () => {
      const child = activeProjectProcesses.get(socket.id);
      if (child) {
        if (typeof child.close === 'function') {
          try { child.close(); } catch {}
        }
        // 042: tree-kill so npm/python subtrees don't linger as zombies.
        const { killTree } = await import('./kill-tree.js');
        killTree(child);
        activeProjectProcesses.delete(socket.id);
        socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[Task terminated]\x1b[0m\r\n' });
      } else {
        socket.emit('chat:shell_stream', { chunk: '\r\n\x1b[33m[No running task]\x1b[0m\r\n' });
      }
    });

    socket.on('task:restart', async () => {
      if (!requireAuth('project:restart')) return;
      const child = activeProjectProcesses.get(socket.id);
      if (child) {
        if (typeof child.close === 'function') {
          try { child.close(); } catch {}
        }
        const { killTree } = await import('./kill-tree.js');
        killTree(child);
        activeProjectProcesses.delete(socket.id);
      }
      runProject({});
    });

    // Direct terminal command execution — attempts container execution first,
    // falls back to host workspace execa execution if container is inactive.
    socket.on('terminal:command', async (payload = {}) => {
      if (!checkRate('terminal:command')) return;
      if (!requireAuth('terminal:command')) return;
      const { command } = payload;
      if (!command || !command.trim()) return;

      // SOCK-037: destructive patterns are rejected BEFORE any execution
      // path (a container-side rejection must never fall through to host).
      try {
        const { assertSafeCommand } = await import('./docker-runner.js');
        assertSafeCommand(command);
      } catch (err) {
        socket.emit('chat:shell_stream', { chunk: `\r\n\x1b[31mBlocked: ${err.message}\x1b[0m\r\n` });
        return;
      }

      // Try container execution if active.
      // M11-003: this is now the ONLY execution path. Previously a failure
      // here fell through to host execution, which meant the safety posture
      // silently depended on whether a container happened to be running.
      try {
        socket.emit('chat:shell_stream', { chunk: `\r\x1b[34m$ ${command}\x1b[0m\r\n` });
        await execInContainer(socket.id, command, (chunk) => {
          socket.emit('chat:shell_stream', { chunk });
        });
        return;
      } catch (err) {
        // Fail closed: no container means no shell, not "try the host instead".
        socket.emit('chat:shell_stream', {
          chunk: `\r\n\x1b[31mNo active container for this session — command not run on the host.\x1b[0m\r\n`,
        });
        socket.emit('chat:error', {
          code: 'NO_CONTAINER',
          message: 'Command execution requires an active project container. Start one, or run the CLI directly on the host.',
        });
        return;
      }

      // M11-003: the host-execution fallback that used to live here was removed.
      // It ran `execa(command, { shell: true, env: { ...process.env } })` behind
      // a five-pattern denylist, and only when no container was active — so the
      // security posture silently depended on runtime state. Container
      // execution is now the only path, and it fails closed.
    });

    // ── Real Terminal PTY Session Management (node-pty) ──────────────
    socket.on('terminal:get_shells', () => {
      socket.emit('terminal:available_shells', AVAILABLE_SHELLS);
    });

    async function spawnPtySession(payload = {}) {
      const { id, shellType = 'powershell', cols = 80, rows = 24, cwd, workspaceId } = payload;
      if (!id) return null;

      // Reload-reattach: a live orphan from the grace window wins over spawn.
      const adopted = adoptOrphan(
        socket.id,
        id,
        (data) => socket.emit('terminal:output', { id, data }),
        ({ exitCode, signal }) => {
          socket.emit('terminal:exit', { id, exitCode, signal });
          killPty(socket.id, id);
        },
        socket.userId
      );
      if (adopted) {
        socket.emit('terminal:spawned', { id, shellPath: adopted.shellPath, adopted: true });
        return adopted.ptyProcess;
      }

      let targetCwd = cwd;
      if (!targetCwd && workspaceId) {
        try {
          const ws = await db().workspace.findOne({ _id: String(workspaceId), userId: socket.userId });
          if (ws?.diskPath) {
            targetCwd = ws.diskPath;
          }
        } catch {}
      }
      if (!targetCwd) {
        targetCwd = await getDefaultWorkspacePath(socket);
      }
      if (targetCwd) {
        try {
          const { existsSync } = await import('node:fs');
          if (!existsSync(targetCwd)) {
            const { mkdir } = await import('node:fs/promises');
            await mkdir(targetCwd, { recursive: true });
          }
        } catch {}
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
        if (shellType === 'zsh' && fs.existsSync('/bin/zsh')) shellPath = '/bin/zsh';
        else if (shellType === 'fish' && fs.existsSync('/usr/bin/fish')) shellPath = '/usr/bin/fish';
        else if (shellType === 'bash' && fs.existsSync('/bin/bash')) shellPath = '/bin/bash';
        else if (shellType === 'sh' && fs.existsSync('/bin/sh')) shellPath = '/bin/sh';
        else if (shellType === 'ash' && fs.existsSync('/bin/ash')) shellPath = '/bin/ash';
        else if (shellType === 'node') shellPath = process.execPath;
        else if (process.env.SHELL && fs.existsSync(process.env.SHELL)) shellPath = process.env.SHELL;
        else if (fs.existsSync('/bin/bash')) shellPath = '/bin/bash';
        else if (fs.existsSync('/bin/sh')) shellPath = '/bin/sh';
        else if (fs.existsSync('/bin/ash')) shellPath = '/bin/ash';
        else shellPath = 'sh';
      }

      // Single owner for PTY state is pty-manager.js (kill first on re-spawn).
      killPty(socket.id, id);

      try {
        console.log(`[SOCKET PTY] Spawning PTY session ${id} (${shellPath}) in ${targetCwd}`);
        const { ptyProcess } = createPtySession(
          socket.id, id, targetCwd, shellType,
          Math.max(cols || 80, 10), Math.max(rows || 24, 5),
          (data) => socket.emit('terminal:output', { id, data }),
          ({ exitCode, signal }) => {
            console.log(`[SOCKET PTY] Session ${id} exited with code ${exitCode}`);
            socket.emit('terminal:exit', { id, exitCode, signal });
            killPty(socket.id, id);
          },
          shellPath,
          socket.userId
        );

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
      if (!checkRate('terminal:spawn')) return;
      if (!requireAuth('terminal:spawn')) return;
      await spawnPtySession(payload);
    });

    socket.on('terminal:input', async ({ id, data }) => {
      if (!requireAuth('terminal:input')) return;
      // Filter out accidental CPR / DA responses from leaking onto shell prompt
      // eslint-disable-next-line no-control-regex
      if (typeof data === 'string' && (/^\x1b\[\d+;\d+R$/.test(data) || /^\x1b\[\?\d+;?.*c$/.test(data))) {
        return;
      }
      writeToPty(socket.id, id, data);
      // Preserve legacy auto-spawn: first keystroke creates the session.
      if (id && data !== undefined) {
        const { getPty } = await import('./pty-manager.js');
        if (!getPty(socket.id, id)) {
          console.log(`[SOCKET PTY] Auto-spawning missing session ${id} on terminal:input`);
          await spawnPtySession({ id });
          writeToPty(socket.id, id, data);
        }
      }
    });

    socket.on('terminal:resize', ({ id, cols, rows }) => {
      resizePty(socket.id, id, cols, rows);
    });

    socket.on('terminal:kill', ({ id }) => {
      killPty(socket.id, id);
    });

    // ── Testing Panel ─────────────────────────────
    socket.on('test:run', async (payload = {}) => {
      if (!checkRate('test:run')) return;
      if (!requireAuth('test:run')) return;
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
    // 1021: authenticated users only — unauthenticated sockets must not
    // be able to make the server dial arbitrary hosts (SSRF/pivot).
    socket.on('ssh:connect', (payload = {}) => {
      if (!requireAuth('ssh:connect')) return;
      connectSSH(socket.id, payload,
        (data) => socket.emit('ssh:data', { data }),
        () => socket.emit('ssh:ready'),
        (error) => socket.emit('ssh:error', { error })
      );
    });

    socket.on('ssh:input', ({ data }) => {
      if (!requireAuth('ssh:input')) return;
      sendToSSH(socket.id, data);
    });

    // ── Ports Panel ──────────────────────────────
    socket.on('ports:list', async () => {
      if (!requireAuth('ports:list')) return;
      try {
        const { execa } = await import('execa');
        let ports = [];
        if (process.platform === 'win32') {
          const { stdout } = await execa('netstat', ['-ano']);
          // Parse basic windows netstat
          const lines = stdout.split('\n').filter(l => l.includes('LISTENING'));
          ports = lines.map(l => {
            const parts = l.trim().split(/\s+/);
            // FIX: header/blank rows have fewer columns — parts[1] was
            // undefined and match() threw, silently killing the list.
            if (parts.length < 2) return null;
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
      killAllPty(socket.id, socket.userId);
      // FIX: debug sessions and project runs were never torn down on
      // disconnect — `mcode serve` kept debug servers, dev servers and the
      // static preview listener alive after the user closed the tab.
      try {
        const dbg = activeDebugSessions.get(socket.id);
        if (dbg) {
          const { killTree } = await import('./kill-tree.js');
          if (dbg.child?.pid) killTree(dbg.child);
          try { dbg.child?.kill?.(); } catch {}
          activeDebugSessions.delete(socket.id);
        }
      } catch { /* best-effort cleanup */ }
      try {
        const proc = activeProjectProcesses.get(socket.id);
        if (proc) {
          try { typeof proc.close === 'function' && proc.close(); } catch {}
          const { killTree } = await import('./kill-tree.js');
          if (proc.pid) killTree(proc);
          activeProjectProcesses.delete(socket.id);
        }
      } catch { /* best-effort cleanup */ }
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
