import { ModelRouter, MODES, MODE_DESC } from '../core/router.js';
import { loadConfig, saveConfig } from '../core/store.js';
import { DEFAULT_ROUTING, TASK_DOMAINS } from '@mcode/shared';
import { table, ok, fail, json, isJsonMode } from '../core/logger.js';

export async function modelListCommand({ asJson = false } = {}) {
  const router = new ModelRouter();
  const catalog = await router.catalog();
  if (asJson) return json(catalog);
  if (catalog.length === 0) {
    fail('no usable models found — add a provider key with `mcode env add` or `mcode api-key`');
    return;
  }
  table(catalog.map((m) => [
    m.ref,
    m.name,
    m.provider,
    m.free ? 'free' : 'paid',
    m.bestDomain || '-',
    String(m.bestScore ?? 0)
  ]), { columns: ['REF', 'NAME', 'PROVIDER', 'COST', 'BEST DOMAIN', 'SCORE'] });
}

export async function modelShowCommand({ domain = null } = {}) {
  const config = await loadConfig();
  const routing = { ...DEFAULT_ROUTING, ...(config.routing || {}) };
  const roles = config.roles || {};

  if (isJsonMode()) return json(routing);

  if (domain) {
    if (!TASK_DOMAINS.includes(domain) && !roles[domain] && !routing[domain]) {
      fail(`unknown domain "${domain}". Known: ${TASK_DOMAINS.join(', ')}`);
      return;
    }
    const base = routing[domain] || [];
    const role = roles[domain];
    const pinned = typeof role === 'string' ? role : role?.preferredModels?.[0];
    ok(`domain: ${domain}`);
    table((base.length ? base : roles[domain] ? Object.values(roles[domain]).flat() : []).map((ref) => [
      ref,
      pinned === ref ? 'pinned' : ''
    ]), { columns: ['PREFERENCE', 'STATE'] });
    return;
  }

  ok('model routing (per task type)');
  table(TASK_DOMAINS.map((d) => [
    d,
    (roles[d] ? (typeof roles[d] === 'string' ? roles[d] : roles[d].preferredModels?.[0]) || '-' : routing[d]?.[0] || '-')
  ]), { columns: ['DOMAIN', 'ACTIVE MODEL'] });
}

export async function modelSetCommand(domain, ref, _opts = {}) {
  if (!domain) {
    fail('usage: mcode model set <domain> <provider:model>');
    process.exit(1);
  }
  if (!ref || !ref.includes(':')) {
    fail('ref must be provider:model (e.g. openai:gpt-5.6-luna)');
    process.exit(1);
  }
  const config = await loadConfig();
  config.routing = { ...(config.routing || {}), [domain]: [ref, 'mock:mock'] };
  config.roles = { ...(config.roles || {}), [domain]: ref };
  await saveConfig(config);
  ok(`model pinned: ${domain} -> ${ref} (saved to ~/.mcode/config.json)`);
}

export async function modelResetCommand({ domain = null } = {}) {
  const config = await loadConfig();
  if (domain) {
    delete config.routing?.[domain];
    delete config.roles?.[domain];
  } else {
    delete config.routing;
    delete config.roles;
  }
  await saveConfig(config);
  ok(domain ? `reset ${domain} to defaults` : 'reset all routing to defaults');
}

export async function modelModesCommand({ asJson = false } = {}) {
  if (asJson) return json(MODES.map((m) => ({ mode: m, desc: MODE_DESC[m] })));
  table(MODES.map((m) => [m, MODE_DESC[m]]), { columns: ['MODE', 'DESCRIPTION'] });
}

/** RTR-005: live benchmark — times a tiny completion per configured model
 *  so static scores can be sanity-checked against reality. Providers without
 *  keys are reported as skipped, never probed. */
export async function modelBenchmarkCommand({ asJson = false, prompt = 'Reply with exactly: ok' } = {}) {
  const router = new ModelRouter();
  await router._init();
  const available = await router.listAvailable();
  const rows = [];
  for (const provider of available) {
    let models = [];
    try {
      models = await provider.listModels();
    } catch {
      continue;
    }
    for (const m of models.slice(0, 3)) {
      const ref = `${provider.id}:${m.id}`;
      const t0 = Date.now();
      try {
        const res = await provider.complete(m.id, {
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          maxTokens: 16,
        });
        rows.push({ ref, ok: true, ms: Date.now() - t0, chars: (res.text || '').length });
      } catch (err) {
        rows.push({ ref, ok: false, ms: Date.now() - t0, error: String(err.message || err).slice(0, 120) });
      }
    }
  }
  if (asJson) return json(rows);
  if (rows.length === 0) {
    fail('no configured providers to benchmark — add a key first');
    return;
  }
  table(rows.map((r) => [r.ref, r.ok ? 'ok' : 'FAIL', String(r.ms), r.ok ? String(r.chars) : (r.error || '')]),
    { columns: ['REF', 'STATUS', 'MS', 'DETAIL'] });
}