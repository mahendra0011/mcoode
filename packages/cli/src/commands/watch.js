import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { Orchestrator } from '../core/orchestrator.js';
import { loadConfig, getProjectId } from '../core/store.js';
import { ok, info, warn, json, table } from '../core/logger.js';
import { DEFAULT_CONFIG } from '@mcode/shared';

const statePath = async (cwd = process.cwd()) => {
  const id = await getProjectId(cwd);
  return join(homedir(), '.mcode', 'watch', `${id}.json`);
};

export async function watchCommand({ background = false, scanIntervalMs = null, cwd = process.cwd() }) {
  if (background) {
    // detached child process (bundled: dist/watch-process.cjs, source: src/watch-process.js)
    const script = typeof __dirname !== 'undefined'
      ? join(__dirname, '..', 'dist', 'watch-process.mjs')
      : join(process.cwd(), 'packages', 'cli', 'src', 'watch-process.js');
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
  await persistState(await statePath(cwd), daemon, process.pid);

  const shutdown = async () => {
    await daemon.stop();
    await unlink(await statePath(cwd)).catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // keep alive
  await new Promise(() => {});
}

export async function watchStopCommand({ cwd = process.cwd() } = {}) {
  const sp = await statePath(cwd);
  try {
    const state = JSON.parse(await readFile(sp, 'utf8'));
    if (state.pid) {
      try {
        process.kill(state.pid, 'SIGTERM');
      } catch {
        /* process already gone */
      }
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
      try {
        process.kill(match.pid, 'SIGTERM');
        ok(`watch daemon stopped (pid ${match.pid})`);
      } catch {
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
  setInterval(write, 5000);
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
