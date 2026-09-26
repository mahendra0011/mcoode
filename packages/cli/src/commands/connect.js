import { intro, outro } from '@clack/prompts';
import pc from 'chalk';
import { getAllAdapters } from '../providers/index.js';
import { loadVault, saveVault } from '../core/vault.js';
import { ok, fail, warn } from '../core/logger.js';

/**
 * `mcode connect` — connect a provider (the command `mcode models`
 * tells users to run, but which never existed until now).
 * Interactive (wizard) by default; CI-safe with --provider/--key.
 */
export async function connectCommand({ provider: providerId = null, key = null, nonInteractive = false } = {}) {
  const secrets = await loadVault();
  const allAdapters = getAllAdapters(secrets);
  const providers = allAdapters.filter((p) => p.id !== 'mock');

  // CI / non-interactive path — no prompts at all.
  if (providerId || key || nonInteractive) {
    if (!providerId) {
      fail('usage: mcode connect --provider <id> --key <key> (or omit flags for the interactive wizard)');
      process.exit(1);
    }
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) {
      fail(`unknown provider "${providerId}" — valid: ${providers.map((p) => p.id).join(', ')}`);
      process.exit(1);
    }
    if (provider.kind === 'local') {
      const live = await provider.testKey('');
      if (!live) {
        fail(`cannot reach local provider at ${provider.baseUrl} — is it running?`);
        process.exit(1);
      }
      ok(`${provider.displayName} connected (local, no key needed)`);
      return;
    }
    if (!key) {
      fail(`--key is required for ${provider.displayName} (or run without flags for the prompt)`);
      process.exit(1);
    }
    const valid = await provider.testKey(key);
    if (!valid) {
      fail(`${provider.displayName} rejected the key — check it and try again`);
      process.exit(1);
    }
    await saveVault({ ...secrets, [provider.envVar]: key });
    ok(`${provider.displayName} connected`);
    return;
  }

  // Interactive path — reuse the existing wizard.
  if (!process.stdin.isTTY) {
    warn('no TTY detected — use: mcode connect --provider <id> --key <key>');
    process.exit(1);
  }
  const { apiKeyAddCommand } = await import('./api-key.js');
  intro('Connect a provider');
  await apiKeyAddCommand();
  outro(pc.green('done — run `mcode models` to pick models'));
}
