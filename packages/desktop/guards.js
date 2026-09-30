'use strict';

/**
 * Keeping the app inside its own routes, and remembering the window.
 */

const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

const { ALLOWED_ROUTES, BLOCKED_ROUTES } = require('./config');

/** Store the window geometry next to the app's userData, not in the repo. */
function stateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (typeof raw.width === 'number' && typeof raw.height === 'number') return raw;
  } catch {
    /* no saved state yet — fall through to defaults */
  }
  return { width: 1440, height: 900, x: undefined, y: undefined, maximized: false };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  // Bounds must be read before maximize() or the maximized size is what gets
  // stored, and the window then never restores to its real size.
  const bounds = win.getNormalBounds();
  try {
    fs.writeFileSync(
      stateFile(),
      JSON.stringify({ ...bounds, maximized: win.isMaximized() }, null, 2)
    );
  } catch {
    /* geometry is a nicety, never worth failing a shutdown over */
  }
}

function normalizeRoute(url) {
  try {
    const { pathname } = new URL(url);
    const trimmed = pathname.replace(/\/+$/, '');
    return trimmed === '' ? '/' : trimmed;
  } catch {
    return null;
  }
}

function isAllowed(url) {
  const route = normalizeRoute(url);
  if (route === null) return false;
  if (BLOCKED_ROUTES.has(route)) return false;
  if (ALLOWED_ROUTES.has(route)) return true;
  // Dynamic routes such as /sessions/<id> are valid app screens.
  return route.startsWith('/sessions/');
}

/**
 * Build the guard script that gets injected into the page.
 *
 * Exported separately from installNavigationGuard() so it can be parsed and
 * executed in a test — a syntax error here would otherwise only surface as a
 * silent failure inside the renderer.
 */
function buildGuardScript(blocked) {
  return `
    (() => {
      const blocked = new Set(${JSON.stringify([...blocked])});
      const isBlocked = (url) => {
        try {
          let p = new URL(url, location.origin).pathname.replace(/\\/+$/, '');
          if (p === '') p = '/';
          return blocked.has(p);
        } catch { return false; }
      };
      for (const name of ['pushState', 'replaceState']) {
        const original = history[name];
        history[name] = function (state, title, url) {
          if (url != null && isBlocked(String(url))) return null;
          return original.apply(this, arguments);
        };
      }
    })();
  `;
}

/**
 * Block the marketing routes from in-app navigation.
 *
 * Electron's will-navigate handler does NOT fire for Next.js router.push(),
 * which is a same-document history.pushState — and that is exactly how the
 * command palette navigates. So the guard is injected into the page's main
 * world where history is shared, and pushState/replaceState simply refuse the
 * blocked paths.
 *
 * This keeps packages/web untouched, which is the whole point: no marketing
 * page can be reached and not a single web file is edited.
 */
function installNavigationGuard(webContents, blocked) {
  webContents.executeJavaScript(buildGuardScript(blocked)).catch(() => {
    // Injection is best-effort; will-navigate still blocks hard navigations.
  });
}

module.exports = {
  loadWindowState,
  saveWindowState,
  buildGuardScript,
  installNavigationGuard,
  isAllowed,
  normalizeRoute,
};