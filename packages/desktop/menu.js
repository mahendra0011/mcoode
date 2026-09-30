'use strict';

/**
 * The native application menu.
 *
 * This is a big part of why the app stops feeling like a web page: Chromium's
 * default menu carries reload / zoom / back / inspect-element, and those are the
 * keyboard shortcuts people reach for out of habit. Building our own menu means
 * those roles are simply not registered, so the shortcuts stop working —
 * no need to intercept and swallow each key.
 */

const { Menu, shell } = require('electron');

function buildMenu({ onReload, onToggleDevTools, onQuit, APP_URL }) {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'mcode',
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { type: 'separator' },
              { label: 'Quit mcode', accelerator: 'Cmd+Q', click: onQuit },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload Workspace',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: onReload,
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: 'Quit mcode', accelerator: 'Alt+F4', click: onQuit },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: onToggleDevTools,
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open API Documentation',
          click: () => shell.openExternal(`${APP_URL}/api/docs`),
        },
        {
          label: 'About mcode',
          click: () => shell.openExternal(`${APP_URL}/changelog`),
        },
      ],
    },
  ];

  // `reload`, `back`, `forward` and `inspectElement` are intentionally absent:
  // they are what make an Electron window feel like a browser tab.
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };