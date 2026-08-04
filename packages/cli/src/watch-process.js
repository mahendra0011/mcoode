import { Orchestrator } from './core/orchestrator.js';
import { loadConfig } from './core/store.js';
import { info, ok } from './core/logger.js';
import { DEFAULT_CONFIG } from '@mcode/shared';

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

  orchestrator.on('WATCH_FIX', (p) => {
    ok(`auto-fixed ${p.file} (${p.outcome})`);
  });

  process.on('SIGTERM', async () => {
    await daemon.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  process.stderr.write(`watch-process: ${err.message}\n`);
  process.exit(1);
});
