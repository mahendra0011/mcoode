import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { PLUGIN_REGISTRY } from '@mcode/shared';
import { MCCODE_DIR } from './store.js';
import { CLI_VERSION } from './version.js';

/**
 * MF-005: remote plugin registry for `mcode add`.
 *
 * Plugins stay **config-only** (they merge config blocks — never downloaded
 * code), so a registry entry is untrusted input and is treated as such:
 *   - entries may declare `minCliVersion` (refused on older CLIs),
 *   - remote entries MUST carry `integrity: "sha256-<hex>"`, verified against
 *     the canonical JSON of the entry's `config` block before it is merged,
 *   - the merged config is validated through `ConfigSchema` on write
 *     (store.saveConfig → validate-before-write, MF-007),
 *   - provenance (`{ registry, version, integrity, installedAt }`) is stored
 *     under `plugins.<name>._source` so `mcode plugin upgrade` can re-resolve.
 *
 * Registry shape (`registry.json`):
 *   { "version": 1, "updatedAt": "…",
 *     "plugins": { "<name>": { "name", "version", "category", "desc",
 *                               "config", "integrity", "minCliVersion",
 *                               "versions": [ …same shape… ] } } }
 * `plugins` may also be an array of entries, or per-name arrays of versions.
 */

export const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/mahendra0011/mcode/main/registry.json';
export const REGISTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const REGISTRY_FETCH_TIMEOUT_MS = 10_000;
export const BUNDLED_VERSION = '1.0.0';

export function registryCachePath() {
  return join(MCCODE_DIR, 'cache', 'registry.json');
}

/** `name` | `name@1.2.0` | `name@^1.2` | `name@~1.2.0` | `name@latest` */
export function parsePluginSpec(spec) {
  const raw = String(spec || '').trim();
  const at = raw.lastIndexOf('@');
  if (at > 0) return { name: raw.slice(0, at), range: raw.slice(at + 1) || 'latest' };
  return { name: raw, range: 'latest' };
}

/** Tolerant semver compare (missing parts = 0, pre-release suffix ignored). */
export function compareVersions(a, b) {
  const parse = (v) => String(v || '0').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** Tiny range matcher — exact / `^` / `~` / `>=` / `latest` / `*`. */
export function satisfiesRange(version, range) {
  const r = String(range || 'latest').trim();
  if (!r || r === 'latest' || r === '*') return true;
  if (r.startsWith('>=')) return compareVersions(version, r.slice(2)) >= 0;
  if (r.startsWith('^')) {
    const base = r.slice(1);
    const maj = Number(base.split('.')[0]) || 0;
    return compareVersions(version, base) >= 0 && Number(String(version).split('.')[0]) === maj;
  }
  if (r.startsWith('~')) {
    const base = r.slice(1);
    const [maj, min] = base.split('.');
    const [vmaj, vmin] = String(version).split('.');
    return Number(vmaj) === Number(maj) && Number(vmin) === Number(min) && compareVersions(version, base) >= 0;
  }
  return compareVersions(version, r) === 0;
}


/** All published entries for a plugin name (single entry | array | `versions`). */
export function entriesFor(registry, name) {
  const raw = (registry?.plugins || {})[name];
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw.versions) ? raw.versions : [raw]);
  return list
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({ ...e, name: e.name || name, version: e.version || BUNDLED_VERSION }));
}

/** Highest published version matching the range, or null. */
export function resolveEntry(registry, name, range = 'latest') {
  return entriesFor(registry, name)
    .filter((e) => satisfiesRange(e.version, range))
    .sort((a, b) => compareVersions(b.version, a.version))[0] || null;
}

/** Accepts `{plugins: {…}}` (object or array); anything else → null. */
export function normalizeRegistry(raw) {
  const plugins = raw?.plugins;
  if (!plugins || typeof plugins !== 'object') return null;
  const out = {};
  if (Array.isArray(plugins)) {
    for (const entry of plugins) {
      if (!entry?.name) continue;
      out[entry.name] = out[entry.name] ? [].concat(out[entry.name], entry) : entry;
    }
  } else {
    for (const [name, entry] of Object.entries(plugins)) out[name] = entry;
  }
  return { version: Number(raw.version) || 1, updatedAt: raw.updatedAt || null, plugins: out };
}

/** The bundled catalog in registry shape (no integrity needed — ships with the CLI). */
export function bundledRegistry() {
  return normalizeRegistry({
    version: 1,
    updatedAt: null,
    plugins: Object.fromEntries(
      Object.entries(PLUGIN_REGISTRY).map(([name, e]) => [
        name,
        { name, version: BUNDLED_VERSION, category: e.category, desc: e.desc, config: e.config }
      ])
    )
  });
}

/** Canonical bytes an entry's `integrity` is computed over. */
export function canonicalConfig(entry) {
  return JSON.stringify(entry?.config ?? {});
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** @returns {{ ok: boolean, actual?: string, reason?: string }} */
export function verifyIntegrity(entry) {
  const integrity = String(entry?.integrity || '');
  const [algo, digest] = integrity.split('-');
  if (!integrity) return { ok: false, reason: 'missing' };
  if (algo !== 'sha256' || !digest) return { ok: false, reason: 'unsupported' };
  const actual = sha256(canonicalConfig(entry));
  return actual === digest ? { ok: true, actual } : { ok: false, actual };
}

export function isCompatibleWithCli(minCliVersion) {
  if (!minCliVersion) return true;
  return compareVersions(CLI_VERSION, minCliVersion) >= 0;
}


/** ── cache + fetch ─────────────────────────────────────────────────────── */

async function readCacheFile(cachePath) {
  try {
    const parsed = JSON.parse(await readFile(cachePath, 'utf8'));
    return parsed?.registry ? parsed : null;
  } catch {
    return null; // missing/corrupt cache — just refetch
  }
}

async function writeCacheFile(cachePath, payload) {
  await mkdir(dirname(cachePath), { recursive: true });
  const tmp = `${cachePath}.tmp.${process.pid}`;
  await writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
  await rename(tmp, cachePath);
}

function withTimeout(promise, ms) {
  if (!ms || !Number.isFinite(ms)) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`registry fetch timed out after ${ms}ms`)), ms);
    timer.unref?.();
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/**
 * Load the registry: fresh cache → remote fetch → stale cache → bundled.
 * Never throws: a registry outage degrades to the offline list, it does not
 * break `mcode add` for the plugins that ship with the CLI.
 */
export async function loadRegistry({
  url = null,
  configUrl = null,
  offline = false,
  ttlMs = REGISTRY_CACHE_TTL_MS,
  timeoutMs = REGISTRY_FETCH_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  cachePath = registryCachePath()
} = {}) {
  const target = url || configUrl || DEFAULT_REGISTRY_URL;
  const cache = await readCacheFile(cachePath);
  const fromCache = (stale) => ({
    registry: normalizeRegistry(cache.registry) || cache.registry,
    source: 'cache',
    url: cache.url || target,
    stale
  });

  if (offline) {
    return cache ? { ...fromCache(true), offline: true } : { registry: bundledRegistry(), source: 'bundled', url: target, offline: true };
  }
  if (cache && now() - Number(cache.fetchedAt || 0) < ttlMs) return fromCache(false);

  try {
    const res = await withTimeout(Promise.resolve(fetchImpl(target)), timeoutMs);
    if (!res || res.ok === false) throw new Error(`registry fetch failed (HTTP ${res?.status ?? 'n/a'})`);
    const registry = normalizeRegistry(await res.json());
    if (!registry) throw new Error('registry payload is not a valid registry document');
    const fetchedAt = now();
    await writeCacheFile(cachePath, { url: target, fetchedAt, registry }).catch(() => { /* cache is best-effort */ });
    return { registry, source: 'remote', url: target, fetchedAt };
  } catch (err) {
    if (cache) return { ...fromCache(true), error: err.message };
    return { registry: bundledRegistry(), source: 'bundled', url: target, error: err.message };
  }
}

/**
 * Resolve `name[@range]` — bundled-first unless a registry was requested
 * (`--registry` / `config.pluginsRegistryUrl`), remote-first in that case.
 * @returns {Promise<{ entry: any, source: 'remote'|'cache'|'bundled', url: string|null, registry: any, stale?: boolean, error?: string }|null>}
 */
export async function resolvePlugin(name, range = 'latest', { url = null, configUrl = null, ...loadOpts } = {}) {
  const useRemote = Boolean(url || configUrl);
  const fromBundled = () => {
    const entry = resolveEntry(bundledRegistry(), name, range);
    return entry ? { entry, source: 'bundled', url: null, registry: null } : null;
  };

  if (!useRemote) {
    const bundled = fromBundled();
    if (bundled) return bundled;
  }

  const loaded = await loadRegistry({ url, configUrl, ...loadOpts });
  const entry = resolveEntry(loaded.registry, name, range);
  if (!entry) return useRemote ? null : fromBundled();
  const source = loaded.source === 'bundled' ? 'bundled' : loaded.source;
  return { entry, source, url: source === 'bundled' ? null : loaded.url, registry: loaded.registry, stale: loaded.stale, error: loaded.error };
}
