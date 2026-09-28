import { createRequire } from 'node:module';

/**
 * MF-006: single source of truth for the CLI version.
 *
 * The version used to be hardcoded in three places (`doctor.js`,
 * `index.js` `.version()`, and the `checkForUpdate()` call), so any release
 * that bumped `package.json` but missed a literal made `mcode doctor` /
 * `mcode --version` / the update check report a stale version — which directly
 * misleads troubleshooting and bug reports.
 *
 * esbuild (scripts/build.js) bundles this module into `dist/mcode.mjs`, so the
 * source path (`src/core/version.js` → `packages/cli/package.json`) and the
 * bundle path (`dist/mcode.mjs` → `../package.json`) are both probed; a missing
 * or unreadable file degrades to a visible warning, never a crash.
 */
const require = createRequire(import.meta.url);
const CANDIDATES = ['../../package.json', '../package.json', '../../../package.json'];

/** @type {string} */
export let CLI_VERSION = '0.0.0-unknown';
try {
  let pkg = null;
  let lastErr = null;
  for (const spec of CANDIDATES) {
    try {
      pkg = require(spec);
      if (pkg) break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (pkg && typeof pkg.version === 'string' && pkg.version) CLI_VERSION = pkg.version;
  else throw lastErr || new Error('no package.json found');
} catch (err) {
  // Never crash a command over a missing package.json — but say so once.
  process.stderr.write(
    `[version] warning: could not read packages/cli/package.json (${err?.message || err}) — reporting ${CLI_VERSION}\n`
  );
}
