# mcode Desktop App — Screen Specification

Goal: ship mcode as a **desktop application** (installed via `.exe`), not as a
website wrapped in a window. It must feel like software: it opens on the app,
never on a marketing homepage, and it behaves like a native window.

This document is the per-file audit that decides what belongs in the desktop
build and what does not. Every row was verified by reading the route file and
the component it imports — nothing here is guessed.

---

## 1. How this was verified

For each file under `packages/web/src/app/**/page.tsx`, the component actually
imported by that route was read, and its imports were followed. Example:
`app/ai/chat/page.tsx` → `AIChatPage` → which imports `EditorPane`,
`FileTree`, `ExplorerPanel`, `BottomPanel`, `IDEActivitySidebar`, `IDEMenuBar`,
so it is a full IDE, not a chat box.

Route count: **20 routes**. The earlier draft of this plan listed 12 — the 8
missed routes are real application screens (see §4).

---

## 2. Route-by-route decision table

| # | Route | Renders | What it is | In desktop app? |
|---|-------|---------|-----------|-----------------|
| 1 | `/` | `LandingPage` | Marketing homepage (Hero, Testimonials, DashboardPreview) | ❌ **OUT** |
| 2 | `/ai` | `AILandingPage` | Marketing page for the AI feature (AIHero, AIChatPreview) | ❌ **OUT** |
| 3 | `/cli` | `CLIPage` | Sales page for the CLI product (CLIHero, CLIDemoPreview, FeaturesGrid, HowItWorks) | ❌ **OUT** |
| 4 | `/ai/chat` | `AIChatPage` | **Chat + Code Editor + Terminal** — Monaco `EditorPane`, `FileTree`, `ExplorerPanel`, `SearchPanel`, `SourceControlPanel`, `RunDebugPanel`, `BottomPanel` (terminal), `IDEActivitySidebar`, `IDEMenuBar` | ✅ **IN — primary** |
| 5 | `/mcode` | `McodeDashboard` | **AI Code Agent mode** — God Mode / subagent orchestration, Turn Machine, skills, tests tabs | ✅ **IN — primary** |
| 6 | `/login` | `LoginPage` | Auth | ✅ **IN** |
| 7 | `/signup` | `SignupPage` | Auth | ✅ **IN** |
| 8 | `/forgot-password` | `ForgotPasswordPage` | Auth | ✅ **IN** |
| 9 | `/settings` | `SettingsPage` | App settings | ✅ **IN** |
| 10 | `/sessions` | `SessionsPage` | Chat/session history | ✅ **IN** |
| 11 | `/sessions/[id]` | `SessionDetailPage` | Past-session transcript | ✅ **IN** |
| 12 | `/extensions` | `ExtensionsMarketplace` | Real extension marketplace UI | ✅ **IN** |
| 13 | `/preview` | (inline page, `getSocket`) | Device preview for built apps | ✅ **IN** |
| 14 | `/live` | `LiveMonitorPage` | Subagent-wave / watch-daemon monitor | ⚠️ **IN — secondary** |
| 15 | `/plugins` | `PluginsPage` | Plugin management | ⚠️ **IN — secondary** |
| 16 | `/tools` | `ToolsPage` | Tool catalogue | ⚠️ **IN — secondary** |
| 17 | `/docs` | `DocsPage` | Documentation reader, cross-links to `/commands` and `/live` | ⚠️ **IN — secondary** |
| 18 | `/commands` | `CommandsPage` | CLI + slash-command reference | ⚠️ **IN — secondary** |
| 19 | `/changelog` | `ChangelogPage` | Release notes | ⚠️ **IN — secondary** (also exists as an in-app modal) |
| 20 | `/settings` (dup) | — | — | — |

### Why the three marketing routes are the only exclusions

`packages/web/src/components/layout/Layout.tsx` (the component that renders the
public nav bar with `/ai` and `/cli` links, `Layout.tsx:81-82`) is imported by
**exactly three files**: `LandingPage`, `AILandingPage`, `CLIPage`. No
application screen uses it. So the app screens already render without the
marketing header — which is most of the "website feel" already absent.
---

## 3. The launch flow

```
app launch
   ↓
/login                     ← first screen, no address bar, no marketing page
   ↓ (existing LoginPage.tsx:127  router.push('/ai/chat'))
/ai/chat                   ← Chat + Editor + Terminal
   ↓ in-app navigation (settings icon AIChatPage.tsx:2258)
/settings, /mcode, /sessions, /extensions …
```

The post-login redirect **already exists** in the codebase
(`packages/web/src/components/pages/LoginPage.tsx:127`, and `:92` for the
GitHub-OAuth branch). Nothing needs to be built for it.

---

## 4. The real problem: a window that loads a URL is still a website

Pointing Electron at `http://localhost:3000/login` is necessary but **not
sufficient**. Out of the box the app still behaves like a web page:

| Website-ish behaviour | Why it happens | Fix (desktop layer only) |
|---|---|---|
| Marketing pages reachable | `CommandPalette.tsx:8` → `{ label: 'CLI', href: '/cli' }`, mounted globally (`layout.tsx:39` → `providers.tsx:8`), so Cmd+K opens it on **every** page incl. `/login` | Block the route in the shell (§5) |
| Reloads like a browser (Cmd+R) | Electron default keybindings | Remove reload/zoom/devtools roles |
| Browser context menu on right-click | Chromium default | Suppress or replace |
| Zoom with Cmd +/- , Cmd+0 | Chromium default | Pin zoom |
| Back/forward reaches marketing pages | Chromium history | Allow-list navigation |
| DevTools visible | Chromium default | Disable in release |
| No app menu (File/Edit/View) | Electron ships none | Build a native menu |
| Blank screen if server is down | `loadURL` fails silently | Detect and show a message |
| Two windows if launched twice | No single-instance lock | `requestSingleInstanceLock()` |
| Window position lost each run | No state persistence | Save/restore bounds |
| Looks slow on launch | Blank frame before first paint | Native splash screen |

**None of these require changing a line of `packages/web`, `packages/backend`
or `packages/cli`.** They are all Electron main-process concerns.

---

## 5. Two genuine problems that DO need care

### 5.1 Cmd+K can still reach `/cli`

This is where the "zero code change" claim is false. The command palette is
global and contains a link to the CLI marketing page:

```
CommandPalette.tsx:7   { label: 'AI Chat',   href: '/ai/chat' }
CommandPalette.tsx:8   { label: 'CLI',        href: '/cli'    }  ← marketing
CommandPalette.tsx:9   { label: 'Extensions', href: '/extensions' }
CommandPalette.tsx:10  { label: 'Preview',    href: '/preview' }
CommandPalette.tsx:11  { label: 'Settings',   href: '/settings' }
```

Technical detail that matters: Next.js routes via `router.push` (a same-document
`pushState`), and Electron's `will-navigate` **does not fire** for those. So
blocking it needs either:

- **(A) One-line web change** — drop/filter the `CLI` entry in the palette
  array. Cleanest; touches nothing else.
- **(B) A `preload` shim** wrapping `history.pushState` to reject marketing
  paths, leaving all web source untouched. Works, but it is a monkey-patch that
  silently breaks the next time a marketing link is added.

(A) is recommended — a one-line deletion, the single exception to "zero changes".

### 5.2 The port in the earlier draft was wrong

The draft said `http://localhost:<backend-port>/login`. The backend
(port 3100) serves only `/health`, `/api/*` and the `/live` socket — **not** the
web UI:

```
http://localhost:3000/login     # correct — Next.js web server
http://localhost:3100/login     # 404 — backend API
```

`packages/desktop/main.js` already does this correctly (`MCODE_WEB_PORT`, default `3000`).

---
## 6. Current status

### Done ✅

| Item | Where |
|---|---|
| Electron wrapper exists | `packages/desktop/main.js` |
| Opens straight on `/login` (never the homepage) | `config.js` — `INITIAL_PATH` |
| Correct port (3000, not backend 3100) | `config.js` — `WEB_PORT` |
| Renderer has no Node access | `contextIsolation: true`, `nodeIntegration: false` |
| External links open in the real browser | `setWindowOpenHandler` / `will-redirect` → `shell.openExternal` |
| **Marketing routes blocked (hard navigations)** | `guards.js` — `will-navigate` + `isAllowed()` |
| **Marketing routes blocked (in-app navigation)** | `guards.js` — `buildGuardScript()` wraps `pushState`/`replaceState` |
| **Native application menu (no browser roles)** | `menu.js` — no `reload`/`back`/`forward`/`inspectElement` |
| **Reload / zoom / view-source keybindings gone** | `menu.js` — roles simply unregistered |
| **Browser context menu suppressed** | `main.js` — `context-menu` handler, editing verbs kept |
| **Zoom pinned** | `main.js` — `setVisualZoomLevelLimits(1, 1)` |
| **Single-instance lock** | `main.js` — `requestSingleInstanceLock()` |
| **Window geometry persists** | `guards.js` — `window-state.json` |
| **Splash screen, no white flash** | `pages.js` — `showSplash()`, `show: false` + `ready-to-show` |
| **"Server not running" screen** | `pages.js` — `showServerDown()` via `did-fail-load` |
| **App icon** | `assets/icon.png` (from the web app's own `logo.png`) |
| Guard logic covered by tests | `guard.test.js` — `npm test` → 11/11 |
| `.exe` builds and runs | `dist/win-unpacked/mcode.exe` |
| Post-login redirect already existed | `LoginPage.tsx:127` |

**Zero lines were changed in `packages/web`, `packages/backend` or `packages/cli`.**

### Not done yet ❌

- [ ] Code signing certificate — builds are unsigned, so SmartScreen warns on install
- [ ] Auto-start the Docker stack from the app (out of scope for a thin shell)

---

## 7. Build status

`npm run dist` produces a working NSIS installer: **`dist/mcode Setup 2.4.6.exe`
(106.7 MB) + `.blockmap`**, built with zero errors.

It did not at first — it failed with a bare `spawn UNKNOWN`. Root cause was a
genuine bug in `app-builder-lib/out/vm/WineVm.js`: on Windows it forwards the
options object straight to `CreateProcess`, so electron-builder's uninstaller
extraction step ran the freshly built installer with an environment containing
only `__COMPAT_LAYER` — no `SystemRoot`, `SystemDrive` or `TEMP`. The non-Windows
branch of the same function merges `process.env` correctly, which is why this
only bites on Windows.

`patch-builder.js` fixes it and is wired into `postinstall` / `prestart` /
`predist`, so a fresh clone builds without manual intervention. It is idempotent
and no-ops if upstream ever ships the fix.

The AppContainer ACL and `ELECTRON_RUN_AS_NODE` problems from earlier are now
handled by `win-fix.js`, also wired into those hooks — they no longer need to be
applied by hand after every build.

Both targets build and run:

| Artifact | Size | Runs? |
|---|---|---|
| `dist/mcode Setup 2.4.6.exe` (NSIS installer) | 106.7 MB | ✅ installs with Start Menu + Desktop shortcuts |
| `dist/mcode 2.4.6.exe` (single-file portable) | 95.9 MB | ✅ runs standalone |

Note on the portable build: it takes roughly 30 s to appear, because the whole
95 MB archive is extracted to a temp folder on first launch. It is not hung.

---

## 7. Build status and known packaging issues

`npm run dist` (NSIS installer) **fails** on this machine with `spawn UNKNOWN`
inside `NsisTarget.computeScriptAndSignUninstaller`. Not root-caused yet; the
`portable` target sidesteps it.

Two Windows-specific issues must be handled on every machine:

**1. `ELECTRON_RUN_AS_NODE` must not be set to `1`.**
It makes Electron run as plain Node — the window never appears and the app exits
with `TypeError: Cannot read properties of undefined (reading 'whenReady')`.

**2. AppContainer ACL grant.**
Electron refuses to start without it:

```
FATAL: Sandboxed processes cannot read ...\electron\dist
  icacls "<dir>" /grant *S-1-15-2-1:(OI)(CI)(RX)
```

This must be re-applied after every `npm install` / rebuild, because the build
rewrites those files. **Both should be folded into an npm script** so it stops
being a manual step.

Also note: the **single-file `portable` exe does not launch on this machine** —
it extracts to a fresh `%TEMP%` folder each run, which has no ACL grant. The
**unpacked** build (`dist/win-unpacked/mcode.exe`) works.

---

## 8. Definition of done

1. `.exe` installs cleanly with no browser context.
2. Launch → login screen. The marketing homepage never appears.
3. Login → lands on `/ai/chat` (chat + editor + terminal).
4. `/mcode` reachable in-app, looks like the agent dashboard.
5. Cmd+K does **not** reach `/cli`, `/ai` or `/`.
6. No browser chrome behaviours: no reload, no zoom, no view-source, no back-to-site.
7. Server-down shows a real message, not a white window.

---