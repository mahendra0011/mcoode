import { Orchestrator } from './core/orchestrator.js';
import { loadConfig, getProjectId } from './core/store.js';
import { info, ok, warn } from './core/logger.js';
import { DEFAULT_CONFIG } from '@mcode/shared';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { writeFile, mkdir, unlink } from 'node:fs/promises';

// Entry point for `mcode watch --background` (detached child process).
async function main() {
  const cwd = process.argv[2] || process.cwd();
  const scanIntervalMs = process.argv[3] || null;

  const config = await loadConfig();
  const orchestrator = new Orchestrator({
    projectPath: cwd,
    config: {
      ...DEFAULT_CONFIG,
      ...config,
      watch: { ...DEFAULT_CONFIG.watch, ...(config.watch || {}), ...(scanIntervalMs ? { scanIntervalMs: Number(scanIntervalMs) } : {}) }
    }
  });
  await orchestrator.init();

  const daemon = await orchestrator.startWatch();
  info(`watching ${cwd} — interval ${daemon.config.scanIntervalMs}ms`);

  const projectId = await getProjectId(cwd);
  const statePath = join(homedir(), '.mcode', 'watch', `${projectId}.json`);
  await mkdir(join(statePath, '..'), { recursive: true });
  const writeState = () =>
    writeFile(statePath, JSON.stringify({ ...daemon.summary(), pid: process.pid }, null, 2), 'utf8').catch(() => {});
  await writeState();
  setInterval(writeState, 5000);

  orchestrator.on('WATCH_FIX', (p) => {
    if (p.outcome === 'auto-fixed') ok(`auto-fixed ${p.file} (${p.outcome})`);
    else warn(`needs review: ${p.file} — ${p.detail || ''}`);
  });

  const shutdown = async () => {
    await daemon.stop();
    await writeState();
    await unlink(statePath).catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  process.stderr.write(`watch-process: ${err.message}\n`);
  process.exit(1);
});
