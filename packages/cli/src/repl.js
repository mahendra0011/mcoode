import { createCliRenderer } from '@opentui/core';
import { createRoot } from '@opentui/react';
import { App } from './ui/App.jsx';
import { OnboardingScreen } from './ui/OnboardingScreen.jsx';
import { Orchestrator } from './core/orchestrator.js';
import { loadConfig, saveConfig } from './core/store.js';
import { saveHistory } from './core/history.js';
import { hasApiKey, backendUrl, migrateLegacyRefreshToken } from './commands/onboarding.js';
import { loadVault, saveVault } from './core/vault.js';
import { basename } from 'node:path';

export async function startRepl({ watchAfter = null } = {}) {
  const stdinOk = Boolean(process.stdin.isTTY) && typeof process.stdin.setRawMode === 'function';
  const stdoutOk = Boolean(process.stdout.isTTY);
  if (!stdinOk || !stdoutOk) {
    console.error('mcode: interactive TUI needs a supported terminal (raw-mode input).');
    console.error('Current terminal is not TTY-capable for OpenTUI. Use Windows Terminal, VS Code terminal,');
    console.error('Command Prompt (not Git Bash/mintty), or run with --non-interactive for scripted use.');
    process.exit(1);
  }

  let renderer;
  try {
    renderer = await createCliRenderer({
      exitOnCtrlC: true,
      screenMode: 'alternate-screen',
      clearOnShutdown: true,
      backgroundColor: '#0a0a0a',
    });
  } catch (err) {
    console.error(`mcode: TUI failed to start (${err?.message || err}).`);
    console.error('OpenTUI needs Node.js 26.4.0+ started with --experimental-ffi.');
    process.exit(1);
  }

  // CLI-001: graceful shutdown — Ctrl+C / SIGTERM restores the terminal
  // (leaves the alternate screen, re-enables echo) instead of stranding it
  // in raw mode when the renderer cannot tear itself down.
  const restoreTerminalAndExit = (code = 130) => {
    try { renderer.destroy?.(); } catch {
      if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
        try { process.stdin.setRawMode(false); } catch { /* raw mode already off */ }
      }
      process.stdout.write('\x1b[?1049l\x1b[?25h');
    }
    process.exit(code);
  };
  process.once('SIGINT', () => restoreTerminalAndExit(130));
  process.once('SIGTERM', () => restoreTerminalAndExit(143));

  const config = await loadConfig();
  const accountExists = Boolean(config?.account?.email);
  const keyExists = await hasApiKey(config);

  // move any legacy plaintext refresh token into the encrypted vault
  await migrateLegacyRefreshToken(config);

  // ── Onboarding (if needed) ────────────────────────────────────────────
  // Local-first: only block when there's no provider key at all (env or
  // vault). An account is optional — the tool works fully without one.
  const needsOnboarding = !keyExists;

  if (needsOnboarding) {
    await new Promise(/** @type {(v?: any) => void} */ ((resolve) => {
      const base = backendUrl(config);

      async function apiCall(method, url, body, token = null) {
        let res;
        try {
          res = await fetch(url, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
          });
        } catch (err) {
          const code = err.cause?.code || '';
          if (['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
            throw new Error(`cannot reach mcode backend at ${base} — start it from the repo root with: npm run start --workspace packages/backend`);
          }
          throw new Error(`network error contacting ${base}: ${err.message}`);
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw Object.assign(
            new Error(data?.error?.message || `request failed (${res.status})`),
            { code: /** @type {any} */(data)?.error?.code }
          );
        }
        return data;
      }

      const apiHandlers = {
        sendOtp: async (email) => {
          return apiCall('POST', `${base}/api/v1/auth/send-otp`, { email, intent: 'signup' });
        },
        verifySignup: async ({ email, name, password, otp }) => {
          const data = await apiCall('POST', `${base}/api/v1/auth/verify-otp`, {
            email, otp, intent: 'signup', name, password,
          });
          await saveConfig({ account: { email: data.user.email, name: data.user.name } });
          await saveVault({ ...(await loadVault()), MCCODE_REFRESH_TOKEN: data.refresh });
          return data;
        },
        login: async (email, password) => {
          const data = await apiCall('POST', `${base}/api/v1/auth/login`, { email, password });
          await saveConfig({ account: { email: data.user.email, name: data.user.name } });
          await saveVault({ ...(await loadVault()), MCCODE_REFRESH_TOKEN: data.refresh });
          return data;
        },
        saveApiKey: async (envVar, key) => {
          const secrets = await loadVault();
          await saveVault({ ...secrets, [envVar]: key });
        },
      };

      const onboardingRoot = createRoot(renderer);
      onboardingRoot.render(
        <OnboardingScreen
          onComplete={() => {
            onboardingRoot.unmount();
            resolve();
          }}
          hasAccount={accountExists}
          hasKey={keyExists}
          config={config}
          apiHandlers={apiHandlers}
        />
      );
    }));
  }

  // ── Main TUI ──────────────────────────────────────────────────────────
  while (true) {
    const freshConfig = await loadConfig({ force: true });
    const projectName = basename(process.cwd()) || 'project';
    const orchestrator = new Orchestrator({
      projectPath: process.cwd(),
      config: freshConfig,
      options: {
        modelOverride: process.env.MCCODE_MODEL || null,
        verbose: process.env.MCCODE_VERBOSE === '1',
        watchAfter: watchAfter === false ? false : Boolean(freshConfig.watchAfter || freshConfig.watch?.autoStart)
      }
    });
    await orchestrator.init();

    let root;
    let nextAction = null;
    let onRendererDestroy = null;
    const exited = new Promise(/** @type {(v?: any) => void} */ ((resolveExit) => {
      onRendererDestroy = () => resolveExit();
      renderer.on('destroy', onRendererDestroy);

      try {
        root = createRoot(renderer);
        root.render(
          <App
            orchestrator={orchestrator}
            projectName={projectName}
            history={[]}
            onAction={(action) => {
              nextAction = action;
              root.unmount();
              resolveExit();
            }}
          />
        );
      } catch (err) {
        console.error(`mcode: TUI failed to start (${err?.message || err}).`);
        console.error('Use Windows Terminal, VS Code terminal, or Command Prompt — or run with --non-interactive.');
        renderer.destroy?.();
        process.exit(1);
      }
    }));

    await exited;
    renderer.off('destroy', onRendererDestroy);
    await orchestrator.stopWatch();
    orchestrator.interrupt?.();

    if (nextAction === 'init') {
      try {
        const { initListCommand } = await import('./commands/init.js');
        await initListCommand();
      } catch (err) {
        console.error(err);
      }
      await new Promise((r) => setTimeout(r, 1500));
      continue;
    }

    if (nextAction === 'demo') {
      try {
        const { doctorCommand } = await import('./commands/doctor.js');
        await doctorCommand();
      } catch (err) {
        console.error(err);
      }
      await new Promise((r) => setTimeout(r, 2500));
      continue;
    }

    // persist session on exit (loop only continues via /init above)
    await saveHistory({
      id: orchestrator.sessionId,
      mode: 'manual',
      projectName,
      projectPath: process.cwd(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      status: 'completed'
    });

    try {
      renderer.destroy?.();
    } catch {
      // Emergency terminal restore if renderer.destroy throws
      if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
        try { process.stdin.setRawMode(false); } catch { /* raw mode already off */ }
      }
      process.stdout.write('\x1b[?1049l\x1b[?25h');
    }
    process.exit(0);
  }
}
