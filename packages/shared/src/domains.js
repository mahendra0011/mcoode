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
 *  is available and not rate-limited. */
export const DEFAULT_ROUTING = Object.freeze({
  planning: [
    'openrouter:anthropic/claude-3.5-sonnet',
    'openrouter:openai/gpt-4o',
    'opencodezen:opencode-zen-7b',
    'mock:mock'
  ],
  frontend: [
    'openrouter:openai/gpt-4o',
    'openrouter:qwen/qwen-2.5-coder-32b-instruct',
    'openrouter:anthropic/claude-3.5-sonnet',
    'mock:mock'
  ],
  backend: [
    'openrouter:anthropic/claude-3.5-sonnet',
    'openrouter:deepseek/deepseek-chat',
    'openrouter:mistralai/codestral-2501',
    'mock:mock'
  ],
  db: [
    'openrouter:anthropic/claude-3.5-sonnet',
    'openrouter:openai/gpt-4o-mini',
    'mock:mock'
  ],
  devops: [
    'openrouter:groq/llama-3.3-70b-versatile',
    'openrouter:mistralai/mistral-small',
    'mock:mock'
  ],
  test: [
    'openrouter:groq/llama-3.1-8b-instant',
    'openrouter:deepseek/deepseek-chat',
    'mock:mock'
  ],
  docs: [
    'openrouter:openai/gpt-4o-mini',
    'mock:mock'
  ],
  bugfix: [
    'openrouter:anthropic/claude-3.5-sonnet',
    'openrouter:deepseek/deepseek-chat',
    'openrouter:groq/llama-3.3-70b-versatile',
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
