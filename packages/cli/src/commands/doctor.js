import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig, getLastConfigError } from '../core/store.js';
import { readSpendLedger } from '../core/history.js';
import { CLI_VERSION } from '../core/version.js';
import { table, ok, warn, json } from '../core/logger.js';

const REQUIRED_KEYS = [
  'OPENROUTER_API_KEY', 'OPENCODE_ZEN_API_KEY', 'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY', 'TOGETHER_API_KEY',
  'MISTRAL_API_KEY', 'COHERE_API_KEY', 'DEEPSEEK_API_KEY', 'XAI_API_KEY',
  'FIREWORKS_API_KEY', 'PERPLEXITY_API_KEY', 'CEREBRAS_API_KEY', 'NOVITA_API_KEY',
  'HUGGINGFACE_API_KEY'
];

export async function doctorCommand({ asJson = false } = {}) {
  const secrets = await loadVault();
  const config = await loadConfig();

  const rows = [];
  rows.push(['Node.js', process.version, 'ok']);
  rows.push(['mcode version', CLI_VERSION, 'ok']);
  rows.push(['Config', '~/.mcode/config.json', config ? 'present' : 'missing']);
  // MF-007: config-schema row — loud when the file on disk is unparsable or
  // fails zod validation (the old store swallowed both into `{}`).
  const cfgErr = getLastConfigError();
  rows.push(['Config schema', cfgErr ? `${cfgErr.kind} error: ${cfgErr.message}` : 'valid', cfgErr ? 'warn' : 'ok']);
  rows.push(['Vault', '~/.mcode/vault.json.enc', Object.keys(secrets).length ? `${Object.keys(secrets).length} keys` : 'empty (use mcode env add)']);

  for (const key of REQUIRED_KEYS) {
    rows.push([key, key in secrets ? 'set' : 'not set', key in secrets ? 'ok' : 'warn']);
  }

  const providers = await getProviders({ secrets, config });
  const providerChecks = await Promise.allSettled(
    providers.map(async (provider) => {
      const avail = await provider.isAvailable();
      const models = avail ? await provider.listModels() : [];
      return [
        `provider:${provider.id}`,
        avail ? `ready (${models.length} models)` : 'unavailable',
        avail ? 'ok' : 'warn'
      ];
    })
  );

  for (let i = 0; i < providers.length; i++) {
    const res = providerChecks[i];
    if (res.status === 'fulfilled') {
      rows.push(res.value);
    } else {
      rows.push([`provider:${providers[i].id}`, 'error checking', 'warn']);
    }
  }

  // MF-002: lifetime spend — the persisted CostLedger (~/.mcode/ledger.json)
  // carries a per-mode breakdown that was previously never read anywhere.
  const spend = await readSpendLedger();
  rows.push([
    'spend (lifetime)',
    spend.totalUsd > 0
      ? `$${spend.totalUsd.toFixed(2)} · ${spend.tokens.toLocaleString()} tokens · ${spend.runs} calls`
      : 'no recorded usage yet (runs a god build first)',
    'ok'
  ]);
  const topModes = Object.entries(spend.byMode)
    .sort((a, b) => (b[1].cost || 0) - (a[1].cost || 0))
    .slice(0, 5);
  for (const [mode, m] of topModes) {
    rows.push([
      `spend:${mode}`,
      `$${(Number(m.cost) || 0).toFixed(2)} · ${Number(m.tokens) || 0} tok · ${Number(m.runs) || 0} runs`,
      'ok'
    ]);
  }
  // MF-002: budget ceiling — only enforced when the user sets it explicitly.
  const hasBudget = config?.cost?.budgetPerRunUsd != null;
  rows.push([
    'budget / run',
    hasBudget
      ? `$${Number(config.cost.budgetPerRunUsd).toFixed(2)} (cost.budgetPerRunUsd; --max-cost overrides)`
      : 'not set — use --max-cost <usd> or cost.budgetPerRunUsd in config',
    'ok'
  ]);

  if (asJson) {
    json(rows.map(([name, value, status]) => ({ name, value, status })));
    return;
  }
  table(rows.map(([a, b, s]) => [a, b, s === 'ok' ? '\u2713' : '\u26a0']), {
    columns: ['CHECK', 'VALUE', '']
  });
  const issues = rows.filter(([, , s]) => s === 'warn').length;
  if (issues === 0) ok('environment healthy');
  else warn(`${issues} check(s) need attention`);
}

/**
 * MF-002: read the persisted CostLedger (written by ModelRouter's autosave).
 * Missing/corrupt files count as zero spend — doctor must never fail on them.
 */
