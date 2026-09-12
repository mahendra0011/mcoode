# ZCode Settings Reference

Complete documentation of all ZCode `setting.json` keys, CLI config schema, and credential storage, sourced from the actual settings file at `C:\Users\mahen\.zcode\v2\` and cross-referenced with `McodeSettingsTab.tsx` documentation.

---

## 📁 File Locations

| File | Purpose |
|------|---------|
| `C:\Users\mahen\.zcode\v2\setting.json` | User-level settings/preferences (~33 keys) |
| `C:\Users\mahen\.zcode\v2\config.json` | Model provider configuration (API keys, base URLs, model metadata) |
| `C:\Users\mahen\.zcode\v2\credentials.json` | Encrypted OAuth tokens (AES-256-GCM) |
| `C:\Users\mahen\.zcode\v2\bot-state.v2.json` | Bot state (conversations, memory) |
| `C:\Users\mahen\.zcode\v2\telemetry-state.json` | Telemetry opt-in/opt-out state |
| `C:\Users\mahen\.zcode\v2\tasks-index.sqlite` | Tasks database |

---

## 🔧 setting.json — User Settings (33+ keys)

### Application Behavior

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `closeToTrayOnWindows` | boolean | `true` | `true` | When true, closes to system tray on Windows instead of exiting. Window closes but process keeps running in background. |
| `closeToTrayOnWindowsMigrationInitialized` | boolean | `true` | `true` | Migration flag — prevents re-showing the close-to-tray migration prompt after first run. |

### Terminal & System

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `terminalInheritSystemProfile` | boolean | `true` | `true` | When launching the built-in terminal, inherits login shell environment, proxy, Kubernetes variables, and local terminal font. |
| `embeddedBrowserAllowInsecureCertificates` | boolean | `false` | `false` | Allows invalid/self-signed TLS certificates in the embedded browser used for Browser Use automation. |
| `embeddedBrowserViewportPreference` | object | `{ mode: "normal", viewport: { width: 393, height: 852 }, zoom: "fit" }` | Same | Controls the embedded browser's viewport for Browser Use automation. `normal` = native, `mobile` = 393×852 iPhone-style, `custom` = user-defined. |
| `desktopWindowSize` | object | `{ width: 1200, height: 800, maximized: true }` | Same | Window dimensions and maximized state on app startup. |
| `desktopChromiumHardwareAccelerationEnabled` | boolean | `true` | `true` | Enables GPU hardware acceleration for Chromium. Disable if you encounter blank windows or rendering issues. |
| `keepAwakeWhileRunning` | boolean | — | `false` | Prevents the system from sleeping while ZCode operations are active. |

### Indexing & Search

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `repoSnapshotIndexingEnabled` | boolean | `false` | `false` | Takes a full snapshot of the repository for indexing (memory-intensive but enables instant search across entire repo). |
| `instantGrepIndexingEnabled` | boolean | `false` | `false` | Enables instant grep file indexing — fast code search within workspaces. |
| `nativeSearchEnhancementsEnabled` | boolean | `true` | `true` | Uses native OS search APIs (Spotlight on macOS, etc.) for enhanced file indexing. |

### Agent Behavior

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `messageStreamShowReasoning` | boolean | `true` | `true` | Shows full reasoning/thinking blocks from the model in the chat stream. |
| `messageStreamShowReasoningMigrationInitialized` | boolean | `true` | `true` | Migration flag for the reasoning display setting. Prevents re-prompting after upgrade. |
| `messageStreamShowTodos` | boolean | — | `false` | Renders interactive TodoWrite tool cards inside the message stream. |
| `toolGroupingExploreEnabled` | boolean | `true` | `true` | Groups consecutive file reads and code searches into a single "Explore" section. |
| `toolGroupingTerminalEnabled` | boolean | `true` | `true` | Groups consecutive shell commands into a "Terminal" section. |
| `toolGroupingChangesEnabled` | boolean | `false` | `false` | Groups consecutive Write, Edit, and ApplyPatch calls into a "Changes" section. |
| `zcodeInteractionBehavior` | string | `"queue"` | `"queue"` | How follow-up questions are handled: `queue` (append to queue), `inline` (allow immediate reply), `modal` (modal dialog). |
| `askUserQuestionAutoResolutionEnabled` | boolean | `true` | `true` | Automatically resolves user question prompts after a timeout without waiting for input. |
| `modelIoFullRetentionEnabled` | boolean | `false` | `false` | Keeps complete model requests and responses without compression (higher token usage). |
| `optimizeAgentExperienceEnabled` | boolean | `false` | `false` | Enables agent experience optimizations (experimental). |
| `optimizeAgentExperienceMigrationInitialized` | boolean | `true` | `true` | Migration flag for agent experience optimization. |

### Memory & Sessions

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `memoryEnabled` | boolean | `false` | `false` | Enables the project memory system — saves long-term context to workspaces for recall in future sessions. |
| `taskAutoArchiveEnabled` | boolean | `false` | `false` | Automatically archives completed tasks after the retention window. |
| `taskAutoArchiveOlderThanDays` | number | `7` | `7` | Task age threshold (in days) for auto-archiving completed sessions. |
| `lastWorkspaceSession` | array | — | `[{...mediCore...}, {...mcoode...}, {...default...}]` | Recency-ordered list of recent workspaces with path and purpose (project/conversation). |
| `lastActiveTabIndex` | number | — | `1` | Last active tab index in workspace (used to restore workspace state on startup). |

### Model Providers

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `enabledBuiltinAgentCliProviders` | array | — | `["glm"]` | List of enabled built-in agent CLI providers (e.g., `glm` for GLM CLI integration). |
| `modelProviderFamilyModes` | object | — | `{ "zai": "oauth" }` | Per-provider-family authentication mode (oauth, api_key, etc.). |
| `modelProviderFamilySelectedKeys` | object | — | `{ "zai": "coding-plan:builtin:zai-coding-plan" }` | Per-provider-family selected API key/coding plan identifier. |
| `providerFamilyDomain` | string | — | `"zai"` | Active provider family domain (determines which model family is primary). |
| `providerFamilyDomainUpdatedAt` | number | — | `1785945015192` | Unix timestamp of last provider family domain change. |
| `providerFamilyDomainMigrated` | boolean | — | `true` | Migration flag indicating provider family domain has been migrated to v2. |

### Updates & Notifications

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `receivePreviewUpdates` | boolean | `false` | `false` | Opt in to receive preview/early-access updates before general release. |
| `autoDownloadAndInstallUpdates` | boolean | `false` | `false` | Automatically downloads and installs updates when found (without asking). |
| `skippedElectronUpdateVersions` | object | `{}` | `{}` | Records Electron update versions that were skipped to prevent re-prompting. |
| `desktopTaskNotifications` | boolean | — | (Not in setting.json) | Sends desktop notifications when a task completes, fails, or needs approval. |
| `notificationSound` | boolean | — | (Not in setting.json) | Plays notification sound for desktop notifications (can be muted separately). |

### UI & Localization

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `locale` | string | `"en-US"` | `"en-US"` | Display language for the ZCode UI. Options: `en-US`, `en-GB`, `ja`, `ko`, `zh-CN`, `zh-TW`. |
| `localePreference` | string | `"en-US"` | `"en-US"` | Preferred locale for content and formatting (may differ from UI locale). |

### Sync & Migration

| Setting | Type | Default | Current Value | Description |
|---------|------|---------|---------------|-------------|
| `settingsSyncFirstRunPromptHandled` | boolean | `true` | `true` | Indicates the settings sync first-run prompt has been shown (prevents re-showing). |

---

## ⚙️ CLI Config Schema (from config.json / McodeConfigTab)

The CLI config schema defines configuration groups with scope-based merge priority. The merge order (lowest → highest) is:

```
System → User → Project → Session → Env → CLI
```

### `permission` Group
| Key | Default | Description |
|-----|---------|-------------|
| `mode` | `"build"` | Permission mode: `plan` (ask for everything), `build` (ask for risky), `edit` (auto-edit but ask for dangerous), `yolo` (approve all). |
| `autoApproveHighRisk` | `false` | Auto-approve high-risk tools (file deletes, system commands) without prompting. |

### `storage` Group
| Key | Default | Description |
|-----|---------|-------------|
| `dir` | `"~/.mcode"` | Persistent storage directory for all ZCode data. |
| `sessionDbPath` | `"~/.mcode/cli/db/db.sqlite"` | Path to the session database (SQLite) storing conversation history. |

### `network` Group
| Key | Default | Description |
|-----|---------|-------------|
| `timeout` | `180000` | Default network timeout in milliseconds (3 minutes). |

### `features` Group
| Key | Default | Description |
|-----|---------|-------------|
| `compact` | `true` | Enable conversation compaction (reduces context window usage for long chats). |
| `rewind` | `true` | Enable workspace checkpoints (undo/redo file changes, restore workspace state). |
| `subagent` | `true` | Enable subagent spawning (parallel agent execution in god mode). |
| `memory` | `true` | Enable project memory system (saves context between sessions). |
| `skill` | `true` | Enable skills loading (custom slash commands and behaviors from skills registry). |
| `mcp` | `true` | Enable MCP (Model Context Protocol) server support. |

### `hooks` Group
| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `false` | Enable hooks system (custom scripts triggered on events). Disabled by default. |
| `timeoutMs` | `60000` | Maximum execution time for a hook before it's killed (60 seconds). |
| `maxOutputBytes` | `32768` | Maximum output size from hooks (32 KB) to prevent oversized payloads. |

### `logging` Group
| Key | Default | Description |
|-----|---------|-------------|
| `level` | `"info"` | Log verbosity: `debug`, `info`, `warn`, `error`. |
| `format` | `"text"` | Log output format: `text`, `json`, `jsonl`. |

### `toolConcurrency` Group
| Key | Default | Description |
|-----|---------|-------------|
| `maxConcurrency` | `10` | Maximum number of concurrent tool calls (parallel function execution limit). |

### `ui` Group
| Key | Default | Description |
|-----|---------|-------------|
| `locale` | `"en-US"` | Default UI locale for the CLI. |
| `theme` | `"auto"` | UI theme: `auto` (system), `light`, `dark`. |

---

## 🔐 Credential Security

### `credentials.json`
| Key | Encryption | Description |
|-----|------------|-------------|
| `oauth:zai:access_token` | AES-256-GCM | Z.ai OAuth access token (encrypted with per-install key) |
| `oauth:zai:user_info` | AES-256-GCM | Z.ai OAuth user info (encrypted) |
| `oauth:active_provider` | AES-256-GCM | Currently active OAuth provider identifier |

**Security properties:**
- All credentials are AES-256-GCM encrypted with a per-install key
- Never stored in plaintext
- JWT_SECRET validation: weak secrets (< 32 chars) trigger warnings

### Certificate Storage
| Path | Purpose |
|------|---------|
| `certs/` | CA key/cert for TLS interception (Desktop CA certificate for HTTPS traffic inspection) |

---

## 📊 Config Merge Order (Scope Priority)

```
System (priority 0)
  ↓
User (priority 10)
  ↓
Project (priority 20)
  ↓
Session (priority 30)
  ↓
Env (priority 40)
  ↓
CLI (priority 50, Highest)
```

Each scope overrides the previous. CLI flags have the highest priority, environment variables override session settings, and project-level settings override user-level settings.

---

## 💻 Code Examples

### Sample `setting.json` (Actual Format)

```json
{
  "recentProjects": [
    "D:\\projects\\mediCore",
    "D:\\projects\\mcoode"
  ],
  "locale": "en-US",
  "localePreference": "en-US",
  "terminalInheritSystemProfile": true,
  "embeddedBrowserAllowInsecureCertificates": false,
  "embeddedBrowserViewportPreference": {
    "mode": "normal",
    "viewport": { "width": 393, "height": 852 },
    "zoom": "fit"
  },
  "desktopWindowSize": { "width": 1200, "height": 800, "maximized": true },
  "desktopChromiumHardwareAccelerationEnabled": true,
  "messageStreamShowReasoning": true,
  "messageStreamShowReasoningMigrationInitialized": true,
  "messageStreamShowTodos": false,
  "toolGroupingExploreEnabled": true,
  "toolGroupingTerminalEnabled": true,
  "toolGroupingChangesEnabled": false,
  "zcodeInteractionBehavior": "queue",
  "askUserQuestionAutoResolutionEnabled": true,
  "modelIoFullRetentionEnabled": false,
  "optimizeAgentExperienceEnabled": false,
  "optimizeAgentExperienceMigrationInitialized": true,
  "enabledBuiltinAgentCliProviders": ["glm"],
  "modelProviderFamilyModes": { "zai": "oauth" },
  "modelProviderFamilySelectedKeys": { "zai": "coding-plan:builtin:zai-coding-plan" },
  "providerFamilyDomain": "zai",
  "repoSnapshotIndexingEnabled": false,
  "instantGrepIndexingEnabled": false,
  "nativeSearchEnhancementsEnabled": true,
  "memoryEnabled": false,
  "taskAutoArchiveEnabled": false,
  "taskAutoArchiveOlderThanDays": 7,
  "closeToTrayOnWindows": true,
  "closeToTrayOnWindowsMigrationInitialized": true,
  "keepAwakeWhileRunning": false,
  "receivePreviewUpdates": false,
  "autoDownloadAndInstallUpdates": false,
  "desktopTaskNotifications": true,
  "notificationSound": false,
  "settingsSyncFirstRunPromptHandled": true
}
```

### Sample `config.json` (Model Provider Configuration)

```json
{
  "provider": {
    "builtin:zai": {
      "name": "Z.ai - API Key",
      "kind": "anthropic",
      "options": {
        "apiKey": "",
        "baseURL": "https://api.z.ai/api/anthropic",
        "apiKeyRequired": true
      },
      "source": "custom",
      "models": {
        "GLM-5.3": {
          "reasoning": { "enabled": true, "variants": ["low", "max", "high"], "defaultVariant": "max" },
          "limit": { "context": 1000000, "output": 128000 },
          "modalities": { "input": ["text"], "output": ["text"] }
        },
        "GLM-5.3-Flash": {
          "reasoning": { "enabled": true, "variants": ["low", "max", "high"], "defaultVariant": "max" },
          "limit": { "context": 1000000, "output": 128000 },
          "modalities": { "input": ["text", "image", "video"], "output": ["text"] }
        }
      }
    },
    "73b59c4c-eeda-4b71-937a-66ad2a4dd4c9": {
      "name": "Poolside",
      "kind": "anthropic",
      "options": {
        "apiKey": "sky_5nf3ZfVR.363IPYb4um4bmDN6frPCxBD3P250tfc0",
        "baseURL": "https://inference.poolside.ai/v1",
        "apiKeyRequired": true
      },
      "source": "custom",
      "models": {
        "poolside/laguna-s-2.1": {
          "limit": { "context": 262144 },
          "modalities": { "input": ["text"], "output": ["text"] }
        }
      }
    }
  }
}
```

### Accessing Settings in the Frontend (React/ZCode Web)

```typescript
// Via ZCode's settings store (zustand)
import { useSettingsStore } from '../../store/settingsStore';

const plugins = useSettingsStore((s) => s.plugins);
const togglePlugin = useSettingsStore((s) => s.togglePlugin);
togglePlugin('compliance-kit'); // Toggle a plugin on/off

// Via API endpoint
import api from '../../lib/axios';

// Fetch all user settings
const res = await api.get('/api/v1/settings', { timeout: 5000 });
const settings = res.data?.settings; // Record<string, any>

// Update a setting
const patch = { keepAwakeWhileRunning: true };
await api.post('/api/v1/settings', patch);
```

### Accessing Settings in the CLI (Node.js)

```typescript
// From ZCode CLI config module
import { getConfig } from '@zcode/cli/lib/config';

// Read a CLI config key with scope-based merge resolution
const mode = getConfig('permission.mode');          // "build"
const timeout = getConfig('network.timeout');      // 180000
const compact = getConfig('features.compact');     // true

// Override at runtime via CLI flag
// zcode --permission.mode=yolo --network.timeout=300000
//   (CLI scope has highest priority, overrides all other scopes)
```

### Settings UI Component Pattern

```tsx
// SettingToggle component (used in SettingsPage)
function SettingToggle({ name, defaultVal, desc }) {
  const [enabled, setEnabled] = useState(defaultVal);
  return (
    <motion.label className="flex items-center justify-between">
      <div>
        <code className="text-xs text-white/60 font-mono">{name}</code>
        <p className="text-xs text-white/40 mt-0.5">{desc}</p>
      </div>
      <motion.div
        animate={{ backgroundColor: enabled ? '#10b981' : '#374151' }}
        className="relative w-10 h-6 rounded-full"
        onClick={() => setEnabled(!enabled)}
      >
        <motion.div
          animate={{ x: enabled ? 4 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
        />
      </motion.div>
    </motion.label>
  );
}

// Usage in a settings tab
<SettingToggle
  name="closeToTrayOnWindows"
  defaultVal={true}
  desc="Keep app in system tray on Windows"
/>
```

### Model Provider Registration Pattern

```typescript
// config.json provider structure
interface ModelProvider {
  name: string;           // Display name (e.g., "Z.ai - API Key")
  kind: 'anthropic' | 'openai' | 'openai-compatible';
  options: {
    apiKey: string;       // Actual or empty (uses OAuth)
    baseURL: string;       // API endpoint
    apiKeyRequired?: boolean;
  };
  source: 'builtin' | 'custom';
  models: Record<string, ModelMetadata>;
  systemDisabledReason?: string;  // Why a provider is disabled
  enabled: boolean;
  zcode?: {
    modified?: boolean;
    priority?: number;
    deletedModels?: string[];
  };
}

interface ModelMetadata {
  limit: { context: number; output: number };
  modalities: { input: string[]; output: string[] };
  reasoning?: { enabled: boolean; variants: string[]; defaultVariant: string };
  name?: string;
}
```
