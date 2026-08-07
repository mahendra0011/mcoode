import { startServer } from '../packages/backend/src/server.js';
import { createServer } from 'node:http';

const { app, io, db } = await startServer({ port: 3100 });
await new Promise(r => setTimeout(r, 500));

const logs = [];
function log(msg) { logs.push(msg); console.log(msg); }

log('✅ Server started on port 3100');

// Test 1: Secret encryption round-trip
const { deriveMasterKey, encryptKey, decryptKey, maskSecret } = await import('../packages/backend/src/secret-enc.js');
const masterKey = deriveMasterKey('test-secret', 'user-123');
const encrypted = encryptKey('sk-test-key-12345', masterKey);
const decrypted = decryptKey(encrypted, masterKey);
log(`✅ Encryption round-trip: ${decrypted === 'sk-test-key-12345' ? 'PASS' : 'FAIL'}`);
log(`✅ Masked: ${maskSecret('sk-test-key-12345')}`);

// Test 2: Verify chat-session.js module loads
const { ChatSession } = await import('../packages/backend/src/chat-session.js');
log('✅ ChatSession class loaded');

// Test 3: Verify ChatAgent loads from CLI
const { ChatAgent } = await import('mcode-cli/chat-agent');
log(`✅ ChatAgent imported: ${typeof ChatAgent}`);

// Test 4: Verify providers load
const { getProviders, getAllAdapters } = await import('mcode-cli/providers');
log('✅ getProviders and getAllAdapters imported');

// Test 5: Verify ModelRouter
const { ModelRouter } = await import('mcode-cli/router');
log('✅ ModelRouter imported');

// Test 6: Verify socket events
const { SOCKET } = await import('@mcode/shared');
log(`✅ SOCKET.C2S.CHAT_START: ${SOCKET.CLIENT_TO_SERVER.CHAT_START}`);
log(`✅ SOCKET.C2S.CHAT_SEND: ${SOCKET.CLIENT_TO_SERVER.CHAT_SEND}`);
log(`✅ SOCKET.S2C.CHAT_STREAM: ${SOCKET.SERVER_TO_CLIENT.CHAT_STREAM}`);
log(`✅ SOCKET.S2C.CHAT_MESSAGE: ${SOCKET.SERVER_TO_CLIENT.CHAT_MESSAGE}`);
log(`✅ SOCKET.S2C.CHAT_READY: ${SOCKET.SERVER_TO_CLIENT.CHAT_READY}`);
log(`✅ SOCKET.S2C.CHAT_DONE: ${SOCKET.SERVER_TO_CLIENT.CHAT_DONE}`);

// Test 7: Start a socket connection and test chat flow with mock provider
const { io: ioClient } = await import('socket.io-client');
const socket = ioClient('http://localhost:3100', {
  path: '/live',
  transports: ['websocket', 'polling'],
  auth: { token: null } // CLI agents connect without auth; but chat needs auth
});

// For chat we need to test with the in-memory ChatSession directly
log('');
log('--- Direct ChatSession test (no auth) ---');

const session = new ChatSession({
  userId: 'test-user-123',
  secret: 'JWT_SECRET',
  workspacePath: process.cwd() + '/packages/backend',
  onEvent: (event, payload) => {
    log(`  socket event: ${event} → ${JSON.stringify(payload).slice(0, 120)}`);
  }
});

// We need to create a test key in the DB
const ApiKey = db().apiKey;
const { encryptKey: enc, deriveMasterKey: dmk } = await import('../packages/backend/src/secret-enc.js');
const mk = dmk('JWT_SECRET', 'test-user-123');
const encKey = enc('fake-key-not-needed-for-mock', mk);

// Save key with envVar that triggers mock-like behavior
await ApiKey.create({
  userId: 'test-user-123',
  providerId: 'mock',
  envVar: 'MOCK_API_KEY',
  displayName: 'Mock Provider',
  encryptedKey: encKey
});
log('✅ Test API key saved to DB');

const ok = await session.init();
log(`✅ ChatSession.init(): ${ok}`);
log(`✅ Providers loaded: ${session.providers?.length}`);
log(`✅ Router loaded: ${!!session.router}`);
log(`✅ UndoStack loaded: ${!!session.undoStack}`);

if (ok) {
  const startOk = await session.start();
  log(`✅ ChatSession.start(): ${startOk}`);

  // Run a test agent interaction (mock provider)
  log('');
  log('--- Testing runAgent with mock provider ---');
  try {
    await session.runAgent('hello, just say hi');
    log('✅ runAgent completed');
  } catch (err) {
    log(`❌ runAgent error: ${err.message}`);
  }
}

// Cleanup
session.cleanup();
socket.disconnect();
process.exit(0);
