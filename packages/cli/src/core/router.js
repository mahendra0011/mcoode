import { DEFAULT_ROUTING } from '@mcode/shared';
import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig } from '../core/store.js';
import { CostLedger } from '@mcode/shared';

/**
 * Router — picks the best available provider+model for a task type,
 * respecting rate-limit budgets and user overrides (mcode model set).
 */
export class ModelRouter {
  constructor({ secrets = null, config = null, ledger = null, providers = null } = {}) {
    this.secrets = secrets;
    this.config = config;
    this.ledger = ledger || new CostLedger();
    this.providers = providers;
    this.availabilityCache = new Map();
  }

  async _init() {
    if (!this.secrets) this.secrets = await loadVault();
    if (!this.config) this.config = await loadConfig();
    if (!this.providers) this.providers = await getProviders({ secrets: this.secrets, config: this.config });
  }

  get routing() {
    const overrides = this.config?.routing || {};
    return { ...DEFAULT_ROUTING, ...overrides };
  }

  async listAvailable() {
    await this._init();
    const out = [];
    for (const provider of this.providers) {
      const key = provider.id;
      if (!this.availabilityCache.has(key)) {
        this.availabilityCache.set(key, await provider.isAvailable());
      }
      if (this.availabilityCache.get(key)) {
        out.push(provider);
      }
    }
    return out;
  }

  /**
   * Choose a model for a domain, falling down the routing preference list.
   * @returns {{provider, model, ref}} or null if nothing is usable.
   */
  async pick(domain, { exclude = [] } = {}) {
    await this._init();
    const prefs = this.routing[domain] || [];
    const available = await this.listAvailable();
    const byId = new Map(available.map((p) => [p.id, p]));

    for (const ref of prefs) {
      const [providerId, modelId] = ref.split(':');
      if (exclude.includes(ref)) continue;
      const provider = byId.get(providerId);
      if (!provider) continue;
      if (this.ledger.isRateLimited(providerId)) continue;
      const entry = provider.listModels().find((m) => m.id === modelId) || provider.listModels()[0];
      if (!entry) continue;
      return { provider, model: entry, ref: `${providerId}:${entry.id}` };
    }

    // Fallback: highest-scoring available model from any provider.
    let best = null;
    for (const provider of available) {
      if (this.ledger.isRateLimited(provider.id)) continue;
      for (const entry of provider.listModels()) {
        const ref = `${provider.id}:${entry.id}`;
        if (exclude.includes(ref)) continue;
        const score = entry.scores?.[domain] ?? 0;
        if (!best || score > best.score) {
          best = { provider, model: entry, score, ref };
        }
      }
    }
    return best;
  }

  /** All usable models, annotated with their best domain. */
  async catalog() {
    const providers = await this.listAvailable();
    const out = [];
    for (const provider of providers) {
      for (const entry of provider.listModels()) {
        const best = Object.entries(entry.scores || {})
          .sort((a, b) => b[1] - a[1])[0];
        out.push({
          ref: `${provider.id}:${entry.id}`,
          provider: provider.id,
          model: entry.id,
          name: entry.name,
          free: Boolean(entry.free),
          bestDomain: best?.[0] || null,
          bestScore: best?.[1] || 0,
          scores: entry.scores || {}
        });
      }
    }
    return out.sort((a, b) => b.bestScore - a.bestScore);
  }

  /** Resolve a `provider:model` ref to an assignment, or null if unusable. */
  async find(ref) {
    if (!ref || typeof ref !== 'string') return null;
    await this._init();
    const [providerId, modelId] = ref.split(':');
    for (const provider of await this.listAvailable()) {
      if (provider.id !== providerId) continue;
      const entry = provider.listModels().find((m) => m.id === modelId) || provider.listModels()[0];
      if (!entry) continue;
      return { provider, model: entry, ref: `${providerId}:${entry.id}` };
    }
    return null;
  }
}
