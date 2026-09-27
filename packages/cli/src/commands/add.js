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
  const plugins = { ...(config.plugins || {}), [plugin]: { ...entry.config, enabled: true } };
  const patch = { plugins };
  for (const [key, value] of Object.entries(entry.config)) {
    patch[key] = { ...(config[key] || {}), ...value };
  }
  await saveConfig(patch);
  ok(`plugin ${plugin} installed (${entry.category}) \u2014 ${entry.desc}`);
}

export async function removeCommand(plugin) {
  const config = await loadConfig();
  if (!config.plugins?.[plugin]) {
    fail(`plugin "${plugin}" is not installed`);
    process.exit(1);
  }
  const plugins = { ...config.plugins };
  delete plugins[plugin];
  await saveConfig({ plugins });
  ok(`plugin ${plugin} removed (merged config keys left untouched — edit config.json to clean up)`);
}

export async function setPluginEnabled(plugin, enabled) {
  const config = await loadConfig();
  if (!config.plugins?.[plugin]) {
    fail(`plugin "${plugin}" is not installed — run "mcode add ${plugin}" first`);
    process.exit(1);
  }
  await saveConfig({ plugins: { ...config.plugins, [plugin]: { ...config.plugins[plugin], enabled } } });
  ok(`plugin ${plugin} ${enabled ? 'enabled' : 'disabled'}`);
}

/** @param {{ category?: string }} [opts] */
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