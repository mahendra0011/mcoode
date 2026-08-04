import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, saveConfig } from '../core/store.js';
import { loadVault, saveVault } from '../core/vault.js';
import { DEFAULT_CONFIG } from '@mcode/shared';

export const LOGO = `
  __  ___     _         __   __
 |  \\/  |___ | |_  ___  \\ \\ / /___
 | |\\/| / __|| __|/ _ \\  \\ V / -_)
 |_|  |_\\___| \\__|\\___/   \\_/ \\___|
`;

const KNOWN_KEYS = [
  'OPENROUTER_API_KEY', 'OPENCODE_ZEN_API_KEY', 'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY',
  'TOGETHER_API_KEY', 'MISTRAL_API_KEY', 'DEEPSEEK_API_KEY',
  'XAI_API_KEY', 'FIREWORKS_API_KEY', 'PERPLEXITY_API_KEY',
  'CEREBRAS_API_KEY', 'NOVITA_API_KEY', 'HUGGINGFACE_API_KEY'
];

const PROVIDER_CHOICES = [
  { id: 'OpenRouter', env: 'OPENROUTER_API_KEY' },
  { id: 'OpenAI', env: 'OPENAI_API_KEY' },
  { id: 'Anthropic (Claude)', env: 'ANTHROPIC_API_KEY' },
  { id: 'Google (Gemini)', env: 'GOOGLE_API_KEY' },
  { id: 'Groq', env: 'GROQ_API_KEY' },
  { id: 'DeepSeek', env: 'DEEPSEEK_API_KEY' },
  { id: 'Mistral', env: 'MISTRAL_API_KEY' },
  { id: 'Other provider', env: null }
];

export function backendUrl(config) {
  return config?.backend?.url || DEFAULT_CONFIG.backend.url;
}

export async function hasApiKey(_config) {
  const secrets = await loadVault();
  if (KNOWN_KEYS.some((k) => secrets[k])) return true;
  return KNOWN_KEYS.some((k) => process.env[k]);
}

export async function needsOnboarding(config) {
  const hasAccount = Boolean(config?.account?.email);
  const keyed = await hasApiKey(config);
  return !(hasAccount && keyed);
}

async function promptHidden(rl, query) {
  const orig = rl._writeToOutput || ((s) => output.write(s));
  let first = true;
  rl._writeToOutput = (s) => {
    if (first && s.startsWith(query)) {
      first = false;
      orig.call(rl, query);
    }
  };
  const answer = await rl.question(query);
  rl._writeToOutput = orig;
  output.write('\n');
  return answer;
}

async function api(method, path, body, token = null) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `request failed (${res.status})`);
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

async function createAccount(rl, config) {
  const base = backendUrl(config);
  output.write('\n  create account\n');
  output.write(`  ${'-'.repeat(46)}\n`);
  const email = (await rl.question('  email: ')).trim();
  if (!email.includes('@')) throw new Error('invalid email');
  const name = (await rl.question('  name: ')).trim();
  if (name.length < 2) throw new Error('name too short');
  const password = await promptHidden(rl, '  password (min 8 chars): ');
  if (password.length < 8) throw new Error('password must be at least 8 characters');

  const sent = await api('POST', `${base}/api/v1/auth/send-otp`, { email, intent: 'signup' });
  output.write(`  \u2713 code sent to ${email} (expires in ${Math.round(sent.expiresInSec / 60)} min)\n`);
  if (sent.devOtp) output.write(`  [dev mode, no SMTP configured] your code: ${sent.devOtp}\n`);
  const otp = (await rl.question('  enter 6-digit code: ')).trim();
  const data = await api('POST', `${base}/api/v1/auth/verify-otp`, { email, otp, intent: 'signup', name, password });
  await saveConfig({ account: { email: data.user.email, name: data.user.name, refresh: data.refresh } });
  output.write(`  \u2713 account created — welcome ${data.user.name}!\n\n`);
}

async function loginAccount(rl, config) {
  const base = backendUrl(config);
  output.write('\n  login\n');
  output.write(`  ${'-'.repeat(46)}\n`);
  const email = (await rl.question('  email: ')).trim();
  const password = await promptHidden(rl, '  password: ');
  const data = await api('POST', `${base}/api/v1/auth/login`, { email, password });
  await saveConfig({ account: { email: data.user.email, name: data.user.name, refresh: data.refresh } });
  output.write(`  \u2713 logged in — welcome back ${data.user.name}!\n\n`);
}

async function addApiKey(rl) {
  output.write('\n  add an API key\n');
  output.write(`  ${'-'.repeat(46)}\n`);
  output.write('  which provider?\n');
  PROVIDER_CHOICES.forEach((p, i) => output.write(`    ${i + 1}) ${p.id}\n`));
  const pickRaw = (await rl.question('  choice [1-8]: ')).trim();
  const pick = Number(pickRaw);
  const choice = PROVIDER_CHOICES[pick - 1];
  if (!choice) throw new Error('invalid choice');
  const env = choice.env || (await rl.question('  env var name (e.g. OPENAI_API_KEY): ')).trim().toUpperCase();
  if (!/^[A-Z0-9_]+$/.test(env)) throw new Error('invalid env var name');
  const key = (await promptHidden(rl, `  paste ${choice.id} API key: `)).trim();
  if (key.length < 8) throw new Error('key looks too short');
  const secrets = await loadVault();
  await saveVault({ ...secrets, [env]: key });
  output.write(`  \u2713 key stored in encrypted vault as ${env}\n\n`);
}

export async function runOnboarding({ interactive = true } = {}) {
  const config = await loadConfig();
  if (!interactive || !input.isTTY || !output.isTTY) return;

  const rl = createInterface({ input, output, terminal: true });
  try {
    output.write(`\x1b[32m${LOGO}\x1b[0m`);
    output.write('  terminal-first, multi-model AI coding CLI\n\n');
    const account = config.account?.email;
    const keyed = await hasApiKey(config);

    if (account && keyed) return; // already onboarded

    output.write(`  welcome${account ? `, ${config.account.name || config.account.email}` : ''}!\n`);
    output.write('  1) create account  2) login  3) continue without account\n');
    const choice = (await rl.question('  choice [1-3]: ')).trim();

    if (choice === '3') {
      output.write('  continuing without an account — local-first mode\n\n');
    } else {
      try {
        if (choice === '1') await createAccount(rl, config);
        else if (choice === '2') await loginAccount(rl, config);
        else throw new Error('invalid choice');
      } catch (err) {
        if (err?.code === 'EMAIL_TAKEN') output.write(`  \u26a0 ${err.message}\n\n`);
        else if (err?.code === 'NOT_FOUND') output.write(`  \u26a0 ${err.message}\n\n`);
        else if (err?.code === 'BAD_OTP') output.write(`  \u26a0 ${err.message} — try again or skip login\n\n`);
        else output.write(`  \u26a0 account setup failed: ${err.message}\n  continuing without an account\n\n`);
      }
    }

    if (!(await hasApiKey(config))) {
      output.write('  \u25c9 you need an AI provider API key to run god mode and chat.\n');
      output.write('  (you can skip — mock + local providers still work, and add keys later with `mcode api-key`)\n');
      const keyChoice = (await rl.question('  add an API key now? [y/N]: ')).trim().toLowerCase();
      if (keyChoice === 'y' || keyChoice === 'yes') {
        await addApiKey(rl);
      } else {
        output.write('  skipping — use `mcode api-key` any time\n\n');
      }
    }
  } finally {
    rl.close();
  }
}

export async function loginCommand() {
  const config = await loadConfig();
  const rl = createInterface({ input, output, terminal: true });
  try {
    output.write(`\x1b[32m${LOGO}\x1b[0m\n`);
    output.write('  1) create account  2) login\n');
    const choice = (await rl.question('  choice [1-2]: ')).trim();
    if (choice === '1') await createAccount(rl, config);
    else if (choice === '2') await loginAccount(rl, config);
    else output.write('  cancelled\n');
  } catch (err) {
    output.write(`  \u26a0 ${err.message}\n`);
  } finally {
    rl.close();
  }
}

export async function logoutCommand() {
  await saveConfig({ account: null });
  output.write('\u2713 logged out (API keys in the vault are untouched)\n');
}

export async function apiKeyCommand() {
  const rl = createInterface({ input, output, terminal: true });
  try {
    output.write('\n  mcode api-key\n\n');
    await addApiKey(rl);
  } catch (err) {
    output.write(`  \u26a0 ${err.message}\n`);
  } finally {
    rl.close();
  }
}
