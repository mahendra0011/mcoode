import { CONFIG_PATH } from '../core/store.js';
import { readFile } from 'node:fs/promises';
import { out, warn } from '../core/logger.js';

export async function configCommand({ open = false } = {}) {
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

export async function serveCommand({ port = process.env.MCCODE_PORT || 3100 } = {}) {
  try {
    await import('@mcode/backend');
  } catch {
    warn('@mcode/backend not installed in this workspace — install it or use the published `mcode-cli` bundle');
    process.exit(1);
  }
  const { startServer } = await import('@mcode/backend');
  const server = await startServer({ port: Number(port) });
  out(`mcode backend listening on http://localhost:${port}  (dashboard: http://localhost:5173)`);
  return server;
}

