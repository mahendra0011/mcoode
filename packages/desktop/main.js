'use strict';

/**
 * mcode desktop shell — entry point.
 *
 * A deliberately thin Electron wrapper around the existing mcode web app. It
 * holds no application logic: it opens one window onto the local Next.js server
 * so every screen, API call and socket behaves exactly as it does in the
 * browser. Nothing in packages/web, packages/backend or packages/cli is
 * duplicated or modified here.
 *
 * What makes it an application rather than a website in a frame:
 *   - it opens on /login, never on a marketing page          (config.js)
 *   - the marketing routes are blocked, in-app too           (guards.js)
 *   - it has a real app menu, not a browser menu             (menu.js)
 *   - reload / zoom / view-source keybindings do not exist   (unregistered)
 *   - it has a splash and a real "server down" screen        (pages.js)
 *   - it is single-instance and remembers its window size    (guards.js)
 */

const { app, BrowserWindow, shell } = require('electron');

const { APP_URL, INITIAL_PATH, BLOCKED_ROUTES, IS_DEV, paths } = require('./config');
const { showSplash, showServerDown } = require('./pages');
const { buildMenu } = require('./menu');
const {
  loadWindowState,
  saveWindowState,
  installNavigationGuard,
  isAllowed,
} = require('./guards');

let mainWindow = null;
let splashWindow = null;

/** Only one copy of the app may run — a second launch focuses the first. */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const state = loadWindowState();

  const win = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1024,
    minHeight: 700,
    show: false, // shown once the first paint lands, not as a white frame
    backgroundColor: '#0c0c0c',
    title: 'mcode',
    icon: paths.icon,
    webPreferences: {
      // The renderer only displays the web app — it gets no Node access.
      contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false is deliberate. The renderer only ever loads
      // http://localhost:<port> and holds no local files, so there is nothing
      // for the OS sandbox to protect — but with it on, Windows refuses to
      // launch at all unless node_modules\electron\dist is granted AppContainer
      // access (icacls ... /grant *S-1-15-2-1), which breaks again on every
      // reinstall of Electron.
      sandbox: false,
    },
  });

  if (state.maximized) win.maximize();
  win.setMinimumSize(1024, 700);

  installGuards(win);
  win.loadURL(`${APP_URL}${INITIAL_PATH}`);
  return win;
}

function installGuards(win) {
  const { webContents } = win;
  const { Menu, MenuItem } = require('electron');

  // --- no browser chrome behaviours ----------------------------------------

  // Chromium's default context menu carries "Back / Reload / Inspect", which is
  // exactly the browser feel we are removing. The editing verbs are kept,
  // because a real app still needs Copy/Paste on a selection.
  webContents.on('context-menu', (_event, params) => {
    if (!params.selectionText && !params.linkURL && !params.isEditable) return;
    const menu = new Menu();
    for (const role of ['copy', 'cut', 'paste', 'pasteAndMatchStyle', 'selectAll']) {
      menu.append(new MenuItem({ role }));
    }
    menu.popup({ window: win });
  });

  // Zoom is a browser gesture. Pin it so Ctrl+wheel cannot rescale the UI —
  // Monaco and xterm do their own font sizing.
  webContents.setVisualZoomLevelLimits(1, 1);
  webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'mouseWheel' && input.control) input.preventDefault();
  });

  // --- navigation ----------------------------------------------------------

  // Hard navigations (typed URL, redirect, window.location) to a marketing page
  // are refused outright.
  webContents.on('will-navigate', (event, url) => {
    if (isAllowed(url)) return;
    event.preventDefault();
    if (IS_DEV) console.warn('[desktop] blocked navigation to', url);
  });

  // Anything that wants a new window (an external doc link) goes to the real
  // browser rather than replacing the app UI.
  webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url) && !url.startsWith(APP_URL)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Anything reaching a different origin leaves the app entirely.
  webContents.on('will-redirect', (event, url) => {
    if (url.startsWith(APP_URL)) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  // --- lifecycle -----------------------------------------------------------

  webContents.on('did-finish-load', () =>
    installNavigationGuard(webContents, BLOCKED_ROUTES)
  );

  webContents.on('did-fail-load', (_e, code, _desc, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (code === -3) return; // ERR_ABORTED — a redirect, not a failure
    if (validatedURL.startsWith(APP_URL)) {
      showServerDown(win, APP_URL, () => win.loadURL(`${APP_URL}${INITIAL_PATH}`));
    }
  });

  win.on('close', () => saveWindowState(win));
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });
}

function buildAppMenu() {
  buildMenu({
    APP_URL,
    onReload: () => mainWindow && mainWindow.webContents.reload(),
    onToggleDevTools: () => {
      if (!mainWindow) return;
      const wc = mainWindow.webContents;
      if (wc.isDevToolsOpened()) wc.closeDevTools();
      else wc.openDevTools({ mode: 'detach' });
    },
    onQuit: () => app.quit(),
  });
}

app.whenReady().then(() => {
  try {
    // Groups the taskbar icon under the app on Windows.
    app.setAppUserModelId('com.mcode.desktop');
  } catch {
    /* cosmetic only */
  }

  buildAppMenu();
  splashWindow = showSplash();

  mainWindow = createWindow();

  // Show the real window only once it has painted — that is what removes the
  // white flash and gives the splash a purpose.
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
    splashWindow = null;
    mainWindow.show();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      mainWindow.once('ready-to-show', () => mainWindow.show());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
