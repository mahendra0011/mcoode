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
  }
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, index: true },
  projectName: String,
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
  code: String,
  intent: { type: String, enum: ['signup', 'login'] },
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
otpSchema.index({ email: 1, createdAt: -1 });

export const User = mongoose.model('User', userSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const AgentTranscript = mongoose.model('AgentTranscript', transcriptSchema);
export const WatchProject = mongoose.model('WatchProject', watchProjectSchema);
export const WatchActivity = mongoose.model('WatchActivity', watchActivitySchema);
export const Plugin = mongoose.model('Plugin', pluginSchema);
export const Otp = mongoose.model('Otp', otpSchema);
