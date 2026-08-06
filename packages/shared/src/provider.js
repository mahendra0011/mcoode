/* global AbortController, AbortSignal */

/**
 * ModelProvider interface — every provider adapter (OpenRouter, OpenCode Zen,
 * direct provider SDKs, local Ollama/LM Studio, Mock) implements this shape.
 * Plain JS contract documented with JSDoc for intellisense.
 *
 * @typedef {Object} ModelInfo
 * @property {string} id          — provider-scoped model id, e.g. "openai/gpt-4o"
 * @property {string} name        — display name
 * @property {boolean} free       — is this a free-tier model?
 * @property {Object<string, number>} scores — per task-type score 0..100
 * @property {string} [contextWindow]
 * @property {string} [costPer1k] — approx USD per 1k tokens (input/output)
 *
 * @typedef {Object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 *
 * @typedef {Object} ToolSpec
 * @property {string} name
 * @property {string} description
 * @property {Object} parameters  — JSON schema
 *
 * @typedef {Object} CompleteOptions
 * @property {ChatMessage[]} messages
 * @property {ToolSpec[]} [tools]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 *
 * @typedef {Object} CompletionResult
 * @property {string} text
 * @property {Object|null} toolCall  — {name, arguments} when the model requested a tool
 * @property {Object} usage          — {inputTokens, outputTokens}
 * @property {string} model
 * @property {string} finishReason
 */
export class ModelProvider {
  constructor(options = {}) {
    this.id = options.id || this.constructor.name.toLowerCase();
    this.displayName = options.displayName || this.id;
    this.kind = options.kind || 'remote';
    this.config = options.config || {};
    this.available = null; // tri-state: null=unknown, true/false after probe
    this.availableAt = null; // last probe timestamp — isAvailable() re-probes after TTL
    this.availableTtlMs = options.availableTtlMs || 60_000;
  }

  /** Probe connectivity/key validity. Returns true/false. */
  async probe() {
    return true;
  }

  /** True when this provider should be considered for routing right now.
   *  Result is cached for `availableTtlMs` so transient blips don't thrash. */
  async isAvailable() {
    if (this.available === null || Date.now() - (this.availableAt || 0) > (this.availableTtlMs ?? 60_000)) {
      try {
        this.available = await this.probe();
        this.availableAt = Date.now();
      } catch {
        this.available = false;
        this.availableAt = Date.now();
      }
    }
    return this.available;
  }

  /** List models this provider can serve, with per-domain scores. */
  listModels() {
    return [];
  }

  /**
   * Non-streaming completion (chat + optional tool calling).
   * @param {string} model
   * @param {CompleteOptions} opts
   * @returns {Promise<CompletionResult>}
   */
  async complete(_model, _opts) {
    throw new Error(`complete() not implemented by ${this.id}`);
  }

  /**
   * Streaming completion — returns an async generator of text deltas.
   * @param {string} model
   * @param {CompleteOptions} opts
   * @returns {AsyncGenerator<string, void, unknown>}
   */
  async *stream(model, opts) {
    const res = await this.complete(model, opts);
    yield res.text;
  }

  /** Resolve a shorthand model ref like "gpt-4o" to a full model id. */
  resolveModel(ref) {
    return ref;
  }

  /** Optional: HTTP client used by the adapter (set by subclasses). */
  get http() {
    throw new Error(`http not available on ${this.id}`);
  }
}

/** Common HTTP plumbing for REST-based providers. */
export class HttpProvider extends ModelProvider {
  constructor(options = {}) {
    super({ ...options, kind: options.kind || 'remote' });
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey || '';
    this.models = options.models || [];
    this.timeoutMs = options.timeoutMs || 60_000;
    this.retries = options.retries ?? 2;
  }

  listModels() {
    return this.models;
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  /** fetch() with per-request timeout + retry on 429/5xx/network errors. */
  async httpFetch(url, init = {}, opts = {}) {
    return fetchWithRetry(url, init, {
      retries: this.retries,
      timeoutMs: this.timeoutMs,
      ...opts
    });
  }
}

/** Consume a fetch Response body as SSE, yielding parsed `data:` payloads.
 *  Enforces a no-data stall timeout so a hung connection can't block forever. */
export async function* streamSSE(res, { stallTimeoutMs = 60_000 } = {}) {
  if (!res?.body) throw new Error('stream: no response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let stalled = null;
  try {
    while (true) {
      const read = Promise.race([
        reader.read(),
        new Promise((_, reject) => {
          stalled = setTimeout(() => reject(new Error(`stream stalled (no data for ${stallTimeoutMs}ms)`)), stallTimeoutMs);
        })
      ]);
      const { done, value } = await read;
      clearTimeout(stalled);
      stalled = null;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return; // early end of stream
        yield payload;
      }
    }
  } finally {
    clearTimeout(stalled);
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  }
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** fetch() that never hangs: aborts after timeoutMs, retries transient
 *  failures (429, 5xx, network errors) with exponential backoff. */
export async function fetchWithRetry(url, init = {}, { retries = 2, timeoutMs = 60_000, baseDelayMs = 1000 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, controller.signal]) : controller.signal;
    let res;
    try {
      res = await fetch(url, { ...init, signal });
      clearTimeout(timer);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= retries) return res;
      const retryAfter = Number(res.headers.get('retry-after') || '') || 0;
      await res.body?.cancel().catch(() => {});
      await sleep(retryAfter > 0 ? Math.min(retryAfter * 1000, 30_000) : baseDelayMs * 2 ** attempt);
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt >= retries) throw err;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastErr || new Error(`fetch failed: ${url}`);
}
