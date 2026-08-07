/**
 * Storage adapter — uses MongoDB (mongoose) when available, otherwise a
 * drop-in in-memory implementation with the same async API. This keeps
 * `mcode serve` fully functional with zero external services (local-first).
 *
 * Exposed API per model: create, findById, findOne, find, findByIdAndUpdate,
 * updateOne, deleteOne, countDocuments.
 */
import mongoose from 'mongoose';

let mode = 'memory';
let connected = false;

class MemoryModel {
  constructor(name) {
    this.name = name;
    this.rows = new Map();
    this.seq = 1;
  }

  _id() {
    const id = String(this.seq++);
    return { _id: id };
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
      out.sort((a, b) => ((a[key] || 0) > (b[key] || 0) ? dir : (a[key] || 0) < (b[key] || 0) ? -dir : 0));
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

  async deleteOne(query) {
    const doc = await this.findOne(query);
    if (!doc) return { deletedCount: 0 };
    this.rows.delete(doc._id);
    return { deletedCount: 1 };
  }

  async countDocuments(query = {}) {
    return (await this.find(query)).length;
  }
}

function matches(doc, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === '_id') return String(doc._id) === String(expected);
    if (expected && typeof expected === 'object' && '$in' in expected) {
      return expected.$in.map(String).includes(String(doc[key]));
    }
    if (expected && typeof expected === 'object' && '$gte' in expected) {
      return new Date(doc[key]) >= new Date(expected.$gte);
    }
    if (expected && typeof expected === 'object' && '$lte' in expected) {
      return new Date(doc[key]) <= new Date(expected.$lte);
    }
    return doc[key] === expected;
  });
}

const collections = {};

export async function connectDb(uri) {
  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      mode = 'mongo';
      connected = true;
      return { mode, connected };
    } catch {
      mode = 'memory';
    }
  } else {
    mode = 'memory';
  }
  connected = false;
  return { mode, connected };
}

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
    out[key] = mode === 'mongo'
      ? mongoose.model(modelName)
      : (collections[key] ||= new MemoryModel(modelName));
  }
  out.mode = mode;
  out.connected = connected;
  return out;
}
