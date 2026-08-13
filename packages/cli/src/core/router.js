import { DEFAULT_ROUTING } from '@mcode/shared';
import { getProviders } from '../providers/index.js';
import { loadVault } from '../core/vault.js';
import { loadConfig } from '../core/store.js';
import { CostLedger } from '@mcode/shared';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

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
 * Layered model scoring system.
 * Each model gets scored per domain using:
 *   0.20 × static benchmark  (public eval scores)
 * + 0.50 × historical success rate  (per-user, per-domain, rolling)
 * + 0.20 × task fingerprint match  (framework/language/task-type)
 * + 0.10 × user override priority
 *
 * Historical scores persist in ~/.mcode/scores/{projectId}/model-scores.json
 */
const STATIC_BENCHMARK = {
  'anthropic:claude-3-5-sonnet':  { frontend: 0.88, backend: 0.91, db: 0.85, test: 0.87, bugfix: 0.90, planning: 0.92, docs: 0.80, devops: 0.83 },
  'anthropic:claude-3-5-haiku':   { frontend: 0.75, backend: 0.80, db: 0.75, test: 0.82, bugfix: 0.78, planning: 0.70, docs: 0.75, devops: 0.72 },
  'openai:gpt-4o':                { frontend: 0.92, backend: 0.88, db: 0.83, test: 0.91, bugfix: 0.86, planning: 0.85, docs: 0.88, devops: 0.85 },
  'openai:gpt-4o-mini':           { frontend: 0.80, backend: 0.82, db: 0.78, test: 0.85, bugfix: 0.80, planning: 0.75, docs: 0.82, devops: 0.80 },
  'google:gemini-2.0-flash':      { frontend: 0.85, backend: 0.89, db: 0.81, test: 0.88, bugfix: 0.83, planning: 0.80, docs: 0.84, devops: 0.89 },
  'google:gemini-2.0-flash-thinking': { frontend: 0.88, backend: 0.92, db: 0.85, test: 0.90, bugfix: 0.88, planning: 0.85, docs: 0.80, devops: 0.87 },
  'mock:default':                 { frontend: 0.5, backend: 0.5, db: 0.5, test: 0.5, bugfix: 0.5, planning: 0.5, docs: 0.5, devops: 0.5 }
};

/**
 * Fingerprint match scores — how well-suited a model is for a given
 * framework/language/task-type combination.
 */
const FINGERPRINT_MATCH = {
  'anthropic:claude-3-5-sonnet': {
    frameworks: { react: 0.95, vue: 0.88, svelte: 0.80, nextjs: 0.93 },
    languages:  { ts: 1.0, js: 1.0, python: 0.92, go: 0.88, rust: 0.85 },
    taskTypes:  { 'code-gen': 0.93, 'bug-fix': 0.92, refactor: 0.88, 'write-tests': 0.91 }
  },
  'openai:gpt-4o': {
    frameworks: { react: 0.96, vue: 0.92, svelte: 0.88, nextjs: 0.94 },
    languages:  { ts: 1.0, js: 1.0, python: 0.98, go: 0.90, rust: 0.86 },
    taskTypes:  { 'code-gen': 0.94, 'bug-fix': 0.90, refactor: 0.87, 'write-tests': 0.93 }
  },
  'google:gemini-2.0-flash': {
    frameworks: { react: 0.90, vue: 0.88, svelte: 0.85, nextjs: 0.92 },
    languages:  { ts: 1.0, js: 1.0, python: 0.95, go: 0.92, rust: 0.88 },
    taskTypes:  { 'code-gen': 0.89, 'bug-fix': 0.87, refactor: 0.85, 'write-tests': 0.88 }
  }
};

/**
 * ModelScorer — manages the 5-layer weighted scoring system.
 * Persists historical success/failure data per project to disk.
 */
class ModelScorer {
  constructor(projectId = 'default') {
    this.projectId = projectId;
    this.scoresPath = join(homedir(), '.mcode', 'scores', projectId, 'model-scores.json');
    this.scores = null;
    this.consecutiveFailures = new Map(); // ref -> count
  }

  async init() {
    try {
      const data = await readFile(this.scoresPath, 'utf8');
      this.scores = JSON.parse(data);
    } catch {
      this.scores = { lastUpdated: Date.now(), models: {} };
    }
  }

  /**
   * Compute the static benchmark layer (20% weight).
   * Falls back to 0.5 for unknown models.
   */
  staticBenchmark(ref, domain) {
    const entry = STATIC_BENCHMARK[ref];
    if (!entry) return 0.5;
    return entry[domain] ?? 0.5;
  }

  /**
   * Compute the historical success rate layer (50% weight).
   * Rolling average: successes / (successes + failures) per ref+domain.
   */
  historicalRate(ref, domain) {
    const modelData = this.scores?.models?.[ref];
    if (!modelData) return 0.5;
    const domainData = modelData.domains?.[domain];
    if (!domainData) return 0.5;
    const total = (domainData.successes || 0) + (domainData.failures || 0);
    if (total === 0) return 0.5;
    return (domainData.successes || 0) / total;
  }

  /**
   * Compute the fingerprint match layer (20% weight).
   * Matches the task fingerprint (framework/language/taskType) against
   * model-specific fingerprint strengths.
   */
  fingerprintMatch(ref, taskFingerprint = {}) {
    const fp = FINGERPRINT_MATCH[ref];
    if (!fp) return 0.5;

    let score = 0;
    let parts = 0;

    if (taskFingerprint.framework) {
      score += fp.frameworks?.[taskFingerprint.framework] ?? 0.5;
      parts++;
    }
    if (taskFingerprint.language) {
      score += fp.languages?.[taskFingerprint.language] ?? 0.5;
      parts++;
    }
    if (taskFingerprint.taskType) {
      score += fp.taskTypes?.[taskFingerprint.taskType] ?? 0.5;
      parts++;
    }

    return parts > 0 ? score / parts : 0.5;
  }

  /**
   * Compute the user override priority layer (10% weight).
   * Derived from routing preference list position — higher position = higher priority.
   */
  userOverridePriority(ref, domain, routingPrefs) {
    const prefs = routingPrefs[domain] || [];
    const index = prefs.indexOf(ref);
    if (index === -1) return 0;
    // Higher-priority = earlier in list → closer to 1
    return 1 - (index / Math.max(prefs.length, 1));
  }

  /**
   * Live escalation adjustment — reduces score for models on failure streaks.
   * After 3 consecutive failures, score drops sharply to trigger auto-switch.
   */
  liveEscalation(ref, domain) {
    const failures = this.consecutiveFailures.get(`${ref}:${domain}`) || 0;
    if (failures === 0) return 0;
    if (failures >= 3) return -0.3; // Hard penalty triggers fallback
    return -0.1 * failures; // Gradual penalty
  }

  /**
   * Full 5-layer weighted score for a model+domain+task combination.
   *
   * final_score = 0.20 × static_benchmark + 0.50 × historical + 0.20 × fingerprint
   * + 0.10 × user_override + live_escalation
   */
  scoreModel(ref, domain, routingPrefs, taskFingerprint = {}) {
    const staticScore = this.staticBenchmark(ref, domain);
    const historical = this.historicalRate(ref, domain);
    const fingerprint = this.fingerprintMatch(ref, taskFingerprint);
    const userOverride = this.userOverridePriority(ref, domain, routingPrefs);
    const escalation = this.liveEscalation(ref, domain);

    const finalScore =
      0.20 * staticScore +
      0.50 * historical +
      0.20 * fingerprint +
      0.10 * userOverride +
      escalation;

    return {
      score: Math.max(0, Math.min(1, finalScore)),
      breakdown: {
        static: 0.20 * staticScore,
        historical: 0.50 * historical,
        fingerprint: 0.20 * fingerprint,
        userOverride: 0.10 * userOverride,
        escalation
      }
    };
  }

  /** Record the result of a subagent task for historical score updates. */
  async recordResult(ref, domain, success) {
    if (!this.scores) await this.init();
    if (!this.scores.models[ref]) {
      this.scores.models[ref] = { domains: {}, totalSuccesses: 0, totalFailures: 0 };
    }
    if (!this.scores.models[ref].domains[domain]) {
      this.scores.models[ref].domains[domain] = { successes: 0, failures: 0 };
    }
    const domainData = this.scores.models[ref].domains[domain];
    const modelData = this.scores.models[ref];

    if (success) {
      domainData.successes++;
      modelData.totalSuccesses++;
      this.consecutiveFailures.delete(`${ref}:${domain}`);
    } else {
      domainData.failures++;
      modelData.totalFailures++;
      const key = `${ref}:${domain}`;
      const current = this.consecutiveFailures.get(key) || 0;
      this.consecutiveFailures.set(key, current + 1);
    }

    this.scores.lastUpdated = Date.now();
    await this._persist();
  }

  getFailureStreak(ref, domain) {
    return this.consecutiveFailures.get(`${ref}:${domain}`) || 0;
  }

  /** Reset consecutive failure streak for a model (e.g., after successful retry). */
  resetFailureStreak(ref, domain) {
    this.consecutiveFailures.delete(`${ref}:${domain}`);
  }

  async _persist() {
    try {
      await mkdir(join(homedir(), '.mcode', 'scores', this.projectId), { recursive: true });
      await writeFile(this.scoresPath, JSON.stringify(this.scores, null, 2), 'utf8');
    } catch (e) {
      // Silently fail — scoring continues in-memory
    }
  }
}

/**
 * Router — picks the best available provider+model for a task type,
 * respecting rate-limit budgets and user overrides (mcode model set).
 */
export class ModelRouter {

  constructor({ secrets = null, config = null, ledger = null, providers = null, projectId = 'default' } = {}) {
    this.secrets = secrets;
    this.config = config;
    this.ledger = ledger || new CostLedger();
    this.providers = providers;
    this.mode = MODES.includes(config?.mode) ? config.mode : 'medium';
    this.scorer = new ModelScorer(projectId);
    this._scorerInitialized = false;
    this._allRefsCache = null;
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
    if (!this._scorerInitialized) {
      await this.scorer.init();
      this._scorerInitialized = true;
    }
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
   * Build a cache of all model refs from available providers for scoring.
   * Cached to avoid repeated provider.listModels() calls within a session.
   */
  async _cacheAllRefs() {
    if (this._allRefsCache) return this._allRefsCache;
    const available = await this.listAvailable();
    const refs = [];
    for (const provider of available) {
      if (this.ledger.isRateLimited(provider.id)) continue;
      const models = await provider.listModels();
      for (const entry of models) {
        refs.push({ ref: `${provider.id}:${entry.id}`, provider, model: entry });
      }
    }
    this._allRefsCache = refs;
    return refs;
  }

  /**
   * Choose a model for a domain using the 5-layer weighted scoring system.
   * Falls back to routing preference order if scoring yields no available model.
   *
   * @param {string} domain — task domain (frontend, backend, db, test, etc.)
   * @param {object} opts
   * @param {string[]} opts.exclude — model refs to exclude
   * @param {object} opts.taskFingerprint — { framework, language, taskType }
   * @returns {{provider, model, ref, scoreResult}} or null if nothing is usable.
   */
  async pick(domain, { exclude = [], taskFingerprint = {} } = {}) {
    await this._init();

    // 1. Check for explicit user preference (role override)
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
      if (match && !this.ledger.isRateLimited(match.provider.id)) {
        const scoreResult = this.scorer.scoreModel(explicitRef, domain, this.routing, taskFingerprint);
        return { ...match, scoreResult };
      }
    }

    // 2. Scoring-based selection across all available models
    const routingPrefs = this.routing;
    const allRefs = await this._cacheAllRefs();
    let best = null;

    for (const { ref, provider, model } of allRefs) {
      if (exclude.includes(ref)) continue;
      if (this.ledger.isRateLimited(provider.id)) continue;

      // Live escalation: auto-exclude models with 3+ consecutive failures
      if (this.scorer.getFailureStreak(ref, domain) >= 3) continue;

      const scoreResult = this.scorer.scoreModel(ref, domain, routingPrefs, taskFingerprint);
      if (!best || scoreResult.score > best.scoreResult.score) {
        best = { provider, model, ref, score: scoreResult.score, scoreResult };
      }
    }

    if (best) return best;

    // 3. Fallback: routing preference list order
    const prefs = routingPrefs[domain] || [];
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
      const scoreResult = this.scorer.scoreModel(ref, domain, routingPrefs, taskFingerprint);
      return { provider, model: entry, ref: `${providerId}:${entry.id}`, scoreResult };
    }

    return null;
  }

  /**
   * Record the outcome of a subagent using a specific model for a domain.
   * Updates the historical scoring data.
   * Call after a subagent completes — success=true on DONE, false on FAILED.
   */
  async recordAssignment(ref, domain, success) {
    if (!this._scorerInitialized) return;
    await this.scorer.recordResult(ref, domain, success);
  }

  /**
   * Get the failure streak for a model in a domain.
   * Used by SubagentManager to trigger auto-switch logic.
   */
  getModelFailureStreak(ref, domain) {
    return this.scorer.getFailureStreak(ref, domain);
  }

  /**
   * Generate a scoring report for debugging / analytics.
   * Shows all available models ranked by total weighted score across all domains.
   */
  async scoringReport() {
    await this._init();
    const allRefs = await this._cacheAllRefs();
    const routingPrefs = this.routing;
    const domains = ['frontend', 'backend', 'db', 'test', 'bugfix', 'planning', 'docs', 'devops'];

    const report = [];
    for (const { ref, provider, model } of allRefs) {
      const domainScores = {};
      let totalScore = 0;
      for (const domain of domains) {
        const { score } = this.scorer.scoreModel(ref, domain, routingPrefs, {});
        domainScores[domain] = Number((score * 100).toFixed(1));
        totalScore += score;
      }
      report.push({
        ref,
        provider: provider.id,
        model: model.id,
        name: model.name,
        averageScore: Number((totalScore / domains.length * 100).toFixed(1)),
        domainScores,
        failureStreak: this.scorer.getFailureStreak(ref, '__global__')
      });
    }

    return report.sort((a, b) => b.averageScore - a.averageScore);
  }

  /**
   * Export ModelScorer for external use (e.g., SubagentManager recording results).
   */
  static getScorer(projectId) {
    return new ModelScorer(projectId);
  }

  /** All usable models, annotated with their best domain and composite score. */
  async catalog() {
    await this._init();

    const allRefs = await this._cacheAllRefs();
    const routingPrefs = this.routing;
    const domains = ['frontend', 'backend', 'db', 'test', 'bugfix', 'planning', 'docs', 'devops'];
    const out = [];

    for (const { ref, provider, model } of allRefs) {
      const domainScores = {};
      let bestDomain = null;
      let bestScore = 0;

      for (const domain of domains) {
        const { score } = this.scorer.scoreModel(ref, domain, routingPrefs, {});
        domainScores[domain] = Number((score * 100).toFixed(1));
        if (score > bestScore) {
          bestScore = score;
          bestDomain = domain;
        }
      }

      out.push({
        ref,
        provider: provider.id,
        model: model.id,
        name: model.name,
        free: Boolean(model.free),
        bestDomain,
        bestScore: Number((bestScore * 100).toFixed(1)),
        scores: domainScores,
        failureStreak: this.scorer.getFailureStreak(ref, 'bugfix')
      });
    }
    return out.sort((a, b) => b.bestScore - a.bestScore);
  }

  /**
   * Prefetch model selection for all task domains.
   * Called at session start to warm up the routing cache,
   * so the first agent call doesn't block on provider enumeration.
   * Mirrors Z Code's predictive model selection pattern.
   */
  async warmUp() {
    await this._init();
    const domains = ['planning', 'frontend', 'backend', 'db', 'devops', 'test', 'docs', 'bugfix'];

    // Warm up in parallel — each pick() resolves the best model per domain
    const assignments = await Promise.all(
      domains.map((domain) => this.pick(domain).catch(() => null))
    );

    // Cache results for fast lookup in specialized agents + scoring data
    this._assignments = {};
    domains.forEach((domain, i) => {
      if (assignments[i]) {
        this._assignments[domain] = assignments[i];
      }
    });

    return this._assignments;
  }

  /** Get a cached model assignment for a domain (warmed up at init). */
  getCachedAssignment(domain) {
    return this._assignments?.[domain] || null;
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
