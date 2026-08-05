import { intro, outro, select, autocomplete, password, multiselect, isCancel } from '@clack/prompts';
import pc from 'chalk';
import { getAllAdapters } from '../providers/index.js';
import { loadVault, saveVault } from '../core/vault.js';
import { loadConfig, saveConfig } from '../core/store.js';


function cancel(msg = 'Setup cancelled') {
  outro(pc.yellow(msg));
  process.exit(0);
}

function handleCancel(value) {
  if (isCancel(value)) cancel();
  return value;
}

export async function apiKeyAddCommand() {
  console.clear();
  intro('API Key Setup');

  const secrets = await loadVault();
  const allAdapters = getAllAdapters(secrets);

  // Filter out mock
  const providers = allAdapters.filter(p => p.id !== 'mock');

  const choice = handleCancel(await autocomplete({
    message: 'Search and select a provider:',
    options: providers.map(p => ({
      label: p.apiKey ? `${p.displayName} (already configured — update key)` : (p.kind === 'local' ? `${p.displayName} (no key needed)` : p.displayName),
      value: p.id
    })),
    maxItems: 10
  }));

  const provider = providers.find(p => p.id === choice);

  if (provider.kind === 'local') {
    const isLive = await provider.testKey('');
    if (!isLive) {
      console.log(pc.red(`✗ Cannot reach local provider at ${provider.baseUrl}. Ensure it's running.`));
      process.exit(1);
    }
    console.log(pc.green(`✓ Local provider reachable`));
    return pickModels(provider);
  }

  return promptForKey(provider);
}

async function promptForKey(provider) {
  const key = handleCancel(await password({
    message: `Paste your ${provider.displayName} API key:`,
    mask: '•'
  }));

  if (!key) return promptForKey(provider);

  console.log(pc.dim(`  validating ${provider.displayName} key…`));
  const isValid = await provider.testKey(key);
  
  if (!isValid) {
    console.log(pc.red('  ✗ key rejected — check it and try again'));
    return promptForKey(provider);
  }

  const secrets = await loadVault();
  await saveVault({ ...secrets, [provider.envVar]: key });
  // Update provider's key in memory for listModels
  provider.apiKey = key;
  console.log(pc.green(`  ✓ ${provider.displayName} connected\n`));

  return pickModels(provider);
}

export async function pickModels(provider) {
  console.log(pc.dim(`  fetching available models for ${provider.displayName}…`));
  const models = await provider.listModels();

  if (!models || models.length === 0) {
    console.log(pc.yellow(`  No models found for ${provider.displayName}.`));
    return;
  }

  const config = await loadConfig();
  const alreadyEnabled = config.enabledModels?.[provider.id] || [];

  const chosen = handleCancel(await multiselect({
    message: `Select model(s) to enable from ${provider.displayName}:`,
    options: models.map(m => {
      let suffix = '';
      if (m.costPer1kIn !== undefined) {
         suffix = ` ($${m.costPer1kIn}/1k in)`;
      } else if (m.free) {
         suffix = ' (free)';
      }
      return {
        label: `${m.name || m.id}${pc.dim(suffix)}`,
        value: m.id
      };
    }),
    initialValues: alreadyEnabled,
    required: false
  }));

  if (chosen.length === 0) {
    console.log(pc.yellow(`  No models enabled from ${provider.displayName}.`));
    return;
  }

  config.enabledModels = { ...config.enabledModels, [provider.id]: chosen };
  await saveConfig(config);

  console.log(pc.green(`  ✓ ${chosen.length} model(s) enabled from ${provider.displayName}\n`));
  return assignRoles(provider, chosen);
}

async function assignRoles(provider, modelIds) {
  const roles = ['frontend', 'backend', 'devops', 'bugfix', 'reviewer', 'planning'];
  const assign = handleCancel(await multiselect({
    message: `Use these model(s) for which roles? (skip = leave existing config unchanged)`,
    options: roles.map(r => ({ label: r, value: r })),
    required: false
  }));

  if (!assign || assign.length === 0) {
    outro(pc.green('Setup complete — run /model to see your full active model list.'));
    return;
  }

  const config = await loadConfig();
  config.roles = config.roles || {};

  const prefix = provider.id + '/';
  const fullModelIds = modelIds.map(id => (id.includes('/') ? id : `${prefix}${id}`));

  for (const role of assign) {
    config.roles[role] = config.roles[role] || { preferredModels: [] };
    const current = config.roles[role].preferredModels || [];
    
    // Filter out the ones we are adding so they move to the front
    const existing = current.filter(m => !fullModelIds.includes(m));
    config.roles[role].preferredModels = [...fullModelIds, ...existing];
  }

  await saveConfig(config);
  console.log(pc.green(`  ✓ updated role preferences for: ${assign.join(', ')}`));
  outro(pc.green('Setup complete — run /model to see your full active model list.'));
}
