import pty from 'node-pty';

const sessions = new Map(); // socketId -> Map<terminalId, ptyProcess>
// Orphans: terminalId -> { ptyProcess, shellPath, timer } kept for a grace
// window after disconnect so a page reload can reattach instead of losing
// the shell. Keyed by terminal id alone (stable across reconnects).
const orphans = new Map();
const ORPHAN_GRACE_MS = 5 * 60 * 1000;

// Adjusted to handle multiple terminals per socket based on id
export function createPtySession(socketId, id, cwd, shellType, cols, rows, onData, onExit, shellPathOverride = null) {
  let shellPath = shellPathOverride || (process.platform === 'win32' ? 'powershell.exe' : 'bash');
  // Advanced detection could be added here if needed, but keeping it simple for now
  if (!shellPathOverride) {
    if (shellType === 'cmd') shellPath = 'cmd.exe';
    if (shellType === 'zsh') shellPath = '/bin/zsh';
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

/** Adopt a live orphan (same terminal id, previous socket gone). */
export function adoptOrphan(socketId, id, onData, onExit) {
  const o = orphans.get(id);
  if (!o) return null;
  clearTimeout(o.timer);
  orphans.delete(id);
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
    } catch {}
  }
}

export function killPty(socketId, id) {
  const ptyProcess = sessions.get(socketId)?.get(id);
  if (ptyProcess) {
    try {
      ptyProcess.kill();
    } catch {}
    sessions.get(socketId)?.delete(id);
  }
}

export function killAllPty(socketId) {
  const socketPtyMap = sessions.get(socketId);
  if (socketPtyMap) {
    for (const [id, proc] of socketPtyMap) {
      // Grace window: keep the shell alive for reload-reattach.
      orphans.get(id)?.timer && clearTimeout(orphans.get(id).timer);
      const shellPath = proc.shellPath || proc.process || 'shell';
      const timer = setTimeout(() => {
        try {
          proc.kill();
        } catch {}
        orphans.delete(id);
      }, ORPHAN_GRACE_MS);
      // Safety: never keep more than 8 orphans per host.
      if (orphans.size >= 8) {
        const oldest = orphans.keys().next().value;
        try {
          orphans.get(oldest)?.ptyProcess?.kill?.();
        } catch {}
        clearTimeout(orphans.get(oldest)?.timer);
        orphans.delete(oldest);
      }
      orphans.set(id, { ptyProcess: proc, shellPath, timer });
    }
    sessions.delete(socketId);
  }
}

/** Hard-kill everything (shutdown path). */
export function killAllNow() {
  for (const [, o] of orphans) {
    clearTimeout(o.timer);
    try {
      o.ptyProcess.kill();
    } catch {}
  }
  orphans.clear();
  for (const [, m] of sessions) {
    for (const [, proc] of m) {
      try {
        proc.kill();
      } catch {}
    }
  }
  sessions.clear();
}
