import { Client } from 'ssh2';
import { StringDecoder } from 'node:string_decoder';
import { verifyToken } from './auth.js';

const connections = new Map();

/**
 * The server signing secret. Resolved once at call time from the environment;
 * there is deliberately NO hardcoded fallback (M11-006). If it is missing the
 * token cannot be verified and the connection is refused — fail closed.
 */
function resolveSecret() {
  return process.env.JWT_SECRET || '';
}

export function connectSSH(socketId, { host, port, username, password, privateKey, token }, onData, onReady, onError) {
  if (!host || !username || (!password && !privateKey)) {
    onError('host, username, and a password or privateKey are required');
    return;
  }
  // M11-006: three defects fixed here.
  //  1. The check was `if (token)` — SKIPPED when no token was supplied, so a
  //     caller could obtain an SSH connection with no verification at all.
  //  2. It fell back to a hardcoded `'dev-secret'` when JWT_SECRET was unset,
  //     bypassing config/envValidator.js entirely.
  //  3. No algorithm pin, so a token could negotiate its own `alg`.
  // A token is now mandatory, verified with the shared helper against the
  // real server secret, and the algorithm is pinned to HS256 by verifyToken.
  if (!token) {
    onError('authentication token is required');
    return;
  }
  const secret = resolveSecret();
  if (!secret) {
    onError('server authentication is not configured');
    return;
  }
  try {
    verifyToken(token, secret);
  } catch {
    onError('invalid or expired session token');
    return;
  }
  const conn = new Client();
  // 1023: streaming decoder keeps multi-byte chars split across TCP
  // packets intact (chunk.toString() would mangle them).
  const decoder = new StringDecoder('utf8');
  const cleanup = () => {
    decoder.end();
    if (connections.get(socketId)?.conn === conn) connections.delete(socketId);
    try { conn.end(); } catch { /* already closed */ }
  };
  conn.on('ready', () => {
    conn.shell((err, stream) => {
      if (err) {
        cleanup();
        return onError(err.message);
      }
      connections.set(socketId, { conn, stream, decoder });
      onReady();
      stream.on('data', (data) => onData(decoder.write(data)));
      stream.on('close', cleanup);
    });
  });
  // 1022: failed/timeout connections are removed instead of dangling.
  conn.on('error', (err) => {
    cleanup();
    onError(err.message);
  });
  conn.on('close', cleanup);

  const connectConfig = { host, port: port || 22, username, readyTimeout: 15000 };
  if (privateKey) connectConfig.privateKey = privateKey;
  else connectConfig.password = password;

  try {
    conn.connect(connectConfig);
  } catch (err) {
    cleanup();
    onError(err.message);
  }
}

export function sendToSSH(socketId, data) {
  const c = connections.get(socketId);
  if (c && c.stream) {
    c.stream.write(data);
  }
}

export function disconnectSSH(socketId) {
  const c = connections.get(socketId);
  if (c) { 
    try { c.conn.end(); } catch (e) {} 
    connections.delete(socketId); 
  }
}
