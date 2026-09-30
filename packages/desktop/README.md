# mcode — Desktop App

A thin Electron shell around the existing mcode web app. It adds **no application
logic**: it opens one window pointed at the local Next.js server, so every screen,
API call and socket behaves exactly as it does in the browser.

`packages/web`, `packages/backend` and `packages/cli` are not modified in any way.

## Which screens you get

The window has no address bar and loads `/login` on launch, so the marketing
pages (`/`, `/ai`, `/cli`) are never loaded. From there the app's own auth flow
takes over — `LoginPage` already redirects to `/ai/chat` after sign-in
(`packages/web/src/components/pages/LoginPage.tsx:127`).

Override the port or the first screen with env vars if needed:

```bash
MCODE_WEB_PORT=3000 MCODE_INITIAL_PATH=/login npm start
```

## Prerequisites

The web app must already be running — this shell does not start Docker itself:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Develop

```bash
npm install
npm start
```

## Build a .exe

```bash
npm run dist       # NSIS installer → dist/mcode Setup <version>.exe
npm run pack       # unpacked folder, no installer
```

`npm run dist` is the supported distribution: a real installer with Start Menu
and Desktop shortcuts. Run `npm start` for day-to-day work.

### What runs automatically

`postinstall`, `prestart` and `predist` all invoke two fixups, so neither step
below is ever needed by hand:

| Script | What it does |
|---|---|
| `patch-builder.js` | Patches an electron-builder bug that broke the NSIS installer on Windows (see below) |
| `win-fix.js` | Grants the AppContainer ACL Electron needs, and warns if `ELECTRON_RUN_AS_NODE` is set |

### The electron-builder bug that was patched

`npm run dist` failed with a bare `spawn UNKNOWN`. Root cause was in
`app-builder-lib/out/vm/WineVm.js`:

```js
if (process.platform === "win32") {
  return exec(target, appArgs, options);            // env passed through as-is
}
return exec(wineExe, [...], {
  ...options,
  env: { ...process.env, ...wineEnv, ...options.env }, // correctly merged
});
```

While extracting the uninstaller, electron-builder runs the just-built installer
with `{ env: { __COMPAT_LAYER: "RunAsInvoker" } }`. The Windows branch passes
that minimal environment straight to `CreateProcess`, so `SystemRoot`,
`SystemDrive` and `TEMP` are all missing and the spawn fails with the
unhelpful `spawn UNKNOWN`. The patch merges `process.env` on the Windows branch
too, mirroring what the other branch already does.

`patch-builder.js` is idempotent and skips the patch if upstream has already
fixed it, so it is safe to keep.

### Windows ACL fix

Electron refuses to start without:

```
FATAL: Sandboxed processes cannot read ...\electron\dist
  icacls "<dir>" /grant *S-1-15-2-1:(OI)(CI)(RX)
```

`win-fix.js` applies this automatically to `node_modules/electron/dist` and
`dist/win-unpacked`. Run `npm run fix:win` to redo it by hand after copying the
build to a new folder.

### If the app exits immediately

`ELECTRON_RUN_AS_NODE` must not be set to `1` — it makes Electron run as a plain
Node process. `win-fix.js` warns when it sees it. To clear it:

```powershell
Remove-Item Env:\ELECTRON_RUN_AS_NODE
# permanently:
[Environment]::SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", "", "User")
```
