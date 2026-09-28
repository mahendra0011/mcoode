import { ok, fail, info, table, json, isJsonMode } from '../core/logger.js';
import { loadConfig, saveConfig } from '../core/store.js';
import { PLUGIN_REGISTRY } from '@mcode/shared';
import { CLI_VERSION } from '../core/version.js';
import {
  parsePluginSpec,
  resolvePlugin,
  verifyIntegrity,
  isCompatibleWithCli,
  bundledRegistry,
  entriesFor,
  loadRegistry
} from '../core/plugin-registry.js';

/** Thrown instead of process.exit so install/upgrade stay unit-testable. */
export class PluginInstallError extends Error {
  constructor(message, code = 'PLUGIN_INSTALL_FAILED') {
    super(message);
    this.name = 'PluginInstallError';
    this.code = code;
  }
}

/**
 * MF-005: merge a resolved entry into the config with provenance.
 * `saveConfig` validates the merged document through `ConfigSchema`
 * (MF-007 validate-before-write), so a bad registry entry can never persist.
 */
async function applyPlugin(name, entry, { source, url, version }) {
  const config = await loadConfig();
  const provenance = {
    registry: source === 'bundled' ? 'bundled' : url,
    version,
    integrity: entry.integrity || null,
    installedAt: new Date().toISOString()
  };
  const plugins = {
    ...(config.plugins || {}),
    [name]: { ...(entry.config || {}), enabled: true, _source: provenance }
  };
  const patch = { plugins };
  for (const [key, value] of Object.entries(entry.config || {})) {
    patch[key] = { ...(config[key] || {}), ...value };
  }
  await saveConfig(patch);
  return provenance;
}

/**
 * Resolve + install `name[@range]`. Throws `PluginInstallError` on every
 * failure path (unknown plugin, bad/integrity-mismatch entry, CLI too old).
 */
export async function installPlugin(spec, { registry = null, configUrl = null, offline = false, config = null, ...loadOpts } = {}) {
  const { name, range } = parsePluginSpec(spec);
  const current = config || (await loadConfig());
  const resolved = await resolvePlugin(name, range, {
    url: registry,
    configUrl: configUrl ?? current.pluginsRegistryUrl,
    offline,
    ...loadOpts
  });
  if (!resolved) {
    throw new PluginInstallError(
      `plugin "${name}" not found in ${registry ? 'the selected registry' : 'the bundled list'}. ` +
      `Available: ${Object.keys(PLUGIN_REGISTRY).slice(0, 8).join(', ')}… ` +
      '(use --registry <url> to search a remote registry)',
      'PLUGIN_NOT_FOUND'
    );
  }
  const { entry, source, url } = resolved;

  // Untrusted-input gates: integrity first, then CLI compatibility.
  if (source !== 'bundled') {
    const verdict = verifyIntegrity(entry);
    if (!verdict.ok) {
      throw new PluginInstallError(
        verdict.reason === 'missing'
          ? `registry entry ${name}@${entry.version} has no integrity (expected "sha256-…") — refusing to install from an unverified source`
          : `integrity check failed for ${name}@${entry.version}: expected ${entry.integrity}, computed sha256-${verdict.actual}`,
        'PLUGIN_INTEGRITY'
      );
    }
  }
  if (!isCompatibleWithCli(entry.minCliVersion)) {
    throw new PluginInstallError(
      `plugin ${name}@${entry.version} requires mcode >= ${entry.minCliVersion} (this CLI is ${CLI_VERSION})`,
      'PLUGIN_INCOMPATIBLE'
    );
  }

  const provenance = await applyPlugin(name, entry, { source, url, version: entry.version });
  return { name, version: entry.version, source, url, category: entry.category, desc: entry.desc, provenance, entry };
}

/** `mcode add <plugin>[@range] [--registry <url>] [--offline]` */
export async function addCommand(spec, { registry = null, offline = false, asJson = false } = {}) {
  let result;
  try {
    result = await installPlugin(spec, { registry, offline });
  } catch (err) {
    fail(err.message);
    process.exit(1);
  }
  if (asJson || isJsonMode()) return json({ ok: true, name: result.name, version: result.version, source: result.source, ...result.provenance });
  ok(`plugin ${result.name}@${result.version} installed (${result.category}) \u2014 ${result.desc}`);
  if (result.source !== 'bundled') info(`  source: ${result.source} registry (${result.url})`);
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

/**
 * `mcode plugin upgrade [name]` (MF-005) — re-resolves installed plugins
 * against their recorded registry (or the bundled catalog) and reinstalls any
 * newer version. Throws on the first failure so nothing is half-upgraded.
 */
export async function upgradePlugins({ registry = null, offline = false, only = null, ...loadOpts } = {}) {
  const config = await loadConfig();
  const installed = Object.entries(config.plugins || {});
  const targets = only ? installed.filter(([name]) => name === only) : installed;
  if (targets.length === 0) {
    if (only) throw new PluginInstallError(`plugin "${only}" is not installed`, 'PLUGIN_NOT_INSTALLED');
    return { upgraded: [], checked: 0 };
  }

  const upgraded = [];
  for (const [name, meta] of targets) {
    const source = meta?._source || {};
    const current = source.version || '0.0.0';
    const result = await installPlugin(name, {
      registry: registry || (source.registry !== 'bundled' ? source.registry : null),
      configUrl: config.pluginsRegistryUrl,
      offline,
      ...loadOpts
    });
    if (result.source === 'bundled' && source.registry && source.registry !== 'bundled') {
      // Remote registry unreachable and no cached copy: leave the install be.
      continue;
    }
    if (result.version === current) continue;
    upgraded.push({ name, from: current, to: result.version, source: result.source });
  }
  return { upgraded, checked: targets.length };
}

/** `mcode plugin upgrade` */
export async function pluginUpgradeCommand({ name = null, registry = null, offline = false, ...loadOpts } = {}) {
  let result;
  try {
    result = await upgradePlugins({ registry, offline, only: name, ...loadOpts });
  } catch (err) {
    fail(err.message);
    process.exit(1);
  }
  if (result.upgraded.length === 0) {
    ok(`nothing to upgrade (${result.checked} plugin(s) checked)`);
    return result;
  }
  for (const u of result.upgraded) ok(`${u.name}: ${u.from} \u2192 ${u.to} (${u.source})`);
  ok(`${result.upgraded.length} plugin(s) upgraded`);
  return result;
}

/**
 * `mcode plugins` — bundled catalog, or the merged remote registry when
 * `--registry` / `config.pluginsRegistryUrl` is set. `--installed` lists what
 * this machine actually has (with provenance); `--json` emits machine output.
 */
export async function pluginsListCommand({ category = null, installed = false, registry = null, offline = false, asJson = false } = {}) {
  const config = await loadConfig();
  const wantJson = asJson || isJsonMode();

  if (installed) {
    const rows = Object.entries(config.plugins || {}).map(([name, meta]) => ({
      name,
      enabled: meta?.enabled !== false,
      version: meta?._source?.version || 'bundled',
      registry: meta?._source?.registry || 'bundled',
      installedAt: meta?._source?.installedAt || null
    }));
    if (wantJson) { json(rows); return rows; }
    if (rows.length === 0) {
      ok('no plugins installed — run `mcode add <plugin>`');
      return [];
    }
    table(rows.map((r) => [r.name, r.version, r.enabled ? 'enabled' : 'disabled', r.registry]), {
      columns: ['PLUGIN', 'VERSION', 'STATE', 'SOURCE']
    });
    return rows;
  }

  const useRemote = Boolean(registry || config.pluginsRegistryUrl);
  const loaded = useRemote
    ? await loadRegistry({ url: registry, configUrl: config.pluginsRegistryUrl, offline })
    : null;
  const doc = loaded?.registry || bundledRegistry();
  const names = Object.keys(doc.plugins || {}).filter((name) => {
    if (!category) return true;
    return entriesFor(doc, name).some((e) => e.category === category);
  });
  const rows = names.map((name) => {
    const entry = entriesFor(doc, name)[0] || {};
    return { name, version: entry.version, category: entry.category, desc: entry.desc, bundled: Object.hasOwn(PLUGIN_REGISTRY, name) };
  });
  if (wantJson) { json(rows); return rows; }
  if (rows.length === 0) {
    fail(`no plugins found${category ? ` in category "${category}"` : ''}`);
    return [];
  }
  table(rows.map((r) => [r.name, r.version, r.category, r.desc]), {
    columns: ['PLUGIN', 'VERSION', 'CATEGORY', 'DESCRIPTION']
  });
  if (loaded?.source === 'cache' && loaded.stale) info('registry cache is stale (offline) — showing the last known catalog');
  else if (loaded?.source === 'bundled') info(`registry unavailable (${loaded?.error || 'offline'}) — showing the bundled catalog`);
  return rows;
}