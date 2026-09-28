import { CONFIG_PATH, getLastConfigError } from '../core/store.js';
import { readFile } from 'node:fs/promises';
import { validateConfig } from '../core/config-schema.js';
import { out, warn, fail } from '../core/logger.js';

export async function configCommand({ open = false, validate = false } = {}) {
  if (validate) return configValidateCommand();
  if (open) {
    const { spawn } = await import('node:child_process');
    const opener = process.platform === 'win32' ? 'notepad' : process.platform === 'darwin' ? 'open' : 'nano';
    spawn(opener, [CONFIG_PATH], { stdio: 'ignore', detached: true }).unref();
    out(`opened ${CONFIG_PATH}`);
    return;
  }
  try {
    out(await readFile(CONFIG_PATH, 'utf8'));
  } catch {
    warn('no config file yet — run `mcode doctor` or `mcode env add` to create one');
  }
}

/** MF-007: `mcode config validate` — loud schema check (0 = valid). */
export async function configValidateCommand() {
  let rawText;
  try {
    rawText = await readFile(CONFIG_PATH, 'utf8');
  } catch {
    warn(`no config file at ${CONFIG_PATH} — nothing to validate`);
    return { ok: true, absent: true };
  }
  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch (err) {
    fail(`config.json is not valid JSON: ${err.message}`);
    process.exitCode = 1;
    return { ok: false, kind: 'parse', message: err.message };
  }
  try {
    validateConfig(raw);
  } catch (err) {
    fail(`config.json failed schema validation: ${err.message}`);
    process.exitCode = 1;
    return { ok: false, kind: 'schema', message: err.message };
  }
  // Surface a stale in-memory problem even when the file is now fine.
  const stale = getLastConfigError?.();
  if (stale) warn(`note: this process previously saw a config ${stale.kind} error: ${stale.message}`);
  out('config.json is valid ✓');
  return { ok: true };
}

export async function serveCommand({ port = process.env.MCCODE_PORT || 3100 } = {}) {
  let mod;
  try {
    mod = await import('@mcode/backend');
  } catch {
    warn('@mcode/backend is not available next to this CLI install.');
    warn('Fix: run inside the mcode monorepo (npm run dev:backend), or start the backend package directly:');
    warn(`  npx -y @mcode/backend   # or: node packages/backend/src/main.js (PORT=${port})`);
    process.exit(1);
  }
  const { startServer } = mod?.startServer ? mod : await import('@mcode/backend');
  const server = await startServer({ port: Number(port) });
  out(`mcode backend listening on http://localhost:${port}  (dashboard: http://localhost:5173)`);
  return server;
}

