/**
 * Electron-aware navigation helpers (UI ↔ CLI separation layer).
 *
 * The Electron main process (packages/desktop/electron/main.js) spawns the
 * backend as a child process and exposes a contextBridge at
 * `window.mcodeElectron`. These helpers detect that bridge and adapt:
 *
 *  - OAuth flows open in a native popup BrowserWindow instead of a full-page redirect
 *  - External links open in the system browser via shell.openExternal
 *  - Logout dispatches a custom event so React's router can navigate (SPA),
 *    avoiding file:// hard-reloads inside the packaged app
 *  - Backend URL resolves to the child process address, not a dev-server proxy
 *
 * In the browser (no bridge) these gracefully degrade to standard window
 * navigation so the same code runs in Vite dev, production web, and Electron.
 */

export type McodeElectronAPI = {
  /** URL of the backend Express server spawned by the Electron main process. */
  backendUrl: string;
  isDev: boolean;
  isPackaged: boolean;
  /** Open an OAuth provider in a popup BrowserWindow. Resolves with the access token. */
  openOAuthPopup: (url: string) => Promise<string>;
  /** Open a URL in the user's default external browser. */
  openExternal: (url: string) => Promise<void>;
  /** Show a directory picker dialog and resolve with the selected path. */
  selectDirectory: () => Promise<string | null>;
  /** Render an error message in the Electron window (fallback for unrecoverable errors). */
  showErrorInWindow: (message: string) => void;
  /** Resolve when the React app is ready (fired after the startup animation). */
  onReady: (callback: () => void) => void;
};

declare global {
  interface Window {
    mcodeElectron?: McodeElectronAPI;
  }
}

/** True when the web frontend is running inside the Electron desktop app. */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.mcodeElectron;
}

/**
 * Resolve the backend URL.
 * In Electron this is the address of the child process server (e.g.
 * http://localhost:3100). In the browser it falls back to the Vite dev
 * proxy or NEXT_PUBLIC_API_URL.
 */
export function getBackendUrl(fallback = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3100`): string {
  if (typeof window !== 'undefined' && window.mcodeElectron?.backendUrl) {
    return window.mcodeElectron.backendUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || fallback;
}

/**
 * Initiate a GitHub (or other) OAuth connection.
 *
 * Electron: the backend URL opens in a popup BrowserWindow whose
 * `will-redirect` handler captures the `code` callback and resolves.
 * Browser: falls back to a full-page redirect (standard OAuth flow).
 */
export function connectOAuth(url: string): void {
  if (typeof window === 'undefined') return;
  if (window.mcodeElectron?.openOAuthPopup) {
    window.mcodeElectron.openOAuthPopup(url).catch(() => {
      // Popup failed or was closed — fall back to inline redirect
      window.location.href = url;
    });
  } else {
    window.location.href = url;
  }
}

/**
 * SPA navigation that works inside and outside Electron.
 *
 * Electron uses HashRouter (for file:// compatibility), so relative nav
 * uses `window.location.hash`. Browser uses native pushState.
 * If a Next.js router is provided, prefers its `push()` to avoid a full reload.
 */
export function navigateTo(path: string, router?: { push: (p: string) => void }): void {
  if (typeof window === 'undefined') return;
  // Prefer Next.js router when available (avoids any page reload)
  if (router?.push) {
    router.push(path);
    return;
  }
  // Electron fallback — hash navigation avoids file:// navigation
  if (window.mcodeElectron) {
    window.location.hash = path;
  } else {
    window.location.href = path;
  }
}

/**
 * Logout: clear stored tokens and navigate to the login page.
 *
 * In React components with router access, pass the router for clean SPA nav.
 * In non-React contexts (axios interceptors) the event is dispatched so the
 * root layout can intercept and route client-side.
 */
export function handleLogout(router?: { push: (p: string) => void }): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mcode_tokens');
  // Signal any React listener (e.g. root layout) that a logout occurred
  window.dispatchEvent(new CustomEvent('mcode:auth:logout'));
  navigateTo('/login', router);
}

/**
 * Open a URL in the external system browser.
 *
 * Electron: `shell.openExternal` (the main process handles this via IPC).
 * Browser: standard `window.open`.
 */
export function openExternal(url: string): void {
  if (typeof window === 'undefined') return;
  if (window.mcodeElectron?.openExternal) {
    window.mcodeElectron.openExternal(url).catch(() => {
      window.open(url, '_blank');
    });
  } else {
    window.open(url, '_blank');
  }
}
