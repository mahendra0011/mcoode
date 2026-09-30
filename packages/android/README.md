# mcode — Android App

Capacitor shell around the existing mcode web app. Three screens, no CLI:

| | |
|---|---|
| **AI Chat** | `/ai/chat` — chat, Monaco editor and terminal together |
| **AI Code Editor** | same screen as above (they are one screen in the app) |
| **AI Code Assistant** | `/mcode` — God Mode, subagent orchestration |

Plus auth and the screens those need: `/login`, `/signup`, `/forgot-password`,
`/settings`, `/sessions`, `/extensions`, `/preview`.

**The CLI is not in this app.** `mcode` is a Node program that runs in a
terminal, and an Android app has no terminal — so `/cli`, `/commands`,
`/plugins`, `/tools`, `/docs`, `/changelog` and `/live` are all blocked, along
with the marketing pages. The allow-list lives in `routes.mjs` and nothing else.

## Before anything works: the backend must be reachable

An Android app **cannot** run the Node + Mongo + Redis backend itself, so the
whole stack has to be running somewhere the phone can reach.

**Option A — a real deployment (recommended).** Put the web app behind a domain
(`https://mcode.yourdomain.com`). Then everything works with no further config:
the app uses that origin, and the existing Next rewrites proxy `/api` and the
`/live` socket to the backend server-side.

**Option B — your machine over Wi-Fi (testing only).** Find your LAN IP:

```powershell
ipconfig | Select-String "IPv4"
```

Start the stack and point the app at port **3000** (the web app, not 3100):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
set MCODE_APP_URL=http://192.168.x.x:3000
npm run sync
npm run run:android
```

`src/debug/AndroidManifest.xml` allows cleartext HTTP for exactly this case, and
only in debug builds — a release build still demands HTTPS.

## Build an APK

This needs **Android Studio** (JDK + Android SDK), which this repo does not
assume to be installed.

```bash
npm install
npm run guard        # builds the route guard into the Android assets
npm run sync         # copies web assets + config into android/

npm run open         # opens the project in Android Studio
```

Then in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The APK lands in `android/app/build/outputs/apk/debug/`.

To install on a connected phone:

```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

## Commands

| Command | What it does |
|---|---|
| `npm run guard` | Rebuilds `android-guard.js` from `routes.mjs` and copies it into the Android assets |
| `npm test` | Proves the guard blocks the CLI/marketing routes and allows the real ones |
| `npm run sync` | `guard` + `cap sync` — run after any config or route change |
| `npm run open` | Opens the project in Android Studio |
| `npm run run:android` | Builds, installs and launches on a connected device |

## How the route blocking works

Capacitor has no concept of allowed routes, and Next.js navigates with
`history.pushState`, which Android's WebViewClient does not treat as a
navigation. So the restriction has to live inside the page:

- `routes.mjs` — the single source of truth for allowed/blocked routes
- `web-guard.js` — a template that wraps `pushState`/`replaceState`
- `build-guard.mjs` — substitutes the route lists, writes `android-guard.js`
- `MainActivity` — injects that script through a Capacitor `WebViewListener`
  after each page load

No Android-specific code was added to `packages/web`.

## Not done

- No release signing config — debug APKs only until a keystore is set up
- No Play Store metadata (icon, screenshots, listing)
- Monaco and xterm.js are built for desktop input; touch behaviour on a real
  phone has not been verified. If the combined chat+editor+terminal layout turns
  out to be cramped on a narrow screen, that will need responsive breakpoints —
  a layout change in the web app, not a logic change.
