import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig, saveConfig } from '../core/store.js';
import { TASK_DOMAINS, DEFAULT_ROUTING } from '@mcode/shared';
import { table, ok, fail } from '../core/logger.js';

export async function modelListCommand({ asJson = false } = {}) {
  const secrets = await loadVault();
  const config = await loadConfig();
  const providers = await getProviders({ secrets, config });
  const rows = [];
  for (const provider of providers) {
    if (!(await provider.isAvailable())) continue;
    for (const model of provider.listModels()) {
      const best = Object.entries(model.scores || {})
        .sort((a, b) => b[1] - a[1])[0];
      rows.push([
        `${provider.id}:${model.id}`,
        model.name,
        model.free ? 'free' : 'paid',
        best ? `${best[0]} ${best[1]}` : '-'
      ]);
    }
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
    return;
  }
  if (rows.length === 0) {
    fail('no models available — add provider keys via `mcode env add KEY value`');
    return;
  }
  table(rows.map((r) => [r[0], r[1], r[2], r[3]]), {
    columns: ['MODEL', 'NAME', 'TIER', 'BEST DOMAIN']
  });
}

export async function modelSetCommand(taskType, modelRef) {
  if (!TASK_DOMAINS.includes(taskType)) {
    fail(`unknown task type "${taskType}". Valid: ${TASK_DOMAINS.join(', ')}`);
    process.exit(1);
  }
  if (!/^[\w-]+:[\w.-]+$/i.test(modelRef)) {
    fail('model ref must be "provider:model" (e.g. openrouter:openai/gpt-4o)');
    process.exit(1);
  }
  const config = await loadConfig();
  config.routing = { ...DEFAULT_ROUTING, ...(config.routing || {}), [taskType]: [modelRef] };
  await saveConfig();
  ok(`${taskType} \u2192 ${modelRef}`);
}

export async function modelShowCommand() {
  const config = await loadConfig();
  const routing = { ...DEFAULT_ROUTING, ...(config.routing || {}) };
  table(Object.entries(routing).map(([task, refs]) => [task, refs.join(', ')]), {
    columns: ['TASK TYPE', 'MODEL PREFERENCE (top-down)']
  });
}
