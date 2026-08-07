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

export async function modelSetCommand(domain, ref, { asJson = false } = {}) {
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

export async function modelResetCommand({ domain = null, asJson = false } = {}) {
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