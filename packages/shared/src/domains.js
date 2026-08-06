export const TASK_DOMAINS = Object.freeze([
  'planning',
  'frontend',
  'backend',
  'db',
  'devops',
  'test',
  'docs',
  'bugfix'
]);

/** Hex colors shared 1:1 between terminal UI and web dashboard. */
export const DOMAIN_COLORS = Object.freeze({
  planning: '#b18aff',
  frontend: '#5b9dff',
  backend: '#b18aff',
  db: '#f5c04a',
  devops: '#6b7280',
  test: '#2dd4bf',
  docs: '#4ade80',
  bugfix: '#ff6b6b'
});

export const DOMAIN_TAGS = Object.freeze({
  planning: 'plan',
  frontend: 'frontend',
  backend: 'backend',
  db: 'db',
  devops: 'devops',
  test: 'test',
  docs: 'docs',
  bugfix: 'bugfix'
});

/** Default model preferences per task type. Entries are tried top-down.
 *  Format: "providerId:modelId" — the router picks the first whose provider
 *  is available and not rate-limited. Defaults are cheap/free-first; the
 *  router still falls back to the highest-scoring available model. */
export const DEFAULT_ROUTING = Object.freeze({
  planning: [
    'deepseek:deepseek-v4-pro',
    'openai:gpt-5.5',
    'anthropic:claude-sonnet-5',
    'mock:mock'
  ],
  frontend: [
    'qwen:qwen-3.8-max',
    'openai:gpt-5.6-luna',
    'deepseek:deepseek-v4-flash-0731',
    'mock:mock'
  ],
  backend: [
    'deepseek:deepseek-v4-flash-0731',
    'deepseek:deepseek-v4-pro',
    'mistral:codestral',
    'mock:mock'
  ],
  db: [
    'deepseek:deepseek-v4-pro',
    'qwen:qwen-3.8-max',
    'openai:gpt-5.6-luna',
    'mock:mock'
  ],
  devops: [
    'groq:llama-3.3-70b-versatile',
    'groq:llama-3.1-8b-instant',
    'mistral:mistral-medium-3.5',
    'mock:mock'
  ],
  test: [
    'groq:llama-3.1-8b-instant',
    'deepseek:deepseek-v4-flash-0731',
    'deepseek:deepseek-v4-pro',
    'mock:mock'
  ],
  docs: [
    'google:gemini-3.6-flash',
    'openai:gpt-5.6-luna',
    'qwen:qwen-3.7-flash',
    'mock:mock'
  ],
  bugfix: [
    'deepseek:deepseek-v4-flash-0731',
    'groq:llama-3.3-70b-versatile',
    'anthropic:claude-haiku-4-5',
    'mock:mock'
  ]
});

export const DEFAULT_CONFIG = Object.freeze({
  concurrency: 5,
  maxTurnsPerSubagent: 25,
  maxTokensPerSubagent: 60_000,
  watch: {
    scanIntervalMs: 30_000,
    debounceMs: 400,
    maxFixesPerHour: 60,
    autoCommit: false,
    maxAttemptsPerFix: 3
  },
  cost: {
    budgetPerRunUsd: 2.0,
    freeProvidersPreferred: true
  },
  networkWhitelist: null, // null = allow all; set to array of domains (supports *.glob)
  backend: {
    url: 'http://localhost:3100'
  }
});

export function domainColor(domain) {
  return DOMAIN_COLORS[domain] || '#4ade80';
}

export function isDomain(value) {
  return TASK_DOMAINS.includes(value);
}
