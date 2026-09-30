'use strict';

/**
 * Patch an electron-builder bug that breaks the NSIS installer on Windows.
 *
 * Symptom
 * -------
 *   ⨯ spawn UNKNOWN   failedTask=build
 *   at NsisTarget.finishBuild ...
 *   at WineVmManager.execWine (app-builder-lib/src/vm/WineVm.ts:40)
 *
 * Cause
 * -----
 * While extracting the uninstaller, NsisTarget runs the just-built installer
 * through WineVmManager with a minimal environment:
 *
 *   await wineVm.exec(installerPath, [], { env: { __COMPAT_LAYER: "RunAsInvoker" } });
 *
 * and WineVm.execWine does:
 *
 *   if (process.platform === "win32") {
 *     return exec(target, appArgs, options);            // <-- env passed as-is
 *   }
 *   return exec(wineExe, [...], {
 *     ...options,
 *     env: { ...process.env, ...wineEnv, ...options.env }, // <-- correctly merged
 *   });
 *
 * The Windows branch therefore hands CreateProcess an environment containing
 * only __COMPAT_LAYER — no SystemRoot, SystemDrive or TEMP. Windows cannot
 * initialise a process with such an environment, and Node reports the failure
 * as the very unhelpful `spawn UNKNOWN`.
 *
 * Fix
 * ---
 * Merge process.env into the Windows branch, mirroring what the non-Windows
 * branch already does. Applied idempotently, and skipped if upstream has
 * already fixed it.
 */

const fs = require('node:fs');
const path = require('node:path');

const TARGET = path.join(
  __dirname,
  'node_modules',
  'app-builder-lib',
  'out',
  'vm',
  'WineVm.js'
);

const BUGGY = 'return (0, builder_util_1.exec)(target, appArgs, options);';
const FIXED =
  'return (0, builder_util_1.exec)(target, appArgs, { ...options, env: { ...process.env, ...(options == null ? void 0 : options.env) } });';

function patchElectronBuilder() {
  if (!fs.existsSync(TARGET)) {
    console.log('  - WineVm.js not found, skipping patch');
    return;
  }

  const src = fs.readFileSync(TARGET, 'utf8');

  if (src.includes(FIXED)) {
    console.log('  = WineVm.js already patched');
    return;
  }

  if (!src.includes(BUGGY)) {
    // Upstream may have restructured the file; patching blind would be worse
    // than doing nothing.
    console.log('  ! WineVm.js no longer matches the known bug — not patching');
    return;
  }

  const patched = src.replace(BUGGY, FIXED);
  fs.writeFileSync(TARGET, patched, 'utf8');
  console.log('  + patched WineVm.js (NSIS installer env fix)');
}

if (require.main === module) patchElectronBuilder();

module.exports = { patchElectronBuilder };