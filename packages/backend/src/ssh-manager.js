import { Client } from 'ssh2';

const connections = new Map();

export function connectSSH(socketId, { host, port, username, password, privateKey }, onData, onReady, onError) {
  const conn = new Client();
  conn.on('ready', () => {
    conn.shell((err, stream) => {
      if (err) return onError(err.message);
      connections.set(socketId, { conn, stream });
      onReady();
      stream.on('data', (data) => onData(data.toString()));
    });
  });
  conn.on('error', (err) => onError(err.message));
  
  const connectConfig = { host, port: port || 22, username };
  if (privateKey) connectConfig.privateKey = privateKey;
  else connectConfig.password = password;
  
  conn.connect(connectConfig);
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
