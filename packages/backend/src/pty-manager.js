import pty from 'node-pty';

const sessions = new Map(); // socketId -> Map<terminalId, ptyProcess>

// Adjusted to handle multiple terminals per socket based on id
export function createPtySession(socketId, id, cwd, shellType, cols, rows, onData, onExit) {
  let shellPath = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  // Advanced detection could be added here if needed, but keeping it simple for now
  if (shellType === 'cmd') shellPath = 'cmd.exe';
  if (shellType === 'zsh') shellPath = '/bin/zsh';
  
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
  
  let socketPtyMap = sessions.get(socketId);
  if (!socketPtyMap) {
    socketPtyMap = new Map();
    sessions.set(socketId, socketPtyMap);
  }
  socketPtyMap.set(id, ptyProcess);
  return { ptyProcess, shellPath };
}

export function writeToPty(socketId, id, data) {
  const ptyProcess = sessions.get(socketId)?.get(id);
  if (ptyProcess && data !== undefined) {
    ptyProcess.write(data);
  }
}

export function resizePty(socketId, id, cols, rows) {
  const ptyProcess = sessions.get(socketId)?.get(id);
  if (ptyProcess && cols > 0 && rows > 0) {
    try {
      ptyProcess.resize(cols, rows);
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
    for (const [, proc] of socketPtyMap) {
      try {
        proc.kill();
      } catch {}
    }
    sessions.delete(socketId);
  }
}
