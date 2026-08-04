import { render } from 'ink';
import { App } from './ui/App.jsx';
import { Orchestrator } from './core/orchestrator.js';
import { loadConfig } from './core/store.js';
import { saveHistory } from './core/history.js';
import { runOnboarding } from './commands/onboarding.js';
import { basename } from 'node:path';

export async function startRepl() {
  const stdinOk = Boolean(process.stdin.isTTY) && typeof process.stdin.setRawMode === 'function';
  const stdoutOk = Boolean(process.stdout.isTTY);
  if (!stdinOk || !stdoutOk) {
    console.error('mcode: interactive TUI needs a supported terminal (raw-mode input).');
    console.error('Current terminal is not TTY-capable for Ink. Use Windows Terminal, VS Code terminal,');
    console.error('Command Prompt (not Git Bash/mintty), or run with --non-interactive for scripted use.');
    process.exit(1);
  }
  const config = await loadConfig();
  await runOnboarding({ interactive: true });
  const projectName = basename(process.cwd()) || 'project';
  const orchestrator = new Orchestrator({
    projectPath: process.cwd(),
    config,
    options: {
      modelOverride: process.env.MCCODE_MODEL || null,
      verbose: process.env.MCCODE_VERBOSE === '1'
    }
  });
  await orchestrator.init();

  let app;
  try {
    app = render(
      <App
        orchestrator={orchestrator}
        projectName={projectName}
        history={[]}
      />,
      { exitOnCtrlC: true }
    );
  } catch (err) {
    console.error(`mcode: TUI failed to start (${err?.message || err}).`);
    console.error('Use Windows Terminal, VS Code terminal, or Command Prompt — or run with --non-interactive.');
    process.exit(1);
  }

  await app.waitUntilExit();

  // persist session on exit
  await saveHistory({
    id: orchestrator.sessionId,
    mode: 'manual',
    projectName,
    projectPath: process.cwd(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed'
  });

  await orchestrator.watchDaemon?.stop();
  process.exit(0);
}
