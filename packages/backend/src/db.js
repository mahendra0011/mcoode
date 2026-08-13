/**
 * Storage adapter — MongoDB (Mongoose) only.
 *
 * Production-grade: if MongoDB Atlas is unreachable, the server **fails hard**
 * (process.exit(1)). There is NO in-memory fallback — accounts, passwords,
 * and all auth data are persisted exclusively to MongoDB Atlas.
 *
 * Exposed API per model: create, findById, findOne, find, findByIdAndUpdate,
 * updateOne, deleteOne, countDocuments (Mongoose native API).
 */
import mongoose from 'mongoose';
import { configureDnsForAtlas } from './config/mongoDns.js';

// Import all model schemas so they are registered with Mongoose before db() uses them.
// Without this import, mongoose.model(name) throws MissingSchemaError at runtime.
import './models.js';

let connected = false;

/**
 * Connect to MongoDB. Fails hard on any connection error — no fallback.
 * Call this once at server startup before attaching routes.
 *
 * @param {string} uri - MongoDB connection string (mongodb:// or mongodb+srv://)
 * @returns {Promise<{ mode: 'mongo', connected: true }>}
 */
export async function connectDb(uri) {
  if (!uri) {
    console.error('[db] ❌ MONGODB_URI is not set — cannot connect to Atlas.');
    console.error('[db]    Set MONGODB_URI in your .env file (e.g. mongodb+srv://user:pass@cluster...mongodb.net/mcode)');
    process.exit(1);
  }

  if (!uri.startsWith('mongodb')) {
    console.error('[db] ❌ MONGODB_URI must start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }

  // Override DNS for Atlas SRV record resolution (fixes firewall/DNS issues)
  if (uri.startsWith('mongodb+srv://')) {
    configureDnsForAtlas();
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,   // 30s — Atlas can be slow to respond
      socketTimeoutMS: 45000,            // 45s socket timeout
      maxPoolSize: 10,                   // connection pool
      family: 4,                         // force IPv4 (Atlas compatibility)
      bufferCommands: false             // fail fast if not connected
    });

    connected = true;
    console.log('[db] ✅ Connected to MongoDB Atlas');
    return { mode: 'mongo', connected: true };
  } catch (err) {
    console.error('[db] ❌ MongoDB Atlas connection FAILED:');
    console.error('[db]    Reason:', err.message);
    console.error('[db]    Code:', err.code || 'unknown');
    if (err.cause) console.error('[db]    Cause:', err.cause.message);
    console.error('[db]');
    console.error('[db]    Common fixes:');
    console.error('[db]    1. Add your IP to MongoDB Atlas Network Access (Database → Network Access → Add IP Address)');
    console.error('[db]    2. Verify MONGODB_URI credentials in .env');
    console.error('[db]    3. Check Atlas cluster is running (paused clusters reject connections)');
    console.error('[db]    4. Ensure DNS can resolve *.mongodb.net SRV records');
    console.error('[db]    5. If behind a firewall, configure DNS override (Google DNS 8.8.8.8)');
    console.error('[db]');
    process.exit(1);
  }
}

/**
 * Returns the Mongoose model registry.
 * All models are Mongoose schemas — no in-memory fallback.
 */
export function db() {
  const registry = {
    user: 'User',
    session: 'Session',
    agentTranscript: 'AgentTranscript',
    watchProject: 'WatchProject',
    watchActivity: 'WatchActivity',
    plugin: 'Plugin',
    otp: 'Otp',
    apiKey: 'ApiKey',
    workspace: 'Workspace',
    chatMessage: 'ChatMessage',
    githubAccount: 'GithubAccount',
    userSettings: 'UserSettings',
    design: 'Design'
  };

  const out = {};
  for (const [key, modelName] of Object.entries(registry)) {
    out[key] = mongoose.model(modelName);
  }
  out.mode = 'mongo';
  out.connected = connected;
  return out;
}
