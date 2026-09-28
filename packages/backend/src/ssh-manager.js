import { Client } from 'ssh2';
import { StringDecoder } from 'node:string_decoder';
import jwt from 'jsonwebtoken';

const connections = new Map();

export function connectSSH(socketId, { host, port, username, password, privateKey, token }, onData, onReady, onError) {
  if (!host || !username || (!password && !privateKey)) {
    onError('host, username, and a password or privateKey are required');
    return;
  }
  // FINDING-1021: verify the socket session token before accepting credentials
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch {
      onError('invalid or expired session token');
      return;
    }
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
