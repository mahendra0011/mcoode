/**
 * Storage adapter — MongoDB (Mongoose) when available, with an in-memory
 * fallback for testing and offline local development.
 *
 * In production (NODE_ENV === 'production'), if MongoDB Atlas is unreachable,
 * the server fails hard (process.exit(1)) — no silent in-memory fallback.
 * In development and test environments, an in-memory storage adapter is used
 * when no URI is provided or when Atlas is unreachable.
 *
 * Exposed API per model: create, findById, findOne, find, findByIdAndUpdate,
 * updateOne, update, deleteOne, deleteMany, countDocuments.
 */
import mongoose from 'mongoose';
import { configureDnsForAtlas } from './config/mongoDns.js';

// Import all model schemas so they are registered with Mongoose before db() uses them.
import './models.js';

let mode = 'memory';
let connected = false;
const collections = {};

class MemoryModel {
  constructor(name) {
    this.name = name;
    this.rows = new Map();
    this.seq = 1;
  }

  _id() {
    return { _id: String(this.seq++) };
  }

  _toObject(doc) {
    return doc;
  }

  async create(data) {
    const doc = { _id: String(this.seq++), ...data, createdAt: data.createdAt || new Date() };
    this.rows.set(doc._id, structuredClone(doc));
    return structuredClone(doc);
  }

  async findById(id) {
    const doc = this.rows.get(String(id));
    return doc ? structuredClone(doc) : null;
  }

  async findByEmail(email) {
    return await this.findOne({ email });
  }

  async findOne(query = {}) {
    for (const doc of this.rows.values()) {
      if (matches(doc, query)) return structuredClone(doc);
    }
    return null;
  }

  async find(query = {}, sort = {}) {
    let out = [...this.rows.values()];
    if (query && Object.keys(query).length) {
      out = out.filter((doc) => matches(doc, query));
    }
    if (sort && Object.keys(sort).length) {
      const [key, dir] = Object.entries(sort)[0];
      out.sort((a, b) => {
        const valA = a[key] instanceof Date ? a[key].getTime() : a[key];
        const valB = b[key] instanceof Date ? b[key].getTime() : b[key];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        return (valA > valB ? dir : valA < valB ? -dir : 0);
      });
    }
    return out.map((d) => structuredClone(d));
  }

  async findByIdAndUpdate(id, patch) {
    const doc = this.rows.get(String(id));
    if (!doc) return null;
    const merged = { ...doc, ...patch };
    this.rows.set(doc._id, merged);
    return structuredClone(merged);
  }

  async updateOne(query, patch) {
    const doc = await this.findOne(query);
    if (!doc) return { matchedCount: 0 };
    const merged = { ...doc, ...patch };
    this.rows.set(doc._id, merged);
    return { matchedCount: 1 };
  }

  async update(query, patch) {
    return await this.updateOne(query, patch);
  }

  async deleteOne(query) {
    const doc = await this.findOne(query);
    if (!doc) return { deletedCount: 0 };
    this.rows.delete(doc._id);
    return { deletedCount: 1 };
  }

  async deleteMany(query = {}) {
    let deletedCount = 0;
    for (const [id, doc] of this.rows.entries()) {
      if (matches(doc, query)) {
        this.rows.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  }

  async countDocuments(query = {}) {
    return (await this.find(query)).length;
  }
}

function matches(doc, query) {
  if (!query || Object.keys(query).length === 0) return true;
  return Object.entries(query).every(([key, expected]) => {
    if (key === '_id') return String(doc._id) === String(expected);
    if (expected && typeof expected === 'object') {
      if ('$in' in expected) {
        return Array.isArray(expected.$in) && expected.$in.map(String).includes(String(doc[key]));
      }
      let matched = true;
      if ('$gte' in expected) {
        const val = doc[key] instanceof Date ? doc[key].getTime() : Number(doc[key]);
        const exp = expected.$gte instanceof Date ? expected.$gte.getTime() : Number(expected.$gte);
        if (val < exp) matched = false;
      }
      if ('$lte' in expected) {
        const val = doc[key] instanceof Date ? doc[key].getTime() : Number(doc[key]);
        const exp = expected.$lte instanceof Date ? expected.$lte.getTime() : Number(expected.$lte);
        if (val > exp) matched = false;
      }
      return matched;
    }
    return doc[key] === expected;
  });
}

export function clearMemoryDb() {
  for (const key of Object.keys(collections)) {
    collections[key].rows.clear();
    collections[key].seq = 1;
  }
}

/**
 * Connect to MongoDB or fall back to memory mode in test/dev.
 *
 * @param {string|null} uri - MongoDB connection string (mongodb:// or mongodb+srv://)
 * @returns {Promise<{ mode: 'mongo'|'memory', connected: boolean }>}
 */
export async function connectDb(uri) {
  if (uri && uri.startsWith('mongodb')) {
    if (uri.startsWith('mongodb+srv://')) {
      configureDnsForAtlas();
    }
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        family: 4,
        bufferCommands: false
      });
      mode = 'mongo';
      connected = true;
      console.log('[db] ✅ Connected to MongoDB Atlas');
      return { mode: 'mongo', connected: true };
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[db] ❌ MongoDB Atlas connection FAILED:');
        console.error('[db]    Reason:', err.message);
        console.error('[db]    Code:', err.code || 'unknown');
        if (err.cause) console.error('[db]    Cause:', err.cause.message);
        process.exit(1);
      }
      console.warn(`[db] ⚠️  MongoDB connection failed (${err.message}). Falling back to memory mode for local/testing.`);
      mode = 'memory';
      connected = false;
      return { mode: 'memory', connected: false };
    }
  }

  // If no URI provided (or non-mongodb URI)
  if (process.env.NODE_ENV === 'production') {
    console.error('[db] ❌ MONGODB_URI is not set — cannot connect to Atlas in production.');
    process.exit(1);
  }

  mode = 'memory';
  connected = false;
  clearMemoryDb();
  return { mode: 'memory', connected: false };
}

/**
 * Returns the model registry (Mongoose schemas in mongo mode, MemoryModel in memory mode).
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
    userSettings: 'UserSettings'
  };

  const out = {};
  for (const [key, modelName] of Object.entries(registry)) {
    out[key] = mode === 'mongo'
      ? mongoose.model(modelName)
      : (collections[key] ||= new MemoryModel(modelName));
  }
  out.mode = mode;
  out.connected = connected;
  return out;
}
