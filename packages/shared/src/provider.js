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
  }

  /** Probe connectivity/key validity. Returns true/false. */
  async probe() {
    return true;
  }

  /** True when this provider should be considered for routing right now. */
  async isAvailable() {
    if (this.available === null) {
      try {
        this.available = await this.probe();
      } catch {
        this.available = false;
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
}
