'use strict';

/**
 * Native windows (splash + the offline error screen).
 *
 * Both are plain HTML rendered offscreen/frameless, so the app never shows a
 * white browser frame while starting up, and never shows a blank page if the
 * Docker stack is not up.
 */

const { BrowserWindow } = require('electron');

const DARK = '#0c0c0c';

function baseHtml(title, body) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:${DARK};color:#e5e7eb;
    font:14px/1.6 "Segoe UI",system-ui,sans-serif;
    display:flex;align-items:center;justify-content:center}
  .box{max-width:460px;padding:32px 36px;border:1px solid #26262b;border-radius:14px;
    background:#131316;text-align:center}
  h1{margin:0 0 10px;font-size:17px;font-weight:600}
  p{margin:0 0 8px;color:#a1a1aa}
  code{background:#1c1c20;padding:2px 7px;border-radius:5px;color:#e5e7eb;font-size:12.5px}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;
    margin-right:8px;animation:p 1.1s ease-in-out infinite}
  @keyframes p{0%,100%{opacity:.25}50%{opacity:1}}
</style></head>
<body><div class="box">${body}</div></body></html>`;
}

/** Translucent splash shown while the web app boots. */
function showSplash() {
  const splash = new BrowserWindow({
    width: 420,
    height: 240,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  splash.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        baseHtml(
          'mcode',
          `<h1><span class="dot"></span>Starting mcode</h1>
           <p>Connecting to the local server…</p>`
        )
      )
  );
  splash.once('ready-to-show', () => splash.show());
  return splash;
}

/**
 * Shown when the web app cannot be reached — almost always "Docker is not up".
 * A bare loadURL() failure would otherwise leave an empty window, which reads as
 * a broken app rather than an explanation.
 */
function showServerDown(parentWindow, APP_URL, onRetry) {
  const win = new BrowserWindow({
    width: 520,
    height: 380,
    parent: parentWindow,
    modal: Boolean(parentWindow),
    frame: false,
    resizable: false,
    show: false,
    backgroundColor: DARK,
    title: 'mcode — server not running',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  win.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        baseHtml(
          'Server not running',
          `<h1>Cannot reach the mcode server</h1>
           <p>The desktop app is a window onto the web app, which is served by
              Docker at <code>${APP_URL}</code>.</p>
           <p>Start the stack and this screen will disappear:</p>
           <p><code>docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d</code></p>`
        )
      )
  );

  win.once('ready-to-show', () => win.show());
  if (typeof onRetry === 'function') win.on('closed', onRetry);
  return win;
}

module.exports = { showSplash, showServerDown };