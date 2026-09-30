import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for the mcode Android app.
 *
 * IMPORTANT — why `server.url` and not `webDir`
 * ------------------------------------------------
 * The obvious Capacitor setup points at a static build:
 *
 *     webDir: '../web/dist'
 *
 * That does not work for this project, and it is not a missing-file problem.
 * packages/web is a Next.js app with **no static export** — next.config.mjs has
 * no `output: 'export'`, and 18 of its pages are `force-dynamic`. These parts
 * only exist server-side and cannot be bundled into a static folder:
 *
 *   - src/proxy.ts        middleware that mints a CSP nonce per request
 *   - rewrites()          /api and /live are proxied to the backend server-side
 *   - 18 force-dynamic pages, 3 useSearchParams call sites, dynamic [id] routes
 *
 * So the WebView is pointed at the **running** Next server instead, which is
 * exactly the same model as the Windows shell (packages/desktop) loading
 * http://localhost:3000. Same consequences, same navigation guards.
 *
 * The URL must therefore be reachable from the phone: a deployed domain, or the
 * dev machine's LAN IP for testing. An Android device cannot spawn the backend
 * itself, so the whole stack (web + backend + mongo + redis) has to be running
 * and reachable somewhere.
 */
const config: CapacitorConfig = {
  appId: 'com.mcode.desktop', // matches the Windows appId so one brand id is used
  appName: 'mcode',
  webDir: 'www',

  server: {
    // Point this at wherever your stack is reachable from the phone:
    //   production : https://mcode.yourdomain.com
    //   LAN testing: http://192.168.x.x:3000   (docker compose already publishes 3000)
    // Read from the environment so nobody has to edit this file.
    url: process.env.MCODE_APP_URL ?? 'http://192.168.1.100:3000',

    androidScheme: 'https',
  },

  android: {
    // Debug builds talk to a plain-HTTP dev server, which Android blocks by
    // default. This is only needed for cleartext to your LAN host; drop it once
    // you are on HTTPS.
    allowMixedContent: true,
  },
};

export default config;
