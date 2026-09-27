import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { Orchestrator } from '../core/orchestrator.js';
import { loadConfig, getProjectId } from '../core/store.js';
import { ok, info, warn, json, table, fail } from '../core/logger.js';
import { DEFAULT_CONFIG } from '@mcode/shared';

const statePath = async (cwd = process.cwd()) => {
  const id = await getProjectId(cwd);
  return join(homedir(), '.mcode', 'watch', `${id}.json`);
};

export async function watchCommand({ background = false, scanIntervalMs = null, cwd = process.cwd() }) {
  if (background) {
    // detached child process — resolve relative to THIS module, never cwd.
    // bundled: dist/watch-process.mjs next to the bundle; source: src/watch-process.js.
    const { fileURLToPath, pathToFileURL } = await import('node:url');
    const { dirname } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const { existsSync } = await import('node:fs');
    // CLI-006: import.meta.resolve() first (survives bundlers/relocations that
    // move files without preserving relative layout), then relative fallbacks.
    let resolved = null;
    for (const spec of ['../watch-process.js', '../../dist/watch-process.mjs']) {
      try {
        const url = import.meta.resolve(spec);
        const p = fileURLToPath(/** @type {any} */(url) instanceof URL ? /** @type {any} */(url) : pathToFileURL(String(url)));
        if (existsSync(p)) { resolved = p; break; }
      } catch {
        /* specifier unresolvable in this layout — try next */
      }
    }
    const candidates = [
      ...(resolved ? [resolved] : []),
      join(here, '..', '..', 'dist', 'watch-process.mjs'), // src/commands → dist/
      join(here, '..', 'watch-process.js'), // src/commands → src/
    ];
    const script = candidates.find((c) => existsSync(c));
    if (!script) {
      fail(`watch background script not found (looked in ${candidates.join(', ')}) — run "npm run build:cli" first`);
      process.exit(1);
    }
    const child = spawn(process.execPath, [script, cwd, scanIntervalMs || ''], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
    ok(`watch daemon detached (pid ${child.pid}) — survives terminal close`);
    ok('stop with `mcode watch-stop`');
    return;
  }

  const config = await loadConfig();
  const orchestrator = new Orchestrator({
    projectPath: cwd,
    config: { ...DEFAULT_CONFIG, ...config, watch: { ...DEFAULT_CONFIG.watch, ...(config.watch || {}), ...(scanIntervalMs ? { scanIntervalMs: Number(scanIntervalMs) } : {}) } }
  });
  await orchestrator.init();

  const daemon = await orchestrator.startWatch();
  info(`\u25c9 watching ${cwd} — scanning every ${daemon.config.scanIntervalMs}ms`);
  info('Ctrl+C or `mcode watch-stop` to end');

  daemon.on('WATCH_SCAN', () => {});
  orchestrator.on('WATCH_SCAN', (p) => {
    info(`[${time()}] scan: ${p.filesScanned} files`);
  });
  orchestrator.on('WATCH_CHANGE', (p) => {
    info(`[${time()}] change detected: ${p.file}`);
  });
  orchestrator.on('WATCH_FIX', (p) => {
    if (p.outcome === 'auto-fixed') ok(`[${time()}] auto-fixed: ${p.file}`);
    else warn(`[${time()}] needs review: ${p.file} — ${p.detail}`);
  });

  // persist state for `watch-status` / `watch-stop` from other terminals
  const persistInterval = await persistState(await statePath(cwd), daemon, process.pid);

  const shutdown = async () => {
    if (persistInterval) clearInterval(persistInterval);
    await daemon.stop();
    await unlink(await statePath(cwd)).catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // keep alive
  await new Promise(() => {});
}

/** 854: cross-platform kill — Windows has no graceful SIGTERM for trees. */
async function killDaemonPid(pid) {
  try {
    if (process.platform === 'win32') {
      const { execa } = await import('execa');
      await execa('taskkill', ['/pid', String(pid), '/T', '/F'], { reject: false });
    } else {
      process.kill(pid, 'SIGTERM');
    }
    return true;
  } catch {
    return false;
  }
}

export async function watchStopCommand({ cwd = process.cwd() } = {}) {
  const sp = await statePath(cwd);
  try {
    const state = JSON.parse(await readFile(sp, 'utf8'));
    if (state.pid) {
      await killDaemonPid(state.pid);
      await unlink(sp).catch(() => {});
      ok(`watch daemon stopped (pid ${state.pid})`);
    }
  } catch {
    const daemons = await listDaemonStates();
    if (daemons.length === 0) {
      warn('no watch daemon is running for this project');
      return;
    }
    const match = daemons.find((d) => d.project === cwd);
    if (match?.pid) {
      const dead = await killDaemonPid(match.pid);
      if (dead) {
        ok(`watch daemon stopped (pid ${match.pid})`);
      } else {
        warn(`daemon pid ${match.pid} not running — state file stale`);
      }
      await unlink(match.stateFile).catch(() => {});
    } else {
      warn('no watch daemon is running for this project');
    }
  }
}

export async function watchStatusCommand({ cwd = process.cwd() } = {}) {
  const sp = await statePath(cwd);
  try {
    const state = JSON.parse(await readFile(sp, 'utf8'));
    json(state);
    table([
      ['status', state.status],
      ['uptime', formatUptime(state.uptimeSecs || 0)],
      ['scans', String(state.scansRun ?? 0)],
      ['files scanned', String(state.filesScanned ?? 0)],
      ['fixes applied', String(state.fixesApplied ?? 0)],
      ['pid', String(state.pid ?? '-')]
    ], { columns: ['METRIC', 'VALUE'] });
  } catch {
    warn('no watch daemon running for this project');
  }
}

async function persistState(sp, daemon, pid) {
  await mkdir(join(sp, '..'), { recursive: true });
  const write = () =>
    writeFile(sp, JSON.stringify({ ...daemon.summary(), pid }, null, 2), 'utf8');
  await write();
  return setInterval(write, 5000);
}

async function listDaemonStates() {
  const dir = join(homedir(), '.mcode', 'watch');
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(dir).catch(() => []);
  const out = [];
  for (const f of files.filter((x) => x.endsWith('.json'))) {
    try {
      const state = JSON.parse(await readFile(join(dir, f), 'utf8'));
      out.push({ ...state, stateFile: join(dir, f) });
    } catch {
      /* corrupt */
    }
  }
  return out;
}

function formatUptime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function time() {
  return new Date().toTimeString().slice(0, 8);
}
