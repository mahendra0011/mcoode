import { ok, fail, table } from '../core/logger.js';
import { loadConfig, saveConfig } from '../core/store.js';
import { PLUGIN_REGISTRY, listPlugins } from '@mcode/shared';

export async function addCommand(plugin) {
  const entry = PLUGIN_REGISTRY[plugin];
  if (!entry) {
    fail(`plugin "${plugin}" not found in registry. Available:\n  ${Object.keys(PLUGIN_REGISTRY).join('\n  ')}`);
    process.exit(1);
  }
  const config = await loadConfig();
  config.plugins = { ...(config.plugins || {}), [plugin]: entry.config };
  for (const [key, value] of Object.entries(entry.config)) {
    config[key] = { ...(config[key] || {}), ...value };
  }
  await saveConfig();
  ok(`plugin ${plugin} installed (${entry.category}) \u2014 ${entry.desc}`);
}

export async function pluginsListCommand({ category } = {}) {
  const ready = listPlugins({ category });
  if (ready.length === 0) {
    fail('no plugins found in registry');
    return [];
  }
  table(ready.map((p) => [p.name, p.category, p.desc]), {
    columns: ['PLUGIN', 'CATEGORY', 'DESCRIPTION']
  });
  return ready;
}