'use strict';

/**
 * One-time Windows fixes that Electron needs on this machine.
 *
 * Two separate problems are handled here, both of which stop the app from
 * launching with no useful error:
 *
 * 1. ELECTRON_RUN_AS_NODE=1
 *    When set, Electron runs as a plain Node process. The window never opens
 *    and the app dies with:
 *      TypeError: Cannot read properties of undefined (reading 'whenReady')
 *
 * 2. AppContainer ACL
 *    Electron refuses to start at all with:
 *      FATAL: Sandboxed processes cannot read ...\electron\dist
 *      its ACL has an entry for an AppContainer package SID but none for
 *      ALL APPLICATION PACKAGES
 *    Fixed by granting the ALL APPLICATION PACKAGES SID read access.
 *
 * Wired into `prestart` / `predist`: npm install and every rebuild recreate
 * those directories and wipe the grant.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const APP_PACKAGES_SID = '*S-1-15-2-1';

function isWindows() {
  return process.platform === 'win32';
}

function grantAppContainerAccess(dir) {
  if (!fs.existsSync(dir)) return false;
  execFileSync(
    'icacls',
    [dir, '/grant', `${APP_PACKAGES_SID}:(OI)(CI)(RX)`, '/T', '/Q'],
    { stdio: 'ignore', windowsHide: true }
  );
  return true;
}

function fixWindows() {
  if (!isWindows()) return;

  // Electron inherits this from the environment it is launched with. We cannot
  // unset it for an already-running parent, so report it loudly instead of
  // pretending the problem was solved.
  if (process.env.ELECTRON_RUN_AS_NODE === '1') {
    console.warn(
      '\n  ! ELECTRON_RUN_AS_NODE=1 is set.\n' +
        '    Electron will run as plain Node and the window will never open.\n' +
        '    Fix for this session:\n' +
        '      Remove-Item Env:\\ELECTRON_RUN_AS_NODE\n' +
        '    Remove it permanently:\n' +
        '      [Environment]::SetEnvironmentVariable("ELECTRON_RUN_AS_NODE","","User")\n'
    );
  }

  const targets = [
    path.join(__dirname, 'node_modules', 'electron', 'dist'),
    path.join(__dirname, 'dist', 'win-unpacked'),
  ];

  for (const dir of targets) {
    try {
      if (grantAppContainerAccess(dir)) {
        console.log(`  + ACL granted: ${path.relative(__dirname, dir) || dir}`);
      }
    } catch (err) {
      console.warn(`  ! could not grant ACL for ${dir}: ${err.message}`);
    }
  }
}

if (require.main === module) fixWindows();

module.exports = { fixWindows };