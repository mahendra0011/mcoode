Maine saare specs check kar liye hain. **Abhi tak kuch bhi fix nahi hua hai** — hum sirf PLAN MODE mein analysis kar rahe hain. Ye raha final status:

---

## ✅ Jo Already Implemented Hai (actual repo mein)

| Feature | File | Status |
|---|---|---|
| Two-column layout (chat + sidebar) | `App.jsx` | ✅ |
| Blue left-bar message blocks | `MainPane.jsx` | ✅ |
| Assistant meta line `▪ Build · model · secs` | `MainPane.jsx` | ✅ |
| Live Thought block `+ Thought: 2.8s…` | `MainPane.jsx` | ✅ |
| Spinner (braille frames) | `MainPane.jsx` | ✅ |
| Read block `# Read path` + line numbers | `MainPane.jsx` | ✅ |
| Write block `# Wrote path` | `MainPane.jsx` | ✅ |
| Diff block `← Edit path` + red/green tint | `MainPane.jsx` | ✅ |
| Command block `$ cmd` + muted output | `MainPane.jsx` | ✅ |
| Todo block `# Todos` + glyphs | `MainPane.jsx` | ✅ |
| Interrupt `✗ Interrupted by user` | `MainPane.jsx` | ✅ |
| Error + retry hint | `MainPane.jsx` | ✅ |
| Permission prompt `(y/n/always)` | `MainPane.jsx` | ✅ |
| Multi-file summary `# Changed 3 files` | `MainPane.jsx` | ✅ |
| Sidebar (Context, Tasks, LSP, path:branch) | `Sidebar.jsx` | ✅ |
| Command palette (ctrl+p, bordered) | `CommandPalette.jsx` | ✅ |
| Status bar (cwd, tokens, ctrl+p) | `StatusBar.jsx` | ✅ |
| Input box + multiline + slash menu | `InputLine.jsx` | ✅ |
| Scroll (PgUp/PgDn + wheel SGR + auto-follow) | `MainPane.jsx` | ✅ |

---

## ❌ Jo Fix Nahi Hua Hai (spec ke against gaps)

**5 color mismatches in `MainPane.jsx`:**
1. Todo **done** `✓` → `theme.green` (`#3ecf6e`) hona chahiye `diffGreen` (`#5fb87a`)
2. Todo **paused** `◐` → `theme.amber` (`#f5c04a`) hona chahiye dim `accentOrange`
3. Permission `?` prefix → `theme.text` hai, hona chahiye `accentOrange`
4. Permission command → orange hai, hona chahiye bold white
5. Summary `(new)` suffix → `theme.purple` hai, hona chahiye `theme.dim`

**Other gaps from earlier specs:**
- Sidebar animated (0→35) instead of fixed width
- Input meta row missing provider + `max` badge
- StatusBar shows project name not absolute path
- `blocks.jsx` / `blocks-extra.jsx` / `blocks-todo-and-states.jsx` reference files don't exist in repo (but functionality is already inline in MainPane.jsx)
- `ink-text-input` not installed (only matters for standalone `mcode-ui.jsx` demo)
- Reference `PermissionBlock` has a React hooks violation (conditional `useInput`) — but actual repo doesn't have this bug

---

## 🧭 Final Answer

**Nahi, sab complete nahi hua hai.** Core UI ~90% working hai, but 5 color fixes + a few spec-alignment tweaks baaki hain. Ye saare changes **ACT MODE** mein implement karne hain — PLAN MODE mein sirf analysis ho sakta hai.

**Toggle to ACT MODE** and I'll apply all remaining fixes:
1. 5 color corrections in `MainPane.jsx`
2. Sidebar fixed width (remove animation)
3. Input meta row: add `max` badge + provider name
4. StatusBar: absolute path + version dot
5. Verify build passes (`npm run build:cliimport mongoose from 'mongoose';

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
