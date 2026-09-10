/**
 * Type augmentation for the Electron bridge injected by packages/desktop/electron/preload.mjs.
 *
 * The preload script exposes `window.mcodeElectron` via contextBridge with
 * properties used by the web frontend to adapt behavior when running inside
 * the Electron wrapper (as opposed to a browser tab served by Vite).
 *
 * In web/browser dev mode this global is `undefined`, so all usages must guard
 * with optional chaining: `window.mcodeElectron?.backendUrl`.
 */
export type McodeElectronAPI = {
  /** URL of the backend Express server (e.g. http://localhost:3100). */
  backendUrl: string;
  /** True when running inside the packaged Electron app. */
  isDev: boolean;
  /** True when the Electron app is packaged (production). */
  isPackaged: boolean;
  /**
   * Open an OAuth flow in a popup BrowserWindow.
   * Resolves with the access token once the provider redirects back
   * with `?github_connected=1` (or similar).
   */
  openOAuthPopup: (url: string) => Promise<string>;
  /** Open a URL in the user's default external browser. */
  openExternal: (url: string) => Promise<void>;
  /** Show a directory picker dialog and resolve with the selected path. */
  selectDirectory: () => Promise<string | null>;
  /** Show an error message in the Electron window (first-run / crash fallback). */
  showErrorInWindow: (message: string) => void;
  /**
   * Resolve when the React app is ready (fired after startup animation).
   * Only emitted in Electron; no-op in browser.
   */
  onReady: (callback: () => void) => void;
};

declare global {
  interface Window {
    mcodeElectron?: McodeElectronAPI;
  }
}
