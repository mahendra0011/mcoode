import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  passwordHash: String,
  name: String,
  createdAt: { type: Date, default: Date.now },
  plan: { type: String, default: 'free' },
  settings: {
    defaultConcurrency: Number,
    notifyOnBuildComplete: Boolean,
    routingOverrides: { type: Map, of: String, default: {} }
  },
  quotas: {
    tokens: { limit: { type: Number, default: 1_000_000 }, used: { type: Number, default: 0 } },
    builds: { limit: { type: Number, default: 100 }, used: { type: Number, default: 0 } },
    resetAt: { type: Date, default: () => new Date() }
  }
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  projectName: String,
  workspace: String,
  mode: String,
  status: String,
  plan: {
    summary: String,
    todos: [
      {
        id: String,
        title: String,
        domain: String,
        dependsOn: [String],
        status: String,
        assignedModel: String,
        startedAt: Date,
        finishedAt: Date
      }
    ]
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});
sessionSchema.index({ userId: 1, createdAt: -1 });

const transcriptSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, index: true },
  todoId: String,
  model: String,
  provider: String,
  steps: [
    {
      type: String,
      content: String,
      toolName: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  diffs: [{ file: String, patch: String }],
  result: String
});

const watchProjectSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  projectPath: String,
  status: { type: String, default: 'active' },
  startedAt: Date,
  lastScanAt: Date,
  scansRun: { type: Number, default: 0 },
  fixesApplied: { type: Number, default: 0 }
});

const watchActivitySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, index: true },
  timestamp: { type: Date, default: Date.now },
  file: String,
  outcome: String,
  detail: String
});
watchActivitySchema.index({ projectId: 1, timestamp: -1 });

const pluginSchema = new mongoose.Schema({
  name: { type: String, unique: true, index: true },
  authorId: mongoose.Schema.Types.ObjectId,
  description: String,
  category: String,
  latestVersion: String,
  versions: [
    { version: String, publishedAt: Date, manifestUrl: String }
  ],
  installs: { type: Number, default: 0 }
});
pluginSchema.index({ name: 'text', description: 'text' });

const otpSchema = new mongoose.Schema({
  email: { type: String, index: true },
  codeHash: String,
  intent: { type: String, enum: ['signup', 'login'] },
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
otpSchema.index({ email: 1, createdAt: -1 });

/** Per-user provider API keys — AES-256-GCM encrypted at rest.
 *  The encryptedKey blob already contains salt + iv + tag + ciphertext
 *  (see secret-enc.js), so the individual keyIv/keyTag/keySalt fields are
 *  kept optional for backward-compatibility with legacy imports. */
const apiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  providerId: { type: String, required: true },
  envVar: { type: String, required: true }, // e.g. OPENROUTER_API_KEY
  displayName: String,
  encryptedKey: { type: String, required: true },
  keyIv: String,
  keyTag: String,
  keySalt: String,
  createdAt: { type: Date, default: Date.now }
});
apiKeySchema.index({ userId: 1, providerId: 1 }, { unique: true });

/** GitHub OAuth tokens — encrypted at rest using per-user master key. */
const githubAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, unique: true },
  accessToken: { type: String, required: true },
  username: String,
  avatarUrl: String,
  createdAt: { type: Date, default: Date.now }
});

/** Per-user settings persisted in MongoDB (fallback to in-memory defaults). */
const userSettingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, unique: true },
  allowShellAll: { type: Boolean, default: false },
  requireEditApproval: { type: Boolean, default: false },
  modelOverrides: { type: Map, of: String, default: {} },
  accentColor: { type: String, default: 'emerald' },
  networkWhitelist: [{ type: String }],
  watchDefaults: {
    intervalMs: { type: Number, default: 30000 },
    autoFix: { type: Boolean, default: false }
  },
  godModeDefaults: {
    concurrency: { type: Number, default: 3 },
    deployTarget: { type: String, default: '' },
    skipTests: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

/** Generated designs stored for history/versioning. */
const designSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  prompt: String,
  html: String,
  version: { type: Number, default: 1 },
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  device: { type: String, default: 'desktop' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
designSchema.index({ userId: 1, parentId: 1 });

const workspaceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  diskPath: { type: String, required: true },
  gitUrl: String,
  branch: String,
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});
workspaceSchema.index({ userId: 1, name: 1 }, { unique: true });

/** Individual chat messages stored for session history. */
const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
  content: String,
  kind: String,
  block: String,
  tool: String,
  file: String,
  command: String,
  output: String,
  timestamp: { type: Date, default: Date.now }
});
chatMessageSchema.index({ sessionId: 1, timestamp: 1 });

export const User = mongoose.model('User', userSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const AgentTranscript = mongoose.model('AgentTranscript', transcriptSchema);
export const WatchProject = mongoose.model('WatchProject', watchProjectSchema);
export const WatchActivity = mongoose.model('WatchActivity', watchActivitySchema);
export const Plugin = mongoose.model('Plugin', pluginSchema);
export const Otp = mongoose.model('Otp', otpSchema);
export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export const Workspace = mongoose.model('Workspace', workspaceSchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export const GithubAccount = mongoose.model('GithubAccount', githubAccountSchema);
export const UserSettings = mongoose.model('UserSettings', userSettingsSchema);
export const Design = mongoose.model('Design', designSchema);
