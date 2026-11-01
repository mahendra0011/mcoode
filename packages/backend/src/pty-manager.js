import pty from 'node-pty';
import fs from 'node:fs';

const sessions = new Map(); // socketId -> Map<terminalId, ptyProcess>
// Orphans: terminalId -> { ptyProcess, shellPath, timer, userId } kept for a
// grace window after disconnect so a page reload can reattach instead of
// losing the shell. Orphans remember their owner — without that, any other
// authenticated user could attach a shell the previous user left running.
const orphans = new Map();
/** socketId -> userId (owner of every shell opened under that connection). */
const sessionOwners = new Map();
const ORPHAN_GRACE_MS = 5 * 60 * 1000;

function resolveDefaultShell() {
  if (process.platform === 'win32') return 'powershell.exe';
  if (process.env.SHELL && fs.existsSync(process.env.SHELL)) return process.env.SHELL;
  if (fs.existsSync('/bin/bash')) return '/bin/bash';
  if (fs.existsSync('/bin/sh')) return '/bin/sh';
  if (fs.existsSync('/bin/ash')) return '/bin/ash';
  return 'sh';
}

// Adjusted to handle multiple terminals per socket based on id
export function createPtySession(socketId, id, cwd, shellType, cols, rows, onData, onExit, shellPathOverride = null, userId = null) {
  if (userId) sessionOwners.set(socketId, userId);
  let shellPath = shellPathOverride;
  if (!shellPath) {
    if (process.platform === 'win32') {
      if (shellType === 'cmd') shellPath = 'cmd.exe';
      else shellPath = 'powershell.exe';
    } else {
      if (shellType === 'zsh' && fs.existsSync('/bin/zsh')) shellPath = '/bin/zsh';
      else if (shellType === 'fish' && fs.existsSync('/usr/bin/fish')) shellPath = '/usr/bin/fish';
      else if (shellType === 'bash' && fs.existsSync('/bin/bash')) shellPath = '/bin/bash';
      else if (shellType === 'sh' && fs.existsSync('/bin/sh')) shellPath = '/bin/sh';
      else shellPath = resolveDefaultShell();
    }
  }

  const ptyProcess = pty.spawn(shellPath, [], {
    name: 'xterm-256color',
    cols: Math.max(cols || 80, 10),
    rows: Math.max(rows || 24, 5),
    cwd,
    env: { ...process.env, COLORTERM: 'truecolor', TERM: 'xterm-256color' },
    useConpty: process.platform !== 'win32' ? undefined : false,
  });

  ptyProcess.onData((data) => onData(data));
  ptyProcess.onExit(({ exitCode, signal }) => onExit(exitCode, signal));
  /** @type {any} */ (ptyProcess).shellPath = shellPath;

  let socketPtyMap = sessions.get(socketId);
  if (!socketPtyMap) {
    socketPtyMap = new Map();
    sessions.set(socketId, socketPtyMap);
  }
  socketPtyMap.set(id, ptyProcess);
  return { ptyProcess, shellPath };
}

export function getPty(socketId, id) {
  return sessions.get(socketId)?.get(id) || null;
}

/** Adopt a live orphan (same terminal id, previous socket gone).
 *  SECURITY: orphans carry their owner's userId — a different user must never
 *  attach (and thereby drive) someone else's running shell. */
export function adoptOrphan(socketId, id, onData, onExit, userId = null) {
  const o = orphans.get(id);
  const owner = userId || sessionOwners.get(socketId) || null;
  if (!o || (o.userId && owner && o.userId !== owner)) return null;
  clearTimeout(o?.timer);
  orphans.delete(id);
  if (owner) sessionOwners.set(socketId, owner);
  let socketPtyMap = sessions.get(socketId);
  if (!socketPtyMap) {
    socketPtyMap = new Map();
    sessions.set(socketId, socketPtyMap);
  }
  socketPtyMap.set(id, o.ptyProcess);
  o.ptyProcess.onData((data) => onData(data));
  o.ptyProcess.onExit(({ exitCode, signal }) => {
    onExit(exitCode, signal);
    sessions.get(socketId)?.delete(id);
  });
  return { ptyProcess: o.ptyProcess, shellPath: o.shellPath, adopted: true };
}

export function writeToPty(socketId, id, data) {
  const ptyProcess = sessions.get(socketId)?.get(id);
  if (ptyProcess && data !== undefined) {
    ptyProcess.write(data);
  }
}

export function resizePty(socketId, id, cols, rows) {
  const ptyProcess = sessions.get(socketId)?.get(id);
  // 1056: clamp dimensions — negative/huge values crash node-pty.
  const c = Math.min(500, Math.max(10, Number(cols) || 80));
  const r = Math.min(200, Math.max(5, Number(rows) || 24));
  if (ptyProcess) {
    try {
      ptyProcess.resize(c, r);
    } catch { }
  }
}

export function killPty(socketId, id) {
  const ptyProcess = sessions.get(socketId)?.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.kill();
    } catch { }
    sessions.get(socketId)?.delete(id);
    if (sessions.get(socketId)?.size === 0) {
      sessions.delete(socketId);
      sessionOwners.delete(socketId);
    }
  }
}

export function killAllPty(socketId, userId = null) {
  const socketPtyMap = sessions.get(socketId);
  if (socketPtyMap) {
    for (const [id, proc] of socketPtyMap) {
      // Grace window: keep the shell alive for reload-reattach.
      const prev = orphans.get(id);
      if (prev) clearTimeout(prev.timer);
      const shellPath = proc.shellPath || proc.process || 'shell';
      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch { }
        orphans.delete(id);
      }, ORPHAN_GRACE_MS);
      // Safety: never keep more than 8 orphans per host.
      if (orphans.size >= 8 && !orphans.has(id)) {
        const oldest = orphans.keys().next().value;
        try {
          orphans.get(oldest)?.ptyProcess?.kill?.();
        } catch { }
        clearTimeout(orphans.get(oldest)?.timer);
        orphans.delete(oldest);
      }
      // FIX: when an orphan slot is replaced, the previous orphaned shell
      // used to leak — its timer was cleared but the process was never
      // killed and stayed alive beyond the grace window.
      if (prev) {
        try {
          if (prev.ptyProcess !== proc) prev.ptyProcess?.kill?.();
        } catch { }
      }
      orphans.set(id, { ptyProcess: proc, shellPath, timer, userId: userId || sessionOwners.get(socketId) || null });
    }
    sessions.delete(socketId);
    if (!sessions.has(socketId)) sessionOwners.delete(socketId);
  }
}

/** Hard-kill everything (shutdown path). */
export function killAllNow() {
  for (const [, o] of orphans) {
    clearTimeout(o.timer);
    try {
      o.ptyProcess.kill();
    } catch { }
  }
  orphans.clear();
  for (const [, m] of sessions) {
    for (const [, proc] of m) {
      try {
        proc.kill();
      } catch { }
    }
  }
  sessions.clear();
  sessionOwners.clear();
}
