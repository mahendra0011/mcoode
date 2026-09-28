import { describe, it, expect, afterAll, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// MF-005: never touch the developer's real ~/.mcode (config + registry cache).
const home = await mkdtemp(join(tmpdir(), 'mcode-registry-home-'));
vi.mock('node:os', async (importOriginal) => {
  const os = await importOriginal();
  return { ...os, homedir: () => home };
});

const {
  parsePluginSpec,
  compareVersions,
  satisfiesRange,
  normalizeRegistry,
  resolveEntry,
  bundledRegistry,
  verifyIntegrity,
  isCompatibleWithCli,
  loadRegistry,
  resolvePlugin,
  canonicalConfig,
  sha256,
  REGISTRY_CACHE_TTL_MS
} = await import('../src/core/plugin-registry.js');
const { installPlugin, upgradePlugins, pluginsListCommand, PluginInstallError } =
  await import('../src/commands/add.js');
const { loadConfig, saveConfig, CONFIG_PATH } = await import('../src/core/store.js');
const { validateConfig } = await import('../src/core/config-schema.js');

let seq = 0;
function tempCache(tag = 'r') {
  return join(home, 'cache', `${tag}-${seq++}.json`);
}

/** Build a registry entry with a correct integrity stamp. */
function entry(name, version, config, extra = {}) {
  const e = { name, version, category: 'test', desc: `${name} test entry`, config, ...extra };
  e.integrity = extra.integrity || `sha256-${sha256(canonicalConfig(e))}`;
  return e;
}

function okFetch(payload) {
  return async () => ({ ok: true, status: 200, json: async () => payload });
}

function registryDoc(plugins) {
  return { version: 1, updatedAt: '2026-01-01T00:00:00.000Z', plugins };
}

afterAll(async () => {
  await rm(home, { recursive: true, force: true }).catch(() => {});
});

describe('MF-005 registry helpers', () => {
  it('parses name@range specs', () => {
    expect(parsePluginSpec('db-tools')).toEqual({ name: 'db-tools', range: 'latest' });
    expect(parsePluginSpec('db-tools@1.2.0')).toEqual({ name: 'db-tools', range: '1.2.0' });
    expect(parsePluginSpec('db-tools@^1.2')).toEqual({ name: 'db-tools', range: '^1.2' });
    expect(parsePluginSpec('@acme/plugin@~1.0.0')).toEqual({ name: '@acme/plugin', range: '~1.0.0' });
  });

  it('compares versions and matches ranges', () => {
    expect(compareVersions('1.2.3', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '2')).toBe(0);
    expect(satisfiesRange('1.4.0', '^1.2.0')).toBe(true);
    expect(satisfiesRange('2.0.0', '^1.2.0')).toBe(false);
    expect(satisfiesRange('1.2.9', '~1.2.0')).toBe(true);
    expect(satisfiesRange('1.3.0', '~1.2.0')).toBe(false);
    expect(satisfiesRange('1.2.0', '1.2.0')).toBe(true);
    expect(satisfiesRange('0.9.0', 'latest')).toBe(true);
    expect(satisfiesRange('1.5.0', '>=1.2.0')).toBe(true);
  });

  it('normalizes registry shapes and rejects junk', () => {
    const obj = normalizeRegistry(registryDoc({ a: entry('a', '1.0.0', { x: 1 }) }));
    expect(Object.keys(obj.plugins)).toEqual(['a']);

    const arr = normalizeRegistry({ plugins: [entry('b', '2.0.0', {})] });
    expect(arr.plugins.b.version).toBe('2.0.0');

    const multi = normalizeRegistry(registryDoc({
      c: { name: 'c', versions: [entry('c', '1.0.0', {}), entry('c', '1.2.0', {})] }
    }));
    expect(multi.plugins.c.versions).toHaveLength(2);

    expect(normalizeRegistry({ nope: true })).toBeNull();
    expect(normalizeRegistry(null)).toBeNull();
  });

  it('resolves the highest matching version', () => {
    const reg = normalizeRegistry(registryDoc({
      d: { name: 'd', versions: [entry('d', '1.0.0', {}), entry('d', '1.2.0', {}), entry('d', '2.0.0', {})] }
    }));
    expect(resolveEntry(reg, 'd').version).toBe('2.0.0');
    expect(resolveEntry(reg, 'd', '^1.0.0').version).toBe('1.2.0');
    expect(resolveEntry(reg, 'd', '9.9.9')).toBeNull();
    expect(resolveEntry(reg, 'missing')).toBeNull();
  });

  it('verifies sha256 integrity over the entry config', () => {
    const good = entry('e', '1.0.0', { lint: { eslintConfig: 'flat' } });
    expect(verifyIntegrity(good).ok).toBe(true);

    const tampered = { ...good, config: { lint: { eslintConfig: 'evil' } } };
    const bad = verifyIntegrity(tampered);
    expect(bad.ok).toBe(false);
    expect(bad.actual).toBe(sha256(JSON.stringify(tampered.config)));

    expect(verifyIntegrity({ name: 'f', version: '1.0.0', config: {} }).reason).toBe('missing');
    expect(verifyIntegrity({ ...good, integrity: 'md5-abc' }).reason).toBe('unsupported');
  });

  it('gates on minCliVersion', () => {
    expect(isCompatibleWithCli(undefined)).toBe(true);
    expect(isCompatibleWithCli('0.0.1')).toBe(true);
    expect(isCompatibleWithCli('999.0.0')).toBe(false);
  });

  it('bundled registry exposes the shipped catalog', () => {
    const reg = bundledRegistry();
    expect(Object.keys(reg.plugins).length).toBeGreaterThan(20);
    expect(resolveEntry(reg, 'eslint').config).toEqual({ lint: { eslintConfig: 'flat' } });
  });

  it('config schema keeps plugin blocks + provenance (validate-before-write)', () => {
    const validated = validateConfig({
      plugins: { eslint: { lint: { eslintConfig: 'flat' }, enabled: true, _source: { version: '1.0.0' } } },
      lint: { eslintConfig: 'flat' }
    });
    expect(validated.plugins.eslint.enabled).toBe(true);
    expect(validated.lint).toEqual({ eslintConfig: 'flat' });
  });
});

describe('MF-005 registry loading (cache + offline)', () => {
  it('fetches remotely, caches for 24h and then serves from cache', async () => {
    const cachePath = tempCache('fresh');
    const doc = registryDoc({ hello: entry('hello', '1.0.0', { ui: { theme: 'dark' } }) });
    let calls = 0;
    const fetchImpl = async () => { calls++; return { ok: true, status: 200, json: async () => doc }; };

    const first = await loadRegistry({ url: 'https://reg.test/r.json', cachePath, fetchImpl, now: () => 1000 });
    expect(first.source).toBe('remote');
    expect(Object.keys(first.registry.plugins)).toEqual(['hello']);

    const cached = await loadRegistry({ url: 'https://reg.test/r.json', cachePath, fetchImpl, now: () => 61_000 });
    expect(cached.source).toBe('cache'); // no second network call
    expect(calls).toBe(1);

    // …but a stale cache is refetched.
    await loadRegistry({ url: 'https://reg.test/r.json', cachePath, fetchImpl, now: () => 1000 + REGISTRY_CACHE_TTL_MS + 1 });
    expect(calls).toBe(2);
  });

  it('falls back to the stale cache when the network is down', async () => {
    const cachePath = tempCache('stale');
    const doc = registryDoc({ kept: entry('kept', '1.0.0', { ci: { provider: 'github-actions' } }) });
    await loadRegistry({ url: 'https://reg.test/r.json', cachePath, fetchImpl: okFetch(doc), now: () => 0 });

    const offlineRun = await loadRegistry({
      url: 'https://reg.test/r.json',
      cachePath,
      now: () => REGISTRY_CACHE_TTL_MS * 10,
      fetchImpl: async () => { throw new Error('ENOTFOUND reg.test'); }
    });
    expect(offlineRun.source).toBe('cache');
    expect(offlineRun.stale).toBe(true);
    expect(offlineRun.error).toContain('ENOTFOUND');
  });

  it('degrades to the bundled catalog when offline and uncached', async () => {
    const result = await loadRegistry({ url: 'https://reg.test/r.json', cachePath: tempCache('none'), offline: true });
    expect(result.source).toBe('bundled');
    expect(Object.keys(result.registry.plugins).length).toBeGreaterThan(20);

    const failing = await loadRegistry({
      url: 'https://reg.test/r.json',
      cachePath: tempCache('none2'),
      fetchImpl: async () => { throw new Error('offline'); }
    });
    expect(failing.source).toBe('bundled');
    expect(failing.error).toContain('offline');
  });

  it('rejects a malformed registry document', async () => {
    const result = await loadRegistry({
      url: 'https://reg.test/r.json',
      cachePath: tempCache('bad'),
      fetchImpl: okFetch({ totally: 'wrong' })
    });
    expect(result.source).toBe('bundled');
    expect(result.error).toMatch(/not a valid registry document/);
  });

  it('resolvePlugin prefers bundled unless a registry was requested', async () => {
    const bundled = await resolvePlugin('eslint', 'latest', { cachePath: tempCache('res1') });
    expect(bundled.source).toBe('bundled');

    const doc = registryDoc({ eslint: entry('eslint', '2.0.0', { lint: { eslintConfig: 'strict' } }) });
    const remote = await resolvePlugin('eslint', 'latest', {
      url: 'https://reg.test/r.json',
      cachePath: tempCache('res2'),
      fetchImpl: okFetch(doc)
    });
    expect(remote.source).toBe('remote');
    expect(remote.entry.version).toBe('2.0.0');
  });
});

describe('MF-005 install / upgrade / list', () => {
  const REG = 'https://reg.test/registry.json';

  it('installs a remote plugin, records provenance and persists the config', async () => {
    await saveConfig({ plugins: {} });
    const doc = registryDoc({ 'db-tools': entry('db-tools', '1.2.0', { db: { orm: 'prisma' } }) });

    const result = await installPlugin('db-tools', {
      registry: REG,
      cachePath: tempCache('inst'),
      fetchImpl: okFetch(doc)
    });
    expect(result).toMatchObject({ name: 'db-tools', version: '1.2.0', source: 'remote' });

    const config = await loadConfig({ force: true });
    expect(config.plugins['db-tools'].db).toEqual({ orm: 'prisma' });
    expect(config.plugins['db-tools'].enabled).toBe(true);
    expect(config.plugins['db-tools']._source).toMatchObject({
      registry: REG,
      version: '1.2.0',
      installedAt: expect.any(String)
    });
    // merged config block is written too…
    expect(config.db).toEqual({ orm: 'prisma' });
    // …and survives a reload of the file on disk (schema must not strip it)
    const onDisk = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
    expect(onDisk.plugins['db-tools']._source.version).toBe('1.2.0');
  });

  it('refuses an entry whose integrity does not match', async () => {
    await saveConfig({ plugins: {} });
    const bad = entry('tampered', '1.0.0', { ui: { theme: 'dark' } });
    bad.integrity = `sha256-${'0'.repeat(64)}`;
    const doc = registryDoc({ tampered: bad });

    await expect(
      installPlugin('tampered', { registry: REG, cachePath: tempCache('bad'), fetchImpl: okFetch(doc) })
    ).rejects.toMatchObject({ code: 'PLUGIN_INTEGRITY' });

    const config = await loadConfig({ force: true });
    expect(config.plugins?.tampered).toBeUndefined();
  });

  it('refuses a remote entry with no integrity at all', async () => {
    await saveConfig({ plugins: {} });
    const doc = registryDoc({ lazy: { name: 'lazy', version: '1.0.0', category: 'test', desc: 'no stamp', config: { ui: { theme: 'x' } } } });
    await expect(
      installPlugin('lazy', { registry: REG, cachePath: tempCache('nostamp'), fetchImpl: okFetch(doc) })
    ).rejects.toMatchObject({ code: 'PLUGIN_INTEGRITY' });
  });

  it('refuses an entry that needs a newer CLI', async () => {
    await saveConfig({ plugins: {} });
    const doc = registryDoc({ future: entry('future', '1.0.0', { ui: { theme: 'x' } }, { minCliVersion: '999.0.0' }) });
    await expect(
      installPlugin('future', { registry: REG, cachePath: tempCache('future'), fetchImpl: okFetch(doc) })
    ).rejects.toMatchObject({ code: 'PLUGIN_INCOMPATIBLE' });
  });

  it('fails loudly for an unknown plugin name', async () => {
    await saveConfig({ plugins: {} });
    await expect(installPlugin('does-not-exist', { cachePath: tempCache('unknown') })).rejects.toMatchObject({
      code: 'PLUGIN_NOT_FOUND'
    });
    await expect(installPlugin('also-missing', { registry: REG, cachePath: tempCache('unknown2'), fetchImpl: okFetch(registryDoc({})) }))
      .rejects.toBeInstanceOf(PluginInstallError);
  });

  it('installs from the bundled catalog offline and records bundled provenance', async () => {
    await saveConfig({ plugins: {} });
    const result = await installPlugin('prettier', { offline: true, cachePath: tempCache('bundled') });
    expect(result.source).toBe('bundled');
    const config = await loadConfig({ force: true });
    expect(config.plugins.prettier._source).toMatchObject({ registry: 'bundled', version: '1.0.0' });
    expect(config.format).toEqual({ tool: 'prettier' });
  });

  it('honours an explicit version range', async () => {
    await saveConfig({ plugins: {} });
    const doc = registryDoc({
      pinned: { name: 'pinned', versions: [entry('pinned', '1.0.0', { ui: { theme: 'a' } }), entry('pinned', '2.0.0', { ui: { theme: 'b' } })] }
    });
    const result = await installPlugin('pinned@1.0.0', { registry: REG, cachePath: tempCache('pin'), fetchImpl: okFetch(doc) });
    expect(result.version).toBe('1.0.0');
  });

  it('plugin upgrade re-resolves the recorded registry and installs a newer version', async () => {
    await saveConfig({ plugins: {} });
    const v1 = registryDoc({ tool: entry('tool', '1.0.0', { ci: { provider: 'gitlab' } }) });
    await installPlugin('tool', { registry: REG, cachePath: tempCache('up1'), fetchImpl: okFetch(v1) });

    // Same version → nothing to do.
    const same = await upgradePlugins({ cachePath: tempCache('up-same'), fetchImpl: okFetch(v1) });
    expect(same.upgraded).toEqual([]);

    const v2 = registryDoc({ tool: entry('tool', '1.1.0', { ci: { provider: 'github-actions' } }) });
    const result = await upgradePlugins({ cachePath: tempCache('up2'), fetchImpl: okFetch(v2) });
    expect(result.upgraded).toEqual([{ name: 'tool', from: '1.0.0', to: '1.1.0', source: 'remote' }]);

    const config = await loadConfig({ force: true });
    expect(config.plugins.tool._source.version).toBe('1.1.0');
    expect(config.ci).toMatchObject({ provider: 'github-actions' });
  });

  it('plugins --installed reports version + source of what is on the box', async () => {
    const rows = await pluginsListCommand({ installed: true, asJson: true });
    const tool = rows.find((r) => r.name === 'tool');
    expect(tool).toMatchObject({ version: '1.1.0', enabled: true, registry: REG });
  });
});
