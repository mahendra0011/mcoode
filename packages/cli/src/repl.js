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
    await new Promise((resolve) => {
      const base = backendUrl(config);

      async function apiCall(method, path, body, token = null) {
        let res;
        try {
          res = await fetch(path, {
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
          const err = new Error(data?.error?.message || `request failed (${res.status})`);
          err.code = data?.error?.code;
          throw err;
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
    });
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
    const exited = new Promise((resolveExit) => {
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
    });

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

    renderer.destroy?.();
    process.exit(0);
  }
}
