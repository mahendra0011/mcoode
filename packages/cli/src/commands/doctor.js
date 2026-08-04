import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig } from '../core/store.js';
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
  rows.push(['mcode version', '2.4.6', 'ok']);
  rows.push(['Config', '~/.mcode/config.json', config ? 'present' : 'missing']);
  rows.push(['Vault', '~/.mcode/vault.json.enc', Object.keys(secrets).length ? `${Object.keys(secrets).length} keys` : 'empty (use mcode env add)']);

  for (const key of REQUIRED_KEYS) {
    rows.push([key, key in secrets ? 'set' : 'not set', key in secrets ? 'ok' : 'warn']);
  }

  const providers = await getProviders({ secrets, config });
  for (const provider of providers) {
    const avail = await provider.isAvailable();
    rows.push([
      `provider:${provider.id}`,
      avail ? `ready (${provider.listModels().length} models)` : 'unavailable',
      avail ? 'ok' : 'warn'
    ]);
  }

  if (asJson) {
    json(rows.map(([name, value, status]) => ({ name, value, status })));
    return;
  }
  table(rows.map(([a, b, s]) => [a, b, s === 'ok' ? '\u2713' : '\u26a0']), {
    columns: ['CHECK', 'VALUE', '']
  });
  const issues = rows.filter(([, , s]) => s !== 'ok').length;
  if (issues === 0) ok('environment healthy');
  else warn(`${issues} check(s) need attention`);
}
