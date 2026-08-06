import { DEFAULT_ROUTING } from '@mcode/shared';
import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig } from '../core/store.js';
import { CostLedger } from '@mcode/shared';

/** Quality/speed dial for model selection: low → god. */
export const MODES = Object.freeze(['low', 'medium', 'high', 'extra', 'max', 'god']);

export const MODE_DESC = Object.freeze({
  low: 'cheap & fast',
  medium: 'balanced',
  high: 'strong',
  extra: 'powerful',
  max: 'frontier',
  god: 'absolute best'
});

/**
 * Reasoning budget per mode — how hard the model thinks before answering.
 * Providers translate `effort` / `thinkingBudget` into their native API
 * params (reasoning_effort, thinking budget, ...).
 */
export const MODE_REASONING = Object.freeze({
  low: { effort: 'low', thinkingBudget: 1_000 },
  medium: { effort: 'medium', thinkingBudget: 2_000 },
  high: { effort: 'high', thinkingBudget: 4_000 },
  extra: { effort: 'high', thinkingBudget: 8_000 },
  max: { effort: 'high', thinkingBudget: 16_000 },
  god: { effort: 'high', thinkingBudget: 32_000 }
});

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
    this.mode = MODES.includes(config?.mode) ? config.mode : 'medium';
  }

  setMode(mode) {
    this.mode = MODES.includes(mode) ? mode : 'medium';
    return this.mode;
  }

  /** Current reasoning level, for providers to translate into API params. */
  get reasoning() {
    return MODE_REASONING[this.mode] || MODE_REASONING.medium;
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
      // provider.isAvailable() caches its own probe result with a TTL
      if (await provider.isAvailable()) {
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

    let explicitRef = null;
    if (this.config?.roles?.[domain]) {
      explicitRef = typeof this.config.roles[domain] === 'string' 
        ? this.config.roles[domain] 
        : this.config.roles[domain].preferredModels?.[0];
    } else if (this.config?.roles?.build) {
      explicitRef = typeof this.config.roles.build === 'string'
        ? this.config.roles.build
        : this.config.roles.build.preferredModels?.[0];
    }

    if (explicitRef && !exclude.includes(explicitRef)) {
      const match = await this.find(explicitRef);
      if (match && !this.ledger.isRateLimited(match.provider.id)) return match;
    }

    const prefs = this.routing[domain] || [];
    const available = await this.listAvailable();
    const byId = new Map(available.map((p) => [p.id, p]));

    for (const ref of prefs) {
      const [providerId, modelId] = ref.split(':');
      if (exclude.includes(ref)) continue;
      const provider = byId.get(providerId);
      if (!provider) continue;
      if (this.ledger.isRateLimited(providerId)) continue;
      const models = await provider.listModels();
      const entry = models.find((m) => m.id === modelId);
      if (!entry) continue;
      return { provider, model: entry, ref: `${providerId}:${entry.id}` };
    }

    // Fallback: highest-scoring available model from any provider.
    let best = null;
    for (const provider of available) {
      if (this.ledger.isRateLimited(provider.id)) continue;
      const models = await provider.listModels();
      for (const entry of models) {
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
      const models = await provider.listModels();
      for (const entry of models) {
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
      const models = await provider.listModels();
      const entry = models.find((m) => m.id === modelId) || models[0];
      if (!entry) continue;
      return { provider, model: entry, ref: `${providerId}:${entry.id}` };
    }
    return null;
  }
}
