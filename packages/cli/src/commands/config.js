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

