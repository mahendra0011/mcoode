import { intro, outro, autocomplete, isCancel } from '@clack/prompts';
import pc from 'chalk';
import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig } from '../core/store.js';
import { pickModels } from './api-key.js';

function cancel(msg = 'Setup cancelled') {
  outro(pc.yellow(msg));
  process.exit(0);
}

function handleCancel(value) {
  if (isCancel(value)) cancel();
  return value;
}

export async function modelsInteractiveCommand() {
  console.clear();
  intro('Models Configuration');

  const secrets = await loadVault();
  const config = await loadConfig();
  const providers = await getProviders({ secrets, config });

  // Filter out mock and any not-live/not-configured ones
  const activeProviders = providers.filter(p => p.id !== 'mock');

  if (activeProviders.length === 0) {
    console.log(pc.yellow('No providers connected. Run "mcode connect" first.'));
    process.exit(1);
  }

  let providerToEdit = activeProviders[0];

  if (activeProviders.length > 1) {
    const choice = handleCancel(await autocomplete({
      message: 'Search and select a configured provider:',
      options: activeProviders.map(p => ({
        label: p.displayName,
        value: p.id
      })),
      maxItems: 10
    }));
    
    providerToEdit = activeProviders.find(p => p.id === choice);
  }

  await pickModels(providerToEdit);
}
